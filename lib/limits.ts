import { formatBytes } from "./format";

const MB = 1024 * 1024;

/**
 * Everything runs in this tab's memory, so very large jobs can fail where a server would not.
 * Returns a warning to show once the files pass a size where that becomes likely, or null.
 * Phones and low-memory devices get a lower bar. The numbers are cautious guesses, not hard limits.
 */
export function sizeWarning(totalBytes: number): string | null {
  const memory = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined;
  const small = (memory !== undefined && memory <= 4) || (typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches);
  const limit = (small ? 60 : 200) * MB;
  if (totalBytes <= limit) return null;
  return `These files add up to ${formatBytes(totalBytes)}. All the work happens in this tab, so a job this large may be slow or run out of memory${small ? " on a phone" : ""}. If it fails, try fewer files at a time.`;
}
