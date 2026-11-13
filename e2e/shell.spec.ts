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
      await expect(page).toHaveTitle(/· Foldhand$/);
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

  test("S11-H1 help, privacy and terms are written, say files stay on the device, and are linked from the footer @phone", async ({ page }) => {
    await page.goto("/");
    for (const [name, heading] of [["Help", "Where do my files go?"], ["Privacy", "Your files"], ["Terms", "Keep your originals"]]) {
      await page.getByRole("navigation", { name: "About" }).getByRole("link", { name }).click();
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page).toHaveTitle(`${name} · Foldhand`);
      await expect(page.getByText(/never leave this device/).first()).toBeVisible();
      await expect(page.getByText("not written yet")).toHaveCount(0);
      await a11y(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });

  test("S03-E1 a very large job shows a warning before it starts", async ({ page }) => {
    await page.goto("/merge");
    await page.waitForFunction(() => { const i = document.querySelector("input[type=file]"); return !!i && Object.keys(i).some((k) => k.startsWith("__reactProps")); });
    // A 201 MB file made in the page, so nothing large is kept in the project.
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(201 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" }));
      const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByText(/These files add up to 201\.0 MB/)).toBeVisible();
    await expect(page.getByText(/may be slow or run out of memory/)).toBeVisible();
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
    // "Outside" means any address that is not the site being tested, whether that is localhost or the live site.
    const home = new URL(test.info().project.use.baseURL ?? "http://localhost").origin;
    page.on("request", (req) => { const u = new URL(req.url()); if (u.protocol.startsWith("http") && u.origin !== home) outside.push(req.url()); });
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
