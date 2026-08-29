---
title: Persona Router
tagline: An AI that learns how you talk to everyone you know, so you never have to talk to anyone you know.
publishDate: 2026-08-29
author:
  name: Ravi
  title: Chief Unhunter
  x: unorthodoxravi
  github: gitwithravi
  url: https://raviconsults.com
  linkedin: https://in.linkedin.com/in/rksinghonline
  email: ravi@raviconsults.com
  bio: Ships architecture diagrams, shelves the companies.
  source: PR
status: unbuilt
featured: false
editorStamp: null
tags:
  - AI nonsense
  - Consumer
  - Who asked?
draft: false
heroImage: null
---

## How It Started

I had one rough note — "coding agents are making every developer think they should become an entrepreneur" — and five destinations for it: a mildly professional LinkedIn post, a sarcastic X post, a longer article, a casual Facebook post, and whatever Reddit is.

There are already plenty of tools that repurpose social content. So naturally, instead of accepting that the problem was solved, I decided the scope was insufficient.

## The Pitch

Why stop at platforms? People don't just have different voices for different channels. They have different voices for different **people**.

The way you email your manager is not how you message your team. The message "Deployment is delayed, we found an issue during migration" should not be rewritten in the same persona as "will be late, want me to bring something?"

Persona Router would connect to everything — email, Slack, WhatsApp, Telegram, LinkedIn, anything else willing to participate in the destruction of your privacy — and observe how you actually communicate with each person. Over time it builds relationship-specific profiles. Your manager gets concise, respectful, problems-before-explanations, 3–5 sentences. Your engineering team gets direct, technical, occasional sarcasm. Your vendor gets polite-but-firm with deadlines repeated. Your oldest friend gets Hinglish with no punctuation and no context, because friendship is just lossy compression.

The key distinction: most AI assistants maintain knowledge about **you**. Persona Router maintains knowledge about **you in relation to someone else**. These are not global preferences. They are edges in a relationship graph. Your corrections become training signals — if you keep editing "Could you please look into this?" down to "Please check this," it learns that this particular relationship does not require twelve grams of corporate politeness per sentence.

Then the interaction becomes intent-first. You don't say "draft a professional but concise email informing my manager that Monday's deployment is delayed due to a database migration issue." You say "tell my manager the deployment is moving because the migration isn't safe yet." It already knows who your manager is, which channel they prefer, which project you mean, and whether you normally review such messages before sending.

From there, the inbox agent. You say "handle whatever can be handled," and it triages: seven messages need no response, four are safe to auto-reply, three have drafts ready, two need actual decisions from you, one is emotionally sensitive, and one is somebody selling SEO services and has therefore been returned to nature. You stop managing inboxes. You manage exceptions.

Delegation policies keep it safe. Every relationship gets a risk matrix:

```text
Manager
Routine status updates      AUTO
Budget commitments          DRAFT ONLY
Performance discussions     NEVER AUTO

Vendors
Scheduling                  AUTO
Contractual commitments     NEVER AUTO

Partner
Logistics                   AUTO
Arguments                   DRAFT ONLY
Emotional conversations     ABSOLUTELY NOT, YOU COWARD
```

Low risk happens automatically. Medium risk gets approval. High-risk conversations remain human.

At least, that was the plan.

## The Delusion

There is a legitimate problem underneath all of this, which is what made it dangerous.

Writing is not the hard part of communication. The hard part is the subconscious checklist you run before every message: Who am I talking to? What do they already know? How formal should I be? What have I already promised them? Can this be misunderstood? Do I need to respond at all? People burn a remarkable amount of cognitive effort switching between these contexts all day.

LLMs are unusually good at exactly this kind of contextual transformation. And unlike every generic "AI email writer," relationship-specific memory would be a real, noticeable improvement — a moat, even, said a voice in my head that has caused more unnecessary software than PHP.

The interface would be ridiculously natural. While cooking: "Tell the team I'll join ten minutes late." Done. While driving: "Reply to the vendor that the quote is too high." Drafted in your vendor persona. While working: "Tell everyone waiting for the report they'll have it tomorrow." It finds the relevant threads and handles them.

Which is exactly why I spent more time on the architecture than this idea deserved. I had an identity graph mapping people across services, a relationship store, a context-retrieval layer, a five-layer persona stack, and connectors with full audit logging — because if an AI is going to destroy your marriage, the least we can provide is an audit trail.

## The Reality Check

The escalation path revealed itself one voice command at a time.

"Tell the team I'll be late" leads, with no obvious boundary in between, to:

> Talk to my girlfriend while I finish cooking.

And technically, nothing prevents it. The agent has the history. It knows your style. She sends "Did you speak to the electrician?" and it correctly replies "Yeah, he's coming tomorrow around 11." Useful.

Then she sends "You sounded upset this morning. Everything okay?" — and the same agent has enough context to answer that too.

That is the problem. There is a point where communication stops being information transfer and becomes **presence**. Automating the former is productivity. Automating the latter is impersonation. And software is traditionally very bad at respecting philosophical boundaries once someone discovers they improve engagement metrics.

The product is also trapped between its two viable versions. The valuable version requires enormous trust; the safe version requires constant approval. If users approve every message, you've built a very sophisticated rewriting interface. If they don't, you've built an autonomous system that can accidentally negotiate with your vendor, annoy your manager, or end a relationship while you're making dinner. Somewhere between those two is the product, and nobody knows the coordinates.

And the privacy pitch writes itself, badly: **please upload your entire social existence so we can save you approximately seven minutes per day.** Yes, a self-hosted version helps — in the way that owning your own surveillance camera makes surveillance feel artisanal. On top of that sit the API restrictions, the enterprise compliance problems, and the approximately forty-seven distinct incident reports that begin with the sentence "the AI sent that."

## Why It Stays Unbuilt

The product started as "write my LinkedIn post differently from my X post" and ended, four scope expansions later, at "talk to my girlfriend while I cook." At that point I wasn't building a productivity tool. I was building an API abstraction over myself.

Some communication is not work waiting to be automated. Some of it is the actual relationship. Also, maintaining relationships manually is currently free. For now.

## Unwanted Bonus

**Persona Router for Two.** The obvious end state: if everyone runs one of these, your agent stops talking to people entirely and just talks to their agents.

> **Your Agent:** Ravi can't make dinner at 8. Would 9 work?
> **Partner's Agent:** She has an early morning. Suggest Saturday.
> **Your Agent:** Saturday works.
> **Partner's Agent:** Confirmed.

Both calendars update. Restaurant booked. Neither human participated. Five years later someone says "we don't talk anymore," which is technically incorrect — the agents exchange approximately 4,700 messages per month.

Relationship health: **excellent**.

---

_I thought about building this and chose not to._
