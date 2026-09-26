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

test('navigates to Catalog and opens the example-website entity', async ({
  page,
  backstagePage,
}, testInfo) => {
  // Before the new frontend system, the sidebar item for the catalog was
  // called Home.
  const catalogItem = isVersionBetween('1.0', '1.48') ? 'Home' : 'Catalog';
  await clickSidebarItem(page, catalogItem);
  await takeScreenshot(page, testInfo, 'catalog');

  await page.getByRole('link', { name: 'example-website', exact: true }).click();
  // Some versions render the favorite button inside the heading.
  await expect(
    page.getByRole('heading', { name: 'example-website' }).first(),
  ).toBeVisible();

  // The tabs of the entity page differ between versions, so take a
  // screenshot of each tab that is shown.
  const tabs = backstagePage.pageTabs();
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

test('navigates to Register Existing Component', async ({ page }, testInfo) => {
  // The catalog import plugin adds this sidebar item since 1.50. Before, the
  // app template had no such sidebar item.
  test.skip(
    isVersionBetween('1.0', '1.49'),
    'The sidebar has no Register Existing Component item in this version',
  );

  await clickSidebarItem(page, /^\s*register existing (component|entity)\s*$/i);
  await takeScreenshot(page, testInfo, 'register-existing-component');
});
