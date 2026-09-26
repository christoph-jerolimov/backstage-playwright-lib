import { clickSidebarItem, loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to Create', async ({ page }, testInfo) => {
  // The sidebar item is called "Create..." in older versions.
  await clickSidebarItem(page, /^\s*create(\.\.\.)?\s*$/i);
  await takeScreenshot(page, testInfo, 'create');
});
