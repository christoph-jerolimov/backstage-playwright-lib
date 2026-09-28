# backstage-playwright-lib

A minimal [Playwright](https://playwright.dev) project written in TypeScript that
runs against a [Backstage](https://backstage.io) app.

> [!NOTE]
> This is an experiment. The goal is to contribute this to
> [Backstage](https://github.com/backstage/backstage) once it has matured.
> Contributions and feedback are very welcome — feel free to open an issue or
> a pull request. 🙏

## Usage

```sh
npm ci
npx playwright install chromium
npm test
```

The tests run against `http://localhost:3000` by default. Set `PLAYWRIGHT_URL`
to target a different Backstage instance.

The code is formatted with [Prettier](https://prettier.io), using the same
options as Backstage (`@backstage/cli/config/prettier`):

```sh
npm run prettier:check
npm run prettier:fix
npm run tsc
```

## Page object

[`e2e-tests/backstage-page.ts`](e2e-tests/backstage-page.ts) provides locators and actions for the
areas of a Backstage page that work across the old and the new frontend
system. Tests get it as the `backstagePage` fixture:

| Function                | Area                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `sidebar()`             | The sidebar                                                              |
| `allSidebarItems()`     | All sidebar items with a label, e.g. Home, Catalog and Search            |
| `sidebarItem(label)`    | One sidebar item, e.g. `sidebarItem('Catalog')`                          |
| `pluginHeader()`        | The topmost header: plugin header, or page header (old frontend)         |
| `allHeaders()`          | All headers, e.g. plugin header and entity header                        |
| `pageContent()`         | Everything next to the sidebar, including the plugin header              |
| `pageTabs()`            | The tabs of the page's tab bar, e.g. of an entity or settings page       |
| `pageTab(label)`        | One tab of the page's tab bar, e.g. `pageTab('Overview')`                |
| `allTabs()`             | All tabs of the page, including tabs within the content                  |
| `tab(label)`            | One tab of the page, including tabs within the content                   |
| `tabContent()`          | The content below the headers and tabs, e.g. of the selected tab         |
| `contentFilter()`       | The filter or search input of the content, e.g. of the catalog table     |
| `button(label)`         | One button anywhere on the page, e.g. `button('Refresh')`                |
| `allCards()`            | All cards in the content, without nested cards                           |
| `card(title)`           | One card by its title, e.g. `card('About')`                              |
| `allTables()`           | All tables in the content                                                |
| `table()`               | The table in the content; fails if there is more than one (strict mode)  |
| `allDialogs()`          | All open dialogs, in the order they were opened                          |
| `dialog()`              | The latest opened dialog, shown on top of the others                     |
| `action(label)`         | One button or link in the content or a dialog, e.g. `action('Create')`   |
| `moreActions()`         | The button that opens the more actions menu of a header                  |
| `menuItem(label)`       | One item of an open menu, e.g. `menuItem('Inspect entity')`              |
| `tableRows()`           | The rows of the table, without the header row                            |
| `tableRow(text)`        | One row with a cell showing the text, e.g. `tableRow('example-website')` |
| `columnHeader(label)`   | One column header of the table, e.g. `columnHeader('Name')`              |
| `contentSelect(label)`  | One select or autocomplete in the content, e.g. `contentSelect('Kind')`  |
| `loadingIndicators()`   | The visible loading indicators (progress bars and spinners)              |
| `emptyState()`          | The empty state panel, e.g. "Missing Annotation" or "No documents"       |
| `alerts()`              | The visible alerts and toasts, e.g. "Refresh scheduled"                  |
| `errorOverlay()`        | The error overlays of the development server for uncaught errors         |
| `breadcrumbs()`         | The breadcrumbs of the page (plugin header since 1.54)                   |
| `pageTitle()`           | The level 1 heading of the headers (visually hidden since 1.54)          |
| `breadcrumbItems()`     | The items of the breadcrumbs, e.g. Settings and General                  |
| `breadcrumbItem(label)` | One breadcrumb item, e.g. `breadcrumbItem('Settings')`                   |

| Action                         | What it does                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `loginAsGuest()`               | Opens the app and logs in as guest                                                                                             |
| `clickSidebarItem(label)`      | Clicks a sidebar item and waits until its page is shown                                                                        |
| `pageTabInGroup(group, label)` | Opens a tab of a tab group, e.g. `('Documentation', 'TechDocs')`; opens the tab directly if there are no groups (old frontend) |
| `waitForPageToSettle()`        | Waits for requests, loading indicators and animations to finish                                                                |
| `takeScreenshot(name)`         | Saves `screenshots/<name>-<version>.png` and attaches it to the report                                                         |
| `isVersionBetween(from, to)`   | Whether the tested version is in the range, e.g. `('1.49', '1.53')`                                                            |

Labels are matched exactly, but ignoring case, since the old frontend shows
some labels in capitals via CSS.

```ts
test('filters the catalog', async ({ backstagePage }) => {
  await backstagePage.clickSidebarItem('Catalog');
  await backstagePage.contentFilter().fill('example');
  await expect(backstagePage.table().getByRole('row')).toHaveCount(2);
});
```

## CI

The [E2E workflow](.github/workflows/e2e.yml) first typechecks the tests
(`npm run tsc`) and checks the formatting (`npm run prettier:check`). Then it
clones
[backstage-history](https://github.com/christoph-jerolimov/backstage-history),
installs its dependencies, starts it with `yarn start` (`yarn dev` up to
Backstage 1.37, where `yarn start` only starts the frontend) and runs the
Playwright tests against it.

Before starting the app,
[`scripts/setup-backstage.mjs`](scripts/setup-backstage.mjs) enables
translations (English and German) using the config files in
[`app-config/`](app-config):

- New frontend system (1.49+): `app-config.nfs.yaml` configures the
  `api:app/app-language` extension. It's written as `app-config.local.yaml`,
  with its extensions appended to the app's own `app.extensions`, since config
  lists aren't merged.
- Old frontend system (up to 1.48): `app-config.ofs.yaml` is copied as
  `app-config.local.yaml`. Translations can't be enabled via config there, so
  the script adds `__experimentalTranslations` to `createApp()` in `App.tsx`.

The tests run in parallel jobs against the `main` branch and the latest patch
release of the 20 most recent Backstage releases (e.g. `1.55.0`, `1.54.0`, …).
The list of versions is resolved from the repository tags on each run.
Versions that can't be tested are listed in `SKIP_VERSIONS` in the workflow,
currently 1.39.0, whose backend fails to start.

Within a job, the tests run one at a time, since they all use the same guest
user (see the notifications test below). They take a screenshot at the end of
each step:

- `login.test.ts` opens the login page, logs in as guest by clicking the
  _Enter_ button and waits for the catalog page.
- `home.test.ts` navigates to _Home_. Skipped for Backstage 1.49 to 1.53,
  which have no Home item.
- `catalog.test.ts` navigates to _Catalog_, opens the `example-website` entity
  and takes a screenshot of each tab of the entity page. Up to Backstage 1.48
  the catalog item is called Home, so the test clicks Home there. It also
  navigates to _Register Existing Component_, which is skipped up to Backstage
  1.49; the catalog import plugin adds this sidebar item since 1.50.
- `apis.test.ts` navigates to _APIs_, opens the `example-grpc-api` entity and
  its _Definition_ and _TechDocs_ tabs (grouped in a _Documentation_ tab since
  Backstage 1.49; up to 1.48 there is only a _Definition_ tab).
- `docs.test.ts` navigates to _Docs_.
- `scaffolder.test.ts` navigates to _Create_ (called _Create..._ in older
  versions), selects the _Example Node.js Template_ card and clicks _Choose_.
  It also opens the _Tasks_, _Actions_, _Template Editor_ and _Templating
  Extensions_ tabs, which is skipped up to Backstage 1.48 (no tabs there).
- `notifications.test.ts` navigates to _Notifications_, sends a notification
  to all users via the notifications backend (using a static token configured
  in both app-config files) and checks that it is shown and that the sidebar
  item shows 1 unread notification. Afterwards it marks
  the notification as read. Skipped up to Backstage 1.41, whose app template
  doesn't include the notifications plugin.
- `settings.test.ts` navigates to _Settings_, checks that the language
  selection offers all configured languages and opens the _Authentication
  Providers_ and _Feature Flags_ tabs.

Each version uploads its screenshots as a `screenshots-<version>` artifact, and
all screenshots are also collected into a single `screenshots` artifact.

On the `main` branch, all screenshots, test results and Playwright reports are
also published to GitHub Pages as an [Astro](https://astro.build) site, found in
[`site/`](site):

- **Overview**: the test results of each version and a matrix of all screens
  by version, with filters for screens and versions.
- **Version**: all screenshots and test results of one version, with links to
  its Playwright report and to the neighbouring versions.
- **Screen**: one screen across all versions.
- **Compare**: one screen of two versions side by side, with a slider, as an
  overlay, or as a pixel difference. The selection is kept in the URL.

To build the site locally from downloaded artifacts:

```sh
cd site
npm ci
node scripts/prepare.mjs ../artifacts
npm run dev
```
