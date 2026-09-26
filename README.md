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

## CI

The [E2E workflow](.github/workflows/e2e.yml) clones
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

The tests run in parallel against the `main` branch and the latest patch
release of the 20 most recent Backstage releases (e.g. `1.55.0`, `1.54.0`, …).
The list of versions is resolved from the repository tags on each run.
Versions that can't be tested are listed in `SKIP_VERSIONS` in the workflow,
currently 1.39.0, whose backend fails to start.

The tests take a screenshot at the end of each step:

- `login-page.spec.ts` opens the login page, logs in as guest by clicking the
  *Enter* button and waits for the catalog page.
- `sidebar-navigation.spec.ts` logs in as guest and navigates via the sidebar to
  *Home*, *Catalog*, *APIs*, *Docs*, *Notifications* and *Settings*. On
  *Catalog* it opens the `example-website` entity and takes a screenshot of
  each tab of the entity page. On *Settings* it checks that the language
  selection offers all configured languages.
  *Home* is
  skipped for Backstage 1.49 to 1.53, which have no Home item. Up to
  Backstage 1.48 the catalog item is called Home, so the *Catalog* test
  clicks Home there. *Notifications* is skipped up to Backstage 1.41, whose app
  template doesn't include the notifications plugin.

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
