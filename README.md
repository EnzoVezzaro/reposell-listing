# reposell Listing (Official)

The official reposell listing is the authoritative listing service for the reposell protocol. It provides product discovery, repository registration, product verification, release indexing, purchase system, payment integration, license system, pricing policy service, signature authority, public listing registration, and settlement system.

## Quickstart

```bash
# Deploy the listing (Static frontend on Vercel/Netlify/Cloudflare Pages)
# Register a public listing instance via static form or CLI
```

## Core Services (Static Files)

| Service | File | Description |
|---------|------|-------------|
| Pricing Policy | `pricing.json` | Signed pricing policy |
| Trust Document | `trust.json` | Key rotation metadata |
| Verification Key | `config/reposell/verification-key.pub` | Official Ed25519 public key |

## Features

- **Product discovery & search** - Browse and search products across registered repositories
- **Repository registration** - Verify and index `/listing` manifests
- **Release indexing** - Auto-detect new releases from Git tags
- **Stripe Embedded Checkout** - Payment UI in the browser, no redirect
- **Stripe Connect** - Automatic revenue split to sellers
- **Signed pricing policy** - Cryptographically verified fee structure
- **License system** - Repository access via GitHub fork on purchase
- **Public listing registration** - Community instances register via static form
- **Settlement & reporting** - Automated revenue distribution

## Payment Integration

Uses **Stripe Embedded Checkout** with **Stripe Connect** - no backend server required. The listing renders Stripe's checkout UI; checkout sessions created via Stripe.js with Connect destination charges for automatic revenue splitting.

## Default Domain

All references use `https://reposell.dev` as the default domain:

- **Pricing Policy**: `https://reposell.dev/pricing.json`
- **Trust Document**: `https://reposell.dev/trust.json`
- **Verification Key**: `https://reposell.dev/config/reposell/verification-key.pub`

## Documentation

- [Protocol](docs/protocol.md)
- [Pricing Policy](docs/pricing.md)
- [Signatures](docs/signatures.md)
- [Listing Registration](docs/listing-registration.md)
- [Payment Architecture](docs/payment-architecture.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

MIT - see [LICENSE](LICENSE) for details.