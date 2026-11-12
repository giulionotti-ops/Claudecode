#!/bin/bash
# One command per reel:  bash tools/make.sh <episode>      (or --preview for a quick contact sheet)
set -euo pipefail
cd "$(dirname "$0")/.."
EP="${1:?usage: make.sh <episode> [--preview]}"
[ -d node_modules/three ] || npm install --no-audit --no-fund
python3 tools/voice.py "$EP"
if [ "${2:-}" = "--preview" ]; then node tools/render.mjs "$EP" --preview; exit; fi
node tools/render.mjs "$EP"
python3 tools/mix.py "$EP"
python3 tools/caption.py "$EP" || true
