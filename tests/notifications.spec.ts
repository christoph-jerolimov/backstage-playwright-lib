import { test } from './utils';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to Notifications', async ({ backstagePage }) => {
  // The notifications plugin is part of the app template since 1.42.
  test.skip(
    backstagePage.isVersionBetween('1.0', '1.41'),
    'The sidebar has no Notifications item in this version',
  );

  await backstagePage.clickSidebarItem('Notifications');
  await backstagePage.takeScreenshot('notifications');
});
