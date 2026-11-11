import { ToolError, type BuiltTool, type InputFile, type OutputFile, type SourceFile, type ToolOptions, type WorkerRequest, type WorkerResponse } from "./types";

let nextId = 1;

/** Runs a tool in a fresh Web Worker and resolves with its output files. `onProgress` gets 0 to 1. */
export async function runTool<T extends BuiltTool>(tool: T, files: InputFile[], options: ToolOptions[T], onProgress: (fraction: number) => void): Promise<OutputFile[]> {
  // Reading the bytes is the first slice of the work, so the bar moves straight away.
  const sources: SourceFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    sources.push({ name: f.name, bytes: new Uint8Array(await f.file.arrayBuffer()), rotation: f.rotation, type: f.file.type, password: f.password ?? undefined });
    onProgress(((i + 1) / files.length) * 0.2);
  }
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const id = nextId++;
  try {
    return await new Promise<OutputFile[]>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.id !== id) return;
        if (msg.type === "progress") onProgress(0.2 + (msg.done / Math.max(msg.total, 1)) * 0.75);
        else if (msg.type === "done") {
          onProgress(1);
          resolve(msg.outputs.map((o) => {
            const blob = new Blob([o.bytes as BlobPart], { type: o.type });
            return { name: o.name, blob, size: blob.size, detail: o.detail };
          }));
        } else reject(new ToolError(msg.code, msg.fileName, msg.detail));
      };
      worker.onerror = () => reject(new ToolError("unknown"));
      const request: WorkerRequest = { id, tool, files: sources, options };
      worker.postMessage(request, sources.map((s) => s.bytes.buffer));
    });
  } finally {
    worker.terminate();
  }
}

/** Packs several results into one zip, without re-compressing files that are already compressed. */
export async function zipOutputs(outputs: OutputFile[]): Promise<Blob> {
  const { zip } = await import("fflate");
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const o of outputs) entries[o.name] = [new Uint8Array(await o.blob.arrayBuffer()), { level: 0 }];
  const bytes = await new Promise<Uint8Array>((resolve, reject) => zip(entries, (err, data) => (err ? reject(err) : resolve(data))));
  return new Blob([bytes as BlobPart], { type: "application/zip" });
}

/** Saves each page of a PDF as a JPG. Drawing needs pdf.js, which has its own worker, so this runs from the page. */
export async function pdfToImages(file: InputFile, quality: "normal" | "high", onProgress: (fraction: number) => void): Promise<OutputFile[]> {
  const { openPdf } = await import("./inspect");
  const pdf = await openPdf(file.file, file.password ?? undefined);
  if (pdf.status !== "ready") throw new ToolError(pdf.status === "locked" ? "locked-file" : "damaged-file", file.name);
  try {
    const base = file.name.replace(/\.[^.]+$/, "");
    const digits = String(pdf.pageCount).length;
    const outputs: OutputFile[] = [];
    for (let i = 0; i < pdf.pageCount; i++) {
      // 150 or 220 dots per inch; a PDF point is 1/72 inch.
      const blob = await pdf.renderBlob(i, (quality === "high" ? 220 : 150) / 72, quality === "high" ? 0.92 : 0.85, file.rotation);
      if (!blob) throw new ToolError("damaged-file", file.name);
      outputs.push({ name: `${base}-page-${String(i + 1).padStart(digits, "0")}.jpg`, blob, size: blob.size });
      onProgress((i + 1) / pdf.pageCount);
    }
    return outputs;
  } finally {
    pdf.close();
  }
}
