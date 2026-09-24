import {
  clickSidebarItem,
  expect,
  isVersionBetween,
  loginAsGuest,
  takeScreenshot,
  test,
} from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to Home', async ({ page }, testInfo) => {
  test.skip(
    isVersionBetween('1.49', '1.53'),
    'The sidebar has no Home item in Backstage 1.49 to 1.53',
  );

  // The home page shows a random joke from an external API. Return a fixed
  // joke so that the test doesn't depend on that API and the screenshot is
  // stable.
  await page.route('https://official-joke-api.appspot.com/**', route =>
    route.fulfill({
      json: {
        type: 'programming',
        setup: 'Why do programmers prefer dark mode?',
        punchline: 'Because light attracts bugs.',
      },
    }),
  );

  await clickSidebarItem(page, 'Home');
  await takeScreenshot(page, testInfo, 'home');
});

const items = [
  {
    name: 'Catalog',
    screenshot: 'catalog',
    // Before the new frontend system, the sidebar item for the catalog was
    // called Home.
    skip: isVersionBetween('1.0', '1.48'),
  },
  { name: 'APIs', screenshot: 'apis' },
  { name: 'Docs', screenshot: 'docs' },
  { name: 'Notifications', screenshot: 'notifications' },
];

for (const { name, screenshot, skip } of items) {
  test(`navigates to ${name}`, async ({ page }, testInfo) => {
    test.skip(!!skip, `The sidebar has no ${name} item in this version`);

    await clickSidebarItem(page, name);
    await takeScreenshot(page, testInfo, screenshot);
  });
}

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
