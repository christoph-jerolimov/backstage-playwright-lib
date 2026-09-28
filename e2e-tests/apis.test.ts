import { expect } from '@playwright/test';
import { test } from './fixtures';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to APIs and opens the example-grpc-api entity', async ({
  page,
  backstagePage,
}) => {
  await backstagePage.openSidebarItem('APIs');
  await backstagePage.takeScreenshot('apis');

  await page
    .getByRole('link', { name: 'example-grpc-api', exact: true })
    .click();
  // Some versions render the favorite button inside the heading.
  await expect(
    page.getByRole('heading', { name: 'example-grpc-api' }).first(),
  ).toBeVisible();
  await backstagePage.takeScreenshot('apis-entity');

  // The old frontend system has no TechDocs tab on API entity pages.
  const documentationTabs = backstagePage.isVersionBetween('1.0', '1.48')
    ? ['Definition']
    : ['Definition', 'TechDocs'];
  for (const name of documentationTabs) {
    await test.step(`open the ${name} tab`, async () => {
      await backstagePage.openPageTabInGroup('Documentation', name);
      if (name === 'Definition') {
        await expect(backstagePage.tab('gRPC')).toBeVisible();
      }
      await backstagePage.takeScreenshot(`apis-entity-${name.toLowerCase()}`);
    });
  }
});
