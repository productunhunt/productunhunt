import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { OFFICIAL_TAGS } from './lib/tags';

export { OFFICIAL_TAGS };
export type { OfficialTag } from './lib/tags';

/** §8 status keys plus `author-relapsed`. `someone-built-it` is editor-only
 *  and rare, and stays reserved for third-party offenders; `author-relapsed`
 *  is for the house's own failures of discipline. */
export const STATUSES = [
  'unbuilt',
  'someone-built-it',
  'still-a-threat',
  'author-relapsed',
] as const;

/** How far the relapse went. The copy escalates with it. */
export const RELAPSE_EXTENTS = ['domain', 'landing-page', 'working-app'] as const;

// Astro 7 Content Layer API: the collection declares a `loader`; slugs come
// from `entry.id`, which the glob loader derives from the file path.
const ideas = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/ideas' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        tagline: z.string(),
        /** What the `<title>` says, when the product name alone says nothing.
         *  Invented names have no search demand; this is where the idea gets
         *  described in words someone might actually type. The site name is
         *  appended by the layout, so the combined length is what's checked —
         *  see the `superRefine` below. */
        seoTitle: z.string().nullable().optional(),
        publishDate: z.coerce.date(),
        /** Set when a published idea is materially rewritten. Drives the
         *  visible "Updated" line, `dateModified`, and sitemap `lastmod`. */
        updatedDate: z.coerce.date().nullable().optional(),
        /** Editor-owned tie-breaker for a coordinated launch day. */
        launchOrder: z.number().int().positive().nullable().optional(),
        author: z.object({
          name: z.string(),
          // The spec's frontmatter writes literal `null` for every unset author
          // field, and `.optional()` alone rejects that — hence `.nullable()`.
          title: z.string().nullable().optional(),
          x: z.string().nullable().optional(),
          github: z.string().nullable().optional(),
          url: z.url().nullable().optional(),
          linkedin: z.url().nullable().optional(),
          email: z.email().nullable().optional(),
          bio: z.string().nullable().optional(),
          // How the idea arrived. Defaulted so the §8 example frontmatter, which
          // omits it, still validates.
          source: z.enum(['PR', 'email']).default('PR'),
        }),
        status: z.enum(STATUSES),
        featured: z.boolean().default(false),
        /** Optional one-liner from the editor, printed under the author. */
        editorStamp: z.string().nullable().optional(),
        // Closed vocabulary: a typo is a Zod enum error at build time, not a tag
        // page with one idea on it.
        tags: z.array(z.enum(OFFICIAL_TAGS)).min(1).max(3),
        draft: z.boolean().default(false),
        heroImage: image().nullable().optional(),
        heroAlt: z.string().nullable().optional(),
        heroCaption: z.string().nullable().optional(),
        /** Evidence that the author's discipline failed: a live URL and how far
         *  things went. Editor-assigned, like the status it forces. */
        relapse: z
          .object({
            url: z.url(),
            extent: z.enum(RELAPSE_EXTENTS),
          })
          .nullable()
          .optional(),
      })
      .superRefine((data, ctx) => {
        // A relapse and `unbuilt` cannot coexist — the whole point of the block
        // is that "unbuilt" stopped being true. The statuses stay in lockstep in
        // both directions so a card can never contradict its own dossier.
        if (data.relapse && data.status !== 'author-relapsed') {
          ctx.addIssue({
            code: 'custom',
            path: ['status'],
            message: `a \`relapse\` block requires \`status: author-relapsed\` (got "${data.status}")`,
          });
        }
        if (!data.relapse && data.status === 'author-relapsed') {
          ctx.addIssue({
            code: 'custom',
            path: ['relapse'],
            message:
              '`status: author-relapsed` requires a `relapse` block — no evidence, no conviction',
          });
        }

        // The rendered `<title>`, in full. `scripts/check-seo.mjs` asserts the
        // same 70-character budget on the built HTML; failing here first means
        // an over-long title is a frontmatter error, not a post-build surprise.
        if (data.seoTitle) {
          const rendered = `${data.title}: ${data.seoTitle} — ProductUnhunt`;
          if (rendered.length > 70) {
            ctx.addIssue({
              code: 'custom',
              path: ['seoTitle'],
              message: `\`title: seoTitle — ProductUnhunt\` is ${rendered.length} characters; trim it to 70 or fewer`,
            });
          }
        }

        // A modification that predates publication is a typo, and it would
        // reach the sitemap and the article schema before anyone noticed.
        if (data.updatedDate && data.updatedDate < data.publishDate) {
          ctx.addIssue({
            code: 'custom',
            path: ['updatedDate'],
            message: '`updatedDate` cannot be earlier than `publishDate`',
          });
        }

        if (data.heroImage && !data.heroAlt?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['heroAlt'],
            message: '`heroImage` requires useful `heroAlt` text',
          });
        }
        if (!data.heroImage && (data.heroAlt?.trim() || data.heroCaption?.trim())) {
          ctx.addIssue({
            code: 'custom',
            path: ['heroImage'],
            message: '`heroAlt` and `heroCaption` require a `heroImage`',
          });
        }
      }),
});

export const collections = { ideas };
