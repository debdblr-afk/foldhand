import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "@cantoo/pdf-lib";
import { add, bytesOf, download, downloadButton, expect, open, pdfInfo, settled, test, tiles } from "./helpers";

// A 100 MB "scan": 42 pages, each with its own 2.4 MB photo. Made once per run, outside the project.
let big: string;
test.beforeAll(async () => {
  const doc = await PDFDocument.create();
  const photo = bytesOf("photo.jpg");
  for (let i = 0; i < 42; i++) {
    const image = await doc.embedJpg(photo);
    doc.addPage([595, 446]).drawImage(image, { x: 0, y: 0, width: 595, height: 446 });
  }
  big = path.join(mkdtempSync(path.join(tmpdir(), "foldhand-")), "big-scan.pdf");
  writeFileSync(big, await doc.save());
  console.log(`big file: ${(statSync(big).size / 1024 / 1024).toFixed(1)} MB`);
});

const timed = async (label: string, work: () => Promise<void>) => {
  const start = Date.now();
  await work();
  console.log(`${label}: ${((Date.now() - start) / 1000).toFixed(1)} s`);
};

test.describe("Large files @large", () => {
  test("L-01 compress a 100 MB scan", async ({ page }) => {
    await open(page, "compress");
    await timed("read 100 MB", async () => { await add(page, big); await settled(page, 1); });
    await expect(tiles(page).first()).toContainText("42 pages");
    await timed("compress", async () => {
      await page.getByRole("button", { name: "Compress", exact: true }).filter({ visible: true }).click();
      await expect(page.getByRole("heading", { name: "Your smaller PDF is ready" })).toBeVisible({ timeout: 300_000 });
    });
    console.log(await page.getByText(/% smaller/).innerText());
    const file = await download(page, downloadButton(page));
    expect((await pdfInfo(file.bytes)).pages).toBe(42);
    expect(file.bytes.length).toBeLessThan(statSync(big).size / 2);
  });

  test("L-02 merge a 100 MB scan with a small file", async ({ page }) => {
    await open(page, "merge");
    await add(page, big, "alpha.pdf");
    await settled(page, 2);
    await timed("merge", async () => {
      await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
      await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible({ timeout: 300_000 });
    });
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(44);
  });

  test("L-03 arrange the pages of a 100 MB scan", async ({ page }) => {
    await open(page, "organize");
    await timed("open 42 pages", async () => { await add(page, big); await expect(tiles(page)).toHaveCount(42, { timeout: 120_000 }); });
    await timed("first previews", async () => { await expect(tiles(page).first().locator("img")).toBeVisible({ timeout: 120_000 }); });
    await page.getByRole("button", { name: "Remove Page 1", exact: true }).click();
    await timed("save", async () => {
      await page.getByRole("button", { name: "Save PDF" }).filter({ visible: true }).click();
      await expect(page.getByRole("heading", { name: "Your rearranged PDF is ready" })).toBeVisible({ timeout: 300_000 });
    });
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(41);
  });
});
