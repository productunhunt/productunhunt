// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { remarkReadingTime } from './remark-reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://productunhunt.com',
  // Static by default. The Netlify adapter only bundles a server for the
  // routes that opt out of prerendering (the counts endpoint and the
  // auto-injected Actions route); every page still ships as HTML in `dist/`.
  adapter: netlify(),
  integrations: [mdx(), sitemap()],
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
