# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-26

### Changed
- Updated footer to "Built by Enzo Vezzaro — from the Dominican Republic, for the world."
- Listing fee model clarified in docs: contribution is buyer-paid ON TOP of seller's price; community splits reserved for future

### Added
- **Listing detail pages** with repo info (description, stars, language, topics, README excerpt) fetched from GitHub API
- **Gated storefront CTA**: "Go to seller's storefront" button disabled until contribution payment is clicked (localStorage tracking)
- **Community Discussion** integration: Discussion stats (comments, reactions) shown on listing detail pages

## [0.1.0] - 2026-08-23

### Added
- **Verification pipeline** (`src/verify/pipeline.ts`): the 12-step fail-closed Listing PR check (schema, repository, release, manifest, signature, license, /sell reachability + metadata, repository identity, seller Payment Link, discovery pricing, duplicates/immutability, secret scan). Pure, injected fetch, full report even after failures
- **Discovery Stripe automation** (`src/payments/discovery.ts`): idempotent Product/Price/Payment Link creation for DISCOVERY access only — deterministic product-name keys, existing links returned unchanged (immutable per release, D16); input type carries no seller fields
- **Registry records** (`src/registry/records.ts`): immutable per-release listing records; replacing an existing discovery link throws (§15)
- **CI workflows**: `verify-pr.yml` (fail-closed gate, refuses to run with a Stripe secret present) + `discovery-sync.yml` (post-merge provisioning, Actions-secret-only) + `scripts/verify-pr.mjs` / `scripts/discovery-sync.mjs`
- **§20 end-to-end proof**: automated two-Stripe-transaction test (verify → discovery link via Listing key → registry → public page → seller checkout → purchase artifact)
- **Landing**: full lx landing system ported from the CLI (FaultyTerminal hero with decrypt text reveal, 4 exclusive theme layers, autoplay + glitch, ThemeSwitcher) with listing-specific hero content and sections
- **CHANGES.md**: running implementation log

### Changed
- Nav is icon-only: old VitePress default logos removed, site title text hidden (`siteTitle: false`), branding `icon.png` as menu icon + favicon

### Notes
- Architecture invariant encoded in code + tests: the Listing charges ONLY for discovery; the seller's /sell transaction is fully independent; Listing CI never creates/modifies/proxies seller payments

## [0.0.1] - 2026-08-22

### Added
- Initial repository structure with ACC framework
- Static frontend (Bun + Vite + React + TypeScript + shadcn/ui + Tailwind)
- Serverless API structure (Edge functions on Vercel/Cloudflare)
- Repository registration endpoint
- Product discovery & search
- Release indexing (auto-detect from Git tags)
- Stripe Embedded Checkout integration
- Stripe Connect for automatic revenue split
- Signed pricing policy service (GET /api/v1/pricing)
- Signature authority (Ed25519 keys for manifests/policies)
- Public listing registration endpoint
- Settlement system (fee calculation from signed policy)
- Trust document for key rotation (GET /api/v1/trust)
- License system (repository access via GitHub fork)
- CI compliance enforcement (verify.yml MUST PASS for deploy)
- Anti-slop Oxlint plugin (14 generic rules at error level)
- Impeccable design/UX skill
- ACC framework integration (AGENTS.md, .acc/config/, .acc-memory.md)
- Custom open-source licensing scheme
- AI contribution verification (.github/pr_allow_providers.yml)
- Payment architecture documentation (Stripe Embedded Checkout + Connect)

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- Private keys NEVER committed to Git, CI, or logs
- Pricing policies MUST be cryptographically signed
- Fee calculations MUST use signed pricing policy (no hardcoded percentages)
- All financial operations MUST be idempotent
- Webhook signatures MUST be verified (Stripe, GitHub)
- Runtime MUST verify pricing policy on startup
- CI MUST fail deployment if verification fails

## [Unreleased]

### Planned
- Frontend UI (all pages: catalog, product detail, purchase flow, dashboard, admin)
- Listing CLI (login, search, inspect, buy, releases, purchases, licenses, publish, status, verify)
- GitHub webhook integration for release detection
- Admin panel (pricing policy management, listing management)
- Audit logging system
- Multi-agent orchestration configuration