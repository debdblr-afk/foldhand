import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { PDF, ToolError, baseName, type ImagesOptions, type Progress, type RawOutput, type SourceFile } from "./types";

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const MARGINS = { none: 0, small: 20, big: 40 } as const;

/**
 * Turns an image into JPEG or PNG bytes the PDF can hold, the right way up.
 * In the browser this redraws photos that carry a "turn me" flag and formats such as WebP.
 */
export type Normalise = (file: SourceFile) => Promise<{ bytes: Uint8Array; type: "image/jpeg" | "image/png" }>;

/** One image per page. Either all images in one PDF, or one PDF each. */
export async function imagesToPdf(files: SourceFile[], options: ImagesOptions, normalise: Normalise, onProgress?: Progress): Promise<RawOutput[]> {
  const outputs: RawOutput[] = [];
  let doc = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let image;
    try {
      const { bytes, type } = await normalise(f);
      image = type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch {
      throw new ToolError("unsupported-image", f.name);
    }
    // A sideways turn chosen on the tile swaps the picture's sides.
    const turned = f.rotation === 90 || f.rotation === 270;
    const w = turned ? image.height : image.width;
    const h = turned ? image.width : image.height;
    const margin = MARGINS[options.margin];

    let pageW: number, pageH: number;
    if (options.pageSize === "fit") {
      pageW = w + margin * 2;
      pageH = h + margin * 2;
    } else {
      const [short, long] = SIZES[options.pageSize];
      [pageW, pageH] = options.orientation === "landscape" ? [long, short] : [short, long];
    }
    const scale = Math.min((pageW - margin * 2) / w, (pageH - margin * 2) / h, options.pageSize === "fit" ? 1 : Infinity);
    const drawW = w * scale;
    const drawH = h * scale;
    const page = doc.addPage([pageW, pageH]);
    // pdf-lib turns an image about its bottom-left corner, so each turn needs its own starting point.
    const left = (pageW - drawW) / 2;
    const bottom = (pageH - drawH) / 2;
    const origin = {
      0: { x: left, y: bottom },
      90: { x: left, y: bottom + drawH },
      180: { x: left + drawW, y: bottom + drawH },
      270: { x: left + drawW, y: bottom },
    }[f.rotation];
    page.drawImage(image, {
      ...origin,
      width: turned ? drawH : drawW,
      height: turned ? drawW : drawH,
      rotate: degrees(-f.rotation),
    });

    if (!options.oneFile) {
      outputs.push({ name: `${baseName(f.name)}.pdf`, bytes: await doc.save(), type: PDF });
      doc = await PDFDocument.create();
    }
    onProgress?.(i + 1, files.length);
  }
  if (options.oneFile) outputs.push({ name: files.length === 1 ? `${baseName(files[0].name)}.pdf` : "images.pdf", bytes: await doc.save(), type: PDF });
  return outputs;
}

/** Reads the "which way up" flag a camera writes into a JPEG. 1 means upright; 0 means none found. */
export function exifOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const entries = view.getUint16(ifd, little);
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > view.byteLength) return 0;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 0;
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    offset += 2 + size;
  }
  return 0;
}
