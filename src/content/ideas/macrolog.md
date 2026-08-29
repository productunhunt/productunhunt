---
title: MacroLog
tagline: Bring-your-own-API-key calorie tracking for a market of exactly one engineer, whose last entry was six months ago.
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
status: author-relapsed
featured: false
relapse:
  url: https://macrolog.online
  extent: working-app
editorStamp: Total addressable market — one user. Acquired, retained for a while, churned. It was the author.
tags:
  - AI nonsense
  - Health
  - SaaS
draft: false
heroImage: null
---

## How It Started

I was using one of those AI-enabled calorie tracking apps. You photograph your dal, the AI tells you it is dal, and everyone feels very futuristic. On day seven the trial ended and the app asked for ₹700 a month.

₹700. A month. For inference.

I did what any emotionally healthy person does when confronted with a subscription: I opened a calculator. Daily tracking through the cheaper models on OpenRouter would cost me about a dollar for the entire month. And I eat more or less the same four things every day — embed them once in pgvector and most days the "AI" doesn't even need to run. Why exactly was I paying a 20x markup for someone else to call the same API?

This is the kind of question a normal person answers with "convenience" and moves on with their life. I answered it with a Laravel project.

## The Pitch

MacroLog is calorie tracking for engineers — people who look at a ₹700/month app and see a $1/month API bill wearing a nice UI as a disguise.

You bring your own API key. You describe what you ate; a cheap model does the macro estimation; the bill goes to *your* OpenRouter account, where you can watch it fail to reach a dollar. Your meals get embedded in pgvector, so the second time you log "2 rotis and dal" — which, statistically speaking, is every time — it's a vector lookup, not an API call. The system learns the profoundly repetitive truth about your diet and stops paying to rediscover it.

And surely I wasn't alone? Surely there was a whole population of software developers out there, tracking their protein, silently resenting their subscriptions, waiting for a platform where they could do it at cost? People who read "bring your own key" and feel *seen*?

So I actually launched it. macrolog.online. It is live right now. It has one registered user. His last entry was six months ago. I can name him.

## The Delusion

The math was genuinely correct — that's the trap. The unit economics of AI calorie apps really are absurd, the pgvector caching trick really works, and "BYOK so the platform can't rug you on pricing" is a real principle I still believe in.

The delusion was every word after "for myself." I took "I don't want to pay ₹700" and heard "there is a market of people who would rather configure an API key than pay ₹700." Do you know what those two statements have in common? Nothing. The set of people who track calories and the set of people who know what OpenRouter is do overlap — I've met the overlap, it's me — but "I am the target user" is market research the way a mirror is a focus group.

Then, when even that one user stopped logging in, the open source enthusiast in me woke up. Hell with third-party apps entirely — I put it on GitHub as [laravel-macro-log](https://github.com/gitwithravi/laravel-macro-log), so that other people could self-host the thing I had already stopped using. This felt like a principled act at the time. It was actually a very elaborate way of closing a tab.

## The Reality Check

Here is the entire go-to-market strategy, reproduced in full:

That's it. That was the strategy. I built it, launched it, and waited for the developers-who-count-macros to arrive through what I can only assume was going to be word of mouth among people I had not told.

Nobody knows MacroLog exists. There is no distribution, no content, no community, no reason anyone searching "calorie tracker" would ever land on it. And the audience it's for is precisely the audience least likely to pay for it — the pitch is literally "you could do this yourself for a dollar," delivered to people who respond, "you're right," and then do it themselves for a dollar. I had built a product whose value proposition was an instruction manual for not needing the product.

Meanwhile the ₹700 app is doing fine, because its users want to photograph their dal, not provision credentials. The markup I was so offended by wasn't inference cost. It was the price of never having to learn what an API key is. That, it turns out, is the actual product, and I had carefully engineered it out.

Also — and I say this with love for six-months-ago me — I stopped tracking my calories. The founder churned from his own app. When your retention curve is a single point that goes to zero, the market has spoken, and the market was you.

## Why It Stays Unbuilt

It doesn't. It's built, deployed, open sourced, and running — the most operational failure on this entire website. There is simply no business around it: no one knows it exists, and everyone capable of appreciating it is equally capable of replacing it in a weekend. The repo is right there. The dal is embedded. The user is gone.

## Unwanted Bonus

**MacroLog Enterprise.** Same app, but for engineering teams: everyone's macros in a shared Postgres instance, a Slack integration that posts your protein intake to #general, and a team leaderboard for logging streaks so lunch can finally have OKRs. SSO costs extra, obviously. The pricing page charges ₹700 a month — per seat — and the FAQ explaining why is just the phrase "we have learned nothing" in six languages.

---

_I thought about building this and chose not to._
