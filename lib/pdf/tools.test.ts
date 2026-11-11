import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFRawStream } from "@cantoo/pdf-lib";
import { compress } from "./compress";
import { exifOrientation, imagesToPdf } from "./images";
import { organize } from "./organize";
import { parseRanges } from "./ranges";
import { split } from "./split";
import type { SourceFile } from "./types";

/** A PDF whose pages are 100, 101, 102… wide, so each page can be recognised afterwards. */
async function pdf(pages: number, name = "doc.pdf"): Promise<SourceFile> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([100 + i, 300]);
  return { name, bytes: await doc.save(), rotation: 0 };
}
const widths = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth());

describe("parseRanges", () => {
  it("reads single pages, ranges and open ends", () => {
    expect(parseRanges("1-3, 5 7-", 8)).toEqual({ ok: true, groups: [[0, 1, 2], [4], [6, 7]] });
  });
  it.each([["", /Type the pages/], ["9", /has 8 pages/], ["0", /start at 1/], ["3-1", /backwards/], ["a-b", /not a page/]])("rejects %j", (text, message) => {
    const r = parseRanges(text, 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(message);
  });
});

describe("split", () => {
  it("makes one file per range", async () => {
    const out = await split(await pdf(5, "report.pdf"), { mode: "ranges", ranges: "1-2, 5", mergeIntoOne: false });
    expect(out.map((o) => o.name)).toEqual(["report-pages-1-2.pdf", "report-pages-5.pdf"]);
    expect(await widths(out[0].bytes)).toEqual([100, 101]);
    expect(await widths(out[1].bytes)).toEqual([104]);
  });
  it("joins the ranges into one file when asked", async () => {
    const out = await split(await pdf(5), { mode: "ranges", ranges: "4-5, 1", mergeIntoOne: true });
    expect(out).toHaveLength(1);
    expect(await widths(out[0].bytes)).toEqual([103, 104, 100]);
  });
  it("cuts every N pages, with a short last file", async () => {
    const out = await split(await pdf(5), { mode: "every", n: 2 });
    expect(await Promise.all(out.map((o) => widths(o.bytes)))).toEqual([[100, 101], [102, 103], [104]]);
  });
  it("removes pages", async () => {
    const out = await split(await pdf(4), { mode: "remove", pages: "2-3" });
    expect(await widths(out[0].bytes)).toEqual([100, 103]);
  });
  it("refuses to remove every page", async () => {
    await expect(split(await pdf(2), { mode: "remove", pages: "1-2" })).rejects.toMatchObject({ code: "no-pages-left" });
  });
  it("explains a range past the last page", async () => {
    await expect(split(await pdf(2), { mode: "ranges", ranges: "1-9", mergeIntoOne: false })).rejects.toMatchObject({ code: "out-of-range", detail: expect.stringMatching(/has 2 pages/) });
  });
  it("gives the same range typed twice two different names", async () => {
    const out = await split(await pdf(2), { mode: "ranges", ranges: "1, 1", mergeIntoOne: false });
    expect(new Set(out.map((o) => o.name)).size).toBe(2);
  });
});

describe("organize", () => {
  it("reorders across files, turns pages and adds blanks", async () => {
    const out = await organize([await pdf(3), await pdf(1)], [
      { source: 0, pageIndex: 2, rotation: 90 },
      { source: "blank", pageIndex: 0, rotation: 0 },
      { source: 1, pageIndex: 0, rotation: 0 },
      { source: 0, pageIndex: 0, rotation: 0 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([102, 102, 100, 100]);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });
  it("refuses an empty list", async () => {
    await expect(organize([await pdf(1)], [])).rejects.toMatchObject({ code: "no-pages-left" });
  });
});

// The smallest PNG there is: one transparent pixel.
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const asIs = async (f: SourceFile) => ({ bytes: f.bytes, type: "image/png" as const });

describe("imagesToPdf", () => {
  const img = (name: string, rotation: 0 | 90 = 0): SourceFile => ({ name, bytes: PNG, rotation });
  it("puts every image on its own page of one file", async () => {
    const out = await imagesToPdf([img("a.png"), img("b.png")], { orientation: "portrait", pageSize: "a4", margin: "small", oneFile: true }, asIs);
    expect(out.map((o) => o.name)).toEqual(["images.pdf"]);
    const doc = await PDFDocument.load(out[0].bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
  it("makes one file per image, sideways when asked", async () => {
    const out = await imagesToPdf([img("a.png"), img("b.png")], { orientation: "landscape", pageSize: "letter", margin: "none", oneFile: false }, asIs);
    expect(out.map((o) => o.name)).toEqual(["a.pdf", "b.pdf"]);
    expect((await PDFDocument.load(out[0].bytes)).getPage(0).getWidth()).toBe(792);
  });
  it("fits the page to the image plus its margin", async () => {
    const out = await imagesToPdf([img("a.png")], { orientation: "portrait", pageSize: "fit", margin: "big", oneFile: true }, asIs);
    expect((await PDFDocument.load(out[0].bytes)).getPage(0).getWidth()).toBe(81);
  });
  it("names the image it could not read", async () => {
    const bad: SourceFile = { name: "bad.jpg", bytes: new Uint8Array([1, 2, 3]), rotation: 0 };
    await expect(imagesToPdf([bad], { orientation: "portrait", pageSize: "fit", margin: "none", oneFile: true }, async (f) => ({ bytes: f.bytes, type: "image/jpeg" }))).rejects.toMatchObject({ code: "unsupported-image", fileName: "bad.jpg" });
  });
});

describe("exifOrientation", () => {
  it("is 0 for a file that is not a JPEG", () => expect(exifOrientation(PNG)).toBe(0));
  it("reads the flag from a camera header", () => {
    // SOI, APP1 "Exif\0\0", big-endian TIFF with one entry: tag 0x0112 = 6 (turned a quarter)
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(exifOrientation(bytes)).toBe(6);
  });
});

describe("compress", () => {
  /** A PDF holding one fake "photo": the recoder is faked too, so no real JPEG is needed. */
  async function withImage(size: number, extra: Record<string, unknown> = {}): Promise<SourceFile> {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const stream = doc.context.stream(new Uint8Array(size).fill(7), { Type: "XObject", Subtype: "Image", Filter: "DCTDecode", Width: 4000, Height: 3000, ColorSpace: "DeviceRGB", BitsPerComponent: 8, ...extra });
    doc.context.register(stream);
    return { name: "scan.pdf", bytes: await doc.save({ useObjectStreams: false }), rotation: 0 };
  }
  const photo = async (bytes: Uint8Array) =>
    (await PDFDocument.load(bytes)).context.enumerateIndirectObjects().map(([, o]) => o).find((o): o is PDFRawStream => o instanceof PDFRawStream && o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"))!;
  const shrink = async (_: Uint8Array, maxSide: number) => ({ bytes: new Uint8Array(100), width: maxSide, height: maxSide * 0.75 });

  it("swaps in the smaller photo and records its new size", async () => {
    const src = await withImage(50_000);
    const { bytes, images } = await compress(src, "recommended", shrink);
    expect(images).toBe(1);
    expect(bytes.length).toBeLessThan(src.bytes.length / 10);
    const image = await photo(bytes);
    expect(image.dict.get(PDFName.of("Width"))?.toString()).toBe("1800");
    expect(image.contents.length).toBe(100);
  });
  it("leaves an image alone when the redraw is not clearly smaller", async () => {
    const src = await withImage(50_000);
    const { bytes, images } = await compress(src, "less", async (jpeg) => ({ bytes: jpeg.slice(0, 48_000), width: 10, height: 10 }));
    expect(images).toBe(0);
    expect((await photo(bytes)).contents.length).toBe(50_000);
    expect(bytes.length).toBeLessThanOrEqual(src.bytes.length);
  });
  it("does not touch CMYK or masked images", async () => {
    for (const extra of [{ ColorSpace: "DeviceCMYK" }, { ImageMask: true }]) {
      const { images } = await compress(await withImage(50_000, extra), "extreme", shrink);
      expect(images).toBe(0);
    }
  });
  it("survives a photo the browser cannot decode", async () => {
    const src = await withImage(50_000);
    const { bytes, images } = await compress(src, "extreme", async () => { throw new Error("decode failed"); });
    expect(images).toBe(0);
    expect((await photo(bytes)).contents.length).toBe(50_000);
  });
});
