---
title: Connected Listings
description: Every tool currently connected to the official reposell listing — live /sell endpoints, verified releases and immutable discovery records.
---

# Connected Listings

Every entry below is a registry record connected to the official listing: a
repository whose release passed the CI verification pipeline. Each record is
immutable — one release, one discovery link, forever.

<ListingsDirectory />

## Connect your own

If your repository has a working `/sell` endpoint, getting listed is one
command and one PR:

```bash
reposell listing publish v1.0.0
```

CI verifies your live endpoint (identity, release, signature, license,
payment link) — **PASS** merges automatically, **FAIL** explains why.
See [PR Verification](./verification) for the full pipeline.
