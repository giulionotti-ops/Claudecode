#!/bin/bash
# Installs what making and rendering a short needs: ffmpeg, Node + Playwright (Chromium), Python audio libs.
# Safe to re-run; skips what is already there.  Usage: bash shorts/setup.sh
set -euo pipefail

need_apt=()
command -v ffmpeg >/dev/null 2>&1 || need_apt+=(ffmpeg)
command -v node   >/dev/null 2>&1 || need_apt+=(nodejs)
command -v npm    >/dev/null 2>&1 || need_apt+=(npm)
if [ ${#need_apt[@]} -gt 0 ]; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${need_apt[@]}"
fi

# Python: numpy, scipy, soundfile, soxr (music/score.py, mix.py)
python3 -c "import numpy, scipy, soundfile, soxr" 2>/dev/null || \
  pip install -q numpy scipy soundfile soxr 2>/dev/null || \
  pip install -q --break-system-packages numpy scipy soundfile soxr

# Playwright for tools/film.js. Skip if it already resolves (some images ship it).
if ! node -e "require('playwright')" 2>/dev/null; then
  npm install -g playwright@1.49.1
  ln -sfn "$(npm root -g)" "$HOME/.node_modules"   # lets require('playwright') work from any folder
  npx -y playwright@1.49.1 install --with-deps chromium
fi

node -e "require('playwright')" && python3 -c "import numpy, scipy, soundfile, soxr" && ffmpeg -version >/dev/null && echo "shorts setup ok"
