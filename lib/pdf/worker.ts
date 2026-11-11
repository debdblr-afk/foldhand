/// <reference lib="webworker" />
import { normaliseImage, recodeJpeg } from "./browser-images";
import { compress } from "./compress";
import { imagesToPdf } from "./images";
import { merge } from "./merge";
import { organize } from "./organize";
import { split } from "./split";
import { formatBytes } from "../format";
import {
  PDF, ToolError, baseName,
  type CompressOptions, type ImagesOptions, type OrganizeOptions, type Progress, type RawOutput, type SplitOptions, type WorkerRequest, type WorkerResponse,
} from "./types";

// All PDF writing happens here, off the main thread, so the page stays responsive.
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

async function run({ tool, files, options }: WorkerRequest, progress: Progress): Promise<RawOutput[]> {
  switch (tool) {
    case "merge":
      return [{ name: "merged.pdf", bytes: await merge(files, progress), type: PDF }];
    case "split":
      return split(files[0], options as SplitOptions, progress);
    case "organize":
      return [{ name: `${baseName(files[0].name)}-arranged.pdf`, bytes: await organize(files, (options as OrganizeOptions).pages, progress), type: PDF }];
    case "jpg-to-pdf":
      return imagesToPdf(files, options as ImagesOptions, normaliseImage, progress);
    case "compress": {
      const outputs: RawOutput[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const before = f.bytes.length;
        const { bytes } = await compress(f, (options as CompressOptions).level, recodeJpeg, (done, total) => progress(i + done / Math.max(total, 1), files.length));
        const saved = Math.round((1 - bytes.length / before) * 100);
        outputs.push({
          name: `${baseName(f.name)}-small.pdf`,
          bytes,
          type: PDF,
          detail: saved >= 1 ? `${formatBytes(before)} → ${formatBytes(bytes.length)}, ${saved}% smaller` : "Already as small as this tool can make it",
        });
        progress(i + 1, files.length);
      }
      return outputs;
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id } = event.data;
  try {
    const outputs = await run(event.data, (done, total) => post({ id, type: "progress", done, total }));
    // Each buffer is handed over once, even if a tool returned the same bytes it was given.
    post({ id, type: "done", outputs }, [...new Set(outputs.map((o) => o.bytes.buffer))]);
  } catch (e) {
    if (e instanceof ToolError) post({ id, type: "error", code: e.code, fileName: e.fileName, detail: e.detail });
    else post({ id, type: "error", code: e instanceof RangeError ? "out-of-memory" : "unknown" });
  }
};
