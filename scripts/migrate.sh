#!/usr/bin/env bash
set -euo pipefail
r="$(cd "$(dirname "$0")/.."&&pwd)";set -a;source "$r/.env";set +a;: "${DATABASE_URL:?DATABASE_URL required}";for m in "$r"/server/migrations/*.sql;do psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$m";done
