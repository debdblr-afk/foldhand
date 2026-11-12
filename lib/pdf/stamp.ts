import { StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "@cantoo/pdf-lib";
import { splitByFont, type FontKey } from "./fonts";
import { load } from "./load";
import { parseRanges } from "./ranges";
import { ToolError, type PageNumberOptions, type Position, type SourceFile, type WatermarkOptions } from "./types";

const EDGE = 28; // gap between a stamp and the edge of the page, in points

/** The page as the reader sees it: size after the page's own rotation and crop. */
export function visibleSize(page: PDFPage): { width: number; height: number } {
  const box = page.getCropBox();
  const turned = page.getRotation().angle % 180 !== 0;
  return turned ? { width: box.height, height: box.width } : { width: box.width, height: box.height };
}

/**
 * Converts a point measured on the page as the reader sees it (from its bottom-left corner) into the
 * page's own coordinates, and gives the angle that makes text read upright for that reader.
 */
export function toUser(page: PDFPage, vx: number, vy: number): { x: number; y: number; angle: number } {
  const box = page.getCropBox();
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  const [x, y] =
    angle === 90 ? [box.width - vy, vx]
    : angle === 180 ? [box.width - vx, box.height - vy]
    : angle === 270 ? [vy, box.height - vx]
    : [vx, vy];
  return { x: box.x + x, y: box.y + y, angle };
}

/** The pages a stamp applies to. Empty text means all of them. */
function chosen(text: string, count: number, fileName: string): Set<number> {
  if (!text.trim()) return new Set(Array.from({ length: count }, (_, i) => i));
  const parsed = parseRanges(text, count);
  if (!parsed.ok) throw new ToolError("out-of-range", fileName, `${fileName}: ${parsed.message}`);
  return new Set(parsed.groups.flat());
}

type Piece = { text: string; font: PDFFont };

const widthOf = (pieces: Piece[], size: number) => pieces.reduce((w, p) => w + p.font.widthOfTextAtSize(p.text, size), 0);

/**
 * Draws a line of text whose centre sits at a point given in reader coordinates, turned by `tilt` degrees
 * for the reader. The line may be made of pieces in different fonts; they are laid end to end.
 */
function drawCentred(page: PDFPage, pieces: Piece[], size: number, cx: number, cy: number, tilt: number, color: ReturnType<typeof rgb>, opacity: number) {
  const width = widthOf(pieces, size);
  const height = pieces[0].font.heightAtSize(size, { descender: false });
  const centre = toUser(page, cx, cy);
  const total = ((centre.angle + tilt) * Math.PI) / 180;
  // Step back from the centre to the start of the baseline, then walk along the direction the text runs.
  let x = centre.x - (Math.cos(total) * width) / 2 + (Math.sin(total) * height) / 2;
  let y = centre.y - (Math.sin(total) * width) / 2 - (Math.cos(total) * height) / 2;
  for (const piece of pieces) {
    page.drawText(piece.text, { x, y, size, font: piece.font, color, opacity, rotate: degrees(centre.angle + tilt) });
    const advance = piece.font.widthOfTextAtSize(piece.text, size);
    x += Math.cos(total) * advance;
    y += Math.sin(total) * advance;
  }
}

function anchor(position: Position, page: { width: number; height: number }, halfWidth: number, halfHeight: number) {
  const cx = position.horizontal === "left" ? EDGE + halfWidth : position.horizontal === "right" ? page.width - EDGE - halfWidth : page.width / 2;
  const cy = position.vertical === "bottom" ? EDGE + halfHeight : position.vertical === "top" ? page.height - EDGE - halfHeight : page.height / 2;
  return { cx, cy };
}

/** Prints a page number on each chosen page. */
export async function pageNumbers(file: SourceFile, options: PageNumberOptions): Promise<Uint8Array> {
  const doc = await load(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const wanted = chosen(options.pages, pages.length, file.name);
  const offset = options.skipFirst ? 1 : 0;
  const start = Math.floor(options.start) || 1;
  const total = pages.length - offset + start - 1;
  const size = Math.min(48, Math.max(6, options.size || 12));
  pages.forEach((page, i) => {
    if (!wanted.has(i) || i < offset) return;
    const n = start + i - offset;
    const text = options.style === "page-n" ? `Page ${n}` : options.style === "n-of-total" ? `${n} of ${total}` : `${n}`;
    const { cx, cy } = anchor(options.position, visibleSize(page), font.widthOfTextAtSize(text, size) / 2, size / 2);
    drawCentred(page, [{ text, font }], size, cx, cy, 0, rgb(0, 0, 0), 1);
  });
  return doc.save();
}

const STRENGTH = { light: 0.15, medium: 0.3, strong: 0.6 } as const;
const SCALE = { small: 0.25, medium: 0.5, large: 0.8 } as const; // share of the page width the text fills
const COLORS = { grey: rgb(0.35, 0.35, 0.38), red: rgb(0.8, 0.1, 0.1), blue: rgb(0.1, 0.25, 0.75) } as const;

/** Fetches the bytes of one of the fonts in /fonts. Injected so tests can read them from disk. */
export type LoadFont = (key: Exclude<FontKey, "base">) => Promise<Uint8Array>;

/** Stamps a line of text across each chosen page. */
export async function watermark(file: SourceFile, options: WatermarkOptions, loadFont: LoadFont): Promise<Uint8Array> {
  const doc = await load(file);
  const text = options.text.trim();
  const runs = splitByFont(text);
  if (!runs) throw new ToolError("unsupported-text");

  // The built-in font prints Western letters. Other scripts each get a Noto Sans file, embedded only when
  // used and trimmed to the letters in the text.
  const fonts = new Map<FontKey, PDFFont>();
  for (const { font: key } of runs) {
    if (fonts.has(key)) continue;
    if (key === "base") fonts.set(key, await doc.embedFont(StandardFonts.HelveticaBold));
    else {
      const { default: fontkit } = await import("@cantoo/fontkit");
      doc.registerFontkit(fontkit as never);
      let bytes: Uint8Array;
      try {
        bytes = await loadFont(key);
      } catch {
        throw new ToolError("font-unavailable");
      }
      fonts.set(key, await doc.embedFont(bytes, { subset: true }));
    }
  }
  const pieces: Piece[] = runs.map((r) => ({ text: r.text, font: fonts.get(r.font)! }));
  // A letter inside a known script that its font still lacks would print as an empty box: refuse instead.
  for (const piece of pieces) {
    const known = new Set(piece.font.getCharacterSet());
    if ([...piece.text].some((ch) => !known.has(ch.codePointAt(0)!) && ch !== "\u200c" && ch !== "\u200d")) throw new ToolError("unsupported-text");
  }
  const unit = widthOf(pieces, 1);

  const pages = doc.getPages();
  const wanted = chosen(options.pages, pages.length, file.name);
  pages.forEach((page, i) => {
    if (!wanted.has(i)) return;
    const visible = visibleSize(page);
    const size = Math.min((visible.width * SCALE[options.size]) / unit, visible.height * 0.3);
    const width = unit * size;
    const tilt = (options.angle * Math.PI) / 180;
    // The space a tilted line takes up, so it stays inside the page at the edges.
    const halfWidth = (Math.cos(tilt) * width + Math.sin(tilt) * size) / 2;
    const halfHeight = (Math.sin(tilt) * width + Math.cos(tilt) * size) / 2;
    const { cx, cy } = anchor(options.position, visible, halfWidth, halfHeight);
    drawCentred(page, pieces, size, cx, cy, options.angle, COLORS[options.color], STRENGTH[options.strength]);
  });
  return doc.save();
}
