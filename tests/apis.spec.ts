import { clickSidebarItem, loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to APIs', async ({ page }, testInfo) => {
  await clickSidebarItem(page, 'APIs');
  await takeScreenshot(page, testInfo, 'apis');
});
