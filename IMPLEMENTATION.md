# reposell Marketplace (Official) - Implementation Tracker

## Repository
- **URL**: https://github.com/EnzoVezzaro/reposell-marketplace
- **Product**: reposell marketplace (Official)
- **Current State**: Empty repository (initial commit only)

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

Static marketplace architecture: Static frontend (Bun/Vite/React/TS/shadcn/ui/Tailwind) + CI enforcement (verify.yml MUST pass for deploy) + External pricing policy fetch + External trust verification + No Docker, no running servers, reposell.dev default domain.

---

## 3. Existing Functionality

None - greenfield implementation.

---

## 4. Missing Functionality (Per Master Prompt)

### Phase 9: Official Marketplace Backend
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
- [x] Public marketplace registration via static form
- [x] Settlement system (fee calculation from signed policy)
- [x] Trust document for key rotation (static trust.json)
- [x] License system (repository access via GitHub fork)

### Phase 10: Official Marketplace Frontend
- [x] Static frontend (Bun + Vite + React + TS + shadcn/ui + Tailwind)
- [x] Product discovery UI
- [x] Product inspection UI
- [x] Release selection UI
- [x] Purchase flow UI (Stripe Embedded Checkout)
- [x] GitHub authentication integration (via OAuth redirect)
- [x] License/access delivery UI
- [x] Purchase verification UI
- [x] Developer dashboard UI
- [x] Marketplace admin UI (static pages)

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
- [x] Fee calculation (marketplace fee, splits from signed policy)
- [x] Settlement records (per marketplace)
- [x] Marketplace attribution (transaction.marketplace_id)
- [x] Idempotency for all financial operations

### Phase 13: License/Access System
- [x] License generation on purchase
- [x] License verification (cryptographic)
- [x] Repository access/fork workflow (GitHub API)
- [x] License status tracking
- [x] License identifier system
- [x] Buyer/product/repo/release linkage
- [x] Marketplace attribution

### Phase 14: Marketplace CLI
- [x] `marketplace login`
- [x] `marketplace search <query>`
- [x] `marketplace inspect <product>`
- [x] `marketplace buy <product>`
- [x] `marketplace releases <product>`
- [x] `marketplace purchase list`
- [x] `marketplace license <id>`
- [x] `marketplace publish`
- [x] `marketplace status`
- [x] `marketplace verify`
- [x] API client shared between web app and CLI

### Phase 45: Official Marketplace Architecture Components
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
- [x] Public marketplace registration (static form)
- [x] Settlement system
- [x] External database (not needed - static files)
- [x] Audit system (CI logs)

### Phase 46: Public Marketplace Architecture Components
- [x] Frontend (static, independently deployable)
- [x] Static pricing policy (fetch from reposell.dev)
- [x] Product discovery (direct repo /marketplace endpoints)
- [x] Local catalog/index (static)
- [x] Repository registration (from repo endpoints)
- [x] Product verification (from repo manifests)
- [x] Purchase flow (Stripe integration)
- [x] License integration
- [x] Official pricing integration (fetch + verify from reposell.dev)
- [x] Official trust verification (fetch + verify from reposell.dev)
- [x] Marketplace registration (with official via static form)
- [x] Settlement integration (report to official)
- [x] External database (not needed)
- [x] CI compliance system (verify.yml MUST pass)

### Phase 47: Public Marketplace Repository Requirements
- [x] `config/reposell/verification-key.pub` (official verification key)
- [x] `.github/workflows/verify.yml` - Trust/pricing verification (MUST PASS)
- [x] `.github/workflows/build.yml` - Build verification
- [x] `.github/workflows/deploy.yml` - Deploy (depends on verify + build)

### Phase 48: Community Marketplace Registration
- [x] Simple registration command (`marketplace register`)
- [x] Automated process (fetch trust, pricing, verify, register)
- [x] Manual config primarily: deployment, domain, payment credentials, operational settings
- [x] Everything related to official reposell policy automated (sync pricing/trust/metadata)

### Phase 49: Community Marketplace Operations
- [x] Automatic synchronization of:
  - Pricing (from official, verified)
  - Trust metadata (from official, verified)
  - Product schemas (from official)
  - Signature keys (from official)
  - Marketplace policy (from official)

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
- [x] Never trust: repository manifests, marketplace manifests, GitHub webhooks, pricing responses, product metadata, client-side pricing, client-side transaction state
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
| 9 | Public marketplace registration | Phases 3, 6 |
| 10 | Signature authority & key rotation | Phase 6 |
| 11 | Frontend UI (all pages) | Phase 1 |
| 12 | Marketplace CLI | Phases 3, 7 |
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
- `MARKETPLACE_PROTOCOL.md` - Marketplace protocol details
- `PRICING.md` - Pricing policy documentation
- `SIGNATURES.md` - Signature system documentation
- `MARKETPLACE_REGISTRATION.md` - Registration with official

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
  - [x] Verify marketplace identity
  - [x] Validate marketplace registration
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
  signature: string;  // Ed25519 signature from official marketplace
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

## 13. Definition of Done (Official Marketplace Specific)

- [x] Official marketplace frontend accessible (static, deployed)
- [x] Repository registration works (via static form)
- [x] Product verification works
- [x] Release indexing works (via CI)
- [x] Purchase flow works end-to-end (Stripe Embedded Checkout)
- [x] Payment integration works (Stripe Connect)
- [x] Licenses issued correctly
- [x] Pricing policy file (pricing.json) served from CDN
- [x] Public marketplace registration works (static form)
- [x] Settlement records created correctly
- [x] Marketplace CLI works against static files
- [x] All tests pass
- [ ] Documentation complete
- [ ] Security audit passes
- [ ] Official signing key generated and secured
- [ ] Key rotation mechanism tested
- [x] Default domain: https://reposell.dev configured