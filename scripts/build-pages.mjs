// Builds the GitHub Pages site from the downloaded workflow artifacts:
//
//   artifacts/reports/playwright-report-<version>/playwright-report/  (per version)
//   artifacts/screenshots/<name>-<version>.png                         (merged)
//
// into:
//
//   site/index.html                  gallery with all screenshots and report links
//   site/reports/<version>/          Playwright HTML report of each version
//   site/screenshots/                all screenshots
//
// The versions (and their order) are read from the REFS env variable, a JSON
// array like ["main", "1.55.0", ...]. Without it, all versions found in the
// artifacts are shown.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const artifactsDir = process.argv[2] ?? 'artifacts';
const siteDir = process.argv[3] ?? 'site';
const reportsDir = join(artifactsDir, 'reports');
const screenshotsDir = join(artifactsDir, 'screenshots');

// Must match the sanitizing in tests/utils.ts.
const sanitize = ref => ref.replace(/[^a-zA-Z0-9._-]/g, '-');

const screenshotNames = [
  { name: 'login-page', label: 'Login page' },
  { name: 'after-login', label: 'After login' },
  { name: 'home', label: 'Home' },
  { name: 'catalog', label: 'Catalog' },
  { name: 'apis', label: 'APIs' },
  { name: 'docs', label: 'Docs' },
  { name: 'notifications', label: 'Notifications' },
  { name: 'settings', label: 'Settings' },
  { name: 'settings-language', label: 'Settings: language selection' },
];

const escapeHtml = value =>
  String(value).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function listDir(dir) {
  return existsSync(dir) ? readdirSync(dir) : [];
}

function resolveVersions() {
  if (process.env.REFS) {
    return JSON.parse(process.env.REFS);
  }
  return listDir(reportsDir)
    .filter(name => name.startsWith('playwright-report-'))
    .map(name => name.slice('playwright-report-'.length));
}

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(join(siteDir, 'reports'), { recursive: true });
mkdirSync(join(siteDir, 'screenshots'), { recursive: true });
writeFileSync(join(siteDir, '.nojekyll'), '');

const screenshotFiles = new Set(listDir(screenshotsDir));
for (const file of screenshotFiles) {
  cpSync(join(screenshotsDir, file), join(siteDir, 'screenshots', file));
}

const versions = resolveVersions().map(ref => {
  const version = sanitize(ref);
  const reportSrc = join(reportsDir, `playwright-report-${ref}`, 'playwright-report');
  const hasReport = existsSync(join(reportSrc, 'index.html'));
  if (hasReport) {
    cpSync(reportSrc, join(siteDir, 'reports', version), { recursive: true });
  }
  const screenshots = screenshotNames.map(({ name, label }) => {
    const file = `${name}-${version}.png`;
    return { label, file: screenshotFiles.has(file) ? file : undefined };
  });
  return { ref, version, hasReport, screenshots };
});

const repository = process.env.GITHUB_REPOSITORY;
const runUrl =
  repository && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : undefined;
const sha = process.env.GITHUB_SHA?.slice(0, 7);
const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

const meta = [
  `Generated ${escapeHtml(generatedAt)}`,
  sha && `commit <code>${escapeHtml(sha)}</code>`,
  runUrl && `<a href="${escapeHtml(runUrl)}">workflow run</a>`,
]
  .filter(Boolean)
  .join(' · ');

const sections = versions
  .map(({ ref, version, hasReport, screenshots }) => {
    const figures = screenshots
      .map(({ label, file }) =>
        file
          ? `<figure>
          <a href="screenshots/${escapeHtml(file)}"><img src="screenshots/${escapeHtml(file)}" alt="${escapeHtml(label)} of Backstage ${escapeHtml(ref)}" loading="lazy" width="1280" height="720"></a>
          <figcaption>${escapeHtml(label)}</figcaption>
        </figure>`
          : `<figure class="missing">
          <div class="placeholder">No screenshot (skipped or failed)</div>
          <figcaption>${escapeHtml(label)}</figcaption>
        </figure>`,
      )
      .join('\n        ');
    const report = hasReport
      ? `<a class="report" href="reports/${escapeHtml(version)}/">Playwright report →</a>`
      : `<span class="report missing">No report</span>`;
    return `<section id="${escapeHtml(version)}">
      <header>
        <h2>${escapeHtml(ref)}</h2>
        ${report}
      </header>
      <div class="figures">
        ${figures}
      </div>
    </section>`;
  })
  .join('\n    ');

const nav = versions
  .map(({ ref, version }) => `<a href="#${escapeHtml(version)}">${escapeHtml(ref)}</a>`)
  .join('\n      ');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Backstage Playwright results</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f7f8;
      --fg: #1b1f23;
      --muted: #5c6670;
      --card: #ffffff;
      --border: #d8dde2;
      --accent: #0b6e5f;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111417;
        --fg: #e6e9ec;
        --muted: #9aa4ad;
        --card: #1a1f24;
        --border: #2c333a;
        --accent: #4fd1b5;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 16px 64px; }
    h1 { margin: 0 0 4px; font-size: 1.75rem; }
    .meta { color: var(--muted); margin: 0 0 20px; }
    a { color: var(--accent); }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
    nav a {
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--card);
      text-decoration: none;
      font-variant-numeric: tabular-nums;
    }
    section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      scroll-margin-top: 16px;
    }
    section header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    h2 { margin: 0; font-size: 1.25rem; font-variant-numeric: tabular-nums; }
    .report { white-space: nowrap; }
    .missing { color: var(--muted); }
    .figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    figure { margin: 0; }
    figure img, .placeholder {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      object-position: top;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .placeholder { display: grid; place-items: center; color: var(--muted); }
    figcaption { color: var(--muted); font-size: 0.875rem; margin-top: 6px; }
  </style>
</head>
<body>
  <main>
    <h1>Backstage Playwright results</h1>
    <p class="meta">${meta}</p>
    <nav>
      ${nav}
    </nav>
    ${sections}
  </main>
</body>
</html>
`;

writeFileSync(join(siteDir, 'index.html'), html);
console.log(`Built ${siteDir} with ${versions.length} versions.`);
