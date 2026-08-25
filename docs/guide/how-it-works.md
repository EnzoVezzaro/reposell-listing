# How It Works

The reposell listing operates as a serverless discovery layer over Git repositories.

## Architecture

The listing is built on three pillars:

1. **Git-native registry** — Products are published through pull requests containing JSON references to their `/sell` endpoints
2. **CI verification** — Every PR is automatically verified against the seller's live endpoint before merge
3. **Static catalog** — The product catalog is a static JSON index generated from verified listings

## Verification Pipeline

When a pull request is submitted to the listing registry:

1. The CI pipeline fetches the seller's `/sell` endpoint
2. It validates the manifest, payment link, and health endpoint
3. It verifies Ed25519 signatures on all signed data
4. On pass, the PR is auto-merged; on fail, it's blocked with a reason

## Trust Model

- **Signatures are mandatory** — Every listing must include a valid Ed25519 signature
- **Fail-closed verification** — Any verification failure blocks the listing
- **Transparent pricing** — Fee splits are signed by the policy and publicly verifiable
- **No central authority** — The protocol enforces trust, not a platform operator
