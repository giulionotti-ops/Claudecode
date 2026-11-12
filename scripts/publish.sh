#!/usr/bin/env bash
# Build the place with Rojo and publish it via Roblox Open Cloud.
# Usage: scripts/publish.sh            build + publish
#        scripts/publish.sh --build    build only
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="$HOME/.rokit/bin:$PATH"

OUT=build/game.rbxl
ENV_FILE="$HOME/.roblox.env"

mkdir -p build
rojo build -o "$OUT"

[[ "${1:-}" == "--build" ]] && exit 0

# Non-secret IDs
UNIVERSE_ID=$(grep -E '^UNIVERSE_ID=' publish.config | cut -d= -f2- | tr -d '[:space:]"')
PLACE_ID=$(grep -E '^PLACE_ID=' publish.config | cut -d= -f2- | tr -d '[:space:]"')
if ! [[ "$UNIVERSE_ID" =~ ^[0-9]+$ && "$PLACE_ID" =~ ^[0-9]+$ ]]; then
  echo "Set UNIVERSE_ID and PLACE_ID in publish.config first." >&2
  exit 1
fi

# Secret key: read it, never echo it
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (should contain ROBLOX_API_KEY=...)." >&2
  exit 1
fi
if [[ "$(stat -c %a "$ENV_FILE")" != "600" ]]; then
  echo "$ENV_FILE must be chmod 600." >&2
  exit 1
fi
ROBLOX_API_KEY=$(grep -E '^ROBLOX_API_KEY=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '[:space:]"'"'")
if [[ -z "$ROBLOX_API_KEY" ]]; then
  echo "ROBLOX_API_KEY not found in $ENV_FILE." >&2
  exit 1
fi

URL="https://apis.roblox.com/universes/v1/${UNIVERSE_ID}/places/${PLACE_ID}/versions?versionType=Published"
RESP=$(mktemp)
trap 'rm -f "$RESP"' EXIT

# Header is passed through a process substitution (printf is a builtin),
# so the key never shows up in the process list or any log.
STATUS=$(curl -sS -o "$RESP" -w '%{http_code}' -X POST "$URL" \
  -H @<(printf 'x-api-key: %s\n' "$ROBLOX_API_KEY") \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @"$OUT")
unset ROBLOX_API_KEY

if [[ "$STATUS" == "200" ]]; then
  echo "Published. $(cat "$RESP")"
else
  echo "Publish failed (HTTP $STATUS): $(cat "$RESP")" >&2
  exit 1
fi
