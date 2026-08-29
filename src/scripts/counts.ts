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
// module-level state below safe to share.
//
// ## Subscriptions, not one-shot reads
//
// A registration stays live until its element disconnects, so counts can be
// *pushed* as well as pulled. That is what keeps the idea page honest: the
// vote action replies with fresh counts, the poll publishes them here, and the
// "current mood" teaser a few hundred pixels up the page hears about the
// verdict its reader just cast instead of insisting nobody has voted.
//
// ## Why a `Source`
//
// The two ways counts arrive are not equally trustworthy. `/api/counts` is
// deliberately anonymous and edge-cached (`s-maxage=60`, five more minutes of
// `stale-while-revalidate`), so it can be *minutes* behind and will not
// contain the reader's own vote. The vote action's reply is the one response
// on the page that certainly does. So a `fetch` result may not overwrite a
// recent `vote` result — without that rule a slow batch landing after a fast
// click silently un-casts the vote on screen. "Recent" is the whole subtlety;
// see `AUTHORITY_MS`.

import { isPollOptionKey, type Counts } from '../lib/poll';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const ENDPOINT = `${BASE}/api/counts`;

/** Mirrors the cap the Phase 6 endpoint enforces. A page with more surfaces
 *  than this splits into several requests rather than getting a 400. */
const MAX_SLUGS_PER_REQUEST = 50;

type Listener = (counts: Counts) => void;

/** Where a set of counts came from. See the note above — this is a trust
 *  ranking, not a label. */
type Source = 'fetch' | 'vote';

interface Entry {
  counts: Counts;
  /** When the vote action returned these, or `undefined` for a plain read.
   *  While it is recent they outrank anything fetched; see `AUTHORITY_MS`. */
  votedAt?: number;
}

/**
 * How long counts from the vote action outrank the cached read.
 *
 * Tied to the endpoint's own headers: `s-maxage=60` plus
 * `stale-while-revalidate=300` is six minutes in which the CDN may still be
 * serving a copy that predates this reader's vote. After that the shared
 * response has caught up and is the better source — a reader's own tally must
 * not be frozen at the moment they cast it while everyone else's votes arrive.
 */
const AUTHORITY_MS = 6 * 60 * 1000;

const isAuthoritative = (entry: Entry | undefined): boolean =>
  entry?.votedAt !== undefined && Date.now() - entry.votedAt < AUTHORITY_MS;

const subscribers = new Map<string, Set<Listener>>();
const latest = new Map<string, Entry>();
const pending = new Set<string>();
let flushHandle: ReturnType<typeof setTimeout> | undefined;

/** Where a reader's own tally outlives the page. `localStorage` rather than
 *  `sessionStorage` because a link opened in a second tab is a fresh session
 *  and would fall straight back to the stale CDN copy; the `AUTHORITY_MS`
 *  window is what keeps that from meaning "frozen forever". */
const storageKey = (slug: string) => `pu_counts:${slug}`;

function remember(slug: string, entry: Entry): void {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(entry));
  } catch {
    // Private mode, or storage disabled. The counts are still correct for the
    // life of this page; they just won't outlive it.
  }
}

function recall(slug: string): Entry | undefined {
  try {
    const stored = localStorage.getItem(storageKey(slug));
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as { counts?: unknown; votedAt?: unknown };
    const counts = sanitize(parsed?.counts);
    const votedAt = typeof parsed?.votedAt === 'number' ? parsed.votedAt : undefined;
    const entry = counts ? { counts, votedAt } : undefined;
    // Past the window the shared response is the better answer, so this stops
    // being worth keeping — and an idea read once should not leave a row in
    // storage forever.
    if (!isAuthoritative(entry)) {
      localStorage.removeItem(storageKey(slug));
      return undefined;
    }
    return entry;
  } catch {
    return undefined;
  }
}

/**
 * Ask for a slug's counts and keep hearing about them. The listener fires with
 * anything already known, then on every later publish, until the returned
 * unsubscribe is called from `disconnectedCallback`.
 *
 * It does not fire for a failed request, a missing endpoint, or an idea nobody
 * has voted on — all three leave the server-rendered empty copy exactly where
 * it is.
 */
export function requestCounts(slug: string, listener: Listener): () => void {
  const listeners = subscribers.get(slug) ?? new Set<Listener>();
  listeners.add(listener);
  subscribers.set(slug, listeners);

  const known = latest.get(slug) ?? recall(slug);
  if (known) {
    latest.set(slug, known);
    deliver(known.counts, [listener]);
  }

  // Nothing to ask the network for when this browser already holds counts that
  // include its own vote: the reply would be older than what is on screen.
  if (!isAuthoritative(known)) {
    pending.add(slug);
    schedule();
  }

  return () => {
    const current = subscribers.get(slug);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) subscribers.delete(slug);
  };
}

/**
 * Hand new counts to every surface showing this idea. Called by the poll with
 * the vote action's reply, and by this module with each batch that lands.
 */
export function publish(slug: string, counts: Counts, source: Source = 'vote'): void {
  if (source === 'fetch' && isAuthoritative(latest.get(slug))) return;

  const entry: Entry = { counts, votedAt: source === 'vote' ? Date.now() : undefined };
  latest.set(slug, entry);
  if (source === 'vote') remember(slug, entry);
  deliver(counts, subscribers.get(slug));
}

function deliver(counts: Counts, listeners: Iterable<Listener> | undefined): void {
  // Copied before iterating: a listener is free to unsubscribe itself.
  for (const listener of [...(listeners ?? [])]) {
    try {
      listener(counts);
    } catch {
      // One component throwing must not strand the rest of the page.
    }
  }
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
  pending.clear();
  if (flushHandle === undefined) return;
  clearTimeout(flushHandle);
  flushHandle = undefined;
}

function flush(): void {
  flushHandle = undefined;
  if (pending.size === 0) return;

  // Snapshot and clear before awaiting: anything registered while the request
  // is in flight belongs to the next batch, not this one.
  const slugs = [...pending];
  pending.clear();

  for (let index = 0; index < slugs.length; index += MAX_SLUGS_PER_REQUEST) {
    void fetchChunk(slugs.slice(index, index + MAX_SLUGS_PER_REQUEST));
  }
}

async function fetchChunk(slugs: string[]): Promise<void> {
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
    publish(slug, counts, 'fetch');
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
// that follows — so this drops the outgoing page's *unsent* work without ever
// touching the incoming page's. Subscribers are not cleared here: each element
// removes its own in `disconnectedCallback`, and `latest` deliberately
// survives the navigation so returning to an idea shows the verdict this
// browser already cast rather than the CDN's older opinion of it.
document.addEventListener('astro:before-swap', reset);
