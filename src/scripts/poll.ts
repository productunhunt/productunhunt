// `<pu-poll>` — the community verdict island (§9).
//
// Deliberately a vanilla custom element. Adding a framework integration for
// six radio-ish buttons and one fetch would mean a renderer, a hydration
// directive, and ~10 KB of runtime to produce markup Astro already emits
// statically — and the no-JavaScript rendering would get worse, not better.
//
// The server renders all six options; this script never rebuilds that markup,
// it only updates counts, bars, pressed state, and which buttons are live. So
// the no-JS page and the upgraded page are the same DOM.

import { actions } from 'astro:actions';
import { POLL_OPTIONS, totalVotes, type Counts, type PollOptionKey } from '../lib/poll';
import { publish, requestCounts, sanitize } from './counts';

/** Where the visitor's own choice is remembered. Written only after the server
 *  has accepted the vote, so its presence means "this browser has a verdict on
 *  record", which is what the lock below keys off. The signed cookie remains
 *  the server's identity; this is the client's memory of the outcome, needed
 *  because the counts response is edge-cached and therefore anonymous. */
const choiceKey = (slug: string) => `pu_vote:${slug}`;

function readChoice(slug: string): PollOptionKey | undefined {
  try {
    const stored = localStorage.getItem(choiceKey(slug));
    return POLL_OPTIONS.some((option) => option.key === stored)
      ? (stored as PollOptionKey)
      : undefined;
  } catch {
    // Private mode, or storage disabled entirely. The poll still works; it
    // just can't highlight a previous verdict.
    return undefined;
  }
}

function writeChoice(slug: string, option: PollOptionKey): void {
  try {
    localStorage.setItem(choiceKey(slug), option);
  } catch {
    /* see above */
  }
}

class PollElement extends HTMLElement {
  #unsubscribe?: () => void;
  #counts: Counts = {};
  #choice?: PollOptionKey;
  #pending = false;
  #error?: string;
  #slug = '';

  connectedCallback(): void {
    const slug = this.dataset.slug;
    if (!slug) return;
    this.#slug = slug;
    this.#choice = readChoice(slug);

    for (const button of this.#buttons()) {
      button.addEventListener('click', this.#onClick);
    }

    // The buttons ship `disabled` from the server — without this script a
    // click could not do anything, and an enabled-looking button that silently
    // ignores you is worse than one that says it is not available. `#render`
    // is what decides which of them come alive, because that answer depends on
    // whether this browser has already voted.
    this.#render();
    this.#unsubscribe = requestCounts(slug, (counts) => {
      this.#counts = counts;
      this.#render();
    });
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    for (const button of this.#buttons()) {
      button.removeEventListener('click', this.#onClick);
    }
  }

  #buttons(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('button[data-option]')];
  }

  #onClick = (event: Event): void => {
    const button = (event.currentTarget as HTMLButtonElement | null)?.dataset.option;
    if (button) void this.#vote(button as PollOptionKey);
  };

  async #vote(option: PollOptionKey): Promise<void> {
    // One verdict per browser: once a vote is on record the other five are
    // disabled, so this is only ever reached by a stray programmatic click or
    // by the option already held. Both are no-ops rather than a round trip.
    if (this.#pending || this.#choice) return;

    const previousCounts = this.#counts;
    this.#pending = true;
    this.#error = undefined;

    // Optimistic. A copy rather than a mutation: `#counts` is the same object
    // every other surface on the page was handed, and editing it in place
    // would edit theirs.
    this.#counts = { ...previousCounts };
    this.#counts[option] = (this.#counts[option] ?? 0) + 1;
    this.#choice = option;
    this.#render();

    try {
      const { data, error } = await actions.vote({ slug: this.#slug, option });
      if (error) throw error;
      writeChoice(this.#slug, option);
      // The action returns authoritative counts; prefer them over the guess —
      // but only when they contain something. A vote that just succeeded
      // cannot leave a total of zero, so an empty payload means the response
      // was shaped wrong, and adopting it would blank a poll that has votes.
      //
      // Published rather than assigned: these are the only counts on the page
      // known to include this reader, and the mood teaser wants them too.
      const fresh = sanitize((data as { counts?: unknown } | undefined)?.counts);
      if (fresh && totalVotes(fresh) > 0) publish(this.#slug, fresh);
    } catch (error) {
      this.#counts = previousCounts;
      this.#choice = undefined;
      this.#error = this.#messageFor((error as { code?: string } | null)?.code);
    } finally {
      this.#pending = false;
      this.#render();
    }
  }

  /** The server's own message is deliberately not shown: §9's copy lives in
   *  the dictionary, and an unrecognised code should read as a plain failure
   *  rather than leaking whatever the action happened to throw. */
  #messageFor(code: string | undefined): string {
    if (code === 'SERVICE_UNAVAILABLE') return this.dataset.unavailable ?? '';
    if (code === 'TOO_MANY_REQUESTS') return this.dataset.tooMany ?? '';
    return this.dataset.failed ?? '';
  }

  #render(): void {
    const total = totalVotes(this.#counts);
    // A verdict on record locks the poll: the choice stands, and the five it
    // was chosen over stop being offers.
    const locked = this.#choice !== undefined;

    for (const button of this.#buttons()) {
      const key = button.dataset.option as PollOptionKey;
      const count = this.#counts[key] ?? 0;
      const chosen = this.#choice === key;

      button.disabled = this.#pending || (locked && !chosen);
      button.setAttribute('aria-pressed', String(chosen));
      button.querySelector('[data-count]')!.textContent = total > 0 ? String(count) : '';
      // Share of the total, not of the leader: the proportions are the point
      // of a verdict poll, and inflating them to fill the row would misreport
      // a six-way split as a landslide.
      const share = total > 0 ? (count / total) * 100 : 0;
      button.querySelector<HTMLElement>('[data-bar]')!.style.width = `${share.toFixed(1)}%`;
      button.querySelector<HTMLElement>('[data-your-vote]')!.hidden = !chosen;
      button.querySelector<HTMLElement>('[data-action]')!.textContent = chosen
        ? 'Selected ✓'
        : locked
          ? 'Locked'
          : 'Choose';
    }

    if (this.#error) {
      this.#setStatus(this.#error, true);
      return;
    }
    if (total === 0) {
      this.#setStatus(this.dataset.empty ?? '', false);
      return;
    }
    const template = total === 1 ? this.dataset.votesOne : this.dataset.votes;
    this.#setStatus((template ?? '').replace('{count}', String(total)), false);
  }

  #setStatus(text: string, isError: boolean): void {
    const status = this.querySelector<HTMLElement>('[data-poll-status]');
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  }
}

if (!customElements.get('pu-poll')) {
  customElements.define('pu-poll', PollElement);
}
