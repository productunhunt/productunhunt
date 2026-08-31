// Sitemap inputs for `astro.config.mjs`.
//
// The config is evaluated before the content layer exists, so this reads the
// idea frontmatter off disk instead of through `getCollection()`. That means
// three rules live here in duplicate; each one is noted at its source.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const IDEAS_DIR = new URL('../src/content/ideas/', import.meta.url);

/** Mirrors `TAG_INDEX_MIN_IDEAS` in `src/lib/tags.ts` — the tag pages below it
 *  render `noindex`, and a `noindex` URL has no business in a sitemap. */
const TAG_INDEX_MIN_IDEAS = 3;

/** Mirrors `tagSlug()` in `src/lib/tags.ts`. */
const tagSlug = (tag) =>
  tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Mirrors `isVisible()` in `src/lib/ideas.ts`: drafts ship everywhere except
 *  the production deploy, and they must never reach a production sitemap. */
const isVisible = (data) => !data.draft || process.env.CONTEXT !== 'production';

async function readIdeas() {
  const names = (await readdir(IDEAS_DIR)).filter(
    (name) => /\.mdx?$/.test(name) && !name.startsWith('_'),
  );

  const ideas = [];
  for (const name of names) {
    const { data } = matter(await readFile(new URL(name, IDEAS_DIR), 'utf8'));
    if (!isVisible(data)) continue;
    ideas.push({
      slug: path.basename(name, path.extname(name)),
      tags: data.tags ?? [],
      // Frontmatter dates come back as `Date` from YAML; a quoted one is a
      // string. `new Date(...)` handles both, and an unparseable value is
      // dropped rather than written to the sitemap as `Invalid Date`.
      changed: [data.updatedDate ?? data.publishDate]
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))[0],
    });
  }
  return ideas;
}

/**
 * @returns {Promise<{ exclude: Set<string>, lastmod: Map<string, string> }>}
 *   `exclude` holds site-root pathnames to keep out of the sitemap;
 *   `lastmod` maps a pathname to an ISO timestamp.
 */
export async function sitemapData() {
  const ideas = await readIdeas();

  const newest = (subset) => {
    const dates = subset.map((idea) => idea.changed).filter(Boolean);
    return dates.length ? new Date(Math.max(...dates)).toISOString() : undefined;
  };

  const exclude = new Set([
    // Client-side search over content that is already in the sitemap: nothing
    // for an index to hold on to, and it renders `noindex` to match.
    '/search/',
    // The form's success redirect. A dead end for anyone arriving from search,
    // and it renders `noindex` to match.
    '/submit/thanks/',
  ]);
  const lastmod = new Map();

  const siteChanged = newest(ideas);
  for (const pathname of ['/', '/ideas/']) {
    if (siteChanged) lastmod.set(pathname, siteChanged);
  }

  for (const idea of ideas) {
    if (idea.changed) lastmod.set(`/ideas/${idea.slug}/`, idea.changed.toISOString());
  }

  const tags = [...new Set(ideas.flatMap((idea) => idea.tags))];
  for (const tag of tags) {
    const tagged = ideas.filter((idea) => idea.tags.includes(tag));
    const pathname = `/ideas/tags/${tagSlug(tag)}/`;
    if (tagged.length < TAG_INDEX_MIN_IDEAS) {
      exclude.add(pathname);
      continue;
    }
    const changed = newest(tagged);
    if (changed) lastmod.set(pathname, changed);
  }

  return { exclude, lastmod };
}
