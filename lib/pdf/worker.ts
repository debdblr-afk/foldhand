/// <reference lib="webworker" />
import { merge } from "./merge";
import { ToolError, type WorkerRequest, type WorkerResponse } from "./types";

// All PDF writing happens here, off the main thread, so the page stays responsive.
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, tool, files } = event.data;
  try {
    if (tool === "merge") {
      const bytes = await merge(files, (done, total) => post({ id, type: "progress", done, total }));
      post({ id, type: "done", outputs: [{ name: "merged.pdf", bytes }] }, [bytes.buffer]);
    }
  } catch (e) {
    if (e instanceof ToolError) post({ id, type: "error", code: e.code, fileName: e.fileName });
    else post({ id, type: "error", code: e instanceof RangeError ? "out-of-memory" : "unknown" });
  }
};
