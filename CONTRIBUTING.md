# Contributing to ProductUnhunt

You have bad ideas too. This is where they go.

ProductUnhunt publishes business ideas that were considered and then correctly
abandoned. Contributions are welcome through either of two doors, and both ask
for exactly the same thing.

## The entry requirement

> "I thought about building this and chose not to."

That line is not a formality. If you are still building it, this is the wrong
website.

## Door one — open a pull request

1. Copy [`IDEA_TEMPLATE.md`](./IDEA_TEMPLATE.md).
2. Fill it in.
3. Add it as `src/content/ideas/your-slug.mdx` (or `.md` — either works).
4. Open a PR.

The slug is lowercase, hyphenated, and matches the product name:
`fake-vacation.md`, not `Fake Vacation Idea FINAL.md`.

Frontmatter is validated at build time, so a bad tag fails CI rather than the
site. Leave `publishDate`, `updatedDate`, `status`, `editorStamp`, and
`featured` at the template's values — the schema needs a date and a status to
be present, but the editor sets the real ones on the way in.

`seoTitle` is the one extra line worth your attention: an invented product
name tells a search result nothing, so this is where the idea gets described
in words someone might actually type. `title: seoTitle — ProductUnhunt` has to
fit in 70 characters, and the build says so if it doesn't.

## Door two — email it

Send the same fields as plain text to **ideas@productunhunt.com** and let
someone else do the YAML.

There is no form, no attachment requirement, and no autoresponder. Ingestion
is manual, which is a polite way of saying it happens when the editor gets to
it.

## The fields

Same either way:

- **Product name.** The kind of name that would fit on a lanyard.
- **Tagline.** One line, savage, no hedging.
- **Author name.** Pseudonyms are fine. No follower counts, ever.
- **Optional:** X handle, GitHub handle, a site, a one-line bio.
- **The story.** Default shape: five sections — The Pitch · The Delusion ·
  The Reality Check · Why It Stays Unbuilt · Unwanted Bonus — with an
  optional How It Started before the Pitch. Format breaks are allowed; see
  below.
- **One to three official tags,** from the closed list below.

### Official tags

AI nonsense · SaaS · Dating · Marketplace · Hardware · B2B · Consumer ·
Social · Who asked? · Local · Climate · Health · Fintech · Creator economy

One to three per idea. The list is closed — no free-typed tags — and the
schema rejects anything else. If your idea genuinely needs a fifteenth tag,
say so in the PR and make the case.

### The sections

| Section              | What goes in it                                                                        |
| -------------------- | -------------------------------------------------------------------------------------- |
| How It Started       | _Optional._ The mundane moment the idea mutated from. Two or three sentences, a scene. |
| The Pitch            | The idea, played completely straight. Sell it.                                         |
| The Delusion         | Why it sounded good. The reasoning that got you there.                                 |
| The Reality Check    | Where it falls apart. Be specific — numbers, mechanics, the one detail that kills it.  |
| Why It Stays Unbuilt | The verdict. Short.                                                                    |
| Unwanted Bonus       | The worse idea that fell out of the first one.                                         |

How It Started is the one optional section: use it when the origin is
genuinely a story, skip it when the Pitch already carries it. The other five
are required, in that order — `npm run check:ideas` enforces them.

No word-count rule. Funny and specific beats a target length, and the editor
trims what drags.

### Breaking the format

The five sections are the house format, not a law. If your idea's story
demands a different shape — a one-sentence obituary, an FAQ, a fake
changelog, the exit interview — break the format. Two conditions:

- It has to be funnier than the template would have been. A format break
  that isn't a joke is just missing structure.
- The two load-bearing beats survive in some form: sell the idea straight,
  then kill it honestly.

When in doubt, use the template. The repetition is part of the joke.

## The bar

**Published** if it is funny and specific.

**Rejected** if it is:

- a real pitch deck wearing a costume
- an attack on a person, a company's staff, or an identifiable individual
- another empty "Uber for X" with no observation in it

Rejection is not a review. There is no appeals process and no feedback
guarantee.

## After acceptance

The editor adds the publish date, the status, and — if it earns one — a
one-line stamp. Light copy-editing is allowed. The joke stays yours; the
commas may not.

If the idea later turns out to exist anyway — a bought domain, a landing
page, a working app — the editor sets `status: author-relapsed` and adds a
`relapse` block (`url` + `extent: domain | landing-page | working-app`)
linking the evidence. CI enforces that a relapse block and `unbuilt` never
coexist. This is a confession, not a launch channel.

The poll is not yours to run. Neither is the schedule.

## The deal

This is entertainment. Treat every idea as public and already dead.

By submitting, you grant ProductUnhunt a perpetual, irrevocable, worldwide
licence to publish, edit, translate, and roast it, and to keep it published.
You keep the copyright in your idea. We promise nothing.

Do not send confidential plans, client work, or anything you would mind
seeing next to Founder needs sleep.

Published ideas may be copy-edited. We can reject or unpublish anything, no
debate.

This grant runs to ProductUnhunt and is separate from the licenses on the
repository — see [`src/content/LICENSE`](./src/content/LICENSE) for what
everyone else may do with published ideas, and [`NOTICE`](./NOTICE) for the
name and the marks.

## Comments

House rules on every idea page:

- Roast the idea, not the author.
- Pitching a real startup in the comments is a self-own and will be deleted.

---

## Code contributions

Rarer than idea contributions, and held to a different standard.

Requires **Node.js 22.12 or newer**. The version lives in `.nvmrc`, so a
version manager can pick it up.

```sh
git clone https://github.com/productunhunt/productunhunt.git
cd productunhunt
nvm use          # or `fnm use` / `mise install` — reads .nvmrc
npm install
cp .env.example .env
npm run dev
```

Before pushing:

```sh
npm run format   # Prettier — CI rejects unformatted code
npm run check    # astro check — must report 0 errors
npm run build    # must succeed
```

Two things that trip people up:

- **Route internal links through `withBase()`** (`src/lib/url.ts`).
  Hard-coded paths break deployments that use a `base` path.
- **The site uses View Transitions.** Scripts that touch the DOM must re-run
  after soft navigation — listen for `astro:page-load` or `astro:after-swap`
  rather than relying on a single initial execution.

Ground rules:

- Branch from `main`. Descriptive branch name (`feat/…`, `fix/…`, `docs/…`).
- Small commits, one logical change each.
- [Conventional Commits](https://www.conventionalcommits.org/) subjects.
- Screenshots for any visual change.
- One concern per PR. Drive-by refactors make review slow.

The site ships close to zero client-side JavaScript, and keeping it that way
is a feature rather than an accident. The vote island is the exception, and it
had to argue for itself.

Code contributions are MIT-licensed — see [`LICENSE`](./LICENSE). Ideas are
not; they are covered by the deal above.
