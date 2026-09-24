import {
  clickSidebarItem,
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
  { name: 'Settings', screenshot: 'settings' },
];

for (const { name, screenshot, skip } of items) {
  test(`navigates to ${name}`, async ({ page }, testInfo) => {
    test.skip(!!skip, `The sidebar has no ${name} item in this version`);

    await clickSidebarItem(page, name);
    await takeScreenshot(page, testInfo, screenshot);
  });
}
