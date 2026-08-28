// Writes `src/generated/idea-slugs.json` — the build-time list of valid idea
// slugs that the *runtime* vote action validates against (§4).
//
// ## Why this is an integration and not a script
//
// The action ships as a Netlify Function. At request time it has no content
// store to consult, and it can only read a file that Vite saw while bundling
// the server. So the manifest has to exist *before Vite resolves anything*.
// Every more obvious option fails:
//
//   - `astro:build:done` — too late. The server bundle is already written, so
//     the function ships with whatever the previous build left behind.
//   - a `prebuild` npm script — `astro dev` never runs it, so dev validates
//     against a stale file and the two environments disagree.
//   - importing `astro:content` inside the action — appears to work in `astro
//     dev` (the content store is in-process) and fails in production.
//
// `astro:config:setup` is the one hook that fires before Vite in *both* dev
// and build. Its cost: collections aren't loaded yet, so `getCollection()` is
// unavailable and the glob + draft rule have to be re-implemented here against
// the raw files. `scripts/check-ideas.mjs` asserts the result still matches
// the collection, which is what keeps that duplication honest.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const CONTENT_DIR = 'src/content/ideas/';
const OUTPUT_FILE = 'src/generated/idea-slugs.json';

/** Mirrors the glob loader's `**\/[^_]*.{md,mdx}` pattern in `content.config.ts`. */
function isIdeaFile(name) {
  return /\.mdx?$/.test(name) && !name.startsWith('_');
}

/** Mirrors `isVisible()` in `src/lib/ideas.ts`. Netlify sets `CONTEXT` to
 *  `production` only on the production deploy, so drafts stay votable on
 *  deploy previews and in local dev. */
function isVisible(data) {
  return !data?.draft || process.env.CONTEXT !== 'production';
}

/** Slugs of every idea this build should accept votes for, sorted so the file
 *  is stable across filesystem orderings. */
async function collectSlugs(contentDir) {
  let entries;
  try {
    entries = await readdir(contentDir, { recursive: true, withFileTypes: true });
  } catch (error) {
    // No ideas yet is a legitimate state — a fresh checkout, or the very first
    // build of an empty content directory. An empty manifest rejects every
    // vote, which is the correct behaviour when there is nothing to vote on.
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const slugs = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isIdeaFile(entry.name)) continue;
    const path = `${entry.parentPath.replace(/\/$/, '')}/${entry.name}`;
    const { data } = matter(await readFile(path, 'utf8'));
    if (!isVisible(data)) continue;
    // The glob loader derives `entry.id` from the path relative to `base`,
    // minus the extension. Nested directories keep their separator.
    slugs.push(path.slice(contentDir.length).replace(/\.mdx?$/, ''));
  }
  return slugs.sort();
}

/** Writes only when the content actually changed. In dev the manifest lives
 *  under `src/` and is imported by the actions module, so an unconditional
 *  write on every content save would fire an HMR round trip for nothing. */
async function writeManifest(outputFile, slugs) {
  const next = `${JSON.stringify(slugs, null, 2)}\n`;
  try {
    if ((await readFile(outputFile, 'utf8')) === next) return false;
  } catch {
    // Missing or unreadable: fall through and write it.
  }
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, next, 'utf8');
  return true;
}

/** @returns {import('astro').AstroIntegration} */
export default function slugManifest() {
  let contentDir;
  let outputFile;

  async function regenerate(logger) {
    const slugs = await collectSlugs(contentDir);
    const wrote = await writeManifest(outputFile, slugs);
    if (wrote) logger.info(`idea slug manifest: ${slugs.length} slug(s)`);
    return slugs;
  }

  return {
    name: 'pu-slug-manifest',
    hooks: {
      // Before Vite resolves anything, in dev and in build alike.
      'astro:config:setup': async ({ config, logger }) => {
        contentDir = fileURLToPath(new URL(CONTENT_DIR, config.root));
        outputFile = fileURLToPath(new URL(OUTPUT_FILE, config.root));
        await regenerate(logger);
      },
      // Dev only: adding, renaming or un-drafting an idea has to make it
      // votable without a restart, or dev disagrees with build again.
      'astro:server:setup': ({ server, logger }) => {
        const onChange = (path) => {
          if (!path.startsWith(contentDir) || !isIdeaFile(basename(path))) return;
          void regenerate(logger);
        };
        server.watcher.on('add', onChange);
        server.watcher.on('change', onChange);
        server.watcher.on('unlink', onChange);
      },
    },
  };
}
