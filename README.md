# reposell Listing (Official)

The official reposell listing — a static discovery directory with verification CI and discovery payments.

## Features

- **Product discovery** — browse and search products across registered repositories
- **Repository registration** — verify and index `/listing` manifests
- **Release indexing** — auto-detect new releases from Git tags
- **Stripe Embedded Checkout** — payment UI in the browser, no redirect
- **Stripe Connect** — automatic revenue split to sellers
- **Signed pricing policy** — cryptographically verified fee structure
- **License system** — repository access via GitHub fork on purchase
- **Settlement & reporting** — automated revenue distribution

## Quickstart

```bash
npm install
npm run dev
```

## Documentation

The docs site is built with VitePress:

```bash
npm run docs:dev      # local dev server
npm run docs:build    # production build
npm run docs:preview  # preview production build
```

## License

MIT
