# reposell Listing (Official)

## Purpose

The official reposell listing is the authoritative listing service for the reposell protocol, deployed canonically at `listing.reposell.dev` as a static generated index over every verified listing. Its product registry is GIT-NATIVE: products are published through pull requests to the listings repository (`listings/package-name.json`, containing only the `/sell` reference), verified by CI against the seller's live endpoint (manifest, release, signature, payment link, health), and auto-merged on pass — never through an API. Beyond the registry it provides product discovery, verification, release indexing (automated re-verification keeps entries current), contribution payment-link generation via CI, signature authority, public listing registration, and settlement records.

PRINCIPLE: listing.reposell.dev discovers and verifies products; it does NOT host or sell them. Product pages render generated Listing JSON plus a LIVE client-side request to each owner's /health endpoint; /sell remains entirely under the repository owner's control. NO Reposell application server, database, or API exists — the registry is Git + GitHub Actions + static files.

## Responsibilities

- Operate the PR-based product registry: CI pipeline validates every PR against the seller's live `/sell` endpoint; PASS → auto-merge, FAIL → block with reason
- Run scheduled re-verification of existing listings (new releases, manifest/payment/health changes) so updates flow without new PRs

- Operate the listing frontend and CI pipelines (no API server)
- Register and verify repository `/reposell/*` endpoints
- Index products and releases from registered repositories
- Serve the static generated catalog at `listing.reposell.dev` (no API server)
- Create per-release Listing contribution Payment Links via CI (`REPOSELL_STRIPE_SECRET_KEY`, Actions-only)
- Manage official signing keys and trust documents for key rotation
- Register and authorize public listing instances
- Record settlement data as signed static files
- Provide listing CLI for terminal operations

## Ownership

Owner: the listing repository itself (Git + Actions)

## Inputs

- Pull requests to the listings registry (reference-only: schema + `/sell` URL)
- Seller `/sell` endpoints (fetched live by CI verification)
- Seller `/health` endpoints (CI + browser runtime checks)
- Public listing registration requests
- GitHub events for release detection

## Outputs

- Product catalog and search index (static JSON)
- Per-release Listing contribution Payment Links (Reposell Stripe, test/live modes)
- Signed XP event ledger files
- Settlement records (signed static files)
- Listing identity records
- Trust documents for key rotation

## Dependencies

- GitHub Actions (verification + generation)
- Stripe (test mode first, then live)
- Static hosting (GitHub Pages)

## Constraints

- Official signing key NEVER committed to Git, CI, or logs
- `REPOSELL_STRIPE_SECRET_KEY` lives ONLY in this repo's Actions secrets; live mode for production
- Every release gets its own IMMUTABLE Listing Payment Link — never deleted/replaced/reused between releases
- Contribution amounts are declared by sellers; changes apply to future releases only
- All financial operations MUST be idempotent (CI reruns never duplicate Stripe objects)
- Runtime MUST verify signatures on all consumed data
- CI MUST fail closed if verification fails

## Architecture

The official listing is SERVERLESS — GitHub + Actions + Stripe + static files:

1. **Frontend** - Bun + Vite + React + TypeScript + shadcn/ui + Tailwind (static, reads generated JSON)
2. **Registry** - Git repository: `listings/*.json` PRs + `listings/repositories/**` generated records
3. **CI** - GitHub Actions: verify-pr pipeline (auto-merge/block), scheduled re-verification, contribution link creation, ledger signing
4. **Payments** - Per-release Reposell Stripe Payment Links created by CI; sellers keep their own `/sell` links
5. **Git** - GitHub API for release detection and repo access
6. **Crypto** - Ed25519 signing for manifests and the event ledger

## Workflows

- See `.acc/config/workflows/feature.md` for the standard feature workflow.
- See `.acc/config/workflows/release.md` for the release automation workflow.