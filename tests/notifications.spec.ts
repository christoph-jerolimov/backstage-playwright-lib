import { isVersionBetween, loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to Notifications', async ({
  page,
  backstagePage,
}, testInfo) => {
  // The notifications plugin is part of the app template since 1.42.
  test.skip(
    isVersionBetween('1.0', '1.41'),
    'The sidebar has no Notifications item in this version',
  );

  await backstagePage.clickSidebarItem('Notifications');
  await takeScreenshot(page, testInfo, 'notifications');
});
