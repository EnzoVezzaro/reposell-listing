---
title: What is the reposell Listing?
description: Discovery and cryptographic verification for software sold straight from the source — serverless by design.
---

# What is the reposell Listing?

The reposell listing is the discovery and verification layer of the [reposell protocol](https://github.com/EnzoVezzaro/reposell). It indexes software that developers sell directly from their own repositories — through their own `/sell` endpoints, priced by them, paid to them.

It sits **on top of** repositories. It never replaces them.

## What it is

Three jobs, done without owning anything:

1. **Discovery** — a browsable catalog at [listing.reposell.dev](https://listing.reposell.dev) of repositories selling their own work.
2. **Verification** — every entry is checked against the seller's live `/sell` endpoint and its Ed25519 signature before it appears. If the math doesn't check out, it never shows up.
3. **Freshness** — scheduled GitHub Actions re-verify existing listings continuously, so releases, manifests and health stay current without anyone filing paperwork.

## What it is not

- **Not a store.** The listing does not host, own, or sell software. The actual `/sell` endpoint stays entirely under the repository owner's control.
- **Not an API service.** There is no API server and no database anywhere in this architecture.
- **Not a middleman.** Sellers keep 100% of their price. If they want, they declare a voluntary contribution to Reposell — see [Publishing](/guide/publishing).
- **Not a gatekeeper.** Anyone can publish; nothing gets listed until cryptography says yes. See the [trust model](/guide/trust-model).

## A serverless, Git-native registry

Publication happens through plain pull requests. Adding a product means adding one small file:

```json
{
  "schema": "reposell-listing/v1",
  "sell": "https://alice.github.io/cool-package/sell"
}
```

That is the whole thing — a pointer, not a copy. GitHub Actions then fetches the seller's live `/sell` data, verifies it end-to-end, and auto-merges on pass. See [how it works](/guide/how-it-works).

The full stack:

| Component | Technology |
| --- | --- |
| Registry | Git repository (`listings/*.json`) |
| Verification | GitHub Actions (fail-closed) |
| Catalog | Static generated index at listing.reposell.dev |
| Contributions | Per-release Stripe Payment Links created by CI |

No servers to run, no database to babysit. The audit trail is the git history.

## Who it is for

- **Developers selling their work** — publish with two commands, keep every cent of your price. See [Publishing](/guide/publishing).
- **Buyers** — find software sold straight from the source, with proof of authenticity attached. The [trust model](/guide/trust-model) explains why the proof holds.
- **Curators and communities** — run your own front door over the shared catalog. See [Self-hosting](/guide/self-hosting).

## Where next

- [How it works](/guide/how-it-works) — the PR pipeline, step by step
- [Publishing](/guide/publishing) — list your repository in minutes
- [Trust model](/guide/trust-model) — why you can believe what you read here
- [Self-hosting](/guide/self-hosting) — run a community listing in the federation
