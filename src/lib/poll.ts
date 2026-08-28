// The community verdict's frozen six (§9).
//
// **`key` is the database value.** It is written into `votes.option` on every
// row, so an option may never be reordered, renamed, or removed after launch —
// doing so silently re-labels or orphans every vote already cast. Adding a
// seventh is the only safe change, and even that retires the "six options"
// copy.
//
// This module is the single source of truth for three consumers: `Poll.astro`
// and `VoteSummary.astro` (display), the vote action's Zod enum (validation),
// and the counts endpoint (the `GROUP BY` result shape).
//
// The labels live here rather than in `src/i18n/en.ts` on purpose. They are
// welded to their keys — a label that drifts away from the key it describes
// re-labels historical votes just as surely as renaming the key would — and
// keeping the pair on one line is what makes that impossible to do by
// accident. Everything else the poll renders is UI chrome and stays in the
// dictionary.

export interface PollOption {
  /** Stored in the database. Frozen forever. */
  key: string;
  /** Displayed. Frozen in practice, for the reason above. */
  label: string;
  /** Decorative only — always paired with the label, never the sole meaning. */
  emoji: string;
}

export const POLL_OPTIONS = [
  { key: 'trophy', label: 'Deserves a Trophy for Ridiculous', emoji: '🏆' },
  { key: 'stay-unbuilt', label: 'Should Stay Unbuilt', emoji: '🚫' },
  { key: 'genius', label: 'Accidentally Genius', emoji: '💡' },
  { key: 'sleep', label: 'Founder needs sleep', emoji: '😴' },
  { key: 'someone-will', label: 'Someone will build this', emoji: '🔮' },
  { key: 'would-pay', label: 'Unfortunately, I’d pay', emoji: '💸' },
] as const satisfies readonly PollOption[];

export type PollOptionKey = (typeof POLL_OPTIONS)[number]['key'];

/** The keys alone — the shape the action's Zod enum and the endpoint want. */
export const POLL_OPTION_KEYS = POLL_OPTIONS.map((option) => option.key) as [
  PollOptionKey,
  ...PollOptionKey[],
];

const KEY_SET: ReadonlySet<string> = new Set<string>(POLL_OPTION_KEYS);

export function isPollOptionKey(value: unknown): value is PollOptionKey {
  return typeof value === 'string' && KEY_SET.has(value);
}

/** Counts for one idea, keyed by option. Absent means zero — the endpoint only
 *  returns rows that exist, so a brand-new idea comes back as `{}`. */
export type Counts = Partial<Record<PollOptionKey, number>>;

export const totalVotes = (counts: Counts): number =>
  Object.values(counts).reduce((sum: number, count) => sum + (count ?? 0), 0);

/** Options that actually have votes, most first, with `POLL_OPTIONS` order as
 *  the tie-break so a 3–3 split doesn't reshuffle between renders. */
export function rankedOptions(counts: Counts): { option: PollOption; count: number }[] {
  return POLL_OPTIONS.map((option) => ({ option, count: counts[option.key] ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
