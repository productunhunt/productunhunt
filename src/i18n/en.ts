// English UI dictionary — the only one that ships. §16 puts a multilingual UI
// out of scope, but the dictionary itself earns its keep: `UIKey` is derived
// from this object, so deleting a string that a template still renders is a
// compile error rather than an empty span discovered in production.
//
// **Scope: UI chrome and reusable copy.** Navigation, section headings, button
// and aria labels, generated strings, and the copy §2 fixes site-wide. Page
// prose that appears exactly once lives in its `.astro` file, where you would
// edit it anyway.
//
// Keys are flat and dotted; `{name}` placeholders are filled in by `t()`.
// A few values carry inline `<code>` markup and are rendered with `set:html` —
// they are authored here, never user input.
//
// Note: values are deliberately *not* `as const` — widening them to `string`
// is what keeps the type a dictionary shape rather than a union of literals.

export const en = {
  // Header, footer, and other chrome
  'nav.ideas': 'Ideas',
  'nav.howItWorks': 'How it works',
  'nav.contribute': 'Contribute',
  'nav.about': 'About',
  'nav.search': 'Search',
  'nav.label': 'Main navigation',
  'nav.brandHome': '{site} home',
  'footer.label': 'Footer navigation',
  'social.label': 'Social links',

  // Pagination
  'pagination.label': 'Pagination',
  'pagination.newer': '← Newer',
  'pagination.older': 'Older →',
  'pagination.status': 'Page {current} of {total}',

  // Shared calls to action (§2). The same two strings appear on the homepage,
  // the idea page, and the contribute interstitial.
  'cta.submit': 'Submit an unbuilt idea',
  'cta.howThisWorks': 'How this works',
  'cta.fullPile': 'See the full pile',

  // Tag filter row — `All` plus only the tags currently in use (§5).
  'filter.label': 'Filter ideas by tag',
  'filter.all': 'All',

  // Homepage (§5). The manifesto line itself is SITE.description.
  'home.primaryLinks': 'Primary links',
  'home.recentlyNotBuilt': 'Recently not built',
  'home.featuredHeading': 'Most unhinged this week',
  'home.contributeHeading': 'You have bad ideas too',
  'home.contributeLead':
    'Two doors, one format: open a pull request, or email it and let someone else do the YAML.',
  'home.empty': 'Nothing has been correctly abandoned yet. Give it a moment.',

  // Idea archive (§3) — the pile, with no manifesto essay on top.
  'ideas.title': 'The full pile',
  'ideas.titlePaged': 'The full pile · Page {page}',
  'ideas.eyebrow': 'Archive',
  'ideas.description': 'Every idea considered and correctly abandoned on {site}.',
  'ideas.lead': 'Everything considered and correctly abandoned, newest first.',
  'ideas.listLabel': 'Abandoned ideas',
  'ideas.empty': 'The pile is empty. Enjoy it while it lasts.',

  // Tag archive — every string here is generated from a tag, which is why it
  // stays in the dictionary even though it reads like page copy.
  'tag.title': 'Ideas tagged “{tag}”',
  'tag.titlePaged': 'Ideas tagged “{tag}” · Page {page}',
  'tag.description': 'Abandoned ideas tagged {tag} on {site}.',
  'tag.eyebrow': 'Tag',
  'tag.lead': 'Bad ideas filed under {tag}.',
  'tag.listLabel': '{tag} ideas',
  'tag.moreTagsEyebrow': 'More tags',
  'tag.otherTagsNavLabel': 'Other tags',
  'tag.allIdeas': 'All ideas',

  // Idea page (§7)
  'idea.tagsLabel': 'Tags',
  'idea.editorStampEyebrow': 'Editor’s note',
  'idea.moodEyebrow': 'Current mood',
  'idea.tocLabel': 'Table of contents',
  'idea.contentsEyebrow': 'Contents',
  'idea.relatedEyebrow': 'Similar mistakes',
  'idea.relatedLabel': 'Similar mistakes',
  'idea.submitEyebrow': 'Submit a worse one',
  'idea.breadcrumbHome': 'Home',
  'idea.breadcrumbIdeas': 'Ideas',
  'idea.authorSourcePR': 'Submitted by pull request',
  'idea.authorSourceEmail': 'Submitted by email',

  // Status badges (§8). `src/lib/status.ts` maps a frontmatter key to one of
  // these, so the label is written down exactly once.
  'status.unbuilt': 'Regrettably unbuilt',
  'status.someone-built-it': 'Unfortunately real',
  'status.still-a-threat': 'Do not encourage',

  // Community verdict (§9)
  'poll.heading': 'The public inquiry',
  'poll.label': 'Community verdict poll',
  'poll.empty': 'No verdicts yet. Be the first brave witness.',
  'poll.others': '+ {count} other questionable opinions',
  'poll.votes': '{count} votes',
  'poll.votesOne': '1 vote',
  'poll.yourVote': 'Selected',
  'poll.unavailable': 'Voting is unavailable right now. The ideas remain bad regardless.',
  'poll.failed': 'That vote did not go through. Try again.',

  // Comments (§10) — rendered only when GISCUS.enabled
  'comments.eyebrow': 'Comments',
  // `{link}` is a whole anchor element, built in Comments.astro — a rewrite
  // decides where in the sentence it lands, and the URL never has to be
  // interpolated into the dictionary value.
  'comments.failed': 'Comments could not be loaded. Read the thread on {link}.',
  'comments.failedLink': 'GitHub Discussions ↗',
  'comments.noscript': 'Comments require JavaScript. They are hosted on GitHub Discussions.',
  'houseRules.eyebrow': 'House rules',
  'houseRules.label': 'House rules',
  'houseRules.one': 'Roast the idea, not the author.',
  'houseRules.two': 'Pitching a real startup in the comments is a self-own and will be deleted.',

  // Contribute (§11)
  'contribute.title': 'Contribute',
  'contribute.eyebrow': 'Contribute',
  'contribute.lead': 'Two doors, one format. The editor publishes; you supply the regret.',
  'contribute.prEyebrow': 'For developers',
  'contribute.emailEyebrow': 'For everyone else',
  'contribute.fieldsEyebrow': 'What an entry needs',
  'contribute.confirmation': 'I thought about building this and chose not to',
  'contribute.reviewEyebrow': 'What gets published',

  // How it works (§3)
  'howItWorks.title': 'How it works',
  'howItWorks.eyebrow': 'How it works',

  // The license paragraph (§11), rendered on Contribute and How it works.
  // One string, blank-line separated: both pages split it into paragraphs, so
  // the wording can never drift between them.
  'license.eyebrow': 'The deal',
  'license.body': [
    'This is entertainment. Treat every idea as public and already dead.',
    'By submitting, you grant ProductUnhunt a perpetual license to publish, edit, and roast it. You keep whatever rights you think you had. We promise nothing.',
    'Do not send confidential plans, client work, or anything you would mind seeing next to Founder needs sleep.',
    'Published ideas may be copy-edited. The joke stays yours; the commas may not.',
    'We can reject or unpublish anything, no debate.',
  ].join('\n\n'),

  // About — section labels only; the copy lives in about/index.astro
  'about.title': 'About',
  'about.eyebrow': 'About',
  'about.ledgerLabel': 'What this site will not do',

  // Search
  'search.title': 'Search',
  'search.eyebrow': 'Search',
  'search.sectionLabel': 'Site search',
  'search.fallback':
    'The search index is generated at build time. Run <code>npm run build</code> and preview the site to try it — it is not available on the dev server.',

  // 404 (§2)
  'notFound.title': 'Page not found',
  'notFound.description': 'This page was also correctly abandoned.',
  'notFound.eyebrow': '404 — Not found',
  'notFound.heading': 'This page was also correctly abandoned.',
  'notFound.lead':
    'It was considered, briefly, and then it was not built. The pile below is still standing.',
  'notFound.linksLabel': 'Recovery links',
  'notFound.home': 'Back home',
  'notFound.ideas': 'Browse the pile',
  'notFound.contribute': 'Submit an unbuilt idea',
};

/** The shape every dictionary must implement. */
export type UIStrings = typeof en;

/** Every valid translation key. */
export type UIKey = keyof UIStrings;
