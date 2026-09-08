#!/usr/bin/env bash
set -euo pipefail

# reposell-listing access worker — production deploy runbook.
#
# Idempotent: creates D1 + KV if wrangler.toml still has placeholders,
# applies the schema, and sets every secret. Safe to re-run.
#
# Prereqs:
#   npx wrangler login          # once
#   export WORKOS_CLIENT_ID=... # test or prod
#   export WORKOS_API_KEY=...   # MUST match WORKOS_CLIENT_ID (never mix)
#   export LISTING_STRIPE_SECRET_KEY=...   # or leave unset: read from ../.env
#   export WORKOS_REDIRECT_URI=...         # default prod callback
#   export ALLOWED_ORIGINS=...             # default https://listing.reposell.dev
#
# The worker has NO dependency on the input secrets being secret (they are
# set via wrangler secret, never written to disk).

cd "$(dirname "$0")"

WRANGLER="npx wrangler"
TOML="wrangler.toml"

say() { printf '== %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# --- 0. authenticated? ----------------------------------------------------
if ! $WRANGLER whoami >/dev/null 2>&1; then
  die "not authenticated — run: npx wrangler login"
fi

# --- 1. D1 + KV -----------------------------------------------------------
patch_placeholder() {
  local key="$1" value="$2"
  if rg -q "REPLACE_WITH_$key" "$TOML"; then
    python3 - "$TOML" "$key" "$value" <<'PY'
import sys, re
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path).read()
s = s.replace(f"REPLACE_WITH_{key}", value)
open(path, "w").write(s)
PY
    say "patched $key in $TOML"
  fi
}

create_d1() {
  local id
  say "creating D1 database 'reposell-listing-access'"
  # shellcheck disable=SC2086
  id=$($WRANGLER d1 create reposell-listing-access 2>/dev/null | \
    rg -o 'database_id = "[0-9a-f-]+"' | head -1 | cut -d'"' -f2)
  [[ -n "$id" ]] || die "could not read database_id from wrangler d1 create"
  patch_placeholder "D1_DATABASE_ID" "$id"
}

create_kv() {
  local id
  say "creating KV namespace 'reposell-listing-access-kv'"
  id=$($WRANGLER kv namespace create reposell-listing-access-kv 2>/dev/null | \
    rg -o '"id": "[0-9a-f-]+"' | head -1 | cut -d'"' -f4)
  [[ -n "$id" ]] || die "could not read namespace id from wrangler kv namespace create"
  patch_placeholder "KV_NAMESPACE_ID" "$id"
}

if rg -q 'REPLACE_WITH_D1_DATABASE_ID' "$TOML"; then create_d1; else say "D1 already configured"; fi
if rg -q 'REPLACE_WITH_KV_NAMESPACE_ID' "$TOML"; then create_kv; else say "KV already configured"; fi

# --- 2. schema ------------------------------------------------------------
say "applying schema.sql"
$WRANGLER d1 execute reposell-listing-access --file src/schema.sql --remote

# --- 3. secrets -----------------------------------------------------------
resolve_secret() {
  local name="$1" fallback="${2:-}"
  if [[ -n "${!name:-}" ]]; then printf '%s' "${!name}"; return; fi
  if [[ -n "$fallback" ]]; then printf '%s' "$fallback"; return; fi
  die "missing secret $name — export it and re-run"
}

set_secret() {
  local name="$2" value
  value="$(resolve_secret "$@")"
  say "setting secret $name"
  printf '%s' "$value" | $WRANGLER secret put "$name" >/dev/null
}

set_secret WORKOS_CLIENT_ID WORKOS_CLIENT_ID
set_secret WORKOS_API_KEY WORKOS_API_KEY
set_secret WORKOS_REDIRECT_URI WORKOS_REDIRECT_URI "https://access.reposell.dev/api/auth/callback"

# RepoSell's OWN Stripe secret — prefer the repo-local .env (gitignored),
# else the exported variable (already read above, so pass it explicitly).
if [[ -z "${LISTING_STRIPE_SECRET_KEY:-}" && -f ../.env ]]; then
  LISTING_STRIPE_SECRET_KEY="$(rg '^STRIPE_SECRET_KEY=' ../.env | head -1 | cut -d= -f2-)"
fi
set_secret LISTING_STRIPE_SECRET_KEY LISTING_STRIPE_SECRET_KEY

set_secret ALLOWED_ORIGINS ALLOWED_ORIGINS "https://listing.reposell.dev"

# --- 4. deploy ------------------------------------------------------------
say "deploying worker to access.reposell.dev"
$WRANGLER deploy

say "done."