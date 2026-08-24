---
title: Publishing
description: List your repository on the official reposell listing — two commands, one pull request.
---

# Publishing

If your repository already has a working `/sell` endpoint, listing takes two commands and zero infrastructure:

```bash
reposell listing enable     # opt in, declare your contribution
reposell listing publish    # opens the publication PR for you
```

The [`reposell` CLI](https://github.com/EnzoVezzaro/reposell) handles signing, manifest generation and the PR itself. New to reposell? Run `reposell init` first — it sets up your `/sell` endpoint, manifest and CI workflows from scratch.

## What the PR contains

One file, and it holds nothing but a reference:

```json
{
  "schema": "reposell-listing/v1",
  "sell": "https://you.github.io/your-package/sell"
}
```

No price. No description. No screenshots. The PR is a **claim**, not the product data — CI fetches the authoritative information live from your `/sell` endpoint during verification ([how it works](/guide/how-it-works)). That is the entire point: there is nothing in the PR worth faking.

## You cannot fake someone else's product

This matters because the contributor and the repository owner are often different people. Suppose Bob opens *"PR #142: Add alice/project"*:

```text
Bob's PR
   │ proposes a reference
   ▼
Alice's live /sell
   │ proves ownership, authorization, price, release
   ▼
CI verifies Alice's Ed25519 signature
   ▼
Only then does it appear on the listing
```

CI ignores whatever Bob wrote and trusts Alice's signed endpoint instead. Bob can propose Alice's package; he cannot invent its price, releases or identity — those come from her manifest, over her signature.

## The contribution

Listing is free. When you run `reposell listing enable`, you declare a voluntary contribution to Reposell that applies per future release:

```text
Contribution to Reposell? [$5]
  $5 / $10 / $25 / $50 / custom
```

- Your price is untouched — **you keep 100% of every sale** through your own `/sell`.
- During the publication PR, the listing's CI creates a separate Stripe Payment Link for the contribution, on Reposell's account. Your Stripe credentials are never shared.
- Each release gets its own immutable contribution link, kept forever. Changing your contribution affects future releases only — historical records are never rewritten.
- Free projects can participate too: `pricing.type: "free"` needs no payment verification, and a free release can still carry a donation-style contribution.

## After merge

Your listing appears at [listing.reposell.dev](https://listing.reposell.dev) as part of the regenerated static catalog. Future releases flow in automatically through scheduled re-verification — publish tags as usual and forget the listing exists.

Check anytime with:

```bash
reposell listing status     # is my listing current?
reposell listing verify     # dry-run the CI checks yourself
```

Curious what the listing may and may not do with your data? Read the [trust model](/guide/trust-model). Thinking bigger than one repo? See [self-hosting](/guide/self-hosting).
