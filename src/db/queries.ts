import { count, inArray } from 'drizzle-orm';
import type { Db } from './client';
import { votes } from './schema';
import { isPollOptionKey, type Counts, type PollOptionKey } from '../lib/poll';

/** Counts for several ideas at once, keyed by slug then option. */
export type CountsBySlug = Record<string, Counts>;

/**
 * One `GROUP BY slug, option` for every slug asked about — the query the
 * `(slug, option)` index exists for. Slugs must already be manifest-validated
 * by the caller.
 *
 * Only non-zero pairs come back, so an idea nobody has voted on is simply
 * absent from the result rather than a map of six zeroes. `Counts` treats a
 * missing key as zero for exactly this reason.
 */
export async function readCounts(db: Db, slugs: string[]): Promise<CountsBySlug> {
  if (slugs.length === 0) return {};

  const rows = await db
    .select({ slug: votes.slug, option: votes.option, total: count() })
    .from(votes)
    .where(inArray(votes.slug, slugs))
    .groupBy(votes.slug, votes.option);

  const bySlug: CountsBySlug = {};
  for (const row of rows) {
    // A retired option key still sitting in old rows would have no label to
    // render. Dropping it here keeps it out of both the API and the totals.
    if (!isPollOptionKey(row.option)) continue;
    (bySlug[row.slug] ??= {})[row.option as PollOptionKey] = Number(row.total);
  }
  return bySlug;
}

/** Counts for a single idea — what the vote action returns to the caller. */
export async function readCountsFor(db: Db, slug: string): Promise<Counts> {
  return (await readCounts(db, [slug]))[slug] ?? {};
}
