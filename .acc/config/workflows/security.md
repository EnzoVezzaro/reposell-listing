# security.md — Security-sensitive changes for listing

1. Run `acc check` to validate current state.
2. Run `acc context --include memory` to review learned security notes.
3. Run `acc impact <changed-path>` to find what could break.
4. Verify all cryptographic operations use Ed25519.
5. Verify no hardcoded secrets in source or config.
6. Verify webhook signatures are verified (Stripe, GitHub) - mandatory.
7. Verify payment confirmation never trusted from browser - mandatory.
8. Verify all financial operations are idempotent - mandatory.
9. Verify input validation is active on all API endpoints - mandatory.
10. Verify output validation is active on all responses - mandatory.
11. Verify pricing policy is verified at runtime - mandatory.
11. Verify runtime enters safe state if verification fails - mandatory (NO fallback 50%).
12. Run `reposell verify` to verify signatures and manifests.
12. Update `.acc-memory.md` with any security lessons learned.

## Security Requirements Checklist (Mandatory)

- [ ] Ed25519 used for all signing operations
- [ ] Private keys NEVER committed to Git, CI, or logs - mandatory
- [ ] Stripe webhook signature verification mandatory
- [ ] Payment confirmation never trusted from browser - mandatory
- [ ] All financial operations idempotent - mandatory
- [ ] Input validation on all API endpoints - mandatory
- [ ] Output validation on all responses - mandatory
- [ ] Pricing policy verified at runtime - mandatory
- [ ] Runtime enters safe state if verification fails - mandatory (NO fallback 50%)
- [ ] GitHub token minimization (narrowest permissions)
- [ ] Secure HTTP headers (CSP, HSTS, etc.)
- [ ] Dependency auditing (bun audit) - mandatory
- [ ] Supply chain protection
- [ ] Never trust: repository manifests, listing manifests, GitHub webhooks, pricing responses, product metadata, client-side pricing, client-side transaction state - mandatory

## Security Audit Triggers

CI `verify.yml` MUST pass on every deployment. If verification fails, deployment is blocked.