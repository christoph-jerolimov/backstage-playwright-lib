// Prepares the data of the site from the downloaded workflow artifacts:
//
//   node scripts/prepare.mjs <artifacts-dir>
//
// Reads:
//   <artifacts-dir>/reports/playwright-report-<version>/playwright-report/
//   <artifacts-dir>/reports/playwright-report-<version>/test-results.json
//   <artifacts-dir>/screenshots/<name>-<version>.png
//
// Writes:
//   public/reports/<version>/   Playwright HTML report of each version
//   public/screenshots/         all screenshots
//   src/data/results.json       versions, test results and screenshot names
//
// The versions (and their order) are read from the REFS env variable, a JSON
// array like ["main", "1.55.0", ...]. Without it, all versions found in the
// artifacts are used.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsDir = resolve(process.argv[2] ?? join(siteDir, '..', 'artifacts'));
const reportsDir = join(artifactsDir, 'reports');
const screenshotsDir = join(artifactsDir, 'screenshots');

const publicReportsDir = join(siteDir, 'public', 'reports');
const publicScreenshotsDir = join(siteDir, 'public', 'screenshots');
const resultsFile = join(siteDir, 'src', 'data', 'results.json');

// Must match the sanitizing in tests/utils.ts.
const sanitize = ref => ref.replace(/[^a-zA-Z0-9._-]/g, '-');

const listDir = dir => (existsSync(dir) ? readdirSync(dir) : []);

function resolveRefs() {
  if (process.env.REFS) {
    return JSON.parse(process.env.REFS);
  }
  return listDir(reportsDir)
    .filter(name => name.startsWith('playwright-report-'))
    .map(name => name.slice('playwright-report-'.length));
}

const statusNames = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped',
};

/** Flattens the tests of a Playwright JSON report. */
function readTestResults(file) {
  if (!existsSync(file)) {
    return undefined;
  }
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const tests = [];
  const visit = (suite, path) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        tests.push({
          file: spec.file ?? path[0],
          title: spec.title,
          status: statusNames[test.status] ?? test.status,
        });
      }
    }
    for (const child of suite.suites ?? []) {
      visit(child, [...path, child.title]);
    }
  };
  for (const suite of report.suites ?? []) {
    visit(suite, [suite.title]);
  }
  return tests;
}

rmSync(publicReportsDir, { recursive: true, force: true });
rmSync(publicScreenshotsDir, { recursive: true, force: true });
mkdirSync(publicReportsDir, { recursive: true });
mkdirSync(publicScreenshotsDir, { recursive: true });
mkdirSync(dirname(resultsFile), { recursive: true });

const screenshotFiles = listDir(screenshotsDir).filter(file =>
  file.endsWith('.png'),
);
for (const file of screenshotFiles) {
  cpSync(join(screenshotsDir, file), join(publicScreenshotsDir, file));
}

const versions = resolveRefs().map(ref => {
  const id = sanitize(ref);
  const artifactDir = join(reportsDir, `playwright-report-${ref}`);

  const reportSrc = join(artifactDir, 'playwright-report');
  const report = existsSync(join(reportSrc, 'index.html'));
  if (report) {
    cpSync(reportSrc, join(publicReportsDir, id), { recursive: true });
  }

  const suffix = `-${id}.png`;
  const screenshots = screenshotFiles
    .filter(file => file.endsWith(suffix))
    .map(file => file.slice(0, -suffix.length));

  return {
    ref,
    id,
    report,
    tests: readTestResults(join(artifactDir, 'test-results.json')) ?? null,
    screenshots,
  };
});

const repository = process.env.GITHUB_REPOSITORY;
const results = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  commitUrl:
    repository && process.env.GITHUB_SHA
      ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repository}/commit/${process.env.GITHUB_SHA}`
      : null,
  runUrl:
    repository && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  versions,
};

writeFileSync(resultsFile, `${JSON.stringify(results, null, 2)}\n`);
console.log(
  `Prepared ${versions.length} versions and ${screenshotFiles.length} screenshots.`,
);
