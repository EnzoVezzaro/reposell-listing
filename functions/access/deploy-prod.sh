#!/usr/bin/env bash
set -euo pipefail

# Production deploy wrapper: loads the gitignored prod credentials from
# .env.worker.prod, then runs the idempotent ./deploy.sh runbook.
# Prereq: npx wrangler login (once).

cd "$(dirname "$0")"

set -a
# shellcheck disable=SC1091
source .env.worker.prod
set +a

./deploy.sh