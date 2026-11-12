/**
 * Files on their way from one tool's result to another tool (F08). Held in memory only: moving between
 * tools does not reload the page, so the next tool picks them up when it opens. A reload drops them.
 */
let pending: File[] = [];

export function handOver(files: File[]) {
  pending = files;
}

/** Returns the waiting files once, then forgets them. */
export function takeHandOver(): File[] {
  const files = pending;
  pending = [];
  return files;
}
