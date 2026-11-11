import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { merge } from "./merge";
import { ToolError } from "./types";

async function pdf(pages: number, width = 200, rotate = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([width, 300]).setRotation(degrees(rotate));
  return doc.save();
}

describe("merge", () => {
  it("joins pages in file order", async () => {
    const out = await merge([
      { name: "a.pdf", bytes: await pdf(2, 200), rotation: 0 },
      { name: "b.pdf", bytes: await pdf(3, 400), rotation: 0 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([200, 200, 400, 400, 400]);
  });

  it("adds the per-file rotation to the rotation a page already has", async () => {
    const out = await merge([
      { name: "a.pdf", bytes: await pdf(1, 200, 90), rotation: 270 },
      { name: "b.pdf", bytes: await pdf(1), rotation: 90 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([0, 90]);
  });

  it("reports progress once per file", async () => {
    const seen: number[] = [];
    await merge(
      [{ name: "a.pdf", bytes: await pdf(1), rotation: 0 }, { name: "b.pdf", bytes: await pdf(1), rotation: 0 }],
      (done) => seen.push(done),
    );
    expect(seen).toEqual([1, 2]);
  });

  it("refuses a single file", async () => {
    await expect(merge([{ name: "a.pdf", bytes: await pdf(1), rotation: 0 }])).rejects.toMatchObject({ code: "too-few-files" });
  });

  it("names the damaged file", async () => {
    const bad = new TextEncoder().encode("this is not a pdf");
    const err = await merge([{ name: "a.pdf", bytes: await pdf(1), rotation: 0 }, { name: "bad.pdf", bytes: bad, rotation: 0 }]).catch((e) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect(err).toMatchObject({ code: "damaged-file", fileName: "bad.pdf" });
  });
});
