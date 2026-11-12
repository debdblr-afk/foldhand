/// <reference lib="webworker" />
import { normaliseImage, recodeJpeg } from "./browser-images";
import { compress } from "./compress";
import { imagesToPdf } from "./images";
import { isLocked, load } from "./load";
import { merge } from "./merge";
import { organize } from "./organize";
import { split } from "./split";
import { pageNumbers, watermark } from "./stamp";
import { formatBytes } from "../format";
import {
  PDF, ToolError, baseName,
  type CompressOptions, type ImagesOptions, type OrganizeOptions, type PageNumberOptions, type Progress, type ProtectOptions, type RawOutput,
  type RotateOptions, type SourceFile, type SplitOptions, type WatermarkOptions, type WorkerRequest, type WorkerResponse,
} from "./types";
import { degrees } from "@cantoo/pdf-lib";

// All PDF writing happens here, off the main thread, so the page stays responsive.
const post = (msg: WorkerResponse, transfer: Transferable[] = []) => (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

/** Runs the same change over each file in turn and names the results with a suffix. */
async function each(files: SourceFile[], suffix: string, progress: Progress, change: (file: SourceFile) => Promise<Uint8Array | RawOutput>): Promise<RawOutput[]> {
  const outputs: RawOutput[] = [];
  for (let i = 0; i < files.length; i++) {
    const result = await change(files[i]);
    outputs.push(result instanceof Uint8Array ? { name: `${baseName(files[i].name)}-${suffix}.pdf`, bytes: result, type: PDF } : result);
    progress(i + 1, files.length);
  }
  return outputs;
}

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
    case "rotate":
      return each(files, "rotated", progress, async (f) => {
        const doc = await load(f);
        const turn = (f.rotation + (options as RotateOptions).turn) % 360;
        if (turn) for (const page of doc.getPages()) page.setRotation(degrees((page.getRotation().angle + turn) % 360));
        return doc.save();
      });
    case "page-numbers":
      return each(files, "numbered", progress, (f) => pageNumbers(f, options as PageNumberOptions));
    case "watermark":
      return each(files, "watermarked", progress, (f) => watermark(f, options as WatermarkOptions, async (key) => {
        // The full address, not "/fonts/…": in development this worker runs from a blob: address, which a
        // bare path cannot be resolved against.
        const res = await fetch(`${self.location.origin}/fonts/${key}.woff`);
        if (!res.ok) throw new Error(`font ${key}: ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      }));
    case "protect":
      return each(files, "locked", progress, async (f) => {
        const doc = await load(f);
        // The same password opens the file and lifts its restrictions, so there is only one thing to remember.
        const password = (options as ProtectOptions).password;
        await doc.encrypt({ userPassword: password, ownerPassword: password });
        return doc.save();
      });
    case "unlock":
      return each(files, "unlocked", progress, async (f) => {
        const name = `${baseName(f.name)}-unlocked.pdf`;
        if (!(await isLocked(f.bytes))) return { name, bytes: f.bytes, type: PDF, detail: "This file was not locked" };
        return { name, bytes: await (await load(f)).save(), type: PDF };
      });
    case "pdf-to-jpg":
      throw new Error("PDF to images runs on the page, not in this worker");
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
