import { test } from './fixtures';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to Docs', async ({ backstagePage }) => {
  await backstagePage.openSidebarItem('Docs');
  await backstagePage.takeScreenshot('docs');
});
