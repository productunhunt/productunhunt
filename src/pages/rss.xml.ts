import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { withBase } from '../lib/url';
import { getPublishedIdeas } from '../lib/ideas';
import { SITE } from '../consts';
import { locale } from '../i18n';

// Phase 4 replaces the summary-only items below with full-text
// <content:encoded>, rendered through the Container API.
export async function GET(context: APIContext) {
  const ideas = await getPublishedIdeas();

  return rss({
    title: SITE.title,
    description: SITE.rssDescription,
    site: context.site ?? 'https://example.com',
    // Feed readers use <language> to pick a reading direction and hyphenation.
    customData: `<language>${locale}</language>`,
    items: ideas.map((idea) => ({
      title: idea.data.title,
      description: idea.data.tagline,
      pubDate: idea.data.publishDate,
      link: withBase(`/ideas/${idea.id}/`),
      categories: [...idea.data.tags],
    })),
  });
}
