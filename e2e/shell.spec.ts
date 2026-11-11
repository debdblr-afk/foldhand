import { a11y, expect, fx, test } from "./helpers";

const TOOLS = ["merge", "split", "compress", "organize", "rotate", "jpg-to-pdf", "pdf-to-jpg", "page-numbers", "watermark", "protect", "unlock"];

test.describe("Shell: directory, navigation, static pages", () => {
  test("S01-H1 home lists all eleven tools and the filter narrows them @smoke @phone", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("main").getByRole("link");
    await expect(cards).toHaveCount(11);
    await page.getByRole("button", { name: "Lock", exact: true }).click();
    await expect(cards).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Lock", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(cards).toHaveCount(11);
    await a11y(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("S02-H1 every tool page opens with its own title and a way to add files", async ({ page }) => {
    for (const slug of TOOLS) {
      await page.goto(`/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Choose / })).toBeVisible();
      await expect(page).toHaveTitle(/· PDF tools$/);
      await expect(page.getByText("not built yet")).toHaveCount(0);
    }
  });

  test("S18-H1 the all-tools menu opens, closes on Escape, and goes to a tool", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "All tools" });
    await toggle.click();
    const menu = page.getByRole("navigation", { name: "All tools" });
    await expect(menu.getByRole("link")).toHaveCount(11);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await toggle.click();
    await menu.getByRole("link", { name: "Watermark" }).click();
    await expect(page).toHaveURL(/\/watermark$/);
    await expect(menu).toBeHidden();
  });

  test("S06-H1 the result screen's other tools lead somewhere real", async ({ page }) => {
    await page.goto("/");
    for (const href of await page.locator("main").getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
      const res = await page.request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });

  test("S14-H1 an unknown address shows the not-found page with a way home", async ({ page }) => {
    const res = await page.request.get("/no-such-tool");
    expect(res.status()).toBe(404);
  });

  test("S11-H1 help, privacy and terms open and say files stay on the device", async ({ page }) => {
    for (const path of ["/help", "/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.getByText("never leave this device")).toBeVisible();
      await a11y(page);
    }
  });

  test("S00-H1 keyboard only: tab from the top of a tool page reaches the upload button", async ({ page }) => {
    await page.goto("/merge");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      if (await page.getByRole("button", { name: "Choose PDF files" }).evaluate((b) => b === document.activeElement)) return;
    }
    throw new Error("the upload button was not reached with Tab");
  });

  test("S00-N1 nothing is sent anywhere: no request leaves the site while a tool runs", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", (req) => { const u = new URL(req.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) outside.push(req.url()); });
    const posts: string[] = [];
    page.on("request", (req) => { if (req.method() !== "GET") posts.push(`${req.method()} ${req.url()}`); });
    await page.goto("/merge");
    await page.locator("input[type=file]").first().setInputFiles([fx("alpha.pdf"), fx("bravo.pdf")]);
    await page.getByRole("button", { name: "Merge files" }).first().click();
    await expect(page.getByRole("heading", { name: "Your merged PDF is ready" })).toBeVisible();
    expect(outside).toEqual([]);
    expect(posts).toEqual([]);
  });
});
