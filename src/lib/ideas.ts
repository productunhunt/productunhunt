import { getCollection, type CollectionEntry } from 'astro:content';

export type Idea = CollectionEntry<'ideas'>;

/** §8's draft rule, in one place.
 *
 *  Netlify sets `CONTEXT` to `production` only on the production deploy, so
 *  drafts stay visible on deploy previews and in local dev with no extra
 *  preview infrastructure. `import.meta.env.PROD` would be wrong here — it is
 *  true for every build, which would hide drafts on the previews that exist
 *  precisely to review them. */
export function isVisible(idea: Idea): boolean {
  return !idea.data.draft || process.env.CONTEXT !== 'production';
}

/** Newest first. The one ordering used by the homepage, the archive, tag pages
 *  and the feed, so "the first card" means the same thing everywhere. */
export function byNewest(a: Idea, b: Idea): number {
  return b.data.publishDate.getTime() - a.data.publishDate.getTime();
}

/** Every idea that should be visible in this build, newest first.
 *  The single entry point for all idea routes — no route filters drafts itself. */
export async function getPublishedIdeas(): Promise<Idea[]> {
  return (await getCollection('ideas', isVisible)).sort(byNewest);
}
