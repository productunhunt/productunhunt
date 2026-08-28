// Astro auto-discovers `src/actions/index.ts` and injects a non-prerendered
// RPC route for it, which is the only server code this site ships besides the
// counts endpoint.
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { and, gte, sql } from 'drizzle-orm';
import { getDb, type Db } from '../db/client';
import { readCountsFor } from '../db/queries';
import { votes } from '../db/schema';
import { POLL_OPTION_KEYS } from '../lib/poll';
import {
  VOTER_COOKIE,
  VOTER_COOKIE_OPTIONS,
  clientIp,
  hashIp,
  mintVoterId,
  verifyVoterId,
} from '../lib/voter';
// Written at `astro:config:setup` by `integrations/slug-manifest.mjs` and
// inlined by Vite. See that file for why the manifest cannot be produced any
// later — this import is the whole reason it exists.
import ideaSlugs from '../generated/idea-slugs.json';

const VALID_SLUGS: ReadonlySet<string> = new Set(ideaSlugs);

// Rate limit window and its two ceilings.
//
// Note what this actually bounds. The counters are over *rows touched* in the
// window, and one voter holds at most one row per idea, so this limits how
// many ideas an identity or an address can vote on in a minute — the breadth
// that ballot-stuffing needs. It does not throttle a voter flipping their
// verdict on a single idea over and over, which is deliberate: that rewrites
// one row and cannot move a count. Throttling it would need a separate
// request log, and there is nothing to protect.
//
// Both ceilings are generous. The target is a script, not a reader who
// disagrees with four ideas in a row.
const WINDOW_MS = 60_000;
const MAX_PER_VOTER = 10;
const MAX_PER_IP = 30;

async function assertUnderRateLimit(db: Db, voterId: string, ipHash: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS);

  // One round trip for both ceilings. `updatedAt` rather than `createdAt`:
  // changing a vote rewrites an existing row, and a limit that only counted
  // insertions would ignore an unbounded stream of changes.
  // Both aggregates are explicitly aliased: two bare `count(*)` expressions
  // would come back as two columns named `count`, and the result would only be
  // unambiguous by accident of how the driver shapes rows.
  const [row] = await db
    .select({
      byVoter: sql<number>`count(*) filter (where ${votes.voterId} = ${voterId})`
        .mapWith(Number)
        .as('by_voter'),
      byIp: sql<number>`count(*) filter (where ${votes.ipHash} = ${ipHash})`
        .mapWith(Number)
        .as('by_ip'),
    })
    .from(votes)
    .where(
      and(
        gte(votes.updatedAt, since),
        sql`(${votes.voterId} = ${voterId} or ${votes.ipHash} = ${ipHash})`,
      ),
    );

  if ((row?.byVoter ?? 0) >= MAX_PER_VOTER || (row?.byIp ?? 0) >= MAX_PER_IP) {
    throw new ActionError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Slow down. The ideas will still be bad in a minute.',
    });
  }
}

export const server = {
  vote: defineAction({
    input: z.object({
      slug: z.string(),
      option: z.enum(POLL_OPTION_KEYS),
    }),
    handler: async ({ slug, option }, context) => {
      // Validated against the build-time manifest, not the database: a slug is
      // real because an idea file exists, and nothing else.
      if (!VALID_SLUGS.has(slug)) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'No such idea.' });
      }

      const db = getDb();
      if (!db) {
        // No Neon provisioned. The poll shows its "voting is unavailable" line
        // and the page is otherwise untouched.
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Voting is unavailable right now.',
        });
      }

      // Identity is established here, by the action, because a prerendered
      // page has no response to set a cookie on. That is also why the poll
      // cannot highlight "your current choice" on a cold load — the first vote
      // is what creates the identity.
      const voterId = verifyVoterId(context.cookies.get(VOTER_COOKIE)?.value) ?? mintVoterId();
      const ipHash = hashIp(clientIp(context.request.headers));

      await assertUnderRateLimit(db, voterId, ipHash);

      // §9: a vote replaces the previous choice rather than adding to it. The
      // unique `(slug, voter_id)` index is what makes that one statement.
      await db
        .insert(votes)
        .values({ slug, option, voterId, ipHash })
        .onConflictDoUpdate({
          target: [votes.slug, votes.voterId],
          set: { option, ipHash, updatedAt: new Date() },
          // Re-clicking the option already held would otherwise bump
          // `updatedAt` and burn a rate-limit slot for no change.
          setWhere: sql`${votes.option} is distinct from ${option}`,
        });

      // Re-set on every vote, not only when minted: it refreshes the year-long
      // expiry for an active voter and is a no-op for the browser otherwise.
      context.cookies.set(VOTER_COOKIE, voterId, VOTER_COOKIE_OPTIONS);

      // Authoritative counts, straight back to the optimistic UI that just
      // guessed at them.
      return { counts: await readCountsFor(db, slug) };
    },
  }),
};
