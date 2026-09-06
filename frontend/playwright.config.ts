import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright drives a local podman stack, not a deployed site.
 *
 * The suite used to target it2810-15.idi.ntnu.no and write to the shared
 * production database, so it needed the NTNU VPN, interfered with anyone else
 * running it, and leaked test users and comments whenever a run was aborted before
 * its cleanup step. `make test-e2e` now starts a disposable stack on its own ports
 * and removes its volume afterwards.
 *
 * https://playwright.dev/docs/test-configuration
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5273";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: "list",

  use: {
    baseURL,
    // Tests reach the API directly for setup and teardown.
    extraHTTPHeaders: { Accept: "application/json" },
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
