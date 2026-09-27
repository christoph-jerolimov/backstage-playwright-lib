import { expect, test } from './utils';

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
});
