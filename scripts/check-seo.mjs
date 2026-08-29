// SEO lint for `dist/`, run after `npm run build`.
//
// Every rule here exists because it was broken once and nothing complained:
// the head tags are assembled in a layout, the sitemap in a config, and the
// indexation decision in a page — so nothing but this script sees all three at
// the same time. It reads the built HTML, not the source, which is also the
// only way to catch a page that quietly stopped passing a prop.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://productunhunt.com';

/** Google truncates well before this; past it the title is certainly too long. */
const MAX_TITLE = 70;
const MAX_DESCRIPTION = 160;

async function htmlPages(dir = DIST, prefix = '/') {
  const pages = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    // `_astro/` is fingerprinted assets; `pagefind/` ships its own HTML fragments.
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === 'pagefind') continue;
      pages.push(...(await htmlPages(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
    } else if (entry.name.endsWith('.html')) {
      const route = entry.name === 'index.html' ? prefix : `${prefix}${entry.name}`;
      pages.push({ route, html: await readFile(path.join(dir, entry.name), 'utf8') });
    }
  }
  return pages;
}

/** Titles and descriptions are compared by length, so they have to be measured
 *  as a reader sees them — `&amp;` is one character, not five. */
const decode = (text) =>
  text?.replace(
    /&(amp|lt|gt|quot|#39);/g,
    (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[name],
  );

const attr = (html, re) => decode(html.match(re)?.[1]);
const meta = (html, name) =>
  attr(html, new RegExp(`<meta name="${name}" content="([^"]*)"`, 'i')) ??
  attr(html, new RegExp(`<meta property="${name}" content="([^"]*)"`, 'i'));

function checkPage({ route, html }, errors) {
  const fail = (message) => errors.push(`${route}: ${message}`);

  const title = attr(html, /<title>([^<]*)<\/title>/);
  if (!title) fail('no <title>');
  else if (title.length > MAX_TITLE) fail(`title is ${title.length} chars (max ${MAX_TITLE})`);

  const description = meta(html, 'description');
  if (!description) fail('no meta description');
  else if (description.length > MAX_DESCRIPTION) {
    fail(`meta description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
  }

  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) fail(`${h1s.length} <h1> elements (expected exactly 1)`);

  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
  // The 404 is served for arbitrary paths, so its canonical is the one URL on
  // the site that legitimately doesn't match where it was requested from.
  if (route !== '/404.html' && canonical !== `${SITE}${route}`) {
    fail(`canonical is ${canonical ?? 'missing'}, expected ${SITE}${route}`);
  }

  const robots = meta(html, 'robots');
  if (!robots) fail('no robots meta');

  // Every social tag the layout emits, asserted together: a share card missing
  // one of these degrades silently in the crawler and looks fine locally.
  for (const property of [
    'og:type',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:alt',
    'og:image:width',
    'og:image:height',
    'twitter:card',
    'twitter:image',
    'twitter:image:alt',
  ]) {
    if (!meta(html, property)) fail(`no ${property}`);
  }

  const locale = meta(html, 'og:locale');
  if (!/^[a-z]{2}_[A-Z]{2}$/.test(locale ?? '')) {
    fail(`og:locale is "${locale}", expected language_TERRITORY`);
  }

  return { route, title, description, robots };
}

/** The sitemap and the `robots` meta tag are written in different files and
 *  have to agree: a `noindex` URL in the sitemap asks Google to index a page
 *  that then tells it not to. */
async function checkSitemap(pages, errors) {
  let xml;
  try {
    xml = await readFile(path.join(DIST, 'sitemap-0.xml'), 'utf8');
  } catch {
    errors.push('sitemap-0.xml is missing from dist/');
    return;
  }

  const listed = new Set(
    [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => new URL(match[1]).pathname),
  );

  for (const page of pages) {
    if (page.route === '/404.html') continue;
    const noindex = page.robots?.includes('noindex');
    if (noindex && listed.has(page.route)) {
      errors.push(`${page.route}: noindex but listed in the sitemap`);
    }
    if (!noindex && !listed.has(page.route)) {
      errors.push(`${page.route}: indexable but missing from the sitemap`);
    }
  }
}

async function checkRobotsTxt(errors) {
  let txt;
  try {
    txt = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
  } catch {
    errors.push('robots.txt is missing from dist/');
    return;
  }
  if (!txt.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) {
    errors.push('robots.txt does not advertise the absolute sitemap URL');
  }
}

/** Duplicate titles and descriptions are the classic way a templated archive
 *  starts competing with itself. */
function checkUniqueness(pages, errors) {
  for (const field of ['title', 'description']) {
    const seen = new Map();
    for (const page of pages) {
      if (page.robots?.includes('noindex') || !page[field]) continue;
      const routes = seen.get(page[field]) ?? [];
      routes.push(page.route);
      seen.set(page[field], routes);
    }
    for (const [value, routes] of seen) {
      if (routes.length > 1) errors.push(`duplicate ${field} "${value}" on ${routes.join(', ')}`);
    }
  }
}

const errors = [];
const pages = (await htmlPages()).map((page) => checkPage(page, errors));
checkUniqueness(pages, errors);
await checkSitemap(pages, errors);
await checkRobotsTxt(errors);

if (errors.length > 0) {
  console.error(`check:seo failed\n\n${errors.map((e) => `  ${e}`).join('\n')}\n`);
  process.exit(1);
}

console.log(`check:seo: ${pages.length} page(s) OK`);
