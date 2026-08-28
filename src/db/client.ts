import { DATABASE_URL } from 'astro:env/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Db = ReturnType<typeof create>;

function create(url: string) {
  // `neon-http` rather than the WebSocket driver: every query this site runs
  // is a single statement, and the pooled HTTP driver has no connection to
  // establish or tear down per invocation. The WebSocket driver only buys
  // interactive transactions, which nothing here needs.
  return drizzle(neon(url), { schema });
}

let cached: Db | null | undefined;

/**
 * The database, or `null` when no `DATABASE_URL` is configured.
 *
 * The null is load-bearing, not defensive: Neon is not provisioned yet, and
 * the site is required to build and serve without it. Every caller handles
 * null by degrading — the counts endpoint returns `{}`, the vote action
 * returns `SERVICE_UNAVAILABLE`, and the poll keeps its server-rendered empty
 * copy. Any new caller must do the same.
 *
 * Cached across invocations because a warm Netlify Function reuses the module
 * scope; `undefined` means "not yet resolved", `null` means "resolved to no
 * database", which is why this is not a plain `??=`.
 */
export function getDb(): Db | null {
  if (cached === undefined) {
    cached = DATABASE_URL ? create(DATABASE_URL) : null;
  }
  return cached;
}
