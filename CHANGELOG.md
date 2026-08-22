# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Public marketplace registration endpoint
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
- Marketplace CLI (login, search, inspect, buy, releases, purchases, licenses, publish, status, verify)
- GitHub webhook integration for release detection
- Admin panel (pricing policy management, marketplace management)
- Audit logging system
- Multi-agent orchestration configuration