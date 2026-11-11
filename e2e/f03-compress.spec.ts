import { existsSync } from "node:fs";
import { REAL_PDF, a11y, add, bytesOf, download, downloadButton, expect, open, pdfInfo, settled, test } from "./helpers";

const run = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Compress", exact: true }).filter({ visible: true }).click();

test.describe("F03 compress a PDF", () => {
  test("F03-H1 a scan gets smaller at every level, and smallest is smaller than light @smoke", async ({ page }) => {
    const sizes: Record<string, number> = {};
    for (const level of ["Light", "Balanced", "Smallest"]) {
      await open(page, "compress");
      await add(page, "scan.pdf");
      await settled(page, 1);
      await page.getByRole("radio", { name: new RegExp(`^${level}`) }).click();
      await run(page);
      await expect(page.getByRole("heading", { name: "Your smaller PDF is ready" })).toBeVisible();
      await expect(page.getByText(/% smaller/)).toBeVisible();
      const file = await download(page, downloadButton(page));
      expect(file.name).toBe("scan-small.pdf");
      const info = await pdfInfo(file.bytes);
      expect(info.pages).toBe(2);
      expect(info.widths).toEqual([595, 595]); // the page itself keeps its size
      sizes[level] = file.bytes.length;
    }
    expect(sizes.Light).toBeLessThan(bytesOf("scan.pdf").length);
    expect(sizes.Balanced).toBeLessThan(sizes.Light);
    expect(sizes.Smallest).toBeLessThan(sizes.Balanced);
  });

  test("F03-E1 a text-only file is not made bigger and says so", async ({ page }) => {
    await open(page, "compress");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await run(page);
    await expect(page.getByText("Already as small as this tool can make it")).toBeVisible();
    const file = await download(page, downloadButton(page));
    expect(file.bytes.length).toBeLessThanOrEqual(bytesOf("alpha.pdf").length);
    expect((await pdfInfo(file.bytes)).pages).toBe(2);
  });

  test("F03-E2 several files at once come back as a list with a zip", async ({ page }) => {
    await open(page, "compress");
    await add(page, "scan.pdf", "alpha.pdf", "bravo.pdf");
    await settled(page, 3);
    await run(page);
    await expect(page.getByRole("heading", { name: "Your 3 smaller PDFs are ready" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Files" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Download all (zip)" })).toBeVisible();
  });

  test("F03-R1 a real PDF from this Mac still opens after compressing and keeps its pages", async ({ page }) => {
    test.skip(!existsSync(REAL_PDF), "no system PDF on this machine");
    await open(page, "compress");
    await add(page, REAL_PDF);
    await settled(page, 1);
    const pages = Number((await page.getByRole("list", { name: "Files" }).innerText()).match(/(\d+) pages?/)![1]);
    await run(page);
    await expect(page.getByRole("heading", { name: "Your smaller PDF is ready" })).toBeVisible();
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(pages);
  });

  test("F03-A1 accessibility: workspace @phone", async ({ page }) => {
    await open(page, "compress");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
