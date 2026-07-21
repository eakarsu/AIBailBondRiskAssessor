#!/usr/bin/env bash
set -euo pipefail
r="$(cd "$(dirname "$0")"&&pwd)";cd "$r";[[ -f .env ]]||{ echo 'Copy .env.example to .env.'>&2;exit 1;};[[ -d node_modules && -d client/node_modules ]]||{ echo 'Run scripts/bootstrap.sh.'>&2;exit 1;};set -a;source .env;set +a;npm run server & b=$!;(cd client&&BROWSER=none PORT="${CLIENT_PORT:-3000}" npm start)&f=$!;cleanup(){ kill "$b" "$f" 2>/dev/null||true;};trap cleanup EXIT INT TERM;wait "$b" "$f"
