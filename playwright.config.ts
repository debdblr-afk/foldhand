import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the local dev server. Nothing else is needed: the app has no backend.
// To test the static production build instead: npm run build:check, serve .next-build on a port,
// then PW_BASE_URL=http://localhost:<port> npm run e2e
const PORT = 5330;
const baseURL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  outputDir: "e2e/.results",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", acceptDownloads: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
    // Safari's engine. Run with: npx playwright test --project=safari
    { name: "safari", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } }, grep: /@smoke/ },
  ],
  webServer: process.env.PW_BASE_URL ? undefined : { command: `npm run dev -- --port ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
