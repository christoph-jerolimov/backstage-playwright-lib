import { test, expect } from '@playwright/test';

test('opens the initial page', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
});
