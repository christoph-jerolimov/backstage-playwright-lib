import { test, expect, type Page, type TestInfo } from '@playwright/test';

// Identifies the Backstage version under test, e.g. `1.55.0` or `main`.
const version = (process.env.BACKSTAGE_VERSION ?? 'local').replace(
  /[^a-zA-Z0-9._-]/g,
  '-',
);

async function takeScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.waitForLoadState('networkidle');
  const screenshot = await page.screenshot({
    path: `screenshots/${name}-${version}.png`,
    fullPage: true,
  });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

test('opens the initial page and logs in as guest', async ({ page }, testInfo) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
  await takeScreenshot(page, testInfo, 'initial-page');

  const enterButton = page.getByRole('button', { name: 'Enter' });
  await expect(enterButton).toBeVisible();
  await enterButton.click();

  await expect(enterButton).toBeHidden();
  const nav = page.getByRole('navigation', { name: 'sidebar nav' });
  await expect(nav.getByRole('link').first()).toBeVisible();
  // The guest lands on the catalog page after logging in.
  await expect(
    page.getByRole('heading', { name: 'My Company Catalog' }),
  ).toBeVisible();
  await takeScreenshot(page, testInfo, 'after-login');
});
