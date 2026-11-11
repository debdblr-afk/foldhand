import { ToolError, type InputFile, type OutputFile, type SourceFile, type WorkerRequest, type WorkerResponse } from "./types";

let nextId = 1;

/** Runs a tool in a fresh Web Worker and resolves with its output files. */
export async function runMerge(files: InputFile[], onProgress: (fraction: number) => void): Promise<OutputFile[]> {
  // Reading the bytes is the first slice of the work, so the bar moves straight away.
  const sources: SourceFile[] = [];
  for (let i = 0; i < files.length; i++) {
    sources.push({ name: files[i].name, bytes: new Uint8Array(await files[i].file.arrayBuffer()), rotation: files[i].rotation });
    onProgress(((i + 1) / files.length) * 0.2);
  }
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const id = nextId++;
  try {
    return await new Promise<OutputFile[]>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.id !== id) return;
        if (msg.type === "progress") onProgress(0.2 + (msg.done / msg.total) * 0.75);
        else if (msg.type === "done") {
          onProgress(1);
          resolve(msg.outputs.map((o) => {
            const blob = new Blob([o.bytes as BlobPart], { type: "application/pdf" });
            return { name: o.name, blob, size: blob.size };
          }));
        } else reject(new ToolError(msg.code, msg.fileName));
      };
      worker.onerror = () => reject(new ToolError("unknown"));
      const request: WorkerRequest = { id, tool: "merge", files: sources };
      worker.postMessage(request, sources.map((s) => s.bytes.buffer));
    });
  } finally {
    worker.terminate();
  }
}
