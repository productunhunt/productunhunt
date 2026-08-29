// Site-wide settings. Every page, the RSS feed, and Open Graph tags read from
// here.

import type { UIKey } from './i18n/en';

/** The public repo (§15). Ideas arrive as PRs against it, and giscus is backed
 *  by its Discussions. Neither the org nor the repo exists yet — creating both
 *  is a launch-blocking errand, not a code change. */
export const REPO_URL = 'https://github.com/productunhunt/productunhunt';

/** The submission inbox for everyone who isn't opening a PR (§11). Must exist
 *  and forward before launch. */
export const CONTACT_EMAIL = 'ideas@productunhunt.com';

export const SITE = {
  /** BCP 47 language tag. Sets `<html lang>`, date formatting, and the RSS feed
   *  language. Only `en` ships — §16 puts a multilingual UI out of scope. */
  locale: 'en',
  /** Open Graph wants `language_TERRITORY`, which `locale` ('en') is not. Kept
   *  separate so `<html lang>` and `Intl` stay on the neutral tag. */
  ogLocale: 'en_US',
  /** Site name — used in <title>, og:site_name, and the RSS feed. */
  title: 'ProductUnhunt',
  /** The masthead lockup (§2). Spaced caps belong to the header only; `title`
   *  is what goes in `<title>` and og:site_name, where the spacing would read
   *  as a typo. */
  wordmark: 'PRODUCT UNHUNT',
  /** The manifesto line. Doubles as the default meta description. */
  description:
    'The internet has enough serious people building serious products to solve serious problems. ProductUnhunt is for the rest of us.',
  /** Description of the RSS feed at /rss.xml. */
  rssDescription: 'Business ideas that were considered and set free instead of built.',
  /** Default social share image, relative to the site root (see public/).
   *  Per-idea cards are generated at build time; this is the fallback. */
  ogImage: '/og.jpg',
  /** Alt text for the fallback card. Per-idea cards pass their own. */
  ogImageAlt: 'ProductUnhunt — business ideas that were considered and set free instead of built.',
  /** Every share card this site emits is drawn at this size (see
   *  `src/pages/og/ideas/[slug].png.ts` and `public/og.jpg`). */
  ogImageWidth: 1200,
  ogImageHeight: 630,
  /** House byline (§2). Ideas carry their own author in frontmatter — §12 is
   *  explicit that JSON-LD reads that, not this. */
  author: 'Ravi — Chief Unhunter',
  /** Footer credit line (§2). */
  footerText: 'Built for ideas that get to stay free.',
} as const;

/** Icons bundled with the theme — see `src/components/SocialLinks.astro`. */
export type SocialIcon = 'github' | 'x' | 'linkedin' | 'rss' | 'email';

export interface SocialLink {
  /** Accessible name announced on the icon-only link. */
  label: string;
  /** Full URL, `mailto:` address, or site-root path (gets `base` applied). */
  href: string;
  icon: SocialIcon;
}

/** Rendered as inline SVG icons in the footer. */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: 'GitHub', href: REPO_URL, icon: 'github' },
  { label: 'RSS feed', href: '/rss.xml', icon: 'rss' },
  { label: 'Submit an idea by email', href: `mailto:${CONTACT_EMAIL}`, icon: 'email' },
];

/** Giscus — GitHub Discussions-backed comments, on idea pages only (§10).
 *  Values come from https://giscus.app. */
export interface GiscusConfig {
  /** Master switch. While `false`, no Giscus markup, CSS, or script is emitted. */
  enabled: boolean;
  /** Target repository, `owner/name`. Needs public Discussions and the
   *  giscus GitHub App installed. */
  repo: string;
  /** Repository ID from giscus.app (starts with `R_`). */
  repoId: string;
  /** Discussion category name, e.g. `Announcements`. */
  category: string;
  /** Category ID from giscus.app (starts with `DIC_`). */
  categoryId: string;
  /** How a page maps to its discussion. `pathname` is the safest default —
   *  it survives retitling, unlike `title`. */
  mapping: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  /** Use a strict title match when looking up the discussion. */
  strict: boolean;
  /** Show the reaction bar above the comment list. */
  reactionsEnabled: boolean;
  /** Put the comment box above (`top`) or below (`bottom`) the thread. */
  inputPosition: 'top' | 'bottom';
  /** Giscus UI language, e.g. `en`, `ja`, `fr`. */
  lang: string;
  /** Giscus widget theme. The site is dark-only, so this is a constant. */
  darkTheme: string;
}

/** Off until the repo exists: giscus needs a real `repoId` and `categoryId`
 *  from https://giscus.app, and there is nothing to generate them from yet.
 *  `Comments.astro` emits no markup while this is `false`, so an idea page
 *  degrades to no comment section rather than a broken widget. The launch bar
 *  (§14) allows this one to land post-launch. */
export const GISCUS: GiscusConfig = {
  enabled: true,
  repo: 'productunhunt/productunhunt',
  repoId: 'R_kgDOUHPoew',
  category: 'Ideas',
  categoryId: 'DIC_kwDOUHPoe84DEcxs',
  mapping: 'pathname',
  strict: true,
  reactionsEnabled: true,
  inputPosition: 'bottom',
  lang: 'en',
  darkTheme: 'dark',
};

export type NavItem =
  | { href: string; label: string; labelKey?: never }
  | { href: string; labelKey: UIKey; label?: never };

/** Header navigation — §2's three items, and only those. `/about/` and
 *  `/search/` are real pages (§3) but live in the footer: a six-item masthead
 *  dilutes the setup the joke depends on. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/ideas/', labelKey: 'nav.ideas' },
  { href: '/how-it-works/', labelKey: 'nav.howItWorks' },
  { href: '/contribute/', labelKey: 'nav.contribute' },
];

/** Footer navigation — the pages the masthead doesn't carry. */
export const FOOTER_ITEMS: readonly NavItem[] = [
  { href: '/about/', labelKey: 'nav.about' },
  { href: '/search/', labelKey: 'nav.search' },
];
