import { defineConfig } from 'astro/config';

// On GitHub Pages the site is served from /<repository>/. The workflow passes
// the values from actions/configure-pages.
export default defineConfig({
  site: process.env.ASTRO_SITE,
  base: process.env.ASTRO_BASE || '/',
  trailingSlash: 'ignore',
});
