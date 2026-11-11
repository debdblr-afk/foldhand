import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, type PDFObject } from "@cantoo/pdf-lib";
import { load } from "./load";
import type { CompressLevel, Progress, SourceFile } from "./types";

/** Longest side in pixels, and JPEG quality, for each level. */
export const LEVELS: Record<CompressLevel, { maxSide: number; quality: number }> = {
  extreme: { maxSide: 1200, quality: 0.5 },
  recommended: { maxSide: 1800, quality: 0.7 },
  less: { maxSide: 2600, quality: 0.8 },
};

export type Recoded = { bytes: Uint8Array; width: number; height: number };
/** Redraws a JPEG smaller. Returns null when it cannot (the image is then left alone). */
export type Recode = (jpeg: Uint8Array, maxSide: number, quality: number) => Promise<Recoded | null>;

const name = (s: string) => PDFName.of(s);

/** How many colour channels the image has, or null when we should not touch it. */
function channels(dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(name("ColorSpace")) as PDFObject | undefined;
  if (cs === name("DeviceRGB")) return 3;
  if (cs === name("DeviceGray")) return 1;
  if (cs instanceof PDFArray && cs.lookup(0) === name("ICCBased")) {
    const profile = cs.lookup(1);
    const n = profile instanceof PDFRawStream ? profile.dict.lookup(name("N")) : undefined;
    if (n instanceof PDFNumber && (n.asNumber() === 3 || n.asNumber() === 1)) return n.asNumber() as 1 | 3;
  }
  return null; // CMYK, indexed, spot colours: redrawing them in a browser would change the colours
}

function isPlainJpeg(dict: PDFDict): boolean {
  if (dict.lookup(name("Subtype")) !== name("Image")) return false;
  const filter = dict.lookup(name("Filter")) as PDFObject | undefined;
  const dct = filter === name("DCTDecode") || (filter instanceof PDFArray && filter.size() === 1 && filter.lookup(0) === name("DCTDecode"));
  if (!dct) return false;
  // Masks, transparency and custom decode ranges are tied to the exact pixels; leave those images as they are.
  return !["SMask", "Mask", "Decode", "ImageMask"].some((k) => dict.has(name(k)));
}

/**
 * Makes a PDF smaller by redrawing the photos inside it at a lower size and quality.
 * Text and drawings are untouched. If the result is not smaller, the original bytes come back.
 */
export async function compress(file: SourceFile, level: CompressLevel, recode: Recode, onProgress?: Progress): Promise<{ bytes: Uint8Array; images: number }> {
  const doc: PDFDocument = await load(file);
  const { maxSide, quality } = LEVELS[level];
  const candidates = doc.context.enumerateIndirectObjects().filter(
    ([, obj]) => obj instanceof PDFRawStream && isPlainJpeg(obj.dict) && channels(obj.dict) !== null,
  ) as [unknown, PDFRawStream][];

  let changed = 0;
  for (let i = 0; i < candidates.length; i++) {
    const stream = candidates[i][1];
    const recoded = await recode(stream.contents, maxSide, quality).catch(() => null);
    // Only keep a redraw that saves at least a tenth; otherwise quality is lost for nothing.
    if (recoded && recoded.bytes.length < stream.contents.length * 0.9) {
      stream.updateContents(recoded.bytes);
      stream.dict.set(name("Width"), PDFNumber.of(recoded.width));
      stream.dict.set(name("Height"), PDFNumber.of(recoded.height));
      stream.dict.set(name("ColorSpace"), name("DeviceRGB")); // browsers write RGB JPEGs
      stream.dict.set(name("BitsPerComponent"), PDFNumber.of(8));
      stream.dict.set(name("Filter"), name("DCTDecode"));
      stream.dict.delete(name("DecodeParms"));
      changed++;
    }
    onProgress?.(i + 1, candidates.length);
  }
  const bytes = await doc.save();
  return bytes.length < file.bytes.length ? { bytes, images: changed } : { bytes: file.bytes, images: 0 };
}
