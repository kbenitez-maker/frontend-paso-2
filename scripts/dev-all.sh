#!/usr/bin/env bash
# Starts the local stack: account-request zone (:3001), home (:3002) and the
# web-kit POC (:3000, reference only). The zone reads API_BASE_URL from
# .env.local. Ctrl+C stops everything. Repos are expected next to this one;
# override with HOME_REPO=/path/to/home and POC_APP=/path/to/web-kit/apps/web.
set -euo pipefail
# cspell:words fflush

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_REPO="${HOME_REPO:-$ROOT/../home}"
POC_APP="${POC_APP:-$ROOT/../web-kit/apps/web}"

# `kill 0` signals the whole process group, so no server outlives the script.
trap 'trap - EXIT; kill 0 2>/dev/null' INT TERM EXIT

# run <name> <port> <command...>: skips ports already taken (e.g. a server
# started from the IDE) and prefixes every output line with the name.
run() {
  local name=$1 port=$2
  shift 2
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[$name] port $port already in use, skipping"
    return
  fi
  "$@" 2>&1 | awk -v prefix="[$name]" '{ print prefix, $0; fflush() }' &
}

if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "missing $ROOT/.env.local (copy .env.example and set the API)" >&2
  exit 1
fi

if ! grep -Eq '^NEXT_PUBLIC_API_BASE_URL=.+' "$ROOT/.env.local"; then
  echo "NEXT_PUBLIC_API_BASE_URL is not set in .env.local" >&2
  exit 1
fi

if [[ ! -d "$HOME_REPO" ]]; then
  echo "home repo not found at $HOME_REPO (set HOME_REPO)" >&2
  exit 1
fi

run ar-zone 3001 pnpm --dir "$ROOT" run dev
run home 3002 env \
  NEXT_PUBLIC_ACCOUNT_REQUEST_URL=http://localhost:3001/account-request \
  pnpm --dir "$HOME_REPO" run dev

# Optional: the stack works without the POC, so a missing checkout only warns.
if [[ -d "$POC_APP" ]]; then
  run poc 3000 pnpm --dir "$POC_APP" run dev
else
  echo "[poc] not found at $POC_APP (set POC_APP), skipping"
fi

echo "zone: http://localhost:3001/account-request  home: http://localhost:3002/home  poc: http://localhost:3000"
wait
