import type { Locator, Page } from '@playwright/test';

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
 * A page object for the areas of a Backstage page that work across the old
 * and the new frontend system.
 */
export class BackstagePage {
  constructor(readonly page: Page) {}

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

  /** The content below the headers and tabs, e.g. of the selected tab. */
  tabContent(): Locator {
    return this.page.locator(tabContent).first();
  }
}
