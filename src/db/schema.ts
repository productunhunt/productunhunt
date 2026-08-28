import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Every vote ever cast. One table, no `ideas` table (§9): ideas live in the
 * content collection, and the build-time slug manifest is what decides whether
 * a slug is real — a second copy in Postgres would only be able to drift.
 */
export const votes = pgTable(
  'votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Content collection `entry.id`. Validated against the slug manifest
     *  before any row is written, so this is never free-form user input. */
    slug: text('slug').notNull(),
    /** A `POLL_OPTIONS` key. Stored raw rather than as a Postgres enum: the
     *  six are frozen in `src/lib/poll.ts`, and a `pgEnum` would turn adding a
     *  seventh into a migration that locks the table. */
    option: text('option').notNull(),
    /** The HMAC-signed `pu_vid` cookie value. Anonymous — it identifies a
     *  browser, nothing else. */
    voterId: text('voter_id').notNull(),
    /** `sha256(IP_SALT + ip)`. The raw IP is never persisted (§9); this exists
     *  only so rate limiting survives a cleared cookie. */
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // §9's "a new vote replaces the previous choice" — this constraint is what
    // the action's `ON CONFLICT … DO UPDATE` targets, so one browser can only
    // ever hold one opinion per idea.
    uniqueIndex('votes_slug_voter_idx').on(table.slug, table.voterId),
    // The counts endpoint's `GROUP BY slug, option` reads from this alone.
    index('votes_slug_option_idx').on(table.slug, table.option),
    // The rate limiter's "how many rows from this address in the last minute".
    index('votes_ip_recent_idx').on(table.ipHash, table.updatedAt),
  ],
);

export type Vote = typeof votes.$inferSelect;
