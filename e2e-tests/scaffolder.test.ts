import { expect } from '@playwright/test';
import { test } from './fixtures';

test.beforeEach(async ({ backstagePage }) => {
  await backstagePage.loginAsGuest();
});

test('navigates to Create and chooses the Example Node.js Template', async ({
  page,
  backstagePage,
}) => {
  // The sidebar item is called "Create..." in older versions.
  await backstagePage.clickSidebarItem(/^\s*create(\.\.\.)?\s*$/i);
  await backstagePage.takeScreenshot('create');

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

test('navigates to the tabs of Create', async ({ page, backstagePage }) => {
  // In the old frontend system, the Create page has no tabs; these pages are
  // in the menu of its header instead.
  test.skip(
    backstagePage.isVersionBetween('1.0', '1.48'),
    'The Create page has no tabs in the old frontend system',
  );

  await backstagePage.clickSidebarItem(/^\s*create(\.\.\.)?\s*$/i);
  for (const name of [
    'Tasks',
    'Actions',
    'Template Editor',
    'Templating Extensions',
  ]) {
    await test.step(`open the ${name} tab`, async () => {
      const tab = backstagePage.pageTab(name);
      const href = await tab.getAttribute('href');
      await tab.click();
      await expect(page).toHaveURL(url => url.pathname === href);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await backstagePage.takeScreenshot(`create-${slug}`);
    });
  }
});
