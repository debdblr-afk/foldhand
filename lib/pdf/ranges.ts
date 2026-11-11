export type Ranges = { ok: true; groups: number[][] } | { ok: false; message: string };

/**
 * Reads page ranges typed by a person: "1-3, 5, 8-" (open end means "to the last page").
 * Returns one group of 0-based page indexes per range, in the order typed.
 */
export function parseRanges(text: string, pageCount: number): Ranges {
  const parts = text.split(/[,;\s]+/).filter(Boolean);
  if (!parts.length) return { ok: false, message: "Type the pages you want, for example 1-3, 5." };
  const limit = `This file has ${pageCount} ${pageCount === 1 ? "page" : "pages"}.`;
  const groups: number[][] = [];
  for (const part of parts) {
    const m = /^(\d+)(?:\s*[-–]\s*(\d*))?$/.exec(part);
    if (!m) return { ok: false, message: `"${part}" is not a page or a range. Use numbers like 1-3, 5.` };
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : m[2] === "" ? pageCount : Number(m[2]);
    if (from < 1 || to < 1) return { ok: false, message: `Pages start at 1. ${limit}` };
    if (from > pageCount || to > pageCount) return { ok: false, message: `${limit} Use numbers from 1 to ${pageCount}.` };
    if (from > to) return { ok: false, message: `"${part}" runs backwards. Put the smaller page first.` };
    groups.push(Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
  }
  return { ok: true, groups };
}

/** [0,1,2] -> "1-3", [4] -> "5" */
export function describe(group: number[]): string {
  const first = group[0] + 1;
  const last = group[group.length - 1] + 1;
  return first === last ? `${first}` : `${first}-${last}`;
}
