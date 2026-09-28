import {
  expect,
  test,
  type Locator,
  type Page,
  type Request,
} from '@playwright/test';

/** The Backstage version under test, e.g. `1.55.0` or `main`. */
export const backstageVersion = process.env.BACKSTAGE_VERSION ?? 'local';

// Used in screenshot file names.
const fileVersion = backstageVersion.replace(/[^a-zA-Z0-9._-]/g, '-');

/**
 * The layout of a Backstage page: the sidebar and the page content next to
 * it. The class names of Backstage components get a numeric suffix at
 * runtime, e.g. `BackstageSidebarPage-root-123`, so they are matched by
 * prefix.
 */
const sidebarPage = '[class*="BackstageSidebarPage-root"]';

/**
 * Headers of a page:
 * - `.bui-PluginHeader`: the plugin header of the new frontend system, with
 *   the plugin title and optional tabs (since 1.49).
 * - `header.BackstageHeader-header`: the page header of Backstage core
 *   components, used by the old frontend system and some plugins.
 * - `.bui-Header*`: the page header of Backstage UI, rendered as one element
 *   (1.49) or split into top, content and bottom parts (since 1.54).
 */
const headers = [
  '.bui-PluginHeader',
  'header[class*="BackstageHeader-header"]',
  '.bui-Header',
  '.bui-HeaderTop',
  '.bui-HeaderContent',
  '.bui-HeaderBottom',
];

/**
 * The tab bar of a page: tabs in the plugin header or below a core page
 * header, or the content navigation of a Backstage UI page header (e.g. the
 * tabs of an entity page since 1.54).
 */
const pageTabBar = [
  '.bui-PluginHeader [role="tablist"]',
  '[class*="BackstageHeaderTabs-tabsWrapper"] [role="tablist"]',
  'nav[aria-label="Content navigation"]',
].join(', ');

/** Everything below the headers and tabs of a page. */
const notAHeader = headers.map(header => `:not(${header})`).join('');
const tabContent = [
  `${sidebarPage} > article`,
  `${sidebarPage} > main > article`,
  `${sidebarPage} > .bui-Container${notAHeader}`,
  `${sidebarPage} > main > .bui-Container${notAHeader}`,
].join(', ');

/**
 * Dialogs: MUI dialogs (the dialog paper) and Backstage UI dialogs. Menus and
 * other popovers of Backstage UI also have the dialog role, and toasts in
 * the notification region the alertdialog role, so they are excluded.
 */
const dialogs = [
  '[role="dialog"]:not([class*="Popover"])',
  '[role="alertdialog"]:not([role="region"] *)',
].join(', ');

/**
 * Cards: MUI cards (also used by the InfoCard of Backstage core components)
 * and Backstage UI cards. Cards nested in other cards, e.g. filter groups,
 * are part of their outer card.
 */
const anyCard = ':is([class*="MuiCard-root"], .bui-Card)';
const cards = `${anyCard}:not(${anyCard} *)`;

/**
 * The title of a card: the title of an MUI card header (no heading element,
 * also used by InfoCard) or a heading.
 */
const cardTitle = '[class*="MuiCardHeader-title"], h1, h2, h3, h4, h5, h6';

/**
 * Tables: MUI tables and Backstage UI tables (role grid). Only tables with
 * column headers, e.g. without the extra table MUI renders for pagination.
 */
const anyTable = ':is(table, [role="table"], [role="grid"])';
const tables = `${anyTable}:has(th, [role="columnheader"]):not(${anyTable} *)`;

/**
 * Matches a label exactly, ignoring case (some labels are uppercased by CSS)
 * and surrounding whitespace, including zero-width spaces (e.g. the labels
 * of the catalog filters end with one).
 */
function exactly(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^[\\s\\u200b]*${escaped}[\\s\\u200b]*$`, 'i');
}

/** The cells of a table row: MUI table cells and Backstage UI grid cells. */
const tableCells = 'td, th:not([scope="col"]), [role="cell"], [role="gridcell"], [role="rowheader"]';

/**
 * A page object for the areas of a Backstage page that work across the old
 * and the new frontend system.
 */
export class BackstagePage {
  /**
   * The requests in flight. Backstage is a single-page app, so
   * `waitForLoadState('networkidle')` doesn't wait for requests that are
   * started after clicking a link.
   */
  private readonly inflightRequests = new Set<Request>();

  constructor(readonly page: Page) {
    page.on('request', request => {
      // Long-lived connections never finish.
      if (!['eventsource', 'websocket'].includes(request.resourceType())) {
        this.inflightRequests.add(request);
      }
    });
    page.on('requestfinished', request =>
      this.inflightRequests.delete(request),
    );
    page.on('requestfailed', request => this.inflightRequests.delete(request));
  }

  /**
   * Returns true if the Backstage version under test is a release between
   * `from` and `to` (both inclusive, compared by major and minor version),
   * e.g. `isVersionBetween('1.49', '1.53')`. Branches like `main` are never
   * in range.
   */
  isVersionBetween(from: string, to: string): boolean {
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

  /** Opens the app and logs in as guest on the sign-in page. */
  async loginAsGuest(): Promise<void> {
    await test.step('login as guest', async () => {
      await this.page.goto('/');
      const enterButton = this.page.getByRole('button', { name: 'Enter' });
      await enterButton.click();
      await expect(enterButton).toBeHidden();
      await expect(this.sidebar().getByRole('link').first()).toBeVisible();
    });
  }

  /** Waits until no request was in flight for `quietMs` (best effort). */
  private async waitForNetworkQuiet(quietMs = 500, timeout = 15_000) {
    const deadline = Date.now() + timeout;
    let quietSince = Date.now();
    while (Date.now() < deadline) {
      if (this.inflightRequests.size > 0) {
        quietSince = Date.now();
      } else if (Date.now() - quietSince >= quietMs) {
        return;
      }
      await this.page.waitForTimeout(100);
    }
  }

  /** Waits until the page has loaded its data and finished rendering. */
  async waitForPageToSettle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.waitForNetworkQuiet();
    await expect(this.loadingIndicators()).toHaveCount(0);
    // Wait for time-based animations that end, e.g. fade-ins. Spinners run
    // forever and scroll-driven animations (e.g. of Backstage UI cards) only
    // progress when scrolling. Give up after a few seconds in any case.
    await this.page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter(
              a =>
                a.timeline === document.timeline &&
                Number.isFinite(Number(a.effect?.getComputedTiming().endTime)),
            )
            .map(a => a.finished.catch(() => undefined)),
        ),
        new Promise(resolve => setTimeout(resolve, 5_000)),
      ]),
    );
  }

  /**
   * Waits until the page has settled and takes a screenshot of the whole
   * page. Saves it as `screenshots/<name>-<version>.png` and attaches it to
   * the test report.
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.waitForPageToSettle();

    // Instead of `fullPage: true`, grow the viewport to the page height:
    // full-page screenshots render the layout of the new frontend system
    // shifted to the left when the page is taller than the viewport.
    const viewport = this.page.viewportSize();
    const pageHeight = await this.page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const grow = viewport && pageHeight > viewport.height;
    if (grow) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: Math.min(pageHeight, 5_000),
      });
      await this.waitForPageToSettle();
    }

    const screenshot = await this.page.screenshot({
      path: `screenshots/${name}-${fileVersion}.png`,
    });
    await test
      .info()
      .attach(name, { body: screenshot, contentType: 'image/png' });

    if (grow) {
      await this.page.setViewportSize(viewport);
    }
  }

  /**
   * The sidebar. The `nav` element itself has no size, the visible sidebar
   * is a fixed drawer within it.
   */
  sidebar(): Locator {
    return this.page
      .getByRole('navigation', { name: 'sidebar nav' })
      .locator(':scope > div > div');
  }

  /**
   * All items of the sidebar with a label, e.g. Home, Catalog and Search.
   * The Backstage logo is a link without a label and not included.
   */
  allSidebarItems(): Locator {
    const sidebar = this.sidebar();
    return sidebar
      .getByRole('link')
      .or(sidebar.getByRole('button'))
      .filter({ hasText: /\S/ });
  }

  /**
   * The sidebar item with the given label, e.g. `Catalog`, or with a label
   * matching a regular expression for labels that differ between versions,
   * e.g. `/^create(\.\.\.)?$/i`. The first one if the label is shown twice
   * (Notifications in Backstage 1.50 to 1.52).
   */
  sidebarItem(label: string | RegExp): Locator {
    return this.allSidebarItems()
      .filter({ hasText: typeof label === 'string' ? exactly(label) : label })
      .first();
  }

  /**
   * Clicks the sidebar item with the given label (see `sidebarItem`) and
   * waits until its page is shown: the URL is the one of the item, or a sub
   * page of it (e.g. /settings redirects to /settings/general), and a heading
   * is visible.
   */
  async clickSidebarItem(label: string | RegExp): Promise<void> {
    const item = this.sidebarItem(label);
    const href = await item.getAttribute('href');
    await item.click();
    await expect(this.page).toHaveURL(
      url =>
        url.pathname === href ||
        url.pathname.startsWith(`${href?.replace(/\/$/, '')}/`),
    );
    await expect(
      this.page.getByRole('heading').filter({ visible: true }).first(),
    ).toBeVisible();
  }

  /**
   * The topmost header of the page: the plugin header of the new frontend
   * system, or the page header of the old frontend system.
   */
  pluginHeader(): Locator {
    return this.page
      .locator(headers[0])
      .or(this.page.locator(headers[1]))
      .first();
  }

  /**
   * All headers of the page, e.g. the plugin header and the header of an
   * entity. The Backstage UI page header can consist of several elements.
   */
  allHeaders(): Locator {
    // Skip headers nested in other headers and empty header parts.
    const anyHeader = `:is(${headers.join(', ')})`;
    return this.page
      .locator(`${anyHeader}:not(${anyHeader} *)`)
      .filter({ visible: true });
  }

  /**
   * The complete content next to the sidebar, including the plugin header.
   * In the new frontend system these are several sibling elements (headers
   * and content), in the old frontend system one `main` element.
   */
  pageContent(): Locator {
    return this.page
      .locator(`${sidebarPage} > :not(nav[aria-label="sidebar nav"])`)
      .filter({ visible: true });
  }

  /** The tabs of the tab bar of the page, e.g. of an entity or settings page. */
  pageTabs(): Locator {
    const tabBar = this.page.locator(pageTabBar);
    return tabBar.getByRole('tab').or(tabBar.getByRole('link'));
  }

  /** The tab of the tab bar of the page with the given label, e.g. `Overview`. */
  pageTab(label: string): Locator {
    return this.pageTabs().filter({ hasText: exactly(label) });
  }

  /**
   * Opens the tab with the given label that the new frontend system shows in
   * a group of the tab bar, e.g. `pageTabInGroup('Documentation', 'TechDocs')`
   * on an API entity page, and waits until its page is shown.
   *
   * The group is an MUI tab that shows its tabs as buttons in a popover below
   * the tab bar (Backstage 1.49 to 1.53), or a Backstage UI button that shows
   * them as a menu (since 1.54). The tabs of a group are only in the DOM while the
   * group is open. The old frontend system has no groups, so there the tab
   * is opened directly from the tab bar.
   */
  async pageTabInGroup(group: string, label: string): Promise<void> {
    const name = exactly(label);
    const groupName = exactly(group);
    const directTab = this.pageTab(label);
    const groupButton = this.pageContent()
      .getByRole('tab', { name: groupName })
      .or(this.pageContent().getByRole('button', { name: groupName }));
    await expect(directTab.or(groupButton).first()).toBeVisible();

    let tab = directTab;
    if (!(await directTab.isVisible())) {
      await groupButton.click();
      tab = this.page
        .getByRole('menuitemradio', { name })
        .or(this.page.getByRole('navigation').getByRole('button', { name }));
    }
    const href = await tab.getAttribute('href');
    await tab.click();
    await expect(this.page).toHaveURL(url => url.pathname === href);
  }

  /** All tabs of the page, including tabs within the content. */
  allTabs(): Locator {
    return this.page
      .getByRole('tab')
      .or(
        this.page
          .getByRole('navigation', { name: 'Content navigation' })
          .getByRole('link'),
      );
  }

  /** The tab of the page with the given label, including tabs within the content. */
  tab(label: string): Locator {
    return this.allTabs().filter({ hasText: exactly(label) });
  }

  /**
   * The filter or search input of the content, e.g. of the catalog table.
   * Found by its placeholder or label starting with "Filter" or "Search".
   */
  contentFilter(): Locator {
    const content = this.pageContent();
    const name = /^(filter|search)/i;
    return content
      .getByRole('searchbox')
      .or(content.getByRole('textbox', { name }))
      .or(content.getByPlaceholder(name));
  }

  /**
   * The button with the given label anywhere on the page, including the
   * sidebar and dialogs. Only elements with the button role: some actions
   * are links, e.g. Create on the catalog page of the new frontend system.
   */
  button(label: string): Locator {
    return this.page.getByRole('button', { name: exactly(label) });
  }

  /** All cards in the content, without cards nested in other cards. */
  allCards(): Locator {
    return this.pageContent().locator(cards);
  }

  /** The card with the given title, e.g. `About` on an entity page. */
  card(title: string): Locator {
    return this.allCards().filter({
      has: this.page.locator(cardTitle).filter({ hasText: exactly(title) }),
    });
  }

  /** All tables in the content. */
  allTables(): Locator {
    return this.pageContent().locator(tables);
  }

  /**
   * The table in the content. Like any Playwright locator, actions and
   * assertions fail if the content has more than one table (strict mode);
   * use `allTables()` then.
   */
  table(): Locator {
    return this.allTables();
  }

  /** All open dialogs, in the order they were opened. */
  allDialogs(): Locator {
    // Closed MUI dialogs can stay in the DOM without a size.
    return this.page.locator(dialogs).filter({ visible: true });
  }

  /**
   * The latest opened dialog, which is shown on top of the others. Dialogs
   * are rendered at the end of the document when they are opened.
   */
  dialog(): Locator {
    return this.allDialogs().last();
  }

  /** The content below the headers and tabs, e.g. of the selected tab. */
  tabContent(): Locator {
    return this.page.locator(tabContent).first();
  }

  /**
   * The action with the given label in the content or in a dialog: a button
   * or a link. Some actions are buttons in one version and links in another,
   * e.g. Create on the catalog page (a link in the new frontend system).
   */
  action(label: string): Locator {
    const name = exactly(label);
    const inContent = this.pageContent();
    const inDialogs = this.allDialogs();
    return inContent
      .getByRole('button', { name })
      .or(inContent.getByRole('link', { name }))
      .or(inDialogs.getByRole('button', { name }))
      .or(inDialogs.getByRole('link', { name }));
  }

  /**
   * The button that opens the menu with more actions in a header, e.g. of an
   * entity page. Labelled "more" in the old and "More actions" in the new
   * frontend system.
   */
  moreActions(): Locator {
    return this.allHeaders().getByRole('button', {
      name: /^\s*more( actions)?\s*$/i,
    });
  }

  /** The item with the given label of an open menu, e.g. `Inspect entity`. */
  menuItem(label: string): Locator {
    return this.page.getByRole('menuitem', { name: exactly(label) });
  }

  /**
   * The rows of the table in the content, without the header row. An empty
   * table can have one row with a message, e.g. "No records to display".
   */
  tableRows(): Locator {
    return this.table()
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') });
  }

  /** The row of the table with a cell that shows the given text exactly. */
  tableRow(text: string): Locator {
    return this.tableRows().filter({
      has: this.page.locator(tableCells).filter({ hasText: exactly(text) }),
    });
  }

  /** The column header of the table with the given label, e.g. `Name`. */
  columnHeader(label: string): Locator {
    return this.table()
      .getByRole('columnheader')
      .filter({ hasText: exactly(label) });
  }

  /**
   * The select or autocomplete input with the given label in the content,
   * e.g. the `Kind`, `Type` or `Owner` filter of the catalog.
   */
  contentSelect(label: string): Locator {
    return this.pageContent().getByLabel(exactly(label));
  }

  /** The visible loading indicators (progress bars and spinners). */
  loadingIndicators(): Locator {
    return this.page.getByRole('progressbar').filter({ visible: true });
  }

  /**
   * The empty state panel in the content, e.g. "Missing Annotation" on the
   * TechDocs tab of an entity without docs, or "No documents to show".
   */
  emptyState(): Locator {
    return this.pageContent()
      .locator('[class*="BackstageEmptyState-root"]')
      .filter({ visible: true });
  }

  /**
   * The visible alerts, e.g. "Refresh scheduled" after refreshing an entity:
   * MUI alerts in the old and toasts in the notification region in the new
   * frontend system. Toasts are not part of `allDialogs()`.
   */
  alerts(): Locator {
    return this.page
      .locator('[role="alert"], [role="region"] [role="alertdialog"]')
      .filter({ visible: true });
  }

  /**
   * The error overlays of the development server (`yarn start`), shown over
   * the page for uncaught errors. They are iframes; use `.contentFrame()` to
   * read the error, e.g.
   * `errorOverlay().first().contentFrame().locator('body')`.
   */
  errorOverlay(): Locator {
    return this.page
      .locator(
        'iframe#webpack-dev-server-client-overlay, iframe#react-refresh-overlay',
      )
      .filter({ visible: true });
  }

  /**
   * The breadcrumbs of the page: the "Breadcrumbs" navigation of the plugin
   * header (since 1.54) or the "breadcrumb" navigation of the MUI
   * breadcrumbs of Backstage core components.
   */
  breadcrumbs(): Locator {
    return this.page.getByRole('navigation', { name: /^breadcrumbs?$/i });
  }

  /**
   * The title of the page: the level 1 heading of the headers, e.g. the
   * plugin title or, in the old frontend system, the entity name. Since 1.54
   * it is visually hidden in the plugin header, so check it with
   * `toHaveText()` instead of `toBeVisible()`.
   */
  pageTitle(): Locator {
    return this.allHeaders().getByRole('heading', { level: 1 });
  }

  /**
   * The items of the breadcrumbs, e.g. `Settings` and `General`: links to
   * the parent pages and the current page (no link). Separators are hidden
   * from the accessibility tree and not included.
   */
  breadcrumbItems(): Locator {
    return this.breadcrumbs().getByRole('listitem');
  }

  /**
   * The breadcrumb item with the given label, e.g. `Catalog`. Click it to go
   * to a parent page, or use `.getByRole('link')` for its link.
   */
  breadcrumbItem(label: string): Locator {
    return this.breadcrumbItems().filter({ hasText: exactly(label) });
  }
}
