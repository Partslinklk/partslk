import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Browser smoke tests. They drive your installed Google Chrome (no browser download needed) against a running
 * app: `npm run dev` is started if nothing is listening yet. The checkout test places a real bank-transfer order
 * in whichever database that app uses and removes it again afterwards.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, channel: "chrome", headless: true, trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
