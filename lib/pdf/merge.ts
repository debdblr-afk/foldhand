import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { load } from "./load";
import { ToolError, type Progress, type SourceFile } from "./types";

/**
 * Joins the pages of every file, in array order, into one PDF.
 * A per-file rotation is added on top of whatever rotation each page already has.
 */
export async function merge(files: SourceFile[], onProgress?: Progress): Promise<Uint8Array> {
  if (files.length < 2) throw new ToolError("too-few-files");
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const doc = await load(f);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      if (f.rotation) page.setRotation(degrees((page.getRotation().angle + f.rotation) % 360));
      out.addPage(page);
    }
    onProgress?.(i + 1, files.length);
  }
  return out.save();
}
