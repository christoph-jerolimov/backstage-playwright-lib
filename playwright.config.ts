import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  timeout: 60_000,
  expect: {
    timeout: 30_000,
  },
  forbidOnly: !!process.env.CI,
  // One test at a time: all tests use the same guest user, so a notification
  // sent by e2e-tests/notifications.test.ts would show up in the screenshots of
  // tests that run at the same time.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        // Read by the results site (site/scripts/prepare.mjs).
        ['json', { outputFile: 'test-results.json' }],
      ]
    : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
