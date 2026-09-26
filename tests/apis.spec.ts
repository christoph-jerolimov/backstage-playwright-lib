import { expect, loginAsGuest, takeScreenshot, test } from './utils';

test.beforeEach(async ({ page }) => {
  await loginAsGuest(page);
});

test('navigates to APIs and opens the example-grpc-api entity', async ({
  page,
  backstagePage,
}, testInfo) => {
  await backstagePage.clickSidebarItem('APIs');
  await takeScreenshot(page, testInfo, 'apis');

  await page
    .getByRole('link', { name: 'example-grpc-api', exact: true })
    .click();
  // Some versions render the favorite button inside the heading.
  await expect(
    page.getByRole('heading', { name: 'example-grpc-api' }).first(),
  ).toBeVisible();
  await takeScreenshot(page, testInfo, 'apis-entity');
});
