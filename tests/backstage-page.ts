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
   * The sidebar item with the given label, e.g. `Catalog`. The first one if
   * the label is shown twice (Notifications in Backstage 1.50 to 1.52).
   */
  sidebarItem(label: string): Locator {
    return this.allSidebarItems()
      .filter({ hasText: exactly(label) })
      .first();
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
}
