import { test } from './fixtures';

test.describe('Docs', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
  });

  test('opens Docs from the sidebar', async ({ backstagePage }) => {
    await backstagePage.openSidebarItem('Docs');
    await backstagePage.takeScreenshot('docs');
  });
});
