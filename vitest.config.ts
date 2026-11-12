import { defineConfig } from "vitest/config";

// Unit tests live next to the code in lib/. The e2e folder belongs to Playwright.
export default defineConfig({ test: { include: ["lib/**/*.test.ts"] } });
