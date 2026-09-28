import { failOnBrowserErrors } from '@backstage/e2e-test-utils/playwright';
import { test } from './fixtures';

// Fail on uncaught exceptions and console errors in the browser.
failOnBrowserErrors();

test.describe('Docs', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
  });

  test('opens Docs from the sidebar', async ({ backstagePage }) => {
    await backstagePage.openSidebarItem('Docs');
    await backstagePage.takeScreenshot('docs');
  });
});
