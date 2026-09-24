import { expect, sidebar, takeScreenshot, test } from './utils';

test('opens the login page and logs in as guest', async ({ page }, testInfo) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/.+/);
  await takeScreenshot(page, testInfo, 'login-page');

  const enterButton = page.getByRole('button', { name: 'Enter' });
  await expect(enterButton).toBeVisible();
  await enterButton.click();

  await expect(enterButton).toBeHidden();
  await expect(sidebar(page).getByRole('link').first()).toBeVisible();
  // The guest lands on the catalog page after logging in.
  await expect(
    page.getByRole('heading', { name: 'My Company Catalog' }),
  ).toBeVisible();
  await takeScreenshot(page, testInfo, 'after-login');
});
