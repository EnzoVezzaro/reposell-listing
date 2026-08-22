# reposell Marketplace (Official)

## Purpose

The official reposell marketplace is the authoritative marketplace service for the reposell protocol. It provides product discovery, repository registration, product verification, release indexing, purchase system, payment integration, license system, pricing policy service, signature authority, public marketplace registration, and settlement system.

## Responsibilities

- Operate the official marketplace API and frontend
- Register and verify repository `/marketplace` endpoints
- Index products and releases from registered repositories
- Process purchases via Stripe Checkout with webhook verification
- Issue cryptographic licenses on successful payment
- Serve signed pricing policies (`GET /api/v1/pricing`)
- Manage official signing keys and trust documents for key rotation
- Register and authorize public marketplace instances
- Calculate and record settlement transactions
- Provide marketplace CLI for terminal operations

## Ownership

Owner: packages/backend

## Inputs

- Repository registration requests with manifests
- Stripe webhook events (checkout.session.completed, etc.)
- Public marketplace registration requests
- GitHub webhook events for release detection
- Pricing policy management (admin)

## Outputs

- Product catalog and search index
- Signed pricing policies
- Purchase records and licenses
- Settlement records
- Marketplace identity records
- Trust documents for key rotation

## Dependencies

- # Backend API (to be implemented)
- # Frontend (to be implemented)
- # Database layer (to be implemented)
- # Payment integration (to be implemented)
- # Git integration (to be implemented)
- # Crypto/signing (to be implemented)
- # CLI (to be implemented)

## Constraints

- Official signing key NEVER committed to Git, CI, or logs
- Pricing policies MUST be cryptographically signed
- Fee calculations MUST use signed pricing policy (no hardcoded percentages)
- All financial operations MUST be idempotent
- Webhook signatures MUST be verified (Stripe, GitHub)
- Runtime MUST verify pricing policy on startup
- CI MUST fail deployment if verification fails

## Architecture

The official marketplace follows a modular architecture:

1. **Frontend** - Bun + Vite + React + TypeScript + shadcn/ui + Tailwind
2. **API** - Versioned REST API (`/api/v1/...`)
3. **Authentication** - Session/JWT based
4. **Database** - PostgreSQL with migrations
5. **Payment** - Stripe integration with webhook verification
6. **Git** - GitHub API for release detection and repo access
7. **Crypto** - Ed25519 signing for policies and manifests
8. **CLI** - Marketplace CLI using same API as web app

## Workflows

- See `.acc/config/workflows/feature.md` for the standard feature workflow.
- See `.acc/config/workflows/release.md` for the release automation workflow.