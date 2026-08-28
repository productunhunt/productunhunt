// The batched vote-count collector (§4).
//
// Every poll surface on a page — twelve cards on a feed, or one poll plus its
// mood teaser on an idea page — registers its slug here instead of fetching
// for itself. Registrations made in the same task are coalesced into a single
// `GET /api/counts?slugs=…`, which is the whole reason §4 specifies a batched
// endpoint rather than a per-idea one.
//
// This module is imported by the hoisted `<script>` of both `Poll.astro` and
// `VoteSummary.astro`. ES module semantics mean it is instantiated exactly
// once no matter how many components pull it in, which is what makes the
// module-level queue below safe to share.

import { isPollOptionKey, type Counts } from '../lib/poll';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const ENDPOINT = `${BASE}/api/counts`;

/** Mirrors the cap the Phase 6 endpoint enforces. A page with more surfaces
 *  than this splits into several requests rather than getting a 400. */
const MAX_SLUGS_PER_REQUEST = 50;

type Listener = (counts: Counts) => void;

const waiting = new Map<string, Set<Listener>>();
let flushHandle: ReturnType<typeof setTimeout> | undefined;

/**
 * Ask for a slug's counts. The listener fires at most once per registration,
 * and only when real counts come back — a failed request, a missing endpoint,
 * or an idea nobody has voted on all leave the server-rendered empty copy
 * exactly where it is.
 *
 * Returns an unsubscribe for `disconnectedCallback`.
 */
export function requestCounts(slug: string, listener: Listener): () => void {
  const listeners = waiting.get(slug) ?? new Set<Listener>();
  listeners.add(listener);
  waiting.set(slug, listeners);
  schedule();

  return () => {
    const current = waiting.get(slug);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) waiting.delete(slug);
  };
}

function schedule(): void {
  if (flushHandle !== undefined) return;
  // A timeout rather than a microtask: custom elements upgrade as the parser
  // reaches them, so the last card on a long feed registers well after the
  // first. A task boundary is late enough to catch all of them and still
  // early enough to be indistinguishable from an immediate fetch.
  flushHandle = setTimeout(flush, 0);
}

function reset(): void {
  waiting.clear();
  if (flushHandle === undefined) return;
  clearTimeout(flushHandle);
  flushHandle = undefined;
}

function flush(): void {
  flushHandle = undefined;
  if (waiting.size === 0) return;

  // Snapshot and clear before awaiting: anything registered while the request
  // is in flight belongs to the next batch, not this one.
  const batch = new Map(waiting);
  waiting.clear();

  const slugs = [...batch.keys()];
  for (let index = 0; index < slugs.length; index += MAX_SLUGS_PER_REQUEST) {
    void fetchChunk(slugs.slice(index, index + MAX_SLUGS_PER_REQUEST), batch);
  }
}

async function fetchChunk(slugs: string[], batch: Map<string, Set<Listener>>): Promise<void> {
  let payload: unknown;
  try {
    const url = `${ENDPOINT}?slugs=${encodeURIComponent(slugs.join(','))}`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    // A 404 (no endpoint deployed), a 400, or a 500 are all the same to the
    // reader: no counts, and the deadpan empty line stays.
    if (!response.ok) return;
    payload = await response.json();
  } catch {
    return;
  }

  if (typeof payload !== 'object' || payload === null) return;
  const byslug = payload as Record<string, unknown>;

  for (const slug of slugs) {
    const counts = sanitize(byslug[slug]);
    if (!counts) continue;
    for (const listener of batch.get(slug) ?? []) {
      try {
        listener(counts);
      } catch {
        // One component throwing must not strand the rest of the page.
      }
    }
  }
}

/**
 * Trust nothing from the wire. An option key that isn't one of the frozen six
 * — a retired key still sitting in old rows, say — is dropped rather than
 * rendered as an unlabelled bar.
 */
export function sanitize(value: unknown): Counts | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const counts: Counts = {};
  for (const [key, count] of Object.entries(value)) {
    if (!isPollOptionKey(key)) continue;
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) continue;
    counts[key] = Math.floor(count);
  }
  return counts;
}

// The reset the view transition needs. `astro:before-swap` fires while the old
// DOM is still in place, and the new page's elements register during the swap
// that follows — so this drops the outgoing page's pending work without ever
// touching the incoming page's. Without it, navigating away from a feed
// mid-flight leaves a queue keyed by slugs whose elements are gone, and the
// response lands on detached nodes.
document.addEventListener('astro:before-swap', reset);
