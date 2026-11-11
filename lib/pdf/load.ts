import { PDFDocument } from "@cantoo/pdf-lib";
import { ToolError, type SourceFile } from "./types";

const isEncrypted = (e: unknown) => e instanceof Error && /encrypt/i.test(e.message);

/**
 * Opens a source file, turning the library's errors into ones the page can explain.
 * A locked file is opened with the password the person gave and handed back as an unlocked copy,
 * so every tool can treat it like any other file and nothing is re-saved under the old lock.
 */
export async function load(f: SourceFile): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(f.bytes);
  } catch (e) {
    if (!isEncrypted(e)) throw new ToolError("damaged-file", f.name);
  }
  let locked: PDFDocument;
  try {
    // An empty password opens files that are only restricted (no password needed to read them).
    locked = await PDFDocument.load(f.bytes, { password: f.password ?? "" });
  } catch {
    throw new ToolError("locked-file", f.name);
  }
  const open = await PDFDocument.create();
  for (const page of await open.copyPages(locked, locked.getPageIndices())) open.addPage(page);
  return open;
}

/** True when the bytes are a PDF that needs a password or carries restrictions. */
export async function isLocked(bytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(bytes);
    return false;
  } catch (e) {
    return isEncrypted(e);
  }
}
