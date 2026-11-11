import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { load } from "./load";
import { describe, parseRanges } from "./ranges";
import { PDF, ToolError, baseName, type Progress, type RawOutput, type SourceFile, type SplitOptions } from "./types";

/** Cuts one PDF into smaller ones: by page ranges, every N pages, or by leaving pages out. */
export async function split(file: SourceFile, options: SplitOptions, onProgress?: Progress): Promise<RawOutput[]> {
  const doc = await load(file);
  const count = doc.getPageCount();
  const base = baseName(file.name);

  let groups: number[][];
  let names: string[];
  if (options.mode === "every") {
    const n = Math.max(1, Math.floor(options.n) || 1);
    groups = [];
    for (let i = 0; i < count; i += n) groups.push(Array.from({ length: Math.min(n, count - i) }, (_, k) => i + k));
    names = groups.map((g) => `${base}-pages-${describe(g)}.pdf`);
  } else {
    const parsed = parseRanges(options.mode === "ranges" ? options.ranges : options.pages, count);
    if (!parsed.ok) throw new ToolError("out-of-range", file.name, parsed.message);
    if (options.mode === "remove") {
      const drop = new Set(parsed.groups.flat());
      const keep = doc.getPageIndices().filter((i) => !drop.has(i));
      if (!keep.length) throw new ToolError("no-pages-left", file.name);
      groups = [keep];
      names = [`${base}-trimmed.pdf`];
    } else if (options.mergeIntoOne) {
      groups = [parsed.groups.flat()];
      names = [`${base}-selected-pages.pdf`];
    } else {
      groups = parsed.groups;
      names = groups.map((g) => `${base}-pages-${describe(g)}.pdf`);
    }
  }

  const outputs: RawOutput[] = [];
  for (let i = 0; i < groups.length; i++) {
    const out = await PDFDocument.create();
    for (const page of await out.copyPages(doc, groups[i])) {
      if (file.rotation) page.setRotation(degrees((page.getRotation().angle + file.rotation) % 360));
      out.addPage(page);
    }
    outputs.push({ name: uniqueName(names[i], outputs), bytes: await out.save(), type: PDF });
    onProgress?.(i + 1, groups.length);
  }
  return outputs;
}

/** The same range typed twice must not produce two files with one name. */
function uniqueName(name: string, taken: RawOutput[]): string {
  let candidate = name;
  for (let n = 2; taken.some((t) => t.name === candidate); n++) candidate = name.replace(/\.pdf$/, ` (${n}).pdf`);
  return candidate;
}
