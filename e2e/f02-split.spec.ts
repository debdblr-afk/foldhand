import { a11y, add, download, downloadButton, drop, expect, notice, open, pdfInfo, settled, test, unzip } from "./helpers";

const run = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Split file" }).filter({ visible: true }).click();

test.describe("F02 split or extract pages", () => {
  test("F02-H1 ranges become separate files, downloadable one by one or as a zip @smoke", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByLabel("Pages to keep").fill("1-3, 5, 10-");
    await run(page);
    await expect(page.getByRole("heading", { name: "Your 3 PDFs are ready" })).toBeVisible();
    const one = await download(page, page.getByRole("link", { name: "Download long-12-pages-10-12.pdf" }));
    expect((await pdfInfo(one.bytes)).pages).toBe(3);
    const zip = await download(page, page.getByRole("button", { name: "Download all (zip)" }));
    expect(zip.name).toBe("split.zip");
    const entries = unzip(zip.bytes);
    expect(Object.keys(entries).sort()).toEqual(["long-12-pages-1-3.pdf", "long-12-pages-10-12.pdf", "long-12-pages-5.pdf"]);
    expect((await pdfInfo(entries["long-12-pages-1-3.pdf"])).pages).toBe(3);
  });

  test("F02-H2 ranges in one file, in the order typed", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByLabel("Pages to keep").fill("12, 1-2");
    await page.getByLabel("Put all the ranges in one file").check();
    await run(page);
    const file = await download(page, downloadButton(page));
    expect(file.name).toBe("long-12-selected-pages.pdf");
    expect((await pdfInfo(file.bytes)).pages).toBe(3);
  });

  test("F02-H3 equal parts", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByRole("radio", { name: /Equal parts/ }).click();
    await page.getByLabel("Pages in each file").fill("5");
    await run(page);
    await expect(page.getByRole("heading", { name: "Your 3 PDFs are ready" })).toBeVisible();
    const last = await download(page, page.getByRole("link", { name: "Download long-12-pages-11-12.pdf" }));
    expect((await pdfInfo(last.bytes)).pages).toBe(2);
  });

  test("F02-H4 remove pages", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByRole("radio", { name: /Remove pages/ }).click();
    await page.getByLabel("Pages to remove").fill("2-11");
    await run(page);
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(2);
  });

  test("F02-E1 Enter in the field runs the split", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await page.getByLabel("Pages to keep").fill("4");
    await page.getByLabel("Pages to keep").press("Enter");
    await expect(page.getByRole("heading", { name: "Your new PDF is ready" })).toBeVisible();
  });

  test("F02-E2 a second file replaces the first; two dropped at once keeps one and says so", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await add(page, "bravo.pdf");
    await settled(page, 1);
    await expect(page.getByText("This file has 3 pages")).toBeVisible();
    await drop(page, page.locator("main"), "alpha.pdf", "bravo.pdf");
    await settled(page, 1);
    await expect(notice(page)).toContainText("one file at a time");
    await expect(page.getByText("This file has 2 pages")).toBeVisible();
  });

  for (const [name, text, message] of [
    ["empty", "", "Type the pages you want"],
    ["past the end", "1-30", "This file has 12 pages"],
    ["backwards", "8-3", "runs backwards"],
    ["not numbers", "one to three", "is not a page or a range"],
    ["zero", "0-2", "Pages start at 1"],
  ] as const) {
    test(`F02-N1 bad range (${name}) is explained under the field and focus goes there`, async ({ page }) => {
      await open(page, "split");
      await add(page, "long-12.pdf");
      await settled(page, 1);
      const field = page.getByLabel("Pages to keep");
      await field.fill(text);
      await run(page);
      await expect(page.getByText(message)).toBeVisible();
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toBeFocused();
    });
  }

  test("F02-N2 cannot remove every page, cannot split a file into one part", async ({ page }) => {
    await open(page, "split");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByRole("radio", { name: /Remove pages/ }).click();
    await page.getByLabel("Pages to remove").fill("1-2");
    await run(page);
    await expect(page.getByText("That would remove every page")).toBeVisible();
    await page.getByRole("radio", { name: /Equal parts/ }).click();
    await page.getByLabel("Pages in each file").fill("2");
    await run(page);
    await expect(page.getByText("that would not split it")).toBeVisible();
  });

  test("F02-A1 accessibility: workspace with an error, and the several-file result @phone", async ({ page }) => {
    await open(page, "split");
    await add(page, "long-12.pdf");
    await settled(page, 1);
    await run(page);
    await a11y(page);
    await page.getByLabel("Pages to keep").fill("1, 2");
    await run(page);
    await expect(page.getByRole("heading", { name: "Your 2 PDFs are ready" })).toBeVisible();
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
