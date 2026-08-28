import type { STATUSES } from '../content.config';
import { t } from '../i18n';

export type Status = (typeof STATUSES)[number];

/** §8's three badges, keyed by what frontmatter carries. The labels come from
 *  the dictionary rather than being written here, so the badge, the OG card,
 *  and anything else that names a status all read the same string. */
export const STATUS_LABEL: Record<Status, string> = {
  unbuilt: t('status.unbuilt'),
  'someone-built-it': t('status.someone-built-it'),
  'still-a-threat': t('status.still-a-threat'),
};
