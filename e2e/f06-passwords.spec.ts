import { a11y, add, download, downloadButton, expect, isLockedPdf, named, open, pdfInfo, settled, test, tile } from "./helpers";

const PASSWORD = "open-sesame"; // the password of fixtures/locked.pdf

test.describe("F06 protect or unlock a PDF", () => {
  test("F06-H1 lock a file; it then needs the password @smoke", async ({ page }) => {
    await open(page, "protect");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    await page.getByLabel("Password", { exact: true }).fill("test-pass-9");
    await page.getByLabel("Password again").fill("test-pass-9");
    await page.getByRole("button", { name: "Lock files" }).filter({ visible: true }).click();
    const file = await download(page, downloadButton(page));
    expect(file.name).toBe("alpha-locked.pdf");
    expect(await isLockedPdf(file.bytes)).toBe(true);
    expect((await pdfInfo(file.bytes, "test-pass-9")).pages).toBe(2);
    await expect(pdfInfo(file.bytes, "wrong")).rejects.toThrow();
  });

  test("F06-H2 unlock a file with its password", async ({ page }) => {
    await open(page, "unlock");
    await add(page, "locked.pdf", "alpha.pdf");
    const dialog = page.getByRole("dialog", { name: "This file is locked" });
    await expect(dialog).toContainText("locked.pdf");
    await expect(dialog.getByLabel("Password", { exact: true })).toBeFocused();
    await dialog.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await dialog.getByLabel("Password", { exact: true }).press("Enter");
    await expect(dialog).toBeHidden();
    await settled(page, 2);
    await expect(tile(page, "locked.pdf")).toContainText("1 page");
    await page.getByRole("button", { name: "Unlock files" }).filter({ visible: true }).click();
    await expect(page.getByText("This file was not locked")).toBeVisible();
    const file = await download(page, page.getByRole("link", { name: "Download locked-unlocked.pdf" }));
    expect(await isLockedPdf(file.bytes)).toBe(false);
    expect((await pdfInfo(file.bytes)).pages).toBe(1);
  });

  test("F06-N1 passwords must be typed and must match", async ({ page }) => {
    await open(page, "protect");
    await add(page, "alpha.pdf");
    await settled(page, 1);
    const lock = page.getByRole("button", { name: "Lock files" }).filter({ visible: true });
    await lock.click();
    await expect(page.getByText("Type a password.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("one");
    await page.getByLabel("Password again").fill("two");
    await lock.click();
    await expect(page.getByText("The two passwords do not match.")).toBeVisible();
    await expect(page.getByLabel("Password again")).toBeFocused();
  });

  test("F06-N2 wrong password, empty password, and 'Not now'", async ({ page }) => {
    await open(page, "unlock");
    await add(page, "locked.pdf");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Open file" }).click();
    await expect(dialog.getByText("Type the password for this file.")).toBeVisible();
    await dialog.getByLabel("Password", { exact: true }).fill("guess");
    await dialog.getByRole("button", { name: "Open file" }).click();
    await expect(dialog.getByText("That password did not open the file")).toBeVisible();
    await dialog.getByRole("button", { name: "Not now" }).click();
    await expect(dialog).toBeHidden();
    // The file stays locked, with a way back in; running the tool asks again rather than failing.
    await expect(tile(page, "locked.pdf").getByRole("button", { name: "Enter password" })).toBeVisible();
    await page.getByRole("button", { name: "Unlock files" }).filter({ visible: true }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("F06-E1 a locked file works in other tools once its password is given, and two locked files are asked for in turn", async ({ page }) => {
    await open(page, "merge");
    await page.locator("input[type=file]").first().setInputFiles([named("locked.pdf", "locked.pdf"), named("second-locked.pdf", "locked.pdf"), named("bravo.pdf", "bravo.pdf")]);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("locked.pdf");
    await dialog.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await dialog.getByRole("button", { name: "Open file" }).click();
    await expect(dialog).toContainText("second-locked.pdf");
    await expect(dialog.getByLabel("Password", { exact: true })).toHaveValue("");
    await dialog.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await dialog.getByRole("button", { name: "Open file" }).click();
    await expect(dialog).toBeHidden();
    await settled(page, 3);
    await page.getByRole("button", { name: "Merge files" }).filter({ visible: true }).click();
    const file = await download(page, downloadButton(page));
    expect(await isLockedPdf(file.bytes)).toBe(false);
    expect((await pdfInfo(file.bytes)).pages).toBe(5);
  });

  test("F06-A1 accessibility: the password prompt @phone", async ({ page }) => {
    await open(page, "unlock");
    await add(page, "locked.pdf");
    await expect(page.getByRole("dialog")).toBeVisible();
    await a11y(page);
  });
});
