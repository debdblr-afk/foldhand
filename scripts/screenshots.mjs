// Takes the clone's screenshots for replica-diff, at the same sizes as the reference screenshots.
// Run with the dev server up: node scripts/screenshots.mjs <folder to write into>
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const out = (process.argv[2] ?? "screenshots").replace(/\/?$/, "/");
mkdirSync(out, { recursive: true });
const base = process.env.PW_BASE_URL ?? "http://localhost:5330";
const shots = [
  ["S01-home-desktop", "/", { width: 800, height: 600 }, 1],
  ["S02-merge-empty-desktop", "/merge", { width: 800, height: 600 }, 1],
  ["S01-home-mobile", "/", { width: 375, height: 812 }, 2],
  ["S02-merge-empty-mobile", "/merge", { width: 375, height: 812 }, 2],
];

const browser = await chromium.launch();
for (const [name, path, viewport, scale] of shots) {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: scale })).newPage();
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // the dev-mode badge
  await page.screenshot({ path: `${out}${name}.png` });
  await page.close();
}
await browser.close();
console.log("wrote", shots.length, "screenshots to", out);
