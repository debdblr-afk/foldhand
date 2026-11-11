import type { ErrorCode } from "./types";

/** Plain words for each thing that can go wrong: what happened and what to do next. */
export function explain(code: ErrorCode, fileName?: string, detail?: string): string {
  const file = fileName ?? "One file";
  switch (code) {
    case "damaged-file": return `${file} is damaged and could not be opened. Remove it and try again.`;
    case "locked-file": return `${file} is locked. Enter its password, or remove it.`;
    case "too-few-files": return "Add at least two files to merge.";
    case "out-of-range": return detail ?? "Those pages are not in this file.";
    case "no-pages-left": return "That would leave no pages. Keep at least one.";
    case "unsupported-image": return `${file} could not be read as a picture. Use JPG or PNG files.`;
    case "unsupported-text": return "That text has letters this tool cannot print yet. Use English letters, numbers and common symbols.";
    case "out-of-memory": return "These files are too large for this device to handle in one go. Try fewer files at a time.";
    default: return "Something went wrong. Nothing was lost; try again.";
  }
}
