# reposell listing — access worker

`access.reposell.dev` is a Cloudflare Worker that provides the **discovery-contribution
and buyer-identity service** for the official RepoSell listing. It replaces the
previous better-auth worker; GitHub login is handled by **WorkOS AuthKit**
(hosted GitHub OAuth), and the discovery-fee ledger lives in D1.

It does **NOT** sell anything. It only:
- signs buyers in via WorkOS (GitHub identity),
- records RepoSell's own discovery contribution (RepoSell Stripe checkout) per
  listing/buyer,
- lets listing-frontend and `/sell` storefronts verify that a buyer has paid.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/auth/login?redirect_uri=<page>` | PKCE authorize → 302 to WorkOS |
| `GET /api/auth/callback` | exchange code, set `reposell_workos_session` cookie, 302 back |
| `GET /api/auth/me` | current session user (or 401) |
| `POST /api/auth/logout` | clear cookie, return optional WorkOS logout URL |
| `POST /api/access/contribute` | record a contribution via RepoSell Stripe Payment Link |
| `GET /api/access/status?listing_id=&user_id=` | contribution/blocks status |

Session: a WorkOS access-token JWT in an HttpOnly cookie
(`SameSite=None; Secure`), verified per-request against WorkOS's JWKS
(cached in KV). Frontends call with `credentials: 'include'`.

## Delivery model

Buying does **not** auto-fork. After a successful purchase the storefront shows a
manual **Fork on GitHub** link. For **public** repos any signed-in buyer forks
directly. For **private** repos the seller gives the buyer read access, then the
buyer forks — see the buyer-visible note on the `/sell` storefront.

## Production setup (one time)

1. **WorkOS dashboard**: create an AuthKit connection (GitHub provider), register the
   callback `https://access.reposell.dev/api/auth/callback`, and allow the
   `https://access.reposell.dev` origin for CORS.
2. **D1 + KV**: create the D1 database `reposell-listing-access` and a KV namespace,
   then put their IDs in `wrangler.toml` (replacing `REPLACE_WITH_D1_DATABASE_ID` /
   `REPLACE_WITH_KV_NAMESPACE_ID`). Apply the schema:
   `npx wrangler d1 execute reposell-listing-access --file src/schema.sql`.
3. **Secrets** — set with `npx wrangler secret put <NAME>`:
   - `WORKOS_CLIENT_ID` / `WORKOS_API_KEY` — use the matching test **or** prod pair
     (see `wrangler.toml` comment). Never mix test/prod.
   - `WORKOS_REDIRECT_URI` — `https://access.reposell.dev/api/auth/callback`.
   - `LISTING_STRIPE_SECRET_KEY` — RepoSell's **own** Stripe secret; validates the
     discovery contribution only. Never a seller's key.
   - `ALLOWED_ORIGINS` — comma-separated origins allowed to call this worker
     cross-origin. Must include `https://listing.reposell.dev` **plus the origin of
     every seller's `/sell` storefront** that uses WorkOS login (register per seller).
4. `npx wrangler deploy`.

Steps 2–4 are automated by `./deploy.sh` (idempotent): after `npx wrangler login`,
export `WORKOS_CLIENT_ID` / `WORKOS_API_KEY` (a matching test or prod pair) and run
`./deploy.sh`. It reads `LISTING_STRIPE_SECRET_KEY` from the repo-local (gitignored)
`.env` when not exported.

**One-liner for production**: `./deploy-prod.sh` loads the gitignored
`functions/access/.env.worker.prod` (prod WorkOS pair) and runs the runbook. For
local development, copy `.env.worker.test` values into a local `.dev.vars` and use
`npx wrangler dev` (test pair + `COOKIE_SECURE=false`, localhost redirect).

## Local dev

`npx wrangler dev` with a local `.dev.vars`:

```
WORKOS_CLIENT_ID=client_01M1YMB9FT96Z7D4H06ACT1ENA
WORKOS_API_KEY=sk_test_...
WORKOS_REDIRECT_URI=http://localhost:8787/api/auth/callback
LISTING_STRIPE_SECRET_KEY=...
ALLOWED_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
```

(Use `COOKIE_SECURE=false` only for local HTTP.)