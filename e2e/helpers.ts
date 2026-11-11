import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "@cantoo/pdf-lib";
import { expect, test as base, type Download, type Locator, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

export const fx = (name: string) => path.join(__dirname, "fixtures", name);

/** Every test fails on a console error, a page crash, or a failed request to our own server. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, run) => {
    const problems: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") problems.push(`console: ${msg.text()}`); });
    page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
    page.on("response", (res) => { if (res.status() >= 400 && !res.url().includes("favicon")) problems.push(`${res.status()} ${res.url()}`); });
    await run(page);
    expect(problems, "no console errors, crashes or failed requests").toEqual([]);
  },
});
export { expect };

/** Opens a tool and waits until the page is ready to take files. */
export async function open(page: Page, slug: string) {
  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The file input is only wired up once the page's scripts have run.
  await page.waitForFunction(() => {
    const input = document.querySelector("input[type=file]");
    return !!input && Object.keys(input).some((k) => k.startsWith("__reactProps"));
  });
}

/** Adds files the way the file picker would. */
export async function add(page: Page, ...names: string[]) {
  await page.locator("input[type=file]").first().setInputFiles(names.map((n) => (path.isAbsolute(n) ? n : fx(n))));
}

/** Drops files onto the page the way a drag from the desktop would. */
export async function drop(page: Page, target: Locator, ...names: string[]) {
  const files = names.map((n) => ({ name: n, type: n.endsWith(".pdf") ? "application/pdf" : n.endsWith(".png") ? "image/png" : n.endsWith(".jpg") ? "image/jpeg" : "text/plain", b64: readFileSync(fx(n)).toString("base64") }));
  const dataTransfer = await page.evaluateHandle((list) => {
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: f.type }));
    return dt;
  }, files);
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
}

/** The message shown in the workspace (not the page's hidden announcers). */
export const notice = (page: Page) => page.locator("main").locator("[role=alert], [role=status]").filter({ hasText: /\S/ });

/** Bytes of a fixture, for giving a file another name. */
export const bytesOf = (name: string) => readFileSync(fx(name));
export const named = (name: string, fixture: string) => ({ name, mimeType: "application/pdf", buffer: bytesOf(fixture) });

export const tiles = (page: Page) => page.getByRole("list", { name: /^(Files|Pages)/ }).getByRole("listitem");
export const tile = (page: Page, name: string | RegExp) => tiles(page).filter({ hasText: name });

/** Waits until every added file has been read (page counts shown, no "Reading…"). */
export async function settled(page: Page, count: number) {
  await expect(tiles(page)).toHaveCount(count);
  await expect(tiles(page).filter({ hasText: "Reading…" })).toHaveCount(0);
}

/** Clicks a download control and returns the saved file's name and bytes. */
export async function download(page: Page, control: Locator): Promise<{ name: string; bytes: Buffer }> {
  const [dl]: [Download, void] = await Promise.all([page.waitForEvent("download"), control.click()]);
  return { name: dl.suggestedFilename(), bytes: readFileSync(await dl.path()) };
}

/** The single result's Download button. */
export const downloadButton = (page: Page) => page.getByRole("link", { name: "Download", exact: true });

export async function pdfInfo(bytes: Uint8Array, password?: string) {
  const doc = await PDFDocument.load(bytes, password === undefined ? undefined : { password });
  return { pages: doc.getPageCount(), widths: doc.getPages().map((p) => Math.round(p.getWidth())), heights: doc.getPages().map((p) => Math.round(p.getHeight())), rotations: doc.getPages().map((p) => p.getRotation().angle) };
}

export async function isLockedPdf(bytes: Uint8Array): Promise<boolean> {
  try { await PDFDocument.load(bytes); return false; } catch (e) { return /encrypt/i.test(String(e)); }
}

export const unzip = (bytes: Uint8Array) => unzipSync(new Uint8Array(bytes));

/** Accessibility scan of the current screen. Fails on any WCAG A or AA violation. */
export async function a11y(page: Page) {
  // Let fades and slides finish first: text caught halfway through a fade reads as low contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

/** A real multi-page PDF that ships with macOS. Read in place, never copied into the project. */
export const REAL_PDF = "/Library/Documentation/License.lpdf/Contents/Resources/English.lproj/License.pdf";
