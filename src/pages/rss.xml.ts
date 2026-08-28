import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/mdx/container-renderer';
import { render } from 'astro:content';
import { withBase } from '../lib/url';
import { getPublishedIdeas } from '../lib/ideas';
import { SITE } from '../consts';
import { locale } from '../i18n';

// §3/§12: the feed carries the full roast, not a teaser. The Container API is
// build-time only, so this endpoint must stay prerendered — which it is by
// default, but the Netlify adapter makes "by default" worth writing down.
export const prerender = true;

/**
 * Rewrite root-relative `href`/`src` to absolute URLs.
 *
 * `renderToString` emits exactly what a page would (`/ideas/foo/`,
 * `/_astro/img.png`), and a feed reader has no base to resolve those against —
 * every internal link and image in the feed would 404 against the reader's own
 * origin. Protocol-relative `//host/path` is already resolvable, so the second
 * character must not be a slash.
 */
function absolutize(html: string, site: URL): string {
  return html.replace(
    /\b(href|src)="(\/[^/"][^"]*|\/)"/g,
    (_match, attr: string, path: string) => `${attr}="${new URL(path, site).href}"`,
  );
}

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string,
  );

export async function GET(context: APIContext) {
  const ideas = await getPublishedIdeas();
  const site = context.site ?? new URL('https://productunhunt.com');

  // One container for the whole feed; the MDX renderer has to be registered
  // explicitly or any MDX idea renders as an empty string.
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  });

  const items = await Promise.all(
    ideas.map(async (idea) => {
      const { Content } = await render(idea);
      const html = await container.renderToString(Content);

      return {
        title: idea.data.title,
        description: idea.data.tagline,
        pubDate: idea.data.publishDate,
        link: withBase(`/ideas/${idea.id}/`),
        categories: [...idea.data.tags],
        // RSS 2.0's own <author> element is specified as an email address, and
        // a bare name there fails validation. The byline goes out as
        // `dc:creator`, which every reader understands and which does not leak
        // a contributor's address.
        customData: `<dc:creator>${escapeXml(idea.data.author.name)}</dc:creator>`,
        content: absolutize(html, site),
      };
    }),
  );

  return rss({
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    title: SITE.title,
    description: SITE.rssDescription,
    site,
    // Feed readers use <language> to pick a reading direction and hyphenation.
    customData: `<language>${locale}</language>`,
    items,
  });
}
