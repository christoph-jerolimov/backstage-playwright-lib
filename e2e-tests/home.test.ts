import { test } from './fixtures';

test.describe('Home', () => {
  test.skip(
    ({ backstagePage }) => backstagePage.isVersionBetween('1.49', '1.53'),
    'The sidebar has no Home item in Backstage 1.49 to 1.53',
  );

  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
  });

  test('opens Home from the sidebar', async ({ page, backstagePage }) => {
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

    await backstagePage.openSidebarItem('Home');
    await backstagePage.takeScreenshot('home');
  });
});
