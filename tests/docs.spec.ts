import { clickSidebarItem, loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to Docs', async ({ page }, testInfo) => {
  await clickSidebarItem(page, 'Docs');
  await takeScreenshot(page, testInfo, 'docs');
});
