import { test, expect } from '@playwright/test';

// Identifies the Backstage version under test, e.g. `1.55.0` or `main`.
const version = (process.env.BACKSTAGE_VERSION ?? 'local').replace(
  /[^a-zA-Z0-9._-]/g,
  '-',
);

test('opens the initial page', async ({ page }, testInfo) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);

  await page.waitForLoadState('networkidle');
  const screenshot = await page.screenshot({
    path: `screenshots/initial-page-${version}.png`,
    fullPage: true,
  });
  await testInfo.attach('initial-page', {
    body: screenshot,
    contentType: 'image/png',
  });
});
