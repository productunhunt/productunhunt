import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedIdeas } from '../../../lib/ideas';
import { STATUS_LABEL } from '../../../lib/status';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import { SITE } from '../../../consts';

// Per-idea Open Graph cards, generated at build time (§12): cheap-gold frame,
// PRODUCT UNHUNT lockup, status badge, product name, tagline. Deliberately
// absent: the author's face, and vote counts — counts go stale the moment the
// card is cached by a social network, and a wrong number is worse than none.
// The static `public/og.jpg` remains the fallback for every other page.

interface OgProps {
  title: string;
  tagline: string;
  status: string;
}

export const getStaticPaths = (async () => {
  const ideas = await getPublishedIdeas();
  return ideas.map((idea) => ({
    params: { slug: idea.id },
    props: {
      title: idea.data.title,
      tagline: idea.data.tagline,
      status: STATUS_LABEL[idea.data.status],
    } satisfies OgProps,
  }));
}) satisfies GetStaticPaths;

// Satori has no oklch() support, so these are sRGB conversions of the
// light-theme tokens in `src/styles/global.css` — the fifth and last copy of
// the palette. Change a token there and this object has to move with it, or
// share cards ship the previous accent while the site shows the new one.
const COLOR = {
  bg: '#fcfcfa', // --color-bg      oklch(0.99 0.003 100)
  text: '#1e2226', // --color-text    oklch(0.25 0.01 250)
  muted: '#5e646a', // --color-muted   oklch(0.5 0.012 250)
  accent: '#916a0b', // --color-accent  oklch(0.55 0.11 82)
};

const require = createRequire(import.meta.url);
const font = (pkgPath: string) => readFile(require.resolve(pkgPath));

// Latin subsets, to keep the build light. Satori draws any glyph these fonts
// lack as an empty box, which is why the status labels are rendered from the
// Latin dictionary rather than a script these faces don't cover.
const [fraunces, publicSans] = await Promise.all([
  font('@fontsource/fraunces/files/fraunces-latin-600-normal.woff'),
  font('@fontsource/public-sans/files/public-sans-latin-400-normal.woff'),
]);

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export const GET: APIRoute<OgProps> = async ({ props }) => {
  const { title, tagline, status } = props;
  const name = truncate(title, 60);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: COLOR.bg,
          padding: 36,
          fontFamily: 'Public Sans',
        },
        children: {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              // The cheap-gold frame (§12) — the one piece of brand furniture
              // the card carries.
              border: `2px solid ${COLOR.accent}`,
              padding: '48px 56px',
            },
            children: [
              // Lockup: the accent mark plus the spaced-caps wordmark, the
              // same pairing as the masthead.
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 18 },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { width: 20, height: 20, backgroundColor: COLOR.accent },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Fraunces',
                          fontSize: 26,
                          letterSpacing: 8,
                          color: COLOR.text,
                        },
                        children: SITE.wordmark,
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' },
                  children: [
                    // Status badge, drawn as the same outlined pill the site
                    // uses rather than a filled chip — a filled gold block at
                    // this size reads as an advertisement.
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', marginBottom: 30 },
                        children: {
                          type: 'div',
                          props: {
                            style: {
                              border: `1px solid ${COLOR.accent}`,
                              padding: '8px 18px',
                              color: COLOR.accent,
                              fontSize: 20,
                              letterSpacing: 3,
                              textTransform: 'uppercase',
                            },
                            children: status,
                          },
                        },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Fraunces',
                          fontSize: name.length > 32 ? 62 : 78,
                          lineHeight: 1.05,
                          color: COLOR.text,
                        },
                        children: name,
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    maxWidth: 960,
                    fontSize: 27,
                    lineHeight: 1.4,
                    color: COLOR.muted,
                  },
                  children: truncate(tagline, 130),
                },
              },
            ],
          },
        },
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Fraunces', data: fraunces, weight: 600, style: 'normal' },
        { name: 'Public Sans', data: publicSans, weight: 400, style: 'normal' },
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
