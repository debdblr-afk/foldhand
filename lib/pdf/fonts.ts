/** Which font can print which letters. Shared by the page (to check text early) and the worker (to draw it). */

export type FontKey =
  | "base" | "latin-ext" | "cyrillic" | "greek"
  | "devanagari" | "bengali" | "gurmukhi" | "gujarati" | "oriya" | "tamil" | "telugu" | "kannada" | "malayalam";

/** What the PDF's built-in font can print: basic and Western European letters, plus a few common marks. */
const BASE = /^[ -~¡-ÿ–—‘’“”•…€™]$/;

/** Unicode blocks, each printed with its own Noto Sans file from /fonts. */
const BLOCKS: Array<[from: number, to: number, key: FontKey]> = [
  [0x0100, 0x024f, "latin-ext"],
  [0x0370, 0x03ff, "greek"],
  [0x0400, 0x04ff, "cyrillic"],
  [0x0900, 0x097f, "devanagari"],
  [0x0980, 0x09ff, "bengali"],
  [0x0a00, 0x0a7f, "gurmukhi"],
  [0x0a80, 0x0aff, "gujarati"],
  [0x0b00, 0x0b7f, "oriya"],
  [0x0b80, 0x0bff, "tamil"],
  [0x0c00, 0x0c7f, "telugu"],
  [0x0c80, 0x0cff, "kannada"],
  [0x0d00, 0x0d7f, "malayalam"],
];

const JOINERS = new Set([0x200c, 0x200d]); // invisible marks that belong to the letters around them

function fontFor(ch: string): FontKey | "joiner" | null {
  if (BASE.test(ch)) return "base";
  const code = ch.codePointAt(0)!;
  if (JOINERS.has(code)) return "joiner";
  return BLOCKS.find(([from, to]) => code >= from && code <= to)?.[2] ?? null;
}

export type Run = { font: FontKey; text: string };

/**
 * Cuts text into stretches that one font can print. Returns null when some letter has no font here
 * (Chinese, Japanese, Korean, Arabic, Hebrew, emoji and others).
 */
export function splitByFont(text: string): Run[] | null {
  const runs: Run[] = [];
  for (const ch of text) {
    const font = fontFor(ch);
    if (font === null) return null;
    const last = runs[runs.length - 1];
    if (font === "joiner") {
      if (last && last.font !== "base") last.text += ch;
    } else if (last?.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  }
  return runs;
}

export const canPrint = (text: string) => splitByFont(text) !== null;
