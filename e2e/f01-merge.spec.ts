import { existsSync } from "node:fs";
import { REAL_PDF, a11y, add, download, downloadButton, drop, expect, named, notice, open, pdfInfo, settled, test, tile, tiles } from "./helpers";

test.describe("F01 merge several PDFs into one", () => {
  test("F01-H1 pick a tool, add two files, merge, download @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Merge" }).first().click();                     // click 1
    await expect(page.getByRole("heading", { name: "Merge PDFs" })).toBeVisible();
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");                                           // click 2 (file picker)
    await settled(page, 2);
    await expect(tile(page, "alpha.pdf")).toContainText("2 pages");
    await page.getByRole("button", { name: "Merge files" }).first().click();             // click 3
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeFocused();
    const file = await download(page, downloadButton(page));                             // click 4
    expect(file.name).toBe("merged.pdf");
    // alpha is 420 wide (2 pages), bravo is 595 wide (3 pages)
    expect((await pdfInfo(file.bytes)).widths).toEqual([420, 420, 595, 595, 595]);
  });

  test("F01-H2 files dropped onto the page are added", async ({ page }) => {
    await open(page, "merge");
    await drop(page, page.getByRole("heading", { name: "Merge PDFs" }), "alpha.pdf");
    await settled(page, 1);
    await drop(page, page.locator("main"), "bravo.pdf", "notes.txt");
    await settled(page, 2);
    await expect(notice(page)).toContainText("One file was skipped");
  });

  test("F01-E1 order: sort, drag, and keyboard all change the result", async ({ page }) => {
    await open(page, "merge");
    await add(page, "bravo.pdf", "alpha.pdf", "charlie-10.pdf");
    await settled(page, 3);
    await page.getByRole("button", { name: "A to Z" }).click();
    await expect(tiles(page)).toContainText(["alpha.pdf", "bravo.pdf", "charlie-10.pdf"]);
    await page.getByRole("button", { name: "Z to A" }).click();
    await expect(tiles(page)).toContainText(["charlie-10.pdf", "bravo.pdf", "alpha.pdf"]);
    // Keyboard: pick up the first file and move it one place right.
    await page.getByRole("button", { name: /^Move charlie-10.pdf/ }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("charlie-10.pdf");
    await page.waitForTimeout(200); // a person takes at least this long between picking up and moving
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("position 2 of 3");
    await page.keyboard.press("Space");
    await expect(tiles(page)).toContainText(["bravo.pdf", "charlie-10.pdf", "alpha.pdf"]);
    // Mouse: drag the last file to the front.
    await tiles(page).last().dragTo(tiles(page).first(), { steps: 10 });
    await page.waitForTimeout(150); // the drag library ignores clicks for 50 ms after a drop
    await expect(tiles(page)).toContainText(["alpha.pdf", "bravo.pdf", "charlie-10.pdf"]);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    const file = await download(page, downloadButton(page));
    expect((await pdfInfo(file.bytes)).widths).toEqual([420, 420, 595, 595, 595, 420]);
  });

  test("F01-E2 a turned file comes out turned, a removed file is left out", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf", "charlie-10.pdf");
    await settled(page, 3);
    await page.getByRole("button", { name: "Rotate alpha.pdf" }).click();
    await page.getByRole("button", { name: "Remove bravo.pdf" }).click();
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    const info = await pdfInfo((await download(page, downloadButton(page))).bytes);
    expect(info.rotations).toEqual([90, 90, 0]);
  });

  test("F01-E3 the same file twice is merged twice", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await add(page, "alpha.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(4);
  });

  test("F01-E4 double click on Merge makes one result", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).first().dblclick();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
    await expect(downloadButton(page)).toHaveCount(1);
  });

  test("F01-E5 a file with a long name, accents and emoji keeps its place and does not break the layout", async ({ page }) => {
    await open(page, "merge");
    const long = "Relevé de compte – août 2026 – très très long nom de fichier 📄 final (2).pdf";
    await page.locator("input[type=file]").first().setInputFiles([named(long, "alpha.pdf"), named("b.pdf", "bravo.pdf")]);
    await settled(page, 2);
    await expect(tile(page, "Relevé")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
  });

  test("F01-E6 refresh on the result screen asks before throwing the file away, and starts clean", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
    let asked = false;
    page.once("dialog", (d) => { asked = d.type() === "beforeunload"; void d.accept(); });
    await page.reload();
    expect(asked).toBe(true);
    await expect(page.getByRole("button", { name: "Choose PDF files" })).toBeVisible();
  });

  test("F01-E7 start over clears everything", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByRole("button", { name: "Choose PDF files" })).toBeVisible();
    await expect(tiles(page)).toHaveCount(0);
  });

  test("F01-N1 one file is not enough", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(notice(page)).toContainText("Add at least two files");
  });

  test("F01-N2 a damaged file is named and blocks the merge until removed", async ({ page }) => {
    await open(page, "merge");
    await add(page, "alpha.pdf", "broken.pdf", "bravo.pdf");
    await settled(page, 3);
    await expect(tile(page, "broken.pdf")).toContainText("Could not open this file");
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(notice(page)).toContainText("broken.pdf is damaged");
    await page.getByRole("button", { name: "Remove broken.pdf" }).click();
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
  });

  test("F01-N3 a wrong file type is skipped with a message", async ({ page }) => {
    await open(page, "merge");
    await add(page, "notes.txt");
    await expect(notice(page)).toContainText("This tool takes PDF files");
    await expect(tiles(page)).toHaveCount(0);
  });

  test("F01-R1 a real PDF from this Mac merges with a generated one", async ({ page }) => {
    test.skip(!existsSync(REAL_PDF), "no system PDF on this machine");
    await open(page, "merge");
    await add(page, REAL_PDF, "alpha.pdf");
    await settled(page, 2);
    const pages = Number((await tile(page, "License.pdf").innerText()).match(/(\d+) pages?/)![1]);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    const info = await pdfInfo((await download(page, downloadButton(page))).bytes);
    expect(info.pages).toBe(pages + 2);
  });

  test("F01-A1 accessibility: landing, workspace and result @phone", async ({ page }) => {
    await open(page, "merge");
    await a11y(page);
    await add(page, "alpha.pdf", "bravo.pdf");
    await settled(page, 2);
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
    await a11y(page);
  });
});
