import {
  clickSidebarItem,
  expect,
  loginAsGuest,
  takeScreenshot,
  test,
} from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

// The languages enabled in app-config/app-config.nfs.yaml, with the names the
// language selection shows for them.
const languages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];

test('navigates to Settings and shows the language selection', async ({
  page,
}, testInfo) => {
  await clickSidebarItem(page, 'Settings');
  await takeScreenshot(page, testInfo, 'settings');

  const languageSetting = page
    .getByRole('listitem')
    .filter({ has: page.getByText('Change the language') });
  const languageSelection = languageSetting.getByRole('button');
  await expect(languageSelection).toHaveText(languages[0].name);

  await languageSelection.click();
  await expect(page.getByRole('option')).toHaveText(
    languages.map(language => language.name),
  );
  await takeScreenshot(page, testInfo, 'settings-language');
});
