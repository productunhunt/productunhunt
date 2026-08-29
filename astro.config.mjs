// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import slugManifest from './integrations/slug-manifest.mjs';
import { unified } from '@astrojs/markdown-remark';
import { remarkReadingTime } from './remark-reading-time.mjs';
import { sitemapData } from './scripts/content-seo.mjs';

// Read once, at config evaluation, so the filter and serializer below are
// synchronous. See `scripts/content-seo.mjs` for why this can't use the
// content collection.
const { exclude, lastmod } = await sitemapData();

// https://astro.build/config
export default defineConfig({
  site: 'https://productunhunt.com',
  // Dev-only: lets the dev server answer requests addressed via Tailscale
  // MagicDNS (http://dev-vm:3000) instead of tripping Vite's host check.
  vite: { server: { allowedHosts: ['dev-vm'] } },
  // Static by default. The Netlify adapter only bundles a server for the
  // routes that opt out of prerendering (the counts endpoint and the
  // auto-injected Actions route); every page still ships as HTML in `dist/`.
  adapter: netlify(),
  // `slugManifest` writes `src/generated/idea-slugs.json` at `astro:config:setup`,
  // before Vite resolves anything — the vote action imports that file and Vite
  // inlines it, so it cannot be produced any later. See the integration.
  integrations: [
    slugManifest(),
    mdx(),
    sitemap({
      // A sitemap advertises the pages we want indexed; anything rendering
      // `noindex` (site search, thin tag archives) is dropped here to match.
      filter: (page) => !exclude.has(new URL(page).pathname),
      serialize: (item) => {
        const changed = lastmod.get(new URL(item.url).pathname);
        // Pages with no content date behind them (about, contribute, …) get no
        // `lastmod` at all rather than a build timestamp, which would claim
        // every page changed on every deploy.
        return changed ? { ...item, lastmod: changed } : item;
      },
    }),
  ],
  env: {
    schema: {
      // All optional on purpose: with no Neon provisioned the build must still
      // succeed and the site must serve with dead polls.
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      VOTE_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      IP_SALT: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkReadingTime],
    }),
    // Dual Shiki themes; `defaultColor: false` emits CSS variables
    // (--shiki-light / --shiki-dark) so global.css can switch with the theme.
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: true,
    },
  },
});
