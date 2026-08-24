---
title: How It Works
description: From pull request to verified listing — the CI pipeline behind the catalog.
---

# How It Works

The whole system is one loop: **a PR proposes a product, CI interrogates the seller's live endpoint, and only a full pass merges.** No API, no database, no human judgment call about whether a product looks legitimate.

## The flow

```text
Contributor / developer
   │  opens PR adding listings/<package>.json
   ▼
Listing repository (Git)
   │  triggers
   ▼
GitHub Actions verification pipeline
   │  fetches the seller's LIVE /sell + manifest
   │
   ├── FAIL → PR blocked, reason in CI output
   └── PASS → auto-merge
              │
              ▼
      Static catalog regenerated
      at listing.reposell.dev
```

## What CI verifies

CI never trusts the PR — it treats it as a claim and goes checking:

1. **Schema** — the PR contains a valid `reposell-listing/v1` reference.
2. **Fetch** — it GETs the seller's live `/sell` endpoint and manifest.
3. **Transport** — HTTPS only.
4. **Repository** — the GitHub repository exists and matches the manifest.
5. **Release** — the declared release actually exists in the repository.
6. **Release ↔ manifest** — version, tag and commit agree with each other.
7. **Signature** — the manifest's Ed25519 signature validates against the seller's public key.
8. **Authorization** — the signed manifest authorizes listing publication.
9. **Payment link** — the seller's Stripe Payment Link is real, reachable, and matches the release price and currency. (Free releases skip this check — nothing to verify.)
10. **Health** — the project's `/health` endpoint responds.

Any failure blocks the merge — with the exact reason visible in CI output.

## Fail closed

The pipeline treats an unreachable endpoint and a forged manifest identically: unverifiable equals rejected. There are no fallback values, no "assume valid while we look into it", no grace period for bad signatures. If reality does not cooperate right now, retry when it does.

## Updates happen without new PRs

When a developer ships v1.5.0, their `/sell` changes automatically — nobody should have to file a form saying so. A scheduled GitHub Action periodically re-verifies **every existing listing**:

- new releases detected and indexed
- manifest changes picked up
- payment links and health re-checked
- the static index regenerated

Security split: new products require a PR; already-verified listings update themselves.

## At reading time

Product pages show two facts side by side:

| Source | Tells you |
| --- | --- |
| Generated listing JSON | what CI verified, and when |
| Live client-side `GET /health` | whether it is *still* true right now |

You always know the difference between "verified last Tuesday" and "healthy as you watch."

## Why PRs beat an API

GitHub-native authentication, a complete audit trail in git history, zero infrastructure to operate, and moderation that is literally closing a PR. An API server would add uptime anxiety and subtract nothing.

Next: [publish your own repository](/guide/publishing), or dig into the [trust model](/guide/trust-model) that makes automated merging safe.
