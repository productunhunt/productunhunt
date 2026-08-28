/** The closed tag vocabulary (§8). No free-typed tags in v1: the collection
 *  schema validates against this list, so adding a tag here is the only way to
 *  make one usable — and removing one turns every idea that uses it into a
 *  build error rather than a silent orphan.
 *
 *  Order is the display order of the filter row. */
export const OFFICIAL_TAGS = [
  'AI nonsense',
  'SaaS',
  'Dating',
  'Marketplace',
  'Hardware',
  'B2B',
  'Consumer',
  'Social',
  'Who asked?',
  'Local',
  'Climate',
  'Health',
  'Fintech',
  'Creator economy',
] as const;

export type OfficialTag = (typeof OFFICIAL_TAGS)[number];

/** URL-safe form of a tag, used for `/ideas/tags/<slug>/`.
 *
 *  Not cosmetic: `Who asked?` and `AI nonsense` cannot survive as raw path
 *  segments, so every link and every `getStaticPaths` param goes through here. */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Reverse of `tagSlug`, resolved against the closed list.
 *  Returns `undefined` for anything that isn't an official tag. */
export function tagFromSlug(slug: string): OfficialTag | undefined {
  return OFFICIAL_TAGS.find((tag) => tagSlug(tag) === slug);
}

/** The official tags that actually have published ideas behind them, in
 *  `OFFICIAL_TAGS` order. §8: the UI only ever surfaces tags that are in use,
 *  so filter rows and tag pages never offer a dead end. */
export function usedTags(ideas: readonly { data: { tags: readonly string[] } }[]): OfficialTag[] {
  const used = new Set(ideas.flatMap((idea) => idea.data.tags));
  return OFFICIAL_TAGS.filter((tag) => used.has(tag));
}
