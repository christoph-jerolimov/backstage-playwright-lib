import { expect } from '@playwright/test';
import { failOnBrowserErrors } from '@backstage/e2e-test-utils/playwright';
import { test } from './fixtures';

// Fail on uncaught exceptions and console errors in the browser.
failOnBrowserErrors();

test.describe('Catalog', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
    // Before the new frontend system, the sidebar item for the catalog was
    // called Home.
    await backstagePage.openSidebarItem(
      backstagePage.isVersionBetween('1.0', '1.48') ? 'Home' : 'Catalog',
    );
  });

  test('opens the catalog from the sidebar', async ({ backstagePage }) => {
    await backstagePage.takeScreenshot('catalog');
  });

  test('shows each tab of the example-website entity', async ({
    page,
    backstagePage,
  }) => {
    await page
      .getByRole('link', { name: 'example-website', exact: true })
      .click();
    // Some versions render the favorite button inside the heading.
    await expect(
      page.getByRole('heading', { name: 'example-website' }).first(),
    ).toBeVisible();

    // The tabs of the entity page differ between versions, so take a
    // screenshot of each tab that is shown.
    const tabs = backstagePage.pageTabs();
    await expect(tabs.first()).toBeVisible();
    const names = await tabs.evaluateAll(elements =>
      elements.map(element => element.textContent?.trim() ?? ''),
    );
    for (const [index, name] of names.entries()) {
      await test.step(`open the ${name} tab`, async () => {
        await backstagePage.openPageTab(name);
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await backstagePage.takeScreenshot(
          `catalog-entity-${index + 1}-${slug}`,
        );
      });
    }
  });
});

test.describe('Register Existing Component', () => {
  // The catalog import plugin adds this sidebar item since 1.50. Before, the
  // app template had no such sidebar item.
  test.skip(
    ({ backstagePage }) => backstagePage.isVersionBetween('1.0', '1.49'),
    'The sidebar has no Register Existing Component item in this version',
  );

  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
  });

  test('opens Register Existing Component from the sidebar', async ({
    backstagePage,
  }) => {
    await backstagePage.openSidebarItem(
      /^\s*register existing (component|entity)\s*$/i,
    );
    await backstagePage.takeScreenshot('register-existing-component');
  });
});
