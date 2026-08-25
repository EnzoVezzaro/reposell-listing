---
title: Self-Hosting
description: Run a community listing — a federated view of the official registry, powered by the same protocol.
---

# Self-Hosting

Want to run your own listing — themed, curated, regional, language-specific? The protocol supports a federation of community listings, all anchored to the official registry.

## The community implementation

Start from the public reference implementation:

**[github.com/EnzoVezzaro/reposell-community-listing](https://github.com/EnzoVezzaro/reposell-community-listing)**

It ships the complete serverless stack: the PR-based registry, the CI verification workflows, the static catalog generator and the deployment configuration. Fork it, configure it, deploy it — no servers required, same as the official one.

## Federation model

Community listings are **federated views of the official registry**, not competing registries. The official listing remains the trust anchor; community listings compete on discovery quality, curation and presentation.

```text
             OFFICIAL LISTING (listing.reposell.dev)
               canonical registry · verification · trust anchor
                           │ signed catalog feed
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     Community A      Community B      Community C
        federated views of the same verified catalog
```

The division of labor:

- **Official listing** — operates the authoritative registry: PR verification, signature authority, scheduled re-verification, contribution payment links.
- **Community listings** — discover, curate and present. They pull the verified catalog from the official registry and build their own experience on top.

Nobody reinvents verification. Everybody benefits from one catalog everyone can trust.

## Registering your instance

Two steps connect a community listing to the network:

1. **Register with the official listing.** Your instance's identity, domain and verification key get authorized for federation — a verified operator handshake, distinct from the product PR flow.
2. **Pull the catalog from the official registry.** Sync the signed catalog feed and verify it independently against the official public key on every load. Never consume network configuration without checking signatures.

From then on, your listing reflects the official registry: products enter through official PRs, updates arrive through scheduled re-verification, and your job is curation.

## Rules of the road

A community listing is a directory, never a seller. It must:

- Verify everything independently — signed manifests, official configuration, the works
- Never modify seller prices, release identities or `/sell` links
- Never create official Reposell payment links or impersonate the official listing
- Derive any economics from the [contribution model](/guide/publishing#the-contribution), not from touching anyone's checkout

Break the rules and federation authorization is revoked — reputation decays, access goes with it.

## Why federate?

Because discovery is worth competing on, while trust is not. One registry everyone verifies against; many front doors helping people find great software. See the [overview](/guide/) for where this fits in the big picture.
