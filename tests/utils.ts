import { expect, test as base } from '@playwright/test';
import { BackstagePage } from './backstage-page';

/**
 * The Playwright `test` function with a `backstagePage` fixture, the page
 * object for the areas of a Backstage page.
 */
export const test = base.extend<{ backstagePage: BackstagePage }>({
  backstagePage: async ({ page }, use) => {
    await use(new BackstagePage(page));
  },
});

export { expect };
