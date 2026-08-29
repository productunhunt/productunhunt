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

/** Newest first, then the editor's launch-day sequence. The final id tie-break
 *  makes archives, feeds, and related-idea lists deterministic even when an
 *  unranked future batch shares a date. */
export function byNewest(a: Idea, b: Idea): number {
  const byDate = b.data.publishDate.getTime() - a.data.publishDate.getTime();
  if (byDate !== 0) return byDate;

  const aOrder = a.data.launchOrder ?? Number.POSITIVE_INFINITY;
  const bOrder = b.data.launchOrder ?? Number.POSITIVE_INFINITY;
  return aOrder - bOrder || a.id.localeCompare(b.id);
}

/** Every idea that should be visible in this build, newest first.
 *  The single entry point for all idea routes — no route filters drafts itself. */
export async function getPublishedIdeas(): Promise<Idea[]> {
  return (await getCollection('ideas', isVisible)).sort(byNewest);
}
