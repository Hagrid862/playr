import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./src",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["list"], ["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Isolate tests from system media player and mute audio */
    launchOptions: {
      args: ["--mute-audio"],
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "web",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.VITE_WEB_URL || "http://localhost:3000",
      },
      testMatch: /.*\/web\/.*\.spec\.ts/,
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.VITE_ADMIN_URL || "http://localhost:3002",
      },
      testMatch: /.*\/admin\/.*\.spec\.ts/,
    },
    {
      name: "artist",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.VITE_ARTIST_URL || "http://localhost:3001",
      },
      testMatch: /.*\/artist\/.*\.spec\.ts/,
    },
    {
      name: "api",
      use: {
        baseURL: process.env.VITE_API_URL || "http://localhost:8000",
      },
      testMatch: /.*\/api\/.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  /* Run your local dev server before starting the tests */
  // In CI, we use docker-compose to start the full architecture.
  // Locally, you can use `webServer` if needed, but for now we disable it to match CI strategy or require manual start.
  webServer: undefined,
});
