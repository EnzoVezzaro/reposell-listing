# PR Verification

The listing CI pipeline performs twelve fail-closed verification steps on every pull request.

## Pipeline Steps

1. **Schema validation** — Verify the PR payload matches the expected schema
2. **Repository access** — Confirm the repository exists and is accessible
3. **Release validation** — Verify the specified release exists
4. **Manifest fetch** — Retrieve the `/reposell/manifest.json` from the repository
5. **Manifest signature** — Verify the Ed25519 signature on the manifest
6. **Sell endpoint** — Fetch and validate the `/sell` endpoint
7. **Payment link** — Verify the payment link is active and matches the pricing
8. **Health endpoint** — Probe the `/health` endpoint for availability
9. **Pricing policy** — Validate the pricing policy against the manifest
10. **Fee calculation** — Verify fee splits match the signed policy
11. **Idempotency check** — Ensure no duplicate listings exist
12. **Record creation** — Generate the immutable registry record

## Fail-Closed

Any failure in the pipeline blocks the PR. There are no fallback paths or manual overrides.

## Re-verification

Existing listings are periodically re-verified to ensure:

- Payment links remain active
- Health endpoints stay available
- New releases are detected and indexed
- Pricing policies haven't changed without update
