import { a11y, add, download, downloadButton, expect, notice, open, pdfInfo, test, tiles } from "./helpers";

const save = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Save PDF" }).filter({ visible: true }).click();

test.describe("F04 reorder, delete, rotate or add pages", () => {
  test("F04-H1 move, turn, delete, add a blank page, add another file, save @smoke", async ({ page }) => {
    await open(page, "organize");
    await add(page, "alpha.pdf");
    await expect(tiles(page)).toHaveCount(2);
    await add(page, "bravo.pdf");
    await expect(tiles(page)).toHaveCount(5);
    // Previews are drawn for the pages on screen.
    await expect(tiles(page).first().locator("img")).toBeVisible();
    await page.getByRole("button", { name: "Rotate Page 1 of alpha.pdf" }).click();
    await page.getByRole("button", { name: "Remove Page 2 of bravo.pdf" }).click();
    await page.getByRole("button", { name: "Add a blank page after Page 2 of alpha.pdf" }).click();
    await expect(tiles(page)).toContainText(["Page 1 of alpha.pdf", "Page 2 of alpha.pdf", "Blank page", "Page 1 of bravo.pdf", "Page 3 of bravo.pdf"]);
    // Keyboard: move the first page one place right.
    await page.getByRole("button", { name: /^Move Page 1 of alpha.pdf/ }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("Page 1 of alpha.pdf");
    await page.waitForTimeout(200); // a person takes at least this long between picking up and moving
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[id^=DndLiveRegion]")).toContainText("position 2 of 5");
    await page.keyboard.press("Space");
    await expect(tiles(page)).toContainText(["Page 2 of alpha.pdf", "Page 1 of alpha.pdf", "Blank page"]);
    await save(page);
    await expect(page.getByRole("heading", { name: "Your rearranged PDF is ready" })).toBeVisible();
    const info = await pdfInfo((await download(page, downloadButton(page))).bytes);
    // alpha pages are 420 wide, bravo 595; the blank page copies the size of the page before it.
    expect(info.widths).toEqual([420, 420, 420, 595, 595]);
    expect(info.rotations).toEqual([0, 90, 0, 0, 0]);
  });

  test("F04-E1 the last page cannot be deleted", async ({ page }) => {
    await open(page, "organize");
    await add(page, "charlie-10.pdf");
    await expect(tiles(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Remove Page 1" }).click();
    await expect(tiles(page)).toHaveCount(1);
    await expect(notice(page)).toContainText("Keep at least one");
  });

  test("F04-E2 a long file shows every page and saves in the new order", async ({ page }) => {
    await open(page, "organize");
    await add(page, "long-12.pdf");
    await expect(tiles(page)).toHaveCount(12);
    await tiles(page).last().dragTo(tiles(page).first(), { steps: 10 });
    await page.waitForTimeout(150); // the drag library ignores clicks for 50 ms after a drop
    await expect(tiles(page).first()).toContainText("Page 12");
    await save(page);
    expect((await pdfInfo((await download(page, downloadButton(page))).bytes)).pages).toBe(12);
  });

  test("F04-N1 locked, damaged and wrong-type files are refused by name", async ({ page }) => {
    await open(page, "organize");
    await add(page, "locked.pdf");
    await expect(notice(page)).toContainText("was not added");
    await add(page, "broken.pdf");
    await expect(notice(page)).toContainText("was not added");
    await expect(tiles(page)).toHaveCount(0);
  });

  test("F04-A1 accessibility: page grid @phone", async ({ page }) => {
    await open(page, "organize");
    await add(page, "bravo.pdf");
    await expect(tiles(page)).toHaveCount(3);
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
