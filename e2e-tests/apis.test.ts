import { expect } from '@playwright/test';
import { test } from './fixtures';

test.describe('APIs', () => {
  test.beforeEach(async ({ backstagePage }) => {
    await backstagePage.loginAsGuest();
    await backstagePage.openSidebarItem('APIs');
  });

  test('opens APIs from the sidebar', async ({ backstagePage }) => {
    await backstagePage.takeScreenshot('apis');
  });

  test.describe('example-grpc-api entity', () => {
    test.beforeEach(async ({ page }) => {
      await page
        .getByRole('link', { name: 'example-grpc-api', exact: true })
        .click();
      // Some versions render the favorite button inside the heading.
      await expect(
        page.getByRole('heading', { name: 'example-grpc-api' }).first(),
      ).toBeVisible();
    });

    test('opens the entity', async ({ backstagePage }) => {
      await backstagePage.takeScreenshot('apis-entity');
    });

    test('opens the Definition tab', async ({ backstagePage }) => {
      await backstagePage.openPageTabInGroup('Documentation', 'Definition');
      await expect(backstagePage.tab('gRPC')).toBeVisible();
      await backstagePage.takeScreenshot('apis-entity-definition');
    });

    test('opens the TechDocs tab', async ({ backstagePage }) => {
      test.skip(
        backstagePage.isVersionBetween('1.0', '1.48'),
        'The old frontend system has no TechDocs tab on API entity pages',
      );
      await backstagePage.openPageTabInGroup('Documentation', 'TechDocs');
      await backstagePage.takeScreenshot('apis-entity-techdocs');
    });
  });
});
