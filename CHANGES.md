# CHANGES — reposell-listing implementation log

Running log of every change made while implementing the Listing ⇄ /sell
transaction-separation architecture (invariant: **Listing charges only for
discovery; the seller's /sell is fully independent**).

## 2026-08-23

- Scaffolded `src/` (TypeScript ESM, vitest, strict tsconfig) — the package
  was docs-only before this date.
- `src/verify/pipeline.ts` — the 12-step PR verification pipeline
  (spec §4): schema → repository → release → manifest → signature →
  license → /sell health → seller link → discovery price → duplicates →
  ownership → security. Pure, injected fetch, fail-closed.
- `src/payments/discovery.ts` — Listing Stripe automation (spec §6): create
  Product/Price/Payment Link for DISCOVERY only, idempotent via
  deterministic keys, immutable per release (D16). Input type carries no
  seller fields; metadata marks `purpose: "discovery"`.
- `src/registry/records.ts` — listing registry records + immutability
  enforcement: an existing release's discovery link can never be changed or
  deleted (spec §15); new releases append.
- `.github/workflows/verify-pr.yml` + `discovery-sync.yml` — CI entry
  points; Stripe secret only as an Actions secret (spec §17), never in
  manifests, logs, or PR comments.
- E2E fixture test proving the TWO separate Stripe transactions (spec §20).
- `scripts/verify-pr.mjs` — CI entry (fail-closed, exit 1 on BLOCKED);
  refuses to run with a Stripe secret present (§17).
- `scripts/discovery-sync.mjs` — post-merge entry: provisions immutable
  discovery links for records missing one; commits registry updates.
- `vitest.config.ts` — workspace aliases for the §20 cross-package E2E.
- `src/e2e.test.ts` — §20 END-TO-END PROOF: verify → discovery link
  (Listing key, $5, purpose=discovery, zero seller-account calls) →
  registry → public page (no secrets, correct CTA) → seller checkout →
  purchase artifact ($29, buyer fork). Two accounts, two amounts, two
  purposes — never merged.
- oxlint configs aligned to plain oxlint (storefront precedent).

**Final gates: reposell-listing 12/12 · reposell-listing-public 6/6 ·
reposell 93/93 · typecheck clean everywhere.**
- Branding cleanup: removed old VitePress default logos (`logo.svg`, `icon.svg`); nav is icon-only (`siteTitle: false`, branding icon.png as favicon).
