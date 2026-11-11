import { a11y, add, download, downloadButton, expect, notice, open, pdfInfo, settled, test, unzip } from "./helpers";

const make = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Make PDF" }).filter({ visible: true }).click();

test.describe("F05 images to PDF, and PDF to images", () => {
  test("F05-H1 two images become one A4 PDF, one image per page @smoke", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "photo.jpg", "small.png");
    await settled(page, 2);
    await make(page);
    const file = await download(page, downloadButton(page));
    expect(file.name).toBe("images.pdf");
    const info = await pdfInfo(file.bytes);
    expect(info.widths).toEqual([595, 595]);
    expect(info.heights).toEqual([842, 842]);
  });

  test("F05-H2 page fitted to the image, sideways A4, and one PDF per image", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "photo.jpg", "small.png");
    await settled(page, 2);
    await page.getByRole("radio", { name: "Same as image" }).click();
    await page.getByRole("radio", { name: "None" }).click();
    await page.getByLabel("Put all images in one PDF").uncheck();
    await make(page);
    await expect(page.getByRole("heading", { name: "Your 2 PDFs are ready" })).toBeVisible();
    const photo = await pdfInfo((await download(page, page.getByRole("link", { name: "Download photo.pdf" }))).bytes);
    expect([photo.widths[0], photo.heights[0]]).toEqual([2400, 1800]);

    await page.getByRole("button", { name: "Start over" }).click();
    await add(page, "small.png");
    await settled(page, 1);
    await page.getByRole("radio", { name: "Sideways" }).click();
    await make(page);
    const sideways = await pdfInfo((await download(page, downloadButton(page))).bytes);
    expect([sideways.widths[0], sideways.heights[0]]).toEqual([842, 595]);
  });

  test("F05-E1 a phone photo flagged as turned comes out the right way up", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "photo-turned.jpg");
    await settled(page, 1);
    await page.getByRole("radio", { name: "Same as image" }).click();
    await page.getByRole("radio", { name: "None" }).click();
    await make(page);
    const info = await pdfInfo((await download(page, downloadButton(page))).bytes);
    // Stored 2400 x 1800, flagged "turn a quarter": the page must be upright, 1800 x 2400.
    expect([info.widths[0], info.heights[0]]).toEqual([1800, 2400]);
  });

  test("F05-E2 a turn chosen on the tile swaps the page's sides", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "photo.jpg");
    await settled(page, 1);
    await page.getByRole("button", { name: "Rotate photo.jpg" }).click();
    await page.getByRole("radio", { name: "Same as image" }).click();
    await page.getByRole("radio", { name: "None" }).click();
    await make(page);
    const info = await pdfInfo((await download(page, downloadButton(page))).bytes);
    expect([info.widths[0], info.heights[0]]).toEqual([1800, 2400]);
  });

  test("F05-N1 a PDF or text file is not an image", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "alpha.pdf", "notes.txt");
    await expect(notice(page)).toContainText("2 files were skipped. This tool takes JPG, PNG and WebP images");
  });

  test("F05-N2 a file that only claims to be an image is named", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await page.locator("input[type=file]").first().setInputFiles({ name: "fake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really a jpeg") });
    await settled(page, 1);
    await make(page);
    await expect(notice(page)).toContainText("could not be read as a picture");
  });

  test("F05-H3 every page of a PDF becomes a JPG, in a zip", async ({ page }) => {
    await open(page, "pdf-to-jpg");
    await add(page, "bravo.pdf");
    await settled(page, 1);
    await page.getByRole("button", { name: "Make images" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Your 3 images are ready" })).toBeVisible();
    const zip = await download(page, page.getByRole("button", { name: "Download all (zip)" }));
    const entries = unzip(zip.bytes);
    expect(Object.keys(entries).sort()).toEqual(["bravo-page-1.jpg", "bravo-page-2.jpg", "bravo-page-3.jpg"]);
    for (const bytes of Object.values(entries)) expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]); // JPEG signature
  });

  test("F05-A1 accessibility: image workspace @phone", async ({ page }) => {
    await open(page, "jpg-to-pdf");
    await add(page, "small.png");
    await settled(page, 1);
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
