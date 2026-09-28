import { expect } from '@playwright/test';
import { failOnBrowserErrors } from '@backstage/e2e-test-utils/playwright';
import { test } from './fixtures';

// Fail on uncaught exceptions and console errors in the browser.
failOnBrowserErrors();

// The languages enabled in app-config/app-config.nfs.yaml, with the names the
// language selection shows for them.
const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];

test.describe('Settings', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
    await backstagePage.openSidebarItem('Settings');
  });

  test('opens Settings from the sidebar', async ({ backstagePage }) => {
    await backstagePage.takeScreenshot('settings');
  });

  test('offers all configured languages', async ({ page, backstagePage }) => {
    const languageSetting = page
      .getByRole('listitem')
      .filter({ has: page.getByText('Change the language') });
    const languageSelection = languageSetting.getByRole('button');
    await expect(languageSelection).toHaveText(languages[0].name);

    await languageSelection.click();
    await expect(page.getByRole('option')).toHaveText(
      languages.map(language => language.name),
    );
    await backstagePage.takeScreenshot('settings-language');
  });

  for (const name of ['Authentication Providers', 'Feature Flags']) {
    test(`opens the ${name} tab`, async ({ backstagePage }) => {
      await backstagePage.openPageTab(name);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await backstagePage.takeScreenshot(`settings-${slug}`);
    });
  }
});
