// The batched vote-count read (§4). Every poll surface on a page funnels into
// one request here; see `src/scripts/counts.ts` for the collector.
import type { APIRoute } from 'astro';
import { getDb } from '../../db/client';
import { readCounts, type CountsBySlug } from '../../db/queries';
import ideaSlugs from '../../generated/idea-slugs.json';

// The only page-level opt-out in the project. Everything else is prerendered.
export const prerender = false;

const VALID_SLUGS: ReadonlySet<string> = new Set(ideaSlugs);

/** A feed page asks for twelve. The cap exists so a hand-written URL can't
 *  turn one request into an unbounded `IN (…)`; the client chunks to match. */
const MAX_SLUGS = 50;

const CACHE_HEADERS = {
  // Browser-only.
  'cache-control': 'public, max-age=30',
  // What actually drives Netlify's edge. Without this header the CDN would
  // fall back to the line above and cache far less aggressively.
  //
  // Deliberately no `Vary: Cookie`. §4 wants these counts edge-cached and §9
  // wants a reader's own vote reflected in the UI; varying on the cookie would
  // satisfy §9 and destroy the cache, since every voter carries a unique
  // `pu_vid`. So this response stays anonymous and shared, and the client
  // remembers its own choice in `localStorage` instead.
  'netlify-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const;

function json(body: CountsBySlug): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CACHE_HEADERS },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const requested = (url.searchParams.get('slugs') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  // Unknown slugs are dropped rather than rejected. A 400 for the whole batch
  // would blank the counts on eleven valid cards because a twelfth was stale,
  // and this endpoint is a read — there is nothing to protect by being strict.
  const slugs = [...new Set(requested)].filter((slug) => VALID_SLUGS.has(slug)).slice(0, MAX_SLUGS);

  const db = getDb();
  // No Neon: an empty object, with a 200 and the cache headers intact. The
  // client leaves the server-rendered empty copy exactly where it is.
  if (!db || slugs.length === 0) return json({});

  try {
    return json(await readCounts(db, slugs));
  } catch {
    // A database hiccup is not worth a 500 that a reader would see as a broken
    // page. No counts renders identically to no votes.
    return json({});
  }
};
