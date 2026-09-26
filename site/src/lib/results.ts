import results from '../data/results.json';

export type TestStatus = 'passed' | 'failed' | 'flaky' | 'skipped';

export interface TestResult {
  file: string;
  title: string;
  status: TestStatus;
}

export interface Version {
  /** Git ref of backstage-history, e.g. `1.55.0` or `main`. */
  ref: string;
  /** Sanitized ref, used in file names and URLs. */
  id: string;
  /** Whether the Playwright HTML report is available. */
  report: boolean;
  /** Test results, or null if the version produced none. */
  tests: TestResult[] | null;
  /** Screenshot names, e.g. `login-page` or `catalog-entity-2-techdocs`. */
  screenshots: string[];
}

export interface Results {
  generatedAt: string;
  commit: string | null;
  commitUrl: string | null;
  runUrl: string | null;
  versions: Version[];
}

export const data = results as Results;
export const versions = data.versions;

/** Screens in the order of the tests, with their labels. */
const knownScreens: Record<string, string> = {
  'login-page': 'Login page',
  'after-login': 'After login',
  home: 'Home',
  catalog: 'Catalog',
  apis: 'APIs',
  docs: 'Docs',
  create: 'Create',
  'register-existing-component': 'Register existing component',
  notifications: 'Notifications',
  settings: 'Settings',
  'settings-language': 'Settings: language selection',
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const entityTab = (name: string) =>
  /^catalog-entity-(\d+)-(.+)$/.exec(name) ?? undefined;

export function screenLabel(name: string): string {
  if (knownScreens[name]) {
    return knownScreens[name];
  }
  const tab = entityTab(name);
  if (tab) {
    return `Entity: ${capitalize(tab[2].replace(/-/g, ' '))}`;
  }
  return capitalize(name.replace(/-/g, ' '));
}

/**
 * Sort key: known screens in test order; the tabs of the entity page (which
 * differ by version) right after the catalog, by tab position; others last.
 */
function screenSortKey(name: string): [number, number, string] {
  const known = Object.keys(knownScreens);
  const index = known.indexOf(name);
  if (index >= 0) {
    return [index, 0, name];
  }
  const tab = entityTab(name);
  if (tab) {
    return [known.indexOf('catalog'), Number(tab[1]), name];
  }
  return [known.length, 0, name];
}

export function compareScreens(a: string, b: string): number {
  const [a1, a2, a3] = screenSortKey(a);
  const [b1, b2, b3] = screenSortKey(b);
  return a1 - b1 || a2 - b2 || a3.localeCompare(b3);
}

/** All screens of all versions, in test order. */
export const screens: string[] = [
  ...new Set(versions.flatMap(version => version.screenshots)),
].sort(compareScreens);

export function hasScreenshot(version: Version, screen: string): boolean {
  return version.screenshots.includes(screen);
}

export interface TestSummary {
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
}

export function summarize(version: Version): TestSummary | null {
  if (!version.tests) {
    return null;
  }
  const summary: TestSummary = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  for (const test of version.tests) {
    summary[test.status] += 1;
  }
  return summary;
}

/** An absolute URL for a path of the site, respecting the base path. */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export const screenshotUrl = (version: Version, screen: string) =>
  url(`screenshots/${screen}-${version.id}.png`);

export const reportUrl = (version: Version) => url(`reports/${version.id}/`);

export const compareUrl = (screen: string, a: string, b: string) =>
  url(
    `compare/?${new URLSearchParams({ screen, a, b }).toString()}`,
  );
