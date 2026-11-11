import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { isLocked, load } from "./load";
import { pageNumbers, toUser, visibleSize, watermark } from "./stamp";
import type { PageNumberOptions, SourceFile, WatermarkOptions } from "./types";

async function pdf(pages: number, rotate = 0, name = "doc.pdf"): Promise<SourceFile> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 300]).setRotation(degrees(rotate));
  return { name, bytes: await doc.save(), rotation: 0 };
}

/** How many pages of the result have something drawn on them. */
async function stamped(bytes: Uint8Array): Promise<boolean[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => p.node.Contents() !== undefined);
}

describe("toUser", () => {
  it.each([
    [0, 10, 20, { x: 10, y: 20, angle: 0 }],
    [90, 10, 20, { x: 180, y: 10, angle: 90 }],
    [180, 10, 20, { x: 190, y: 280, angle: 180 }],
    [270, 10, 20, { x: 20, y: 290, angle: 270 }],
  ])("maps a reader's point on a page turned %i degrees", async (rotate, vx, vy, expected) => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 300]);
    page.setRotation(degrees(rotate));
    expect(toUser(page, vx, vy)).toEqual(expected);
  });
  it("swaps width and height for a sideways page", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 300]);
    page.setRotation(degrees(90));
    expect(visibleSize(page)).toEqual({ width: 300, height: 200 });
  });
  it("puts each corner of a turned page inside the page", async () => {
    for (const rotate of [0, 90, 180, 270]) {
      const doc = await PDFDocument.create();
      const page = doc.addPage([200, 300]);
      page.setRotation(degrees(rotate));
      const { width, height } = visibleSize(page);
      for (const [vx, vy] of [[0, 0], [width, 0], [0, height], [width, height]]) {
        const { x, y } = toUser(page, vx, vy);
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(200);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(300);
      }
    }
  });
});

const numbers: PageNumberOptions = { position: { vertical: "bottom", horizontal: "center" }, pages: "", start: 1, style: "n", size: 12, skipFirst: false };

describe("pageNumbers", () => {
  it("numbers every page by default", async () => {
    expect(await stamped(await pageNumbers(await pdf(3), numbers))).toEqual([true, true, true]);
  });
  it("leaves the cover alone", async () => {
    expect(await stamped(await pageNumbers(await pdf(3), { ...numbers, skipFirst: true }))).toEqual([false, true, true]);
  });
  it("only numbers the pages asked for", async () => {
    expect(await stamped(await pageNumbers(await pdf(4), { ...numbers, pages: "2-3" }))).toEqual([false, true, true, false]);
  });
  it("names the file when the range does not fit it", async () => {
    await expect(pageNumbers(await pdf(2, 0, "short.pdf"), { ...numbers, pages: "5" })).rejects.toMatchObject({ code: "out-of-range", detail: expect.stringContaining("short.pdf") });
  });
  it("works on sideways pages and every corner", async () => {
    for (const vertical of ["top", "middle", "bottom"] as const) for (const horizontal of ["left", "center", "right"] as const) {
      expect(await stamped(await pageNumbers(await pdf(1, 90), { ...numbers, style: "n-of-total", position: { vertical, horizontal } }))).toEqual([true]);
    }
  });
});

const mark: WatermarkOptions = { text: "DRAFT", position: { vertical: "middle", horizontal: "center" }, angle: 45, strength: "medium", size: "large", color: "grey", pages: "" };

describe("watermark", () => {
  it("stamps every page", async () => {
    expect(await stamped(await watermark(await pdf(2), mark))).toEqual([true, true]);
  });
  it("stamps only the chosen pages", async () => {
    expect(await stamped(await watermark(await pdf(3), { ...mark, pages: "1, 3", angle: 0 }))).toEqual([true, false, true]);
  });
  it("says so when the text uses letters it cannot print", async () => {
    await expect(watermark(await pdf(1), { ...mark, text: "ଗୋପନୀୟ" })).rejects.toMatchObject({ code: "unsupported-text" });
  });
});

describe("locked files", () => {
  async function locked(options: { userPassword?: string; ownerPassword: string }): Promise<SourceFile> {
    const doc = await PDFDocument.create();
    doc.addPage([200, 300]);
    doc.addPage([210, 300]);
    await doc.encrypt(options);
    return { name: "secret.pdf", bytes: await doc.save(), rotation: 0 };
  }
  it("opens with the right password and comes back unlocked", async () => {
    const file = await locked({ userPassword: "open", ownerPassword: "own" });
    expect(await isLocked(file.bytes)).toBe(true);
    const out = await (await load({ ...file, password: "open" })).save();
    expect(await isLocked(out)).toBe(false);
    expect((await PDFDocument.load(out)).getPages().map((p) => p.getWidth())).toEqual([200, 210]);
  });
  it("refuses without the password, and with the wrong one", async () => {
    const file = await locked({ userPassword: "open", ownerPassword: "own" });
    await expect(load(file)).rejects.toMatchObject({ code: "locked-file", fileName: "secret.pdf" });
    await expect(load({ ...file, password: "nope" })).rejects.toMatchObject({ code: "locked-file" });
  });
  it("opens a file that is only restricted, with no password", async () => {
    const out = await (await load(await locked({ ownerPassword: "own" }))).save();
    expect(await isLocked(out)).toBe(false);
  });
  it("can lock a file so it needs the password again", async () => {
    const doc = await load(await pdf(1));
    await doc.encrypt({ userPassword: "pw", ownerPassword: "pw" });
    const bytes = await doc.save();
    expect(await isLocked(bytes)).toBe(true);
    await expect(load({ name: "x.pdf", bytes, rotation: 0 })).rejects.toMatchObject({ code: "locked-file" });
    expect((await load({ name: "x.pdf", bytes, rotation: 0, password: "pw" })).getPageCount()).toBe(1);
  });
});
