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

## Federation Index Signature (D11)

The published registry index is signed so community listing instances can
verify the catalog they pull:

- **Index**: `/registry/listings.json` — exact bytes served.
- **Signature**: `/registry/listings.json.sig` — self-describing
  `reposell-listing-index-sig/v1` payload (`key_id`, `public_key`, `signature`
  over the exact index bytes, Ed25519).
- **Public key**: `/registry/verification-key.pub` (SPKI PEM). Community
  instances pin a copy at `config/reposell/verification-key.pub`.

Signing uses the official RepoSell Ed25519 key, whose secret
(`LISTING_SIGNING_KEY`, a base64 32-byte seed in the `reposell keys` format)
lives ONLY in this repo's Actions secrets and is never committed. The index is
regenerated and re-signed on every deploy and discovery sync; a missing key in
CI is a build failure signal, a local build just warns and skips signing.

Verification is fail-closed in consumers: an unverifiable index is treated as
an EMPTY catalog with an explicit error — never a guessed state.

### Provisioning the signing key

```bash
# 1. Generate a fresh Ed25519 identity (prints the base64 32-byte seed ONCE;
#    writes the public key to .github/reposell/verification-key.pem).
cd reposell && npx reposell keys generate

# 2. Store the printed base64 seed as the listing's Actions secret.
gh secret set LISTING_SIGNING_KEY --repo EnzoVezzaro/reposell-listing --body "<paste base64 seed>"

# 3. The build publishes the official public key automatically at
#    /registry/verification-key.pub (SPKI PEM). Every community listing pins a
#    copy at config/reposell/verification-key.pub:
#      cp .github/reposell/verification-key.pem ../reposell-community-listing/config/reposell/verification-key.pub

# Verify: npx reposell keys show  →  prints the matching public PEM / key id.
```

After the secret is set, the next `deploy-docs.yml`/`discovery-sync.yml` run
signs `listings.json` and commits `listings.json.sig` + `verification-key.pub`.

## Re-verification

Existing listings are periodically re-verified to ensure:

- Payment links remain active
- Health endpoints stay available
- New releases are detected and indexed
- Pricing policies haven't changed without update
