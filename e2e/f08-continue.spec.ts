import { a11y, add, download, downloadButton, expect, next, notice, open, pdfInfo, settled, test, tile, tiles } from "./helpers";

test.describe("F08 continue with the result in another tool", () => {
  test("F08-H1 a merged file is carried into Compress, then into Add a password @smoke", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Keep working on this file" })).toBeVisible();
    await next(page, "Compress").click();                    // click 1
    await expect(page).toHaveURL(/\/compress$/);
    await settled(page, 1);
    await expect(tile(page, "merged.pdf")).toContainText("5 pages");
    await page.getByRole("button", { name: "Compress", exact: true }).filter({ visible: true }).click(); // click 2
    await next(page, "Add a password").click();
    await settled(page, 1);
    await expect(tile(page, "merged-small.pdf")).toContainText("5 pages");
  });

  test("F08-H2 several results are all carried; a one-file tool takes the first and says so", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByLabel("Pages to keep").fill("1-2, 3-5, 6");
    await page.getByRole("button", { name: "Split file" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Keep working on these files" })).toBeVisible();
    await next(page, "Merge").click();
    await settled(page, 3);
    await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(6);
  });

  test("F08-H3 page images are carried into Images to PDF; a result goes into Arrange pages", async ({ page }) => {
    await open(page, "pdf-to-jpg");
    await add(page, "bravo.pdf");
    await settled(page, 1);
    await page.getByRole("button", { name: "Make images" }).filter({ visible: true }).click();
    await next(page, "Images to PDF").click();
    await settled(page, 3);
    await page.getByRole("button", { name: "Make PDF" }).filter({ visible: true }).click();
    await next(page, "Arrange pages").click();
    await expect(tiles(page)).toHaveCount(3);
  });

  test("F08-E1 nothing is carried by the top menu, the browser's back button, or a reload", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
    await page.getByRole("navigation", { name: "Tools" }).getByRole("link", { name: "Split" }).click();
    await expect(page.getByRole("button", { name: "Choose a PDF file" })).toBeVisible();
    await expect(tiles(page)).toHaveCount(0);
  });

  test("F08-E2 a locked result asks for its password in the next tool", async ({ page }) => {
    await open(page, "protect");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByLabel("Password", { exact: true }).fill("carry-me");
    await page.getByLabel("Password again").fill("carry-me");
    await page.getByRole("button", { name: "Lock files" }).filter({ visible: true }).click();
    await next(page, "Merge").click();
    await expect(page.getByRole("dialog", { name: "This file is locked" })).toContainText("alpha-locked.pdf");
  });

  test("F08-A1 accessibility: result screen with the carry-over row @phone", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByLabel("Pages to keep").fill("1, 2");
    await page.getByRole("button", { name: "Split file" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Keep working on these files" })).toBeVisible();
    await a11y(page);
    await expect(notice(page)).toHaveCount(0);
  });
});
