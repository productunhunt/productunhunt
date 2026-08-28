import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { OFFICIAL_TAGS } from './lib/tags';

export { OFFICIAL_TAGS };
export type { OfficialTag } from './lib/tags';

/** §8 status keys. `someone-built-it` is editor-only and rare. */
export const STATUSES = ['unbuilt', 'someone-built-it', 'still-a-threat'] as const;

// Astro 7 Content Layer API: the collection declares a `loader`; slugs come
// from `entry.id`, which the glob loader derives from the file path.
const ideas = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/ideas' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      publishDate: z.coerce.date(),
      author: z.object({
        name: z.string(),
        // The spec's frontmatter writes literal `null` for every unset author
        // field, and `.optional()` alone rejects that — hence `.nullable()`.
        title: z.string().nullable().optional(),
        x: z.string().nullable().optional(),
        github: z.string().nullable().optional(),
        url: z.url().nullable().optional(),
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
    }),
});

export const collections = { ideas };
