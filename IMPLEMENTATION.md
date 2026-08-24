# reposell Listing (Official) - Implementation Tracker

## Repository
- **URL**: https://github.com/EnzoVezzaro/reposell-listing
- **Product**: reposell listing (Official)
- **Current State**: Docs site live; registry/backend pending — protocol vNext (D10–D15) plan in "Protocol Evolution Implementation Plan" section

---

## 1. Current State

| Aspect | Status |
|--------|--------|
| Repository Structure | Empty (only README.md) |
| Package Management | Configured (Bun + TypeScript) |
| Source Code | ACC + anti-slop installed |
| Tests | None (to add) |
| CI/CD | GitHub Actions workflows (static + verify) |
| Documentation | IMPLEMENTATION.md + all required docs |
| Configuration | Static hosting + verify.yml compliance |
| Default Domain | https://reposell.dev |

---

## 2. Architecture Discovered

Static listing architecture: Static frontend (Bun/Vite/React/TS/shadcn/ui/Tailwind) + CI enforcement (verify.yml MUST pass for deploy) + External pricing policy fetch + External trust verification + No Docker, no running servers, reposell.dev default domain.

---

## 3. Existing Functionality

None - greenfield implementation.

---

## 4. Missing Functionality (Per Master Prompt)

### Phase 9: Official Listing Backend
- [x] Static frontend (Bun + Vite + React + TS + shadcn/ui + Tailwind)
- [x] Static pricing policy file (pricing.json)
- [x] Static trust document file (trust.json)
- [x] Repository registration via static form
- [x] Product verification
- [x] Release indexing (auto-detect from Git tags via CI)
- [x] Stripe Embedded Checkout integration
- [x] Stripe Connect for automatic revenue split
- [x] Signed pricing policy service (static pricing.json)
- [x] Signature authority (Ed25519 keys for manifests/policies)
- [x] Public listing registration via static form
- [x] Settlement system (fee calculation from signed policy)
- [x] Trust document for key rotation (static trust.json)
- [x] License system (repository access via GitHub fork)

### Phase 10: Official Listing Frontend
- [x] Static frontend (Bun + Vite + React + TS + shadcn/ui + Tailwind)
- [x] Product discovery UI
- [x] Product inspection UI
- [x] Release selection UI
- [x] Purchase flow UI (Stripe Embedded Checkout)
- [x] GitHub authentication integration (via OAuth redirect)
- [x] License/access delivery UI
- [x] Purchase verification UI
- [x] Developer dashboard UI
- [x] Listing admin UI (static pages)

### Phase 11: Pricing Policy
- [x] Static pricing.json file served from CDN
- [x] Signed pricing policy response
- [x] Policy versioning (1.0, 1.1, etc.)
- [x] Key ID inclusion (key_id)
- [x] Signature generation (Ed25519)
- [x] Effective date management

### Phase 12: Payment and Settlement
- [x] Stripe Embedded Checkout integration
- [x] Stripe Connect for automatic revenue split
- [x] Fee calculation (listing fee, splits from signed policy)
- [x] Settlement records (per listing)
- [x] Listing attribution (transaction.listing_id)
- [x] Idempotency for all financial operations

### Phase 13: License/Access System
- [x] License generation on purchase
- [x] License verification (cryptographic)
- [x] Repository access/fork workflow (GitHub API)
- [x] License status tracking
- [x] License identifier system
- [x] Buyer/product/repo/release linkage
- [x] Listing attribution

### Phase 14: Listing CLI
- [x] `listing login`
- [x] `listing search <query>`
- [x] `listing inspect <product>`
- [x] `listing buy <product>`
- [x] `listing releases <product>`
- [x] `listing purchase list`
- [x] `listing license <id>`
- [x] `listing publish`
- [x] `listing status`
- [x] `listing verify`
- [x] API client shared between web app and CLI

### Phase 45: Official Listing Architecture Components
- [x] Frontend (static, Bun/Vite/React/TS/shadcn/ui/Tailwind)
- [x] Static pricing policy (pricing.json)
- [x] Static trust document (trust.json)
- [x] Authentication (GitHub OAuth via redirect)
- [x] Product discovery
- [x] Repository registration
- [x] Product verification
- [x] Release indexing (via CI)
- [x] Purchase system (Stripe Embedded Checkout)
- [x] Payment integration (Stripe Connect)
- [x] License system
- [x] Pricing policy service (static files)
- [x] Signature authority
- [x] Public listing registration (static form)
- [x] Settlement system
- [x] External database (not needed - static files)
- [x] Audit system (CI logs)

### Phase 46: Public Listing Architecture Components
- [x] Frontend (static, independently deployable)
- [x] Static pricing policy (fetch from reposell.dev)
- [x] Product discovery (direct repo /listing endpoints)
- [x] Local catalog/index (static)
- [x] Repository registration (from repo endpoints)
- [x] Product verification (from repo manifests)
- [x] Purchase flow (Stripe integration)
- [x] License integration
- [x] Official pricing integration (fetch + verify from reposell.dev)
- [x] Official trust verification (fetch + verify from reposell.dev)
- [x] Listing registration (with official via static form)
- [x] Settlement integration (report to official)
- [x] External database (not needed)
- [x] CI compliance system (verify.yml MUST pass)

### Phase 47: Public Listing Repository Requirements
- [x] `config/reposell/verification-key.pub` (official verification key)
- [x] `.github/workflows/verify.yml` - Trust/pricing verification (MUST PASS)
- [x] `.github/workflows/build.yml` - Build verification
- [x] `.github/workflows/deploy.yml` - Deploy (depends on verify + build)

### Phase 48: Community Listing Registration
- [x] Simple registration command (`listing register`)
- [x] Automated process (fetch trust, pricing, verify, register)
- [x] Manual config primarily: deployment, domain, payment credentials, operational settings
- [x] Everything related to official reposell policy automated (sync pricing/trust/metadata)

### Phase 49: Community Listing Operations
- [x] Automatic synchronization of:
  - Pricing (from official, verified)
  - Trust metadata (from official, verified)
  - Product schemas (from official)
  - Signature keys (from official)
  - Listing policy (from official)

### Phase 20: Runtime Trust
- [x] Startup: fetch trust metadata, verify signature
- [x] Startup: fetch pricing policy, verify signature, validate
- [x] Safe state if policy cannot be validated (no fallback 50%)
- [x] Cached policy only per explicit expiration policy

---

## 5. Security Requirements

- [x] Input validation on all user inputs
- [x] Output validation on all generated files
- [x] Authentication (GitHub OAuth)
- [x] Authorization (RBAC)
- [x] CSRF protection where applicable (static frontend)
- [x] Secure cookies (HttpOnly, Secure, SameSite)
- [x] Rate limiting
- [x] Replay protection (idempotency keys)
- [x] Signature verification (all manifests, pricing policy - critical)
- [x] Key rotation (automatic via trust document)
- [x] Secret management (GitHub secrets, env vars, never committed)
- [x] Audit logging (all financial/admin operations)
- [x] Webhook verification (Stripe, GitHub signatures - mandatory)
- [x] Payment verification (never trust browser - Stripe.js handles)
- [x] GitHub token minimization
- [x] SSRF protection (URL validation, allowlisting)
- [x] URL validation (all external URLs)
- [x] Endpoint allowlisting where appropriate
- [x] Secure HTTP headers (CSP, HSTS, etc.)
- [x] Dependency auditing (bun audit)
- [x] Supply chain protection
- [x] Never trust: repository manifests, listing manifests, GitHub webhooks, pricing responses, product metadata, client-side pricing, client-side transaction state
- [x] Price security: Stripe handles payment, immutable accounting snapshot

---

## 6. Implementation Phases (Priority Order)

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Project setup (static frontend + CI) | None |
| 2 | Pricing policy & trust document structure | Phase 1 |
| 3 | Authentication system (GitHub OAuth) | Phase 1 |
| 4 | Repository registration & verification | Phases 1, 2 |
| 5 | Product discovery & release indexing | Phase 4 |
| 6 | Pricing policy service (signed, client) | Phases 1, 2 |
| 7 | Purchase flow & payment integration | Phases 3, 5, 6 |
| 8 | License/access system | Phase 7 |
| 8 | Settlement system | Phase 7 |
| 9 | Public listing registration | Phases 3, 6 |
| 10 | Signature authority & key rotation | Phase 6 |
| 11 | Frontend UI (all pages) | Phase 1 |
| 12 | Listing CLI | Phases 3, 7 |
| 13 | Audit system | All backend phases |

---

## 7. Files to Create

### Project Structure
```
# Static Frontend (hosted on Vercel/Netlify/Cloudflare Pages)
packages/frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json (shadcn/ui)
├── src/
│   ├── components/       # shadcn/ui components
│   ├── pages/            # Page components (static)
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities, pricing/trust client
│   ├── types/            # TypeScript types
│   └── main.tsx          # Entry point
├── index.html
├── public/
│   ├── pricing.json      # Signed pricing policy
│   ├── trust.json        # Trust document
│   └── config/reposell/verification-key.pub
├── .github/workflows/
│   ├── verify.yml        # Trust/pricing verification (MUST PASS)
│   ├── build.yml         # Build verification
│   └── deploy.yml        # Deploy (depends on verify + build)
└── config/reposell/verification-key.pub
```

### Static Files
- `public/pricing.json` - Signed pricing policy
- `public/trust.json` - Trust document
- `public/config/reposell/verification-key.pub` - Official public key

### CI/CD Workflows (GitHub Actions - Static + Enforced Verification)
- `.github/workflows/verify.yml` - Trust/pricing verification (MUST PASS for deploy)
- `.github/workflows/build.yml` - Build verification
- `.github/workflows/deploy.yml` - Deploy (depends on verify + build)

### Documentation (Per Section 55 - reposell.dev Context)
- `README.md` - Updated with full project documentation
- `ARCHITECTURE.md` - System architecture
- `SECURITY.md` - Security considerations
- `CONTRIBUTING.md` - Contribution guidelines
- `DEVELOPMENT.md` - Development setup
- `PROTOCOL.md` - Protocol specification
- `CONFIGURATION.md` - Configuration reference
- `DEPLOYMENT.md` - Deployment guide
- `TROUBLESHOOTING.md` - Common issues
- `LISTING_PROTOCOL.md` - Listing protocol details
- `PRICING.md` - Pricing policy documentation
- `SIGNATURES.md` - Signature system documentation
- `LISTING_REGISTRATION.md` - Registration with official

---

## 8. Files to Modify

- `README.md` - Expand with full project documentation

---

## 9. Tests Required

| Test Category | Coverage Target |
|---------------|-----------------|
| Unit tests (domain) | >95% |
| Unit tests (application) | >90% |
| Integration tests (pricing/trust) | All verification logic |
| Integration tests (payment) | Stripe checkout flow |
| Integration tests (GitHub) | Repository discovery |
| Frontend tests | Critical user flows |
| CLI tests | All commands |
| Cryptographic tests | Sign/verify, key rotation |
| Pricing tests | Fee calculation, splits (must match official) |
| Security tests | All items in Section 5 |
| CI verification tests | Workflow fails on invalid signatures |
| End-to-end tests | Full purchase flow with fee split |

---

## 10. CI Requirements

- [x] Lint (ESLint + TypeScript strict)
- [x] Type check (tsc --noEmit)
- [x] Unit tests
- [x] Integration tests
- [x] Build verification
- [x] Dependency audit
- [x] Security scan
- [x] **Verification workflow (.github/workflows/verify.yml) - MUST PASS for deployment**
  - [x] Fetch official trust metadata (from reposell.dev)
  - [x] Verify official signatures (Ed25519)
  - [x] Fetch pricing policy (from reposell.dev)
  - [x] Verify pricing-policy signature
  - [x] Validate pricing policy
  - [x] Verify listing identity
  - [x] Validate listing registration
  - [x] Validate protocol compatibility
- [x] Build verification
- [x] Dependency audit
- [x] Security scan
- [x] Deployment only after verify + build pass

---

## 11. Documentation Requirements

All documents listed in Section 7 must be created and maintained. All references use `https://reposell.dev` as default domain.

---

## 12. Critical Implementation Details (Static + reposell.dev)

### Pricing Policy Verification (CI + Runtime)

```typescript
// CI verification (runs in GitHub Actions)
async function verifyPricingPolicy() {
  // 1. Fetch from official
  const policy = await fetch('https://reposell.dev/pricing.json').then(r => r.json());
  
  // 2. Verify signature using official verification key
  const verified = await verifyEd25519(policy.signature, policy.key_id);
  
  // 3. Validate policy
  if (!validatePricingPolicy(policy)) {
    throw new Error('Invalid pricing policy');
  }
  
  return policy;
}
```

### Trust Document

```typescript
interface TrustDocument {
  version: number;
  keys: Array<{
    id: string;
    algorithm: "Ed25519";
    public_key: string;  // base64
    status: "active" | "revoked" | "expired";
    activated_at: string;
    expires_at?: string;
  }>;
  signature: string;  // Ed25519 signature from official listing
}
```

### Static Frontend API Client

```typescript
// lib/api.ts
const REPOSELL_BASE = 'https://reposell.dev';

export async function fetchPricing() {
  return fetch(`${REPOSELL_BASE}/pricing.json`).then(r => r.json());
}

export async function verifyTrustDocument() {
  return fetch(`${REPOSELL_BASE}/trust.json`).then(r => r.json());
}

export async function verifyEd25519(signature, keyId, trustDoc) {
  // Verify Ed25519 signature using trust document
}
```

---

## 13. Definition of Done (Official Listing Specific)

- [x] Official listing frontend accessible (static, deployed)
- [x] Repository registration works (via static form)
- [x] Product verification works
- [x] Release indexing works (via CI)
- [x] Purchase flow works end-to-end (Stripe Embedded Checkout)
- [x] Payment integration works (Stripe Connect)
- [x] Licenses issued correctly
- [x] Pricing policy file (pricing.json) served from CDN
- [x] Public listing registration works (static form)
- [x] Settlement records created correctly
- [x] Listing CLI works against static files
- [x] All tests pass
- [ ] Documentation complete
- [ ] Security audit passes
- [ ] Official signing key generated and secured
- [ ] Key rotation mechanism tested
- [x] Default domain: https://reposell.dev configured
---

## Protocol Evolution Implementation Plan (2026-08) — Decisions D10–D15

Source specs: `TRACKING.md` (D11–D15) · protocol pages `listing-endpoint`, `listing-network`, `listing-registry`, `gamification`.
Canonical deployment: **listing.reposell.dev** (static generated index). Production apex: **reposell.dev**.

### A. Registry-as-git-repo (D13) — replaces API registration for products

| File | Purpose |
|------|---------|
| `listings/<package>.json` | reference-only entries: `{"schema":"reposell-listing/v1","sell":"<url>"}` |
| `.github/workflows/verify-pr.yml` | 12-step pipeline on every PR: schema → fetch /sell+manifest → HTTPS → GitHub repo → release↔manifest → signature → listing authorization → payment link → /health → PASS=auto-merge / FAIL=block with reason |
| `.github/workflows/reverify.yml` | scheduled re-verification of ALL existing listings (new releases, manifest/payment/health drift) → updates entries + regenerates index; no PR needed for updates |
| `scripts/generate-index.ts` | builds static Listing JSON + catalog pages from verified `listings/*.json` |

### A2. Contribution link creation (D16) — CI-only Stripe integration

- `REPOSELL_STRIPE_SECRET_KEY` lives ONLY in this repo's Actions secrets — never in seller repos, logs, PR comments, generated JSON, or frontend
- verify-pr pipeline extension: after standard checks, read `pricing.listing.contribution` from the seller manifest → create Stripe Product + Price + Payment Link (Reposell account) → verify created link → commit release record to PR
- **FREE vs PAID branch (D18)**: `pricing.type: "free"` → skip ALL seller payment-link verification (nothing to check; release = direct access); `type: "paid"` → full link↔price/currency verification as below. Contribution link creation applies to BOTH types (free projects may accept donations via contribution)
- **IDEMPOTENCY MANDATORY**: search by deterministic identifiers (repository · release · manifest hash · contribution · publication ID) before creating — reruns/retries must never duplicate Stripe objects
- Data layout: `listing/repositories/<owner>/<project>/manifest.json` + `releases/vX.Y.Z.json` — each release JSON embeds its own pricing type, contribution + immutable Payment Link (if any) + verification metadata + signature
- NEVER delete/replace/deactivate a release's payment link; historical releases stay purchasable; health status never mutates links
- Frontend dual CTA on paid: "Buy from seller" (/sell) vs "Support Reposell / buy through listing" (contribution link); free releases render a single [Fork] CTA — never imply Reposell owns the software

### F. Test strategy (D16 flow — three levels + golden test)

1. **Local**: `act pull_request --secret-file .secrets.test` (`sk_test_…` only, never live) — catches YAML/shell/env/manifest/JSON/signature/Stripe/idempotency issues before push
2. **Real PR fixtures** (`reposell-fixtures` repo): `valid/ · invalid-signature/ · invalid-sell-link/ · missing-payment-link/ · invalid-price/ · unhealthy/ · old-release/ · duplicate-release/ · changed-contribution/` → actual PRs into a test listing repo running the real pipeline
3. **Stripe Test Mode**: `REPOSELL_STRIPE_SECRET_KEY=sk_test_…` as repo secret; CI creates real test Product/Price/Payment Link that can be opened and paid with test cards

Mandatory suites:

- **Complete publication**: every check green incl. "Stripe Product created / Price created / Listing Payment Link created+verified / JSON generated"
- **Idempotency**: run CI twice on same release → exactly one Stripe link (second run reuses via deterministic-ID search)
- **Release immutability**: publish v0.1.0 ($5) then v0.2.0 ($10) → Link A untouched and active, both purchasable
- **Negative matrix**: bad signature / missing payment_link / price mismatch / 404 /sell / failing /health / negative contribution / duplicate release → BLOCKED; retry-of-same-publication → PASS reusing record
- **Serverless proof**: after merge assert `listing/repositories/<owner>/<repo>/releases/*.json` exists and frontend renders from static files with zero API calls
- **Golden E2E**: seller release → CLI → PR → CI verify+create → merge → frontend displays → Stripe test checkout ✓

Workflows: `listing.yml` (pipeline) · `listing-tests.yml` (manifest/signature/health/payment/Stripe/idempotency/immutability/schema; gated on `STRIPE_TEST_MODE=true`) · `release-tests.yml`

### B. Static frontend at listing.reposell.dev (D15)

- Reads generated Listing JSON (product metadata, repository, release, /sell, payment info, last CI verification)
- Product pages (`/foo`) perform LIVE client-side GET to the owner's `/health` — render "verified then" vs "healthy now" side by side
- Principle enforced in UI copy: listing discovers and verifies; it never hosts or sells

### C. Gamification layer (D14) — serverless, manifests + CI only

| File | Purpose |
|------|---------|
| `events/*.json` | signed append-only XP ledger written exclusively by CI workflows (PR merges, health sweeps, release validation) |
| `.github/workflows/ledger.yml` | validates + signs events, regenerates profiles/leaderboards/badges as static artifacts |
| Publisher/curator/buyer XP tables per spec §3–5 · levels Explorer→Legend §6 · product reputation §7 |
| Badge engine: objective VERIFIED badges (never purchasable/XP) vs reputation badges — hard separation §9 |
| Streaks from automated /health sweeps with grace period §10 · quests §12 · seasons §13 · per-actor leaderboards §14 |
| Anti-gaming: diminishing rewards, daily/weekly caps, unique-action rules, anti-self-dealing, refund→XP reversal §15–16 |
| Lifetime XP never decays; separate current-reputation score §16 · trust tiers ≠ XP §17 |

### D. Federation services (D11/D12)

- Operator registration endpoint for community listings (identity/domain/key verification → authorize federation)
- Catalog sync feed (signed) consumed by public listings
- Referral attribution: outbound links carry listing attribution; community economics derive from the CONTRIBUTION model (D16), not checkout splits
- Signed pricing-policy endpoint: superseded by contribution model (D16) — retain only if a signed network-configuration endpoint is still needed

### E. Signed network configuration (D10/D13 — serverless form per D16)

- NO pricing endpoint, NO `/api/*`, NO API server — checkout-fee splitting is superseded (D16) and Listing revenue flows from per-release CONTRIBUTION Payment Links created by CI (see A2)
- If any network-wide configuration is ever needed, it ships as **signed JSON files committed to the listing registry** (`config/*.json` + `signature.json`), consumed via the federation feed and verified with the official public key
- Community listings verify those files independently; no fallback values anywhere; no service to run or call

### F. Deferred backend phases (unchanged from earlier plan)

Purchases/settlement/license-issuance services remain future phases; direct sales flow through seller Payment Links without any listing backend.

### Tests required

verify-pipeline integration tests (fixture repos + fixture /sell hosts) · auto-merge/blocking logic · index generator determinism · ledger signature validation · XP caps/diminishing/fraud-reversal unit tests · pricing policy signature round-trip

### CI requirements

PR gate MUST fail closed on any verification error · scheduled jobs pinned and authenticated · secrets via Actions secrets only · workflow owns registry paths only
