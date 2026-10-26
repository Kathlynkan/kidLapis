import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests (required by the project brief).
 * `pnpm test:e2e` starts BOTH the API server and the Vue dev server for you.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: false, // tests share one JSON database, so run them one by one
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 0,
    trace: 'on-first-retry',
    headless: true, // run `pnpm test:e2e --ui` or `--headed` to watch the browser
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Responsive check (graders test from iPhone 6 size up to Bootstrap XL)
    { name: 'mobile', use: { ...devices['iPhone 6'], defaultBrowserType: 'chromium' } },
  ],

  webServer: [
    {
      // reset demo data, then start the API
      command: 'pnpm --dir ../server seed && pnpm --dir ../server start',
      url: 'http://localhost:8000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: process.env.CI ? 'pnpm preview --port 5173' : 'pnpm dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
