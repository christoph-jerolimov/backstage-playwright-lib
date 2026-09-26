import { loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to Docs', async ({ page, backstagePage }, testInfo) => {
  await backstagePage.clickSidebarItem('Docs');
  await takeScreenshot(page, testInfo, 'docs');
});
