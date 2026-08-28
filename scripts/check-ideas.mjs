// Content lint for `src/content/ideas/`.
//
// The five body sections of §8 are Markdown headings, not schema fields — that
// keeps MDX formatting, Pagefind sub-results and the page TOC working. This
// script is what turns "required" from a convention into a build failure.
//
// It also guards the Phase 6 slug manifest against drift: the manifest is
// written at `astro:config:setup` by a small re-implementation of the draft
// rule, so something has to assert it still agrees with the collection.
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const IDEAS_DIR = fileURLToPath(new URL('../src/content/ideas/', import.meta.url));
const MANIFEST = fileURLToPath(new URL('../src/generated/idea-slugs.json', import.meta.url));

/** §8, in order. The check is order-sensitive: a roast that reaches the reality
 *  check before the delusion is a structural edit, not a lint nit. */
const REQUIRED_SECTIONS = [
  'The Pitch',
  'The Delusion',
  'The Reality Check',
  'Why It Stays Unbuilt',
  'Unwanted Bonus',
];

/** Mirrors the glob loader's `**\/[^_]*.{md,mdx}` pattern. */
function isIdeaFile(name) {
  return /\.mdx?$/.test(name) && !name.startsWith('_');
}

/** Same rule as `src/lib/ideas.ts` — drafts are visible everywhere except the
 *  production deploy, so that is the only place they are exempt from the lint. */
function isVisible(data) {
  return !data.draft || process.env.CONTEXT !== 'production';
}

async function readIdeas() {
  let entries;
  try {
    entries = await readdir(IDEAS_DIR, { recursive: true, withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const ideas = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isIdeaFile(entry.name)) continue;
    const path = `${entry.parentPath.replace(/\/$/, '')}/${entry.name}`;
    const { data, content } = matter(await readFile(path, 'utf8'));
    ideas.push({
      slug: path.slice(IDEAS_DIR.length).replace(/\.mdx?$/, ''),
      file: `src/content/ideas/${path.slice(IDEAS_DIR.length)}`,
      data,
      content,
    });
  }
  return ideas.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The `## ` headings of a body, in document order. */
function headings(content) {
  return [...content.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)].map((match) => match[1]);
}

function checkSections(idea, errors) {
  const found = headings(idea.content);
  let cursor = 0;
  for (const section of REQUIRED_SECTIONS) {
    const at = found.indexOf(section, cursor);
    if (at === -1) {
      errors.push(
        found.includes(section)
          ? `${idea.file}: "## ${section}" is out of order (expected after "## ${REQUIRED_SECTIONS[REQUIRED_SECTIONS.indexOf(section) - 1]}")`
          : `${idea.file}: missing required section "## ${section}"`,
      );
      return;
    }
    cursor = at + 1;
  }
}

/** A `relapse` block and `unbuilt` status must never coexist — the evidence
 *  contradicts the plea. The schema's superRefine enforces the same invariant
 *  at build time; this repeats it here so `check:ideas` fails on its own, with
 *  a message that names the file. */
function checkRelapse(idea, errors) {
  const { relapse, status } = idea.data;
  if (relapse && status !== 'author-relapsed') {
    errors.push(
      `${idea.file}: has a \`relapse\` block but \`status: ${status}\` — a documented relapse requires \`status: author-relapsed\``,
    );
  }
  if (!relapse && status === 'author-relapsed') {
    errors.push(
      `${idea.file}: \`status: author-relapsed\` without a \`relapse\` block — no evidence, no conviction`,
    );
  }
}

async function checkManifest(visible, errors) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch (error) {
    // The manifest is a build artefact (gitignored). Absent means the build
    // hasn't run yet, which is not a content error.
    if (error.code === 'ENOENT') return;
    throw error;
  }

  const expected = visible.map((idea) => idea.slug).sort();
  const actual = [...manifest].sort();
  if (expected.join('\n') !== actual.join('\n')) {
    errors.push(
      `src/generated/idea-slugs.json is out of sync with the collection.\n` +
        `  only in manifest:   ${actual.filter((s) => !expected.includes(s)).join(', ') || '—'}\n` +
        `  only in collection: ${expected.filter((s) => !actual.includes(s)).join(', ') || '—'}`,
    );
  }
}

const ideas = await readIdeas();
const visible = ideas.filter((idea) => isVisible(idea.data));
const errors = [];

for (const idea of visible) {
  checkSections(idea, errors);
  checkRelapse(idea, errors);
}
await checkManifest(visible, errors);

if (errors.length > 0) {
  console.error(`check:ideas failed\n\n${errors.map((e) => `  ${e}`).join('\n')}\n`);
  process.exit(1);
}

console.log(`check:ideas: ${visible.length} idea(s) OK`);
