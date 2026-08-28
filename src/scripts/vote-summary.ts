// `<pu-vote-summary>` — §6's compact verdict readout.
//
// Two callers, one element: the feed card asks for the top two plus the
// remainder line, and the idea page's "current mood" teaser (§7) asks for the
// leading reaction only, with no remainder. Both start as the server-rendered
// empty copy and are only ever replaced by real counts.

import { rankedOptions, totalVotes, type Counts } from '../lib/poll';
import { requestCounts } from './counts';

class VoteSummaryElement extends HTMLElement {
  #unsubscribe?: () => void;

  connectedCallback(): void {
    const slug = this.dataset.slug;
    if (!slug) return;
    this.#unsubscribe = requestCounts(slug, (counts) => this.#render(counts));
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #render(counts: Counts): void {
    const ranked = rankedOptions(counts);
    // Zero votes is the empty state, which is already on the page. Replacing
    // it with an empty list would be strictly worse.
    if (ranked.length === 0) return;

    const top = Math.max(1, Number(this.dataset.top) || 1);
    const leaders = ranked.slice(0, top);

    const list = document.createElement('ul');
    list.className = 'vote-summary-list';
    for (const { option, count } of leaders) {
      const row = document.createElement('li');

      const emoji = document.createElement('span');
      emoji.className = 'vote-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = option.emoji;

      const label = document.createElement('span');
      label.className = 'vote-label';
      label.textContent = option.label;

      const value = document.createElement('span');
      value.className = 'vote-count';
      value.textContent = String(count);

      row.append(emoji, label, value);
      list.append(row);
    }

    this.replaceChildren(list);

    if (this.dataset.remainder !== 'true') return;
    const shown = leaders.reduce((sum, entry) => sum + entry.count, 0);
    const remainder = totalVotes(counts) - shown;
    if (remainder <= 0) return;

    const others = document.createElement('p');
    others.className = 'vote-remainder';
    // The template arrives as a data attribute so the whole UI dictionary
    // doesn't have to be shipped to the browser for one string.
    others.textContent = (this.dataset.others ?? '+ {count}').replace('{count}', String(remainder));
    this.append(others);
  }
}

if (!customElements.get('pu-vote-summary')) {
  customElements.define('pu-vote-summary', VoteSummaryElement);
}
