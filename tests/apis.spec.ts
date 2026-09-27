import { expect } from '@playwright/test';
import { test } from './fixtures';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to APIs and opens the example-grpc-api entity', async ({
  page,
  backstagePage,
}) => {
  await backstagePage.clickSidebarItem('APIs');
  await backstagePage.takeScreenshot('apis');

  await page
    .getByRole('link', { name: 'example-grpc-api', exact: true })
    .click();
  // Some versions render the favorite button inside the heading.
  await expect(
    page.getByRole('heading', { name: 'example-grpc-api' }).first(),
  ).toBeVisible();
  await backstagePage.takeScreenshot('apis-entity');

  // The old frontend system shows the definition as a tab of the entity page.
  // The new frontend system groups the Definition and TechDocs tabs in a
  // Documentation tab: an MUI tab that shows the tabs below it (up to 1.53),
  // or a Backstage UI menu (since 1.54).
  const isOldFrontendSystem = backstagePage.isVersionBetween('1.0', '1.48');
  const documentationTabs = isOldFrontendSystem
    ? ['Definition']
    : ['Definition', 'TechDocs'];
  for (const name of documentationTabs) {
    await test.step(`open the ${name} tab`, async () => {
      if (isOldFrontendSystem) {
        await backstagePage.pageTab(name).click();
      } else {
        await page
          .getByRole('tab', { name: 'Documentation', exact: true })
          .or(page.getByRole('button', { name: 'Documentation', exact: true }))
          .click();
        await page
          .getByRole('menuitemradio', { name, exact: true })
          .or(
            page
              .getByRole('navigation')
              .getByRole('button', { name, exact: true }),
          )
          .click();
      }
      if (name === 'Definition') {
        await expect(backstagePage.tab('gRPC')).toBeVisible();
      }
      await backstagePage.takeScreenshot(`apis-entity-${name.toLowerCase()}`);
    });
  }
});
