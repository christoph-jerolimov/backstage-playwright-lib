import { expect } from '@playwright/test';
import { failOnBrowserErrors } from '@backstage/e2e-test-utils/playwright';
import { test } from './fixtures';

// Fail on uncaught exceptions and console errors in the browser.
failOnBrowserErrors();

test.describe('Create', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
    // The sidebar item is called "Create..." in older versions.
    await backstagePage.openSidebarItem(/^\s*create(\.\.\.)?\s*$/i);
  });

  test('opens Create from the sidebar', async ({ backstagePage }) => {
    await backstagePage.takeScreenshot('create');
  });

  test('chooses the Example Node.js Template', async ({
    page,
    backstagePage,
  }) => {
    const templateCard = backstagePage.card('Example Node.js Template');
    await expect(templateCard).toBeVisible();
    // Choose is a button in some versions and a link in others.
    await templateCard
      .getByRole('button', { name: 'Choose', exact: true })
      .or(templateCard.getByRole('link', { name: 'Choose', exact: true }))
      .click();
    await expect(page).toHaveURL(/\/templates\//);
    await backstagePage.takeScreenshot('create-template');
  });

  test.describe('tabs', () => {
    // In the old frontend system, the Create page has no tabs; these pages
    // are in the menu of its header instead.
    test.skip(
      ({ backstagePage }) => backstagePage.isVersionBetween('1.0', '1.48'),
      'The Create page has no tabs in the old frontend system',
    );

    for (const name of [
      'Tasks',
      'Actions',
      'Template Editor',
      'Templating Extensions',
    ]) {
      test(`opens the ${name} tab`, async ({ backstagePage }) => {
        await backstagePage.openPageTab(name);
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await backstagePage.takeScreenshot(`create-${slug}`);
      });
    }
  });
});
