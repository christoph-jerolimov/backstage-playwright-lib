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
installs its dependencies, starts it with `yarn start` and runs the Playwright
tests against it.
