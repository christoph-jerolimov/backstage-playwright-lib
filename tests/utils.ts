import {
  expect,
  test as base,
  type Page,
  type Request,
  type TestInfo,
} from '@playwright/test';

const inflightRequests = new WeakMap<Page, Set<Request>>();

/**
 * The Playwright `test` function, extended to track the requests of each
 * page. Backstage is a single-page app, so `waitForLoadState('networkidle')`
 * doesn't wait for requests that are started after clicking a link.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const requests = new Set<Request>();
    inflightRequests.set(page, requests);
    page.on('request', request => {
      // Long-lived connections never finish.
      if (!['eventsource', 'websocket'].includes(request.resourceType())) {
        requests.add(request);
      }
    });
    page.on('requestfinished', request => requests.delete(request));
    page.on('requestfailed', request => requests.delete(request));
    await use(page);
  },
});

export { expect };

/** Waits until no request was in flight for `quietMs` (best effort). */
async function waitForNetworkQuiet(page: Page, quietMs = 500, timeout = 15_000) {
  const requests = inflightRequests.get(page);
  if (!requests) {
    return;
  }
  const deadline = Date.now() + timeout;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if (requests.size > 0) {
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return;
    }
    await page.waitForTimeout(100);
  }
}

/** Waits until the page has loaded its data and finished rendering. */
export async function waitForPageToSettle(page: Page) {
  await page.waitForLoadState('networkidle');
  await waitForNetworkQuiet(page);
  await expect(
    page.getByRole('progressbar').filter({ visible: true }),
  ).toHaveCount(0);
  // Wait for finite animations, e.g. fade-ins; spinners run forever.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
        .map(a => a.finished.catch(() => undefined)),
    ),
  );
}

/** The Backstage version under test, e.g. `1.55.0` or `main`. */
export const backstageVersion = process.env.BACKSTAGE_VERSION ?? 'local';

// Used in screenshot file names.
const fileVersion = backstageVersion.replace(/[^a-zA-Z0-9._-]/g, '-');

/**
 * Returns true if the Backstage version under test is a release between
 * `from` and `to` (both inclusive, compared by major and minor version),
 * e.g. `isVersionBetween('1.49', '1.53')`. Branches like `main` are never
 * in range.
 */
export function isVersionBetween(from: string, to: string): boolean {
  const parse = (v: string) => {
    const match = /^(\d+)\.(\d+)/.exec(v);
    return match ? Number(match[1]) * 1000 + Number(match[2]) : undefined;
  };
  const version = parse(backstageVersion);
  if (version === undefined) {
    return false;
  }
  return parse(from)! <= version && version <= parse(to)!;
}

export async function takeScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await waitForPageToSettle(page);
  const screenshot = await page.screenshot({
    path: `screenshots/${name}-${fileVersion}.png`,
    fullPage: true,
  });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}

export function sidebar(page: Page) {
  return page.getByRole('navigation', { name: 'sidebar nav' });
}

/** Logs in as guest on the sign-in page. */
export async function loginAsGuest(page: Page) {
  await test.step('login as guest', async () => {
    await page.goto('/');
    const enterButton = page.getByRole('button', { name: 'Enter' });
    await enterButton.click();
    await expect(enterButton).toBeHidden();
    await expect(sidebar(page).getByRole('link').first()).toBeVisible();
  });
}

/**
 * Clicks the sidebar item with the given text and waits until its page is
 * shown. The Backstage logo is also a link named "Home", but without text.
 */
export async function clickSidebarItem(page: Page, name: string) {
  const link = sidebar(page)
    .getByRole('link', { name, exact: true })
    .filter({ hasText: name })
    // Backstage 1.50 to 1.52 show the Notifications item twice.
    .first();
  const href = await link.getAttribute('href');
  await link.click();
  // Some pages redirect to a sub page, e.g. /settings to /settings/general.
  await expect(page).toHaveURL(
    url =>
      url.pathname === href ||
      url.pathname.startsWith(`${href?.replace(/\/$/, '')}/`),
  );
  await expect(
    page.getByRole('heading').filter({ visible: true }).first(),
  ).toBeVisible();
}
