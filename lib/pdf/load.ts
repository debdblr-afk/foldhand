import { PDFDocument } from "@cantoo/pdf-lib";
import { ToolError, type SourceFile } from "./types";

/** Opens a source file, turning the library's errors into ones the page can explain. */
export async function load(f: SourceFile): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(f.bytes);
  } catch (e) {
    const locked = e instanceof Error && /encrypt/i.test(e.message);
    throw new ToolError(locked ? "locked-file" : "damaged-file", f.name);
  }
}
