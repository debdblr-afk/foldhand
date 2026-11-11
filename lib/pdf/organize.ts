import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { load } from "./load";
import { ToolError, type PageRef, type Progress, type SourceFile } from "./types";

const A4: [number, number] = [595.28, 841.89];

/** Builds one PDF from a list of pages drawn from one or more files, with blank sheets where asked. */
export async function organize(files: SourceFile[], pages: PageRef[], onProgress?: Progress): Promise<Uint8Array> {
  if (!pages.length) throw new ToolError("no-pages-left");
  const out = await PDFDocument.create();
  const docs = new Map<number, PDFDocument>();
  let lastSize = A4;
  for (let i = 0; i < pages.length; i++) {
    const ref = pages[i];
    if (ref.source === "blank") {
      out.addPage(lastSize);
    } else {
      let doc = docs.get(ref.source);
      if (!doc) docs.set(ref.source, (doc = await load(files[ref.source])));
      if (ref.pageIndex >= doc.getPageCount()) throw new ToolError("out-of-range", files[ref.source].name);
      const [page] = await out.copyPages(doc, [ref.pageIndex]);
      if (ref.rotation) page.setRotation(degrees((page.getRotation().angle + ref.rotation) % 360));
      out.addPage(page);
      lastSize = [page.getWidth(), page.getHeight()];
    }
    if (i % 10 === 9 || i === pages.length - 1) onProgress?.(i + 1, pages.length);
  }
  return out.save();
}
