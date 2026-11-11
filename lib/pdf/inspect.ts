import type { FileStatus } from "./types";

export type Inspection = {
  status: Exclude<FileStatus, "reading">;
  pageCount: number | null;
  /**
   * The first-page preview, which arrives later than the facts above: drawing waits for the tab to be
   * visible, and nothing else should wait with it.
   */
  thumbnail: Promise<string | null>;
};

const THUMB_WIDTH = 240;

/** pdf.js touches browser-only globals, so it is loaded on first use, never on the server. */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

/** Opens a PDF to learn its page count and whether it is locked or damaged. The first page is drawn afterwards. */
export async function inspect(file: File): Promise<Inspection> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const thumbnail = (async () => {
      try {
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
        canvas.width = canvas.height = 0; // free the bitmap now rather than at garbage collection
        return blob ? URL.createObjectURL(blob) : null;
      } catch {
        return null; // a page that will not draw is not a reason to refuse the file
      } finally {
        await task.destroy();
      }
    })();
    return { status: "ready", pageCount: doc.numPages, thumbnail };
  } catch (e) {
    await task.destroy();
    const name = e instanceof Error ? e.name : "";
    return { status: name === "PasswordException" ? "locked" : "damaged", pageCount: null, thumbnail: Promise.resolve(null) };
  }
}
