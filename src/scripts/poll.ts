// `<pu-poll>` — the community verdict island (§9).
//
// Deliberately a vanilla custom element. Adding a framework integration for
// six radio-ish buttons and one fetch would mean a renderer, a hydration
// directive, and ~10 KB of runtime to produce markup Astro already emits
// statically — and the no-JavaScript rendering would get worse, not better.
//
// The server renders all six options; this script never rebuilds that markup,
// it only updates counts, bars, and pressed state. So the no-JS page and the
// upgraded page are the same DOM.

import { actions } from 'astro:actions';
import { POLL_OPTIONS, totalVotes, type Counts, type PollOptionKey } from '../lib/poll';
import { requestCounts, sanitize } from './counts';

/** Where the visitor's own choice is remembered. Purely a UI hint: the
 *  server's signed cookie is the real identity, and the counts response is
 *  edge-cached and therefore anonymous (§4 vs §9 — the cache wins, so the
 *  client has to remember this for itself). */
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
  #slug = '';

  connectedCallback(): void {
    const slug = this.dataset.slug;
    if (!slug) return;
    this.#slug = slug;
    this.#choice = readChoice(slug);

    // Server-rendered disabled, enabled here: without this script a click
    // could not do anything, and an enabled-looking button that silently
    // ignores you is worse than one that says it is not available.
    for (const button of this.#buttons()) {
      button.disabled = false;
      button.addEventListener('click', this.#onClick);
    }

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
    // §9 allows changing a vote, but re-clicking the option you already hold
    // is a no-op rather than a round trip that changes nothing.
    if (this.#pending || this.#choice === option) return;

    const previousCounts = { ...this.#counts };
    const previousChoice = this.#choice;
    this.#pending = true;

    // Optimistic: the new choice replaces the old one, exactly as the action's
    // upsert will (§9 — a vote replaces the previous choice, it does not add).
    if (previousChoice) {
      this.#counts[previousChoice] = Math.max(0, (this.#counts[previousChoice] ?? 1) - 1);
    }
    this.#counts[option] = (this.#counts[option] ?? 0) + 1;
    this.#choice = option;
    this.#render();

    try {
      const { data, error } = await actions.vote({ slug: this.#slug, option });
      if (error) throw error;
      // The action returns authoritative counts; prefer them over the guess —
      // but only when they contain something. A vote that just succeeded
      // cannot leave a total of zero, so an empty payload means the response
      // was shaped wrong, and adopting it would blank a poll that has votes.
      const fresh = sanitize((data as { counts?: unknown } | undefined)?.counts);
      if (fresh && totalVotes(fresh) > 0) this.#counts = fresh;
      writeChoice(this.#slug, option);
      this.#render();
    } catch (error) {
      this.#counts = previousCounts;
      this.#choice = previousChoice;
      this.#render();
      const code = (error as { code?: string } | null)?.code;
      this.#setStatus(
        code === 'SERVICE_UNAVAILABLE'
          ? (this.dataset.unavailable ?? '')
          : (this.dataset.failed ?? ''),
        true,
      );
    } finally {
      this.#pending = false;
    }
  }

  #render(): void {
    const total = totalVotes(this.#counts);

    for (const button of this.#buttons()) {
      const key = button.dataset.option as PollOptionKey;
      const count = this.#counts[key] ?? 0;
      const chosen = this.#choice === key;

      button.setAttribute('aria-pressed', String(chosen));
      button.querySelector('[data-count]')!.textContent = total > 0 ? String(count) : '';
      // Share of the total, not of the leader: the proportions are the point
      // of a verdict poll, and inflating them to fill the row would misreport
      // a six-way split as a landslide.
      const share = total > 0 ? (count / total) * 100 : 0;
      button.querySelector<HTMLElement>('[data-bar]')!.style.width = `${share.toFixed(1)}%`;
      button.querySelector<HTMLElement>('[data-your-vote]')!.hidden = !chosen;
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
