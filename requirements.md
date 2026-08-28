# ProductUnhunt — v1 Requirements (v2)

**Site:** productunhunt.com
**Line:** The internet has enough serious people building serious products to solve serious problems. ProductUnhunt is for the rest of us.
**Base:** [Astro Keel](https://github.com/kpab/astro-keel)
**Stack:** Astro 7 · MDX content collections · Netlify · Neon Postgres · Drizzle · Astro Actions · giscus

This is not a product postmortem blog. It is a deadpan board of ideas that were considered and then correctly abandoned.

---

## 1. Product definition

ProductUnhunt publishes ridiculous business ideas as funny analysis.

- Not a launch platform
- Not a startup graveyard
- Not a pitch deck host
- Community can submit; the editor publishes
- v1 content is mostly written by Ravi — Chief Unhunter
- The joke is serious presentation of unserious ideas

---

## 2. Brand and chrome

| Surface                 | Copy                                          |
| ----------------------- | --------------------------------------------- |
| Masthead                | `PRODUCT UNHUNT`                              |
| Domain voice            | ProductUnhunt                                 |
| Browser title           | `{Product name} — ProductUnhunt`              |
| Nav                     | Ideas · How it works · Contribute             |
| Home feed heading       | Recently not built                            |
| Archive heading         | The full pile                                 |
| Contribute CTA          | Submit an unbuilt idea                        |
| Poll heading            | Community verdict                             |
| Empty poll              | Nobody has incriminated themselves yet        |
| Footer                  | Built for ideas that should stay theoretical. |
| Related ideas           | Similar mistakes                              |
| Featured module         | Most unhinged this week                       |
| Contribute interstitial | You have bad ideas too                        |
| 404                     | This page was also correctly abandoned.       |

**Visual rule:** visually credible, editorially unserious.

- Keel bones: type, spacing, dark/light, hairlines, restrained layout
- Unhunt voice on top
- Accent: cheap-gold
- Feed feels like a fake product directory
- Article feels like a magazine profile
- Reference Product Hunt. Do not clone its UI
- Default theme follows system

**Author byline (house ideas):** Ravi — Chief Unhunter

---

## 3. Sitemap

| URL                  | Job                                             |
| -------------------- | ----------------------------------------------- |
| `/`                  | The show. Manifesto strip + feed + modules      |
| `/ideas/`            | The archive. The full pile, filters, pagination |
| `/ideas/[slug]/`     | Roast + poll + comments                         |
| `/ideas/tags/[tag]/` | Tag archive                                     |
| `/contribute/`       | PR + email + template + license paragraph       |
| `/how-it-works/`     | Short dry explainer                             |
| `/about/`            | Who runs it, why it exists, what it will not do |
| `/search/`           | Keep Keel/Pagefind                              |
| `/rss.xml`           | New ideas, full text                            |

**Remove from Keel:** `/works/`, `/uses/`, portfolio collection, personal-brand about copy, "blog" naming.

**Not in v1:** `/authors/[slug]/`, verdict leaderboards, auto-featured-by-votes, email-to-git automation.

---

## 4. Rendering model

Written down so it doesn't get decided by accident:

- **All pages prerendered.** Content stays git/MDX. Votes are the only live system.
- Vote counts hydrate client-side from a single batched endpoint: `GET /api/counts?slugs=...` (feed pages batch all visible cards in one call; idea pages fetch one slug).
- Counts may be minutes stale; cache at the edge. Nothing about vote counts justifies SSR-ing pages.
- Vote submission goes through an Astro Action. The UI updates optimistically; the action replaces the visitor's previous row.
- A slug manifest (JSON) is generated at build time from the content collection. The vote action **rejects any slug not in the manifest** — no polluting the table with junk slugs.

---

## 5. Homepage

Manifesto 20% / ideas 70% / contribute 10%.

**Masthead**
PRODUCT UNHUNT
Nav: Ideas · How it works · Contribute

**Hero (short)**
The exact manifesto line.
Primary: Submit an unbuilt idea
Secondary text link: How this works

**Then ideas immediately.**
The first card must explain the site without another paragraph.

**Layout**

- No sidebar
- Filter row: `All` + **only tags currently in use** (not the full official list)
- Heading: Recently not built
- Idea cards
- Interstitial: Most unhinged this week — manual `featured: true`; module hidden until community entries start arriving (see §13)
- More cards
- Interstitial: You have bad ideas too (PR + email)
- More cards
- Footer

`/` and `/ideas/` share the card component.
`/` is the show. `/ideas/` is the pile (no manifesto essay, filter + sort newest, pagination).

---

## 6. Idea card (feed)

Looks like a deadpan product listing, not an essay teaser.

- Product name
- Savage tagline
- Author name chip only (no bio)
- Tags
- Status badge
- Top **2** community reactions with counts
- `+ N other questionable opinions`
- No full six-option poll
- No comment count
- No reading time

Example energy:

```
Fake Vacation
For people who want the Instagram trip without
the inconvenience of actually going anywhere.
travel · ai · social
REGRETTABLY UNBUILT
🏆 Deserves a Trophy for Ridiculous · 47
💸 Unfortunately, I'd pay · 36
+ 63 other questionable opinions
```

---

## 7. Idea page

Serious editorial profile, judgement at the end.

1. Kicker — status + tags
2. Product name
3. Tagline
4. Byline / compact author card
5. Editor stamp — optional one dry line
6. Current mood teaser — leading reaction only, not a widget
7. The roast — five sections
8. Community verdict — full poll
9. House rules — two dry lines
10. giscus comments
11. Similar mistakes — 2–3 ideas
12. Submit a worse one

No LinkedIn-share energy. No newsletter popup.
Keel TOC only if a roast is actually long.

---

## 8. Content model

Collection: `src/content/ideas/` (MD/MDX).
Not `blog/`.

### Frontmatter

```yaml
title: Fake Vacation
tagline: For people who want the Instagram trip without the inconvenience of actually going anywhere.
publishDate: 2026-08-28
author:
  name: Ravi
  title: Chief Unhunter
  x: null
  github: null
  url: null
  bio: null
status: unbuilt # unbuilt | someone-built-it | still-a-threat
featured: false
editorStamp: null # optional one-liner
tags:
  - AI nonsense
  - Consumer
draft: false
heroImage: null
```

### Body sections (required)

1. The Pitch
2. The Delusion
3. The Reality Check
4. Why It Stays Unbuilt
5. Unwanted Bonus

No word-count rule. Funny and specific beats a target length; the editor trims what drags.

### Status badges

| Key                | Badge               |
| ------------------ | ------------------- |
| `unbuilt`          | Regrettably unbuilt |
| `someone-built-it` | Unfortunately real  |
| `still-a-threat`   | Do not encourage    |

`someone-built-it` is rare and editor-only, with a short note that it became real.

### Official tags (closed list)

AI nonsense · SaaS · Dating · Marketplace · Hardware · B2B · Consumer · Social · Who asked? · Local · Climate · Health · Fintech · Creator economy

- 1–3 tags per idea
- No free-typed tags in v1
- UI (filter row, tag pages) only surfaces tags with published ideas

### Author card

- Homepage: name chip only
- Idea page: avatar (GitHub/Gravatar or generated mark), name, optional title, optional X/GitHub/site, optional one-line bio, source (`PR` or `email`)
- Pseudonyms allowed
- No follower counts
- No `/authors/` pages in v1

### Draft preview

`draft: true` hides an idea from production builds. Preview via Netlify deploy previews on the PR/branch. No separate preview infrastructure.

---

## 9. Community verdict

Frozen six options:

1. Deserves a Trophy for Ridiculous
2. Should Stay Unbuilt
3. Accidentally Genius
4. Founder needs sleep
5. Someone will build this
6. Unfortunately, I'd pay

Rules:

- One active vote per visitor per idea
- Vote can be changed; it replaces the previous choice (optimistic UI, see §4)
- No likes
- Anonymous cookie / signed voter id
- Rate-limit by voter id + IP
- Not login-gated
- Not election-grade
- Homepage: top 2 + remainder count
- Article: all six with counts and a thin bar
- Empty copy: Nobody has incriminated themselves yet

### Poll implementation

- Neon Postgres
- Drizzle
- Astro Actions
- Netlify — pages stay prerendered; only the counts endpoint and vote action are live (see §4)
- Content stays git/MDX

Table:

- `votes` — `id`, `slug`, `option`, `voter_id`, `ip_hash`, `created_at`, `updated_at`
- Unique `(slug, voter_id)`
- No `ideas` table — slug comes from content, validated against the build-time manifest
- `ip_hash` is a **salted hash**; raw IPs are never stored

---

## 10. Comments

- giscus (already in Keel) on idea pages only
- After the poll
- GitHub login required to comment (giscus constraint — acceptable; the poll is the zero-friction participation path)
- Backed by Discussions on the public `productunhunt` repo
- No comment counts on cards

House rules on the page:

- Roast the idea, not the author
- Pitching a real startup in the comments is a self-own and will be deleted

---

## 11. Contribution

Two doors, one format.

1. **Developers:** public PR adding `src/content/ideas/{slug}.mdx` from `IDEA_TEMPLATE.md`
2. **Everyone else:** email `ideas@productunhunt.com` with the same fields (address must exist and forward before launch; ingestion stays manual)

Required fields:

- Product name
- Tagline
- Author name
- Optional X / GitHub / site / bio
- Five body sections
- 1–3 official tags
- Confirmation: "I thought about building this and chose not to"

Review bar (editor):

- Publish if funny and specific
- Reject real pitch decks, attacks on a person, or empty "Uber for X"

After acceptance:

- Editor adds `publishDate`, status, optional `editorStamp` / `featured`
- Light copy-edit allowed
- Author does not control the live poll

### License paragraph (on Contribute + How it works)

This is entertainment. Treat every idea as public and already dead.
By submitting, you grant ProductUnhunt a perpetual license to publish, edit, and roast it.
You keep whatever rights you think you had. We promise nothing.
Do not send confidential plans, client work, or anything you would mind seeing next to Founder needs sleep.
Published ideas may be copy-edited. The joke stays yours; the commas may not.
We can reject or unpublish anything, no debate.

---

## 12. Social / SEO / analytics

- OG image generated per idea at build time
- Cheap-gold frame
- Status badge
- Product name + tagline
- PRODUCT UNHUNT lockup
- No author face
- No vote counts (they stale)
- RSS of new ideas, full text
- JSON-LD as an article about a fictional/abandoned product, author from frontmatter
- Search kept from Keel
- **Analytics: none in v1.** If curiosity wins later, Netlify Analytics — nothing client-side.

---

## 13. Featured module

- Manual `featured: true` only
- Purpose: spotlighting community submissions once they start arriving
- Until then the module stays hidden — house-only content doesn't need a trophy shelf
- Label "Most unhinged this week" is aspirational, not a cadence promise

---

## 14. Launch bar

v1 is launched when:

- 6–8 strong ideas live, mostly by Ravi — Chief Unhunter
- At least 3 tags used
- First card is strong enough to explain the site
- At least one annoyingly plausible idea
- `/`, `/ideas/`, idea pages, `/contribute`, `/how-it-works`, `/about` work
- Polls write to Neon; vote action rejects unknown slugs
- giscus loads on idea pages
- RSS and OG cards work
- Contribute doors exist even if unused (email forwards)
- 404 page has its line

Not required for v1:

- Email ingestion script
- Vote-based featured
- Sort by votes
- Statuses other than `unbuilt`
- Featured module visible
- Author index
- Analytics

---

## 15. What Keel keeps vs what changes

**Keep:** Astro 7, content collections, MDX, i18n plumbing unused except `en`, dark/light, fonts, Pagefind, RSS, sitemap, satori OG pipeline, hairline editorial layout, giscus.

**Change:** works → delete; blog → ideas; home → feed; accent → cheap-gold; add poll island + actions + counts endpoint + slug manifest; rewrite consts/nav/copy; custom idea card; custom idea layout; 404 copy.

**Hosting:** Netlify + Neon. Public GitHub repo `productunhunt` (Discussions enabled for giscus).

---

## 16. Out of scope for v1

- Building any of the featured ideas
- User accounts
- Native comment backend
- Admin CMS
- Mobile app
- Newsletter
- Ads
- Ranking algorithm
- Multilingual UI
