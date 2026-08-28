# ProductUnhunt — implementation plan

## Context

`requirements.md` (untracked, 404 lines) specs v1 of **productunhunt.com**: a deadpan board of business ideas that were considered and correctly abandoned. The repo today is a pristine **Astro Keel** scaffold — one commit, generic theme content, wired for GitHub Pages.

The gap: Keel ships a `blog` + `works` portfolio theme with static output and no server. ProductUnhunt needs a single `ideas` collection, Unhunt brand copy throughout, Netlify hosting, and one live system — the community verdict poll (Neon + Drizzle + Astro Actions) — while every page stays prerendered.

Decisions confirmed with the user:

- **Neon/Netlify are not provisioned yet.** Build the full vote stack, but it degrades cleanly with no `DATABASE_URL` — build succeeds, polls render with the empty copy, votes report unavailable.
- **The giscus repo doesn't exist yet.** Leave `GISCUS.enabled: false` with empty IDs; `Comments.astro` already no-ops.
- **All 6–8 launch ideas get written by me**, as the final step (per the original request).

Outcome: a deployable static site through Phase 4, a working poll after Phase 6, and a launch-ready pile of ideas at the end.

---

## Architecture (settled — phases don't re-litigate)

- **No `output` key.** Astro 7 defaults to `static`. Installing `@astrojs/netlify` + `prerender = false` on the counts endpoint gives the hybrid model §4 wants. Astro auto-injects the Actions route as non-prerendered.
- **`withBase()` stays** (~40 call sites). With `base` dropped it's an identity function.
- **`works` deleted, `blog` → `ideas`.** Slugs come from `entry.id` via the glob loader.
- **No framework integration.** The poll is a vanilla custom element, not React/Preact.

---

## Phase 1 — Foundation

**Modify**

- `astro.config.mjs` — `site: 'https://productunhunt.com'`; **delete `base`** and its GH-Pages comment; add `adapter: netlify()`; register the slug-manifest integration (Phase 6); add `env.schema` with `envField.string({ context: 'server', access: 'secret', optional: true })` for `DATABASE_URL`, `VOTE_SECRET`, `IP_SALT` — `optional` is load-bearing, it's what lets builds succeed with no Neon.
- `package.json` — name `productunhunt`. Add `@astrojs/netlify`, `drizzle-orm`, `@neondatabase/serverless`; dev: `drizzle-kit`, `gray-matter`. Scripts: `db:generate`, `db:push`, `check:ideas`.
- `.github/workflows/ci.yml` — add `npm run check:ideas`.

**Create** — `netlify.toml` (build `npm run build`, publish `dist`, `NODE_VERSION` matching `.nvmrc`; no redirects, the adapter emits its own), `.env.example`.

**Delete** — `.github/workflows/deploy.yml` (GH Pages), `.github/workflows/release.yml` (Keel theme automation).

**Verify:** `npm run build` succeeds; `grep -r '/astro-keel' dist/` is empty; `dist/pagefind/pagefind.js` still exists (**the one thing the adapter could silently break**); `.netlify/` has a function bundle.

---

## Phase 2 — Content model

**Modify `src/content.config.ts`** — drop `works`, replace `blog` with `ideas`. Export `OFFICIAL_TAGS` (the closed 14 from §8). Schema per §8: `title`, `tagline`, `publishDate`, `author` object (`name`, nullable `title`/`x`/`github`/`url`/`bio`, `source: 'PR'|'email'`), `status` enum, `featured`, `editorStamp`, `tags: z.array(z.enum(OFFICIAL_TAGS)).min(1).max(3)`, `draft`, `heroImage`.

> Two traps: the spec's frontmatter writes literal `null`, so nullable fields need `.nullable()` — `.optional()` alone rejects it. And a null `heroImage` must never reach `<Image>`.

**Create**

- `src/lib/ideas.ts` — `getPublishedIdeas()`, the single draft-filter + sort used by every route. Draft rule: `!draft || process.env.CONTEXT !== 'production'` — Netlify's `CONTEXT` gives §8's deploy-preview drafts for free. (`import.meta.env.PROD` would wrongly hide them on previews.)
- `src/lib/tags.ts` — `tagSlug()` / `tagFromSlug()` / `usedTags()`. **Required, not cosmetic:** `Who asked?` and `AI nonsense` cannot be raw URL params.
- `src/lib/status.ts` — `STATUS_LABEL` for the three §8 badges.
- `scripts/check-ideas.mjs` — asserts the five `## ` section headings exist in order in every non-draft idea; also asserts the Phase 6 manifest matches `getCollection('ideas')`.

**Delete** — `src/content/works/`, `src/content/blog/`, `src/pages/works/`.

**Decision — the five body sections are Markdown headings + a lint script, not schema fields.** Frontmatter strings would kill MDX formatting, Pagefind sub-results, and the TOC. The CI script is what makes it a requirement.

**Verify:** `npm run check` clean; a bad tag fails the build with a Zod enum error; removing a section heading fails `check:ideas`.

---

## Phase 3 — Chrome and brand

**`src/consts.ts`** — `SITE.title: 'ProductUnhunt'`, description = the manifesto line, `author: 'Ravi — Chief Unhunter'`, `footerText: 'Built for ideas that should stay theoretical.'`. Add `SITE.wordmark: 'PRODUCT UNHUNT'` (§2 wants the spaced caps in the masthead only; `title` stays for `<title>`/`og:site_name`). `NAV_ITEMS`: Ideas · How it works · Contribute — **§2's three items only**; `/about/` and `/search/` move to the footer, resolving the §2↔§3 conflict. `SOCIAL_LINKS`: GitHub, RSS, `mailto:ideas@productunhunt.com`. `GISCUS` stays `enabled: false` with empty IDs until the repo exists.

**`src/i18n/en.ts`** — full key rewrite; drop `works.*`/`blog.*`/`post.*`, add `ideas.*`/`idea.*`/`poll.*`/`status.*`/`contribute.*`. Every §2 copy-table string lands here, plus `license.body` (§11 verbatim, used on two pages) and the two §10 house rules. Delete `src/i18n/ja.ts` and its `DICTIONARIES` entry. Keeping the dictionary is worth it: `UIKey` makes a deleted-but-used string a compile error.

**`src/styles/global.css`** — cheap-gold accent in **all four** token blocks (lines 4, 30, 47, 63): light `oklch(0.55 0.11 82)`, dark `oklch(0.82 0.13 88)`. The `color-mix()` `-hover`/`-soft` derivations need no edits. Append new component blocks at the end reusing `.section`, `.eyebrow`, `.entry-list`, `.prose` — no parallel system.

**`src/pages/og/.../png.ts`** — the hardcoded `COLOR` object is a **fifth copy of the palette** (satori can't do `oklch`). Update in lockstep or cards ship terracotta. Add a comment in `global.css` pointing at it.

Also: `BaseLayout.astro` brand span + footer links; `404.astro` copy; regenerate `favicon.svg`/`.ico`/`og.jpg` in gold.

**Verify:** the gold appears 4× in `global.css`; `npm run check` catches missing keys; contrast-check light gold + white text in DevTools (the risky pair).

---

## Phase 4 — Routes

**Create**

- `src/pages/ideas/[...page].astro` — the archive ("The full pile"), `pageSize: 12`, filter row of used tags, `<IdeaCard>`, existing `<Pagination>`. Drop Keel's per-entry `render()` reading-time loop (§6 forbids reading time; it's also the slowest part of the index).
- `src/pages/ideas/[slug].astro` — §7 order: kicker → name → tagline → author → editor stamp → mood teaser → `.prose` roast → `<Poll>` → house rules → `<Comments>` → Similar mistakes → Submit a worse one. TOC renders only when `depth === 2` headings **exceed five** (five is the floor, so §7's "only if long" means more).
- `src/pages/ideas/tags/[tag]/[...page].astro` — `params: { tag: tagSlug(tag) }`.
- `src/pages/contribute/index.astro`, `src/pages/how-it-works/index.astro` — both render the §11 license paragraph from `license.body`.

**Modify**

- `src/pages/index.astro` — full rewrite to §5: hero → filter row → "Recently not built" → cards → featured interstitial (**rendered only if any `featured: true` exists**, §13) → cards → "You have bad ideas too" → cards → full-pile link.
- `src/pages/about/index.astro` — replace personal-brand copy and the `.about-ledger` table; "what it will not do" comes from §16.
- `src/pages/rss.xml.ts` — **full text** via the Container API (verified present):
  ```ts
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]), // @astrojs/mdx
  });
  const html = await container.renderToString((await render(idea)).Content);
  ```
  Two gotchas: the endpoint must stay prerendered (Container API is build-time only), and `renderToString` emits root-relative `href`/`src` that feed readers can't resolve — an `absolutize()` pass against `context.site` is mandatory.
- `src/pages/og/[collection]/[slug].png.ts` → `src/pages/og/ideas/[slug].png.ts`. Per §12: gold frame, `PRODUCT UNHUNT` lockup, status badge pill, name, tagline. No author, no counts. Props become `{ tagline, status }`.
- `src/pages/search.astro` — copy only; Pagefind config untouched.
- JSON-LD author must come from **frontmatter**, not `SITE.author` (§12) — a real change at `blog/[slug].astro:60`, not a copy.

**Delete** — `src/pages/blog/`.

**Verify:** build emits `dist/ideas/<slug>/index.html`, `dist/ideas/tags/ai-nonsense/index.html`, `dist/og/ideas/<slug>.png` (eyeball one), and an `rss.xml` whose `<content:encoded>` has all five headings with absolute URLs. No `dist/blog/` or `dist/works/`; sitemap clean.

---

## Phase 5 — Components

All new, in `src/components/` (Keel has **no** card component — markup is inlined per page today):

- `IdeaCard.astro` — §6 exactly: name, tagline, author name chip, tags, `<StatusBadge>`, `<VoteSummary>` placeholder. No comment count, no reading time, no date. Shared by `/` and `/ideas/`.
- `StatusBadge.astro`, `AuthorCard.astro` (`compact` = name chip), `VoteSummary.astro` (top 2 + `+ N other questionable opinions`), `Interstitial.astro`.
- `Poll.astro` — the island.
- `src/lib/poll.ts` — the frozen six options. **Option keys go in the DB; never reorder or rename after launch.** One source of truth for the component, the action's Zod enum, and the counts endpoint.

**Decision — vanilla custom element, no framework.** Adding React for six radio buttons and a fetch means a new integration, a renderer, and ~10 KB of runtime to render markup Astro already emits statically. `Poll.astro` renders all six options server-side inside `<pu-poll data-slug>`; its inline `<script>` can `import { actions } from 'astro:actions'` directly. A page-level collector debounces every visible slug into **one** `GET /api/counts?slugs=…` (§4). Click → optimistic DOM update → `actions.vote()` → revert on error.

> `<ClientRouter />` is already enabled in `BaseLayout.astro`. The batch collector **must** reset on `astro:page-load` or feed→idea→back shows stale counts. This is the most likely place to introduce a view-transitions bug.

**Verify:** JS disabled → all six options + empty copy, no broken UI; a feed page makes exactly one `/api/counts` request; soft-nav home→idea→back re-fetches correctly.

---

## Phase 6 — Vote system

**Create**

- `src/db/schema.ts` — `votes(id, slug, option, voter_id, ip_hash, created_at, updated_at)`, unique `(slug, voter_id)`, index `(slug, option)` (makes the counts `GROUP BY` cheap), index `(ip_hash, updated_at)` (makes rate limiting cheap). No `ideas` table (§9).
- `src/db/client.ts` — lazy singleton over `drizzle-orm/neon-http`, **returns `null` when `DATABASE_URL` is absent**; every caller handles null. The WebSocket driver buys nothing without transactions.
- `src/actions/index.ts` (auto-discovered), `src/pages/api/counts.ts` (`prerender = false`), `drizzle.config.ts`.
- `integrations/slug-manifest.mjs` → writes `src/generated/idea-slugs.json` (gitignored).

### The manifest ordering problem — the sharpest edge in the build

§4 requires a **build-time** manifest that the **runtime** action validates against. The action ships as a Netlify Function; it can't read the content store at request time, and can't read a file Vite never saw. So the manifest must exist _before Vite bundles the server_.

- `astro:build:done` — too late, the server bundle is already written.
- `prebuild` script — `astro dev` never runs it, so dev validates against a stale file.
- **`astro:config:setup` hook — use this.** Fires before Vite resolves anything, in both dev and build. It can't use `getCollection()` (collections aren't loaded yet), so it reads `src/content/ideas/*.{md,mdx}` with `fs.readdir` + `gray-matter`, applies the same `CONTEXT` draft rule, and writes the JSON. The action then does a static `import slugs from '../generated/idea-slugs.json'` and Vite inlines it. Add `astro:server:setup` regeneration for dev.

Cost: the draft/glob rule is duplicated in one small function. `check-ideas.mjs` asserts the manifest matches the collection, guarding against drift.

### Vote action

Reject slug not in manifest (400) → `getDb()` null → `SERVICE_UNAVAILABLE` → read/mint HMAC-signed `pu_vid` cookie (`httpOnly`, `sameSite: lax`, 1yr) → `ipHash = sha256(IP_SALT + ip)` from `x-nf-client-connection-ip` (**raw IP never stored**, §9) → DB-backed rate limit on `ip_hash` and `voter_id` over the last minute → `INSERT … ON CONFLICT (slug, voter_id) DO UPDATE SET option, updated_at` (§9's "replaces the previous choice") → return fresh counts.

> The cookie is set **by the action**, not by a page — prerendered pages can't set cookies. That's why the first vote establishes identity, and why the poll can't show "your current choice" on a cold load.

### Counts endpoint

Parse, cap at 50 slugs, intersect with the manifest, `GROUP BY slug, option`. No DB → `{}` with 200. Headers:

```
Cache-Control: public, max-age=30
Netlify-CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

`Netlify-CDN-Cache-Control` is what actually drives the edge; plain `Cache-Control` is browser-only.

**Spec conflict, resolved:** §4 wants edge-cached counts, §9 wants "your active vote" reflected in the UI — irreconcilable in one cached response. Counts stay anonymous and cacheable; the client remembers its own choice in `localStorage` (`pu_vote:<slug>`) as a pure UI hint, with the cookie as server-side truth for dedup. **Do not add `Vary: Cookie`** — it defeats the cache entirely.

### Degradation with no DB (confirmed requirement)

Three gates: `getDb()` → null; `envField(optional: true)` → build succeeds; components render the §9 empty copy server-side and only replace it on a non-zero response. Net effect: `npm run dev` with an empty `.env` is a fully working site with dead polls.

**Verify:** `curl 'localhost:8888/api/counts?slugs=fake-vacation'` returns JSON + both cache headers; POSTing an unknown slug to `/_actions/vote` returns 400 with the table unchanged; voting twice on one cookie leaves **one** row with a changed `option`; `SELECT ip_hash` shows only hex; removing `DATABASE_URL` still builds and serves.

---

## Phase 7 — The ideas (final step)

- `IDEA_TEMPLATE.md` — full §8 frontmatter with comments, the five headings, the §11 confirmation line.
- Repurpose `.github/PULL_REQUEST_TEMPLATE.md` into the submission checklist.
- `src/content/ideas/` — **6–8 ideas written in full**, spread over ≥4 official tags, all `status: unbuilt`, all `featured: false` (keeps the featured module hidden, §13).
  - `Fake Vacation` (§6's example) is the canonical **first card** — newest `publishDate` — because it has to explain the site with no extra paragraph.
  - At least one **annoyingly plausible** idea (§14): a defensible B2B/Fintech pitch the roast then dismantles. Hardest of the set — write it early in this phase, not last.

> Route work in Phases 4–6 needs something to render. I'll scaffold `Fake Vacation` as a working fixture during Phase 4 and finish the full set here.

**Verify:** `check:ideas` passes on all of them; the first card sits above the fold at 1280×800; every OG png shows its badge and tagline.

---

## Sequencing

**1 → 2 → 3 → 4 → 5 → 6 → 7.** Phases 1–4 are independently deployable as a static site with no polls. Only Phase 6 needs Neon, and it's built to work without it.

---

## Launch bar (§14) — final verification, against a real deploy

| #   | Check                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–4 | 6–8 ideas live, ≥3 tags in the filter row, first card explains the site, ≥1 plausible idea                                                                         |
| 5   | `for p in / /ideas/ /contribute/ /how-it-works/ /about/ /search/; do curl -so /dev/null -w "$p %{http_code}\n" $SITE$p; done` → all 200, plus one `/ideas/<slug>/` |
| 6–7 | Vote in a browser → row in Neon; unknown slug → 400, table unchanged                                                                                               |
| 8   | giscus widget loads (needs the repo — post-launch if not ready)                                                                                                    |
| 9   | `/rss.xml` validates, `<content:encoded>` has all five headings + absolute links                                                                                   |
| 10  | OG card renders in the X validator and Slack                                                                                                                       |
| 11  | `ideas@productunhunt.com` forwards (real test send)                                                                                                                |
| 12  | `curl -s $SITE/nope/ \| grep 'correctly abandoned'`                                                                                                                |

Plus: sitemap has no `/blog/` or `/works/`; Pagefind returns idea results **on the deployed site** (it never works on the dev server); both themes readable.

---

## Open risks

1. **Manifest ordering** — solving it with `astro:build:done` or importing `astro:content` in the action _appears_ to work in dev and fails in production.
2. **Tag slugification** — `Who asked?` breaks silently on Netlify if raw.
3. **Five copies of the accent palette** — four CSS blocks + satori's `COLOR`.
4. **Pagefind + Netlify adapter** — confirm `dist/` still holds static output on the first real build.
5. **External lead times, start now:** `ideas@productunhunt.com` forwarding and the public `productunhunt` repo with Discussions. Neither blocks Phases 1–7.
6. **`someone-built-it` needs "a short note that it became real"** (§8) with no field for it — `editorStamp` carries it. Not needed for v1 (all ideas ship `unbuilt`).
7. **Avatars:** the schema has no email, so Gravatar is unreachable. GitHub avatar when `github` is set, otherwise a generated initial mark.
