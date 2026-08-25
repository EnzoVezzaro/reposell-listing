# Registry

The reposell listing registry is a Git-native product registry built on pull requests.

## How It Works

Products are registered by submitting pull requests to the listing repository. Each PR contains a JSON file with a reference to the product's `/sell` endpoint.

## PR Verification

Every pull request is automatically verified by CI:

- The `/sell` endpoint is fetched and validated
- The manifest schema is verified
- Payment links are checked
- Ed25519 signatures are verified
- Health endpoints are probed

**PASS** → Auto-merge  
**FAIL** → Blocked with reason

## Registry Records

Each verified listing produces an immutable registry record containing:

- Product repository and release information
- Seller `/sell` URL and payment link
- Discovery pricing with Stripe payment link IDs
- Verification timestamps and status

See the [verification guide](./verification) for details on the PR verification pipeline.
