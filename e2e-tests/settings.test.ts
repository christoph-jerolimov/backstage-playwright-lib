import { expect } from '@playwright/test';
import { test } from './fixtures';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

// The languages enabled in app-config/app-config.nfs.yaml, with the names the
// language selection shows for them.
const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];

test('navigates to Settings and shows the language selection', async ({
  page,
  backstagePage,
}) => {
  await backstagePage.clickSidebarItem('Settings');
  await backstagePage.takeScreenshot('settings');

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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('option')).toHaveCount(0);

  for (const name of ['Authentication Providers', 'Feature Flags']) {
    await test.step(`open the ${name} tab`, async () => {
      const tab = backstagePage.pageTab(name);
      const href = await tab.getAttribute('href');
      await tab.click();
      await expect(page).toHaveURL(url => url.pathname === href);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await backstagePage.takeScreenshot(`settings-${slug}`);
    });
  }
});
