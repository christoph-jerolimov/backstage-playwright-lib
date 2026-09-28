import { expect } from '@playwright/test';
import { test } from './fixtures';

test.describe('Login', () => {
  test('shows the login page', async ({ page, backstagePage }) => {
    const response = await page.goto('/');

    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/.+/);
    await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible();
    await backstagePage.takeScreenshot('login-page');
  });

  test('logs in as guest and shows the catalog', async ({
    page,
    backstagePage,
  }) => {
    await page.goto('/');
    const enterButton = page.getByRole('button', { name: 'Enter' });
    await enterButton.click();

    await expect(enterButton).toBeHidden();
    await expect(
      backstagePage.sidebar().getByRole('link').first(),
    ).toBeVisible();
    // The guest lands on the catalog page after logging in.
    await expect(
      page.getByRole('heading', { name: 'My Company Catalog' }),
    ).toBeVisible();
    await backstagePage.takeScreenshot('after-login');
  });
});
