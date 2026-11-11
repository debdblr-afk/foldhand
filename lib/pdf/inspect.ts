import type { FileStatus } from "./types";

export type Inspection = {
  status: Exclude<FileStatus, "reading">;
  pageCount: number | null;
  /**
   * The first-page preview, which arrives later than the facts above: drawing a large page takes a
   * moment, and nothing else should wait for it.
   */
  thumbnail: Promise<string | null>;
};

export type OpenPdf = {
  status: Exclude<FileStatus, "reading">;
  pageCount: number;
  /** Draws one page (0-based) and returns an object URL, or null if it will not draw. One page at a time. */
  renderPage: (index: number, width?: number) => Promise<string | null>;
  /** Draws one page at a scale (1 = 72 dots per inch) and returns the JPG itself. `turn` adds a clockwise rotation. */
  renderBlob: (index: number, scale: number, quality: number, turn?: number) => Promise<Blob | null>;
  close: () => void;
};

const THUMB_WIDTH = 240;

/** pdf.js touches browser-only globals, so it is loaded on first use, never on the server. */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

/** Opens a PDF and keeps it open so pages can be drawn on demand. Call close() when done with it. */
export async function openPdf(file: File, password?: string): Promise<OpenPdf> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password });
  try {
    const doc = await task.promise;
    let queue: Promise<unknown> = Promise.resolve();
    let closed = false;
    const draw = async (index: number, size: { width: number } | { scale: number }, quality: number, turn = 0) => {
      if (closed) return null;
      try {
        const page = await doc.getPage(index + 1);
        const rotation = (page.rotate + turn) % 360;
        const scale = "scale" in size ? size.scale : size.width / page.getViewport({ scale: 1, rotation }).width;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        // "print" draws straight through instead of waiting for animation frames, which browsers pause in a
        // background tab. Previews then appear even if the person has switched away.
        await page.render({ canvas, viewport, intent: "print" }).promise;
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
        canvas.width = canvas.height = 0; // free the bitmap now rather than at garbage collection
        page.cleanup();
        return blob;
      } catch {
        return null; // a page that will not draw is not a reason to refuse the file
      }
    };
    const queued = <T,>(work: () => Promise<T>) => {
      const result = queue.then(work);
      queue = result.catch(() => {});
      return result;
    };
    return {
      status: "ready",
      pageCount: doc.numPages,
      renderPage: (index, width = THUMB_WIDTH) => queued(async () => {
        const blob = await draw(index, { width }, 0.8);
        return blob ? URL.createObjectURL(blob) : null;
      }),
      renderBlob: (index, scale, quality, turn) => queued(() => draw(index, { scale }, quality, turn)),
      close: () => { closed = true; void queue.then(() => task.destroy()); },
    };
  } catch (e) {
    await task.destroy();
    const name = e instanceof Error ? e.name : "";
    return { status: name === "PasswordException" ? "locked" : "damaged", pageCount: 0, renderPage: async () => null, renderBlob: async () => null, close: () => {} };
  }
}

/** Opens a PDF to learn its page count and whether it is locked or damaged. The first page is drawn afterwards. */
export async function inspect(file: File, password?: string): Promise<Inspection> {
  const pdf = await openPdf(file, password);
  if (pdf.status !== "ready") return { status: pdf.status, pageCount: null, thumbnail: Promise.resolve(null) };
  const thumbnail = pdf.renderPage(0).finally(pdf.close);
  return { status: "ready", pageCount: pdf.pageCount, thumbnail };
}
