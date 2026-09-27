import { test } from './utils';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to Docs', async ({ backstagePage }) => {
  await backstagePage.clickSidebarItem('Docs');
  await backstagePage.takeScreenshot('docs');
});
