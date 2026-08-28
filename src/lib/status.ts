import type { STATUSES } from '../content.config';

export type Status = (typeof STATUSES)[number];

/** §8's three badges. The key is what lives in frontmatter; the label is the
 *  only thing a reader ever sees. */
export const STATUS_LABEL: Record<Status, string> = {
  unbuilt: 'Regrettably unbuilt',
  'someone-built-it': 'Unfortunately real',
  'still-a-threat': 'Do not encourage',
};
