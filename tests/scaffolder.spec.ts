import { expect, test } from './utils';

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
