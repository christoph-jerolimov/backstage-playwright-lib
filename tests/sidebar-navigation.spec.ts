import {
  clickSidebarItem,
  entityPageTabs,
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

test('navigates to Catalog and opens the example-website entity', async ({
  page,
}, testInfo) => {
  test.skip(
    // Before the new frontend system, the sidebar item for the catalog was
    // called Home.
    isVersionBetween('1.0', '1.48'),
    'The sidebar has no Catalog item in this version',
  );

  await clickSidebarItem(page, 'Catalog');
  await takeScreenshot(page, testInfo, 'catalog');

  await page.getByRole('link', { name: 'example-website', exact: true }).click();
  // Some versions render the favorite button inside the heading.
  await expect(
    page.getByRole('heading', { name: 'example-website' }).first(),
  ).toBeVisible();

  // The tabs of the entity page differ between versions, so take a
  // screenshot of each tab that is shown.
  const tabs = entityPageTabs(page);
  await expect(tabs.first()).toBeVisible();
  const tabInfos = await tabs.evaluateAll(elements =>
    elements.map(element => ({
      name: element.textContent?.trim() ?? '',
      href: element.getAttribute('href'),
    })),
  );

  for (const [index, { name, href }] of tabInfos.entries()) {
    await test.step(`open the ${name} tab`, async () => {
      await tabs.nth(index).click();
      await expect(page).toHaveURL(url => url.pathname === href);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await takeScreenshot(
        page,
        testInfo,
        `catalog-entity-${index + 1}-${slug}`,
      );
    });
  }
});

const items = [
  { name: 'APIs', screenshot: 'apis' },
  { name: 'Docs', screenshot: 'docs' },
  { name: 'Notifications', screenshot: 'notifications' },
];

for (const { name, screenshot } of items) {
  test(`navigates to ${name}`, async ({ page }, testInfo) => {
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
