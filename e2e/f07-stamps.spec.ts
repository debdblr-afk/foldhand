import { a11y, add, bytesOf, download, downloadButton, embeddedFonts, expect, next, open, pdfInfo, settled, test } from "./helpers";

test.describe("F07 page numbers, watermark, rotate", () => {
  test("F07-H1 page numbers are added and the file keeps its pages @smoke", async ({ page }) => {
    await open(page, "page-numbers");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByRole("radio", { name: "bottom right" }).click();
    await page.getByRole("radio", { name: "1 of 9" }).click();
    await page.getByLabel("The first page is a cover (no number)").check();
    await page.getByRole("button", { name: "Add numbers" }).filter({ visible: true }).click();
    const file = await download(page, downloadButton(page));
    expect(file.name).toBe("long-12-numbered.pdf");
    expect((await pdfInfo(file.bytes)).pages).toBe(12);
    expect(file.bytes.length).toBeGreaterThan(bytesOf("long-12.pdf").length); // something was drawn
  });

  test("F07-N1 page numbers: a range past the end, a zero start and a silly size are refused", async ({ page }) => {
    await open(page, "page-numbers");
    await add(page, "alpha.pdf", "long-12.pdf");
    await settled(page, 2);
    const run = page.getByRole("button", { name: "Add numbers" }).filter({ visible: true });
    await page.getByLabel("Pages to number").fill("1-5");
    await run.click();
    await expect(page.getByText("alpha.pdf: This file has 2 pages")).toBeVisible();
    await page.getByLabel("Pages to number").fill("");
    await page.getByLabel("First number").fill("0");
    await run.click();
    await expect(page.getByText("The first number must be a whole number, 1 or more.")).toBeVisible();
    await page.getByLabel("First number").fill("1");
    await page.getByLabel("Text size").fill("400");
    await run.click();
    await expect(page.getByText("Text size must be from 6 to 48.").first()).toBeVisible();
  });

  test("F07-H2 a watermark is stamped on every file", async ({ page }) => {
    await open(page, "watermark");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByLabel("Text", { exact: true }).fill("DRAFT – not for release");
    await page.getByRole("radio", { name: "Red" }).click();
    await page.getByRole("button", { name: "Add watermark" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Your 2 watermarked PDFs are ready" })).toBeVisible();
    const file = await download(page, page.getByRole("link", { name: "Download bravo-watermarked.pdf" }));
    expect((await pdfInfo(file.bytes)).pages).toBe(3);
  });

  test("F07-N2 watermark: empty text and letters it cannot print are refused before any work is done", async ({ page }) => {
    await open(page, "watermark");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    const run = page.getByRole("button", { name: "Add watermark" }).filter({ visible: true });
    await run.click();
    await expect(page.getByText("Type the text to stamp.")).toBeVisible();
    await page.getByLabel("Text", { exact: true }).fill("机密 🔒");
    await run.click();
    await expect(page.getByText("letters this tool cannot print yet")).toBeVisible();
    await expect(page.getByLabel("Text", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("F07-H4 a watermark in Hindi, Odia and English is stamped with embedded fonts", async ({ page }) => {
    await open(page, "watermark");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByLabel("Text", { exact: true }).fill("DRAFT गोपनीय ଗୋପନୀୟ");
    await page.getByRole("button", { name: "Add watermark" }).filter({ visible: true }).click();
    const file = await download(page, downloadButton(page));
    expect((await pdfInfo(file.bytes)).pages).toBe(2);
    // Two real fonts went into the file (Hindi and Odia); the English part uses the built-in one.
    expect(await embeddedFonts(file.bytes)).toBe(2);
    // The stamped file still draws: feed it back in and wait for its preview.
    await next(page, "Add a password").click();
    await settled(page, 1);
    await expect(page.getByRole("list", { name: /^Files/ }).locator("img")).toBeVisible();
  });

  test("F07-H3 rotate turns every page of every file", async ({ page }) => {
    await open(page, "rotate");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Rotate alpha.pdf" }).click(); // one extra quarter turn for alpha
    await page.getByRole("button", { name: "Rotate", exact: true }).filter({ visible: true }).click();
    const alpha = await pdfInfo((await download(page, page.getByRole("link", { name: "Download alpha-rotated.pdf" }))).bytes);
    const bravo = await pdfInfo((await download(page, page.getByRole("link", { name: "Download bravo-rotated.pdf" }))).bytes);
    expect(alpha.rotations).toEqual([180, 180]);
    expect(bravo.rotations).toEqual([90, 90, 90]);
  });

  test("F07-N3 rotate with nothing turned says so", async ({ page }) => {
    await open(page, "rotate");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByRole("radio", { name: /Not at all/ }).click();
    await page.getByRole("button", { name: "Rotate", exact: true }).filter({ visible: true }).click();
    await expect(page.getByText("Nothing is turned yet")).toBeVisible();
  });

  test("F07-A1 accessibility: the busiest options panels @phone", async ({ page }) => {
    for (const slug of ["watermark", "page-numbers", "rotate"]) {
      await open(page, slug);
      await add(page, "alpha.pdf");
      await settled(page, 1);
      await a11y(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), slug).toBe(true);
    }
  });
});
