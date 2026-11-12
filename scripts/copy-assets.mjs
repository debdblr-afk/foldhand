// Copies files the browser needs out of node_modules into public/. Runs after every install.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/fonts", { recursive: true });
copyFileSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs");

// Noto Sans Bold (SIL Open Font License), one file per script, for watermark text the built-in font cannot print.
const fonts = {
  "latin-ext": "noto-sans/files/noto-sans-latin-ext-700-normal.woff",
  cyrillic: "noto-sans/files/noto-sans-cyrillic-700-normal.woff",
  greek: "noto-sans/files/noto-sans-greek-700-normal.woff",
  devanagari: "noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff",
  bengali: "noto-sans-bengali/files/noto-sans-bengali-bengali-700-normal.woff",
  gurmukhi: "noto-sans-gurmukhi/files/noto-sans-gurmukhi-gurmukhi-700-normal.woff",
  gujarati: "noto-sans-gujarati/files/noto-sans-gujarati-gujarati-700-normal.woff",
  oriya: "noto-sans-oriya/files/noto-sans-oriya-oriya-700-normal.woff",
  tamil: "noto-sans-tamil/files/noto-sans-tamil-tamil-700-normal.woff",
  telugu: "noto-sans-telugu/files/noto-sans-telugu-telugu-700-normal.woff",
  kannada: "noto-sans-kannada/files/noto-sans-kannada-kannada-700-normal.woff",
  malayalam: "noto-sans-malayalam/files/noto-sans-malayalam-malayalam-700-normal.woff",
};
for (const [key, file] of Object.entries(fonts)) copyFileSync(`node_modules/@fontsource/${file}`, `public/fonts/${key}.woff`);
console.log("copied pdf worker and", Object.keys(fonts).length, "fonts to public/");
