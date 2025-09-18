import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.CI
  ? 'https://coderrvrse.github.io/fc-barcelona-kids/'
  : 'http://localhost:8080/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 2,             // flaky-protection
  reporter: [['list']],
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1, // avoid HiDPI diff churn
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'UTC',
    ignoreHTTPSErrors: true,
    // Prefer reduced motion for stable snapshots:
    launchOptions: {
      args: ['--force-prefers-reduced-motion']
    }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } }
  ],
  // If the site is static, a small per-test timeout is enough:
  timeout: 30_000
});