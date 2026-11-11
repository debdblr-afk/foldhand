import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { ToolError, type SourceFile } from "./types";

/**
 * Joins the pages of every file, in array order, into one PDF.
 * A per-file rotation is added on top of whatever rotation each page already has.
 */
export async function merge(files: SourceFile[], onProgress?: (done: number, total: number) => void): Promise<Uint8Array> {
  if (files.length < 2) throw new ToolError("too-few-files");
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(f.bytes);
    } catch (e) {
      const locked = e instanceof Error && /encrypt/i.test(e.message);
      throw new ToolError(locked ? "locked-file" : "damaged-file", f.name);
    }
    const pages = await out.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      if (f.rotation) page.setRotation(degrees((page.getRotation().angle + f.rotation) % 360));
      out.addPage(page);
    }
    onProgress?.(i + 1, files.length);
  }
  return out.save();
}
