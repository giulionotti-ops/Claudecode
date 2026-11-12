#!/bin/bash
# Server variant of the Claude Code session: same repo, skills and ALL plugins, on your own Ubuntu/Debian VPS.
# Run once on the server:   bash reels/server/claude-session.sh
# Then work as usual:        cd ~/Claudecode && claude      (or headless: claude -p "make a new reel about ...")
set -euo pipefail
REPO_DIR="${REPO_DIR:-$HOME/Claudecode}"
sudo apt-get update && sudo apt-get install -y --no-install-recommends git curl ffmpeg python3 python3-numpy
command -v node >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs; }
command -v claude >/dev/null || sudo npm install -g @anthropic-ai/claude-code
sudo npm install -g playwright@1.49.1 && sudo npx -y playwright@1.49.1 install --with-deps chromium
grep -q NODE_PATH ~/.bashrc || echo "export NODE_PATH=$(npm root -g)" >> ~/.bashrc; export NODE_PATH="$(npm root -g)"
[ -d "$REPO_DIR/.git" ] || git clone https://github.com/giulionotti-ops/Claudecode "$REPO_DIR"
cd "$REPO_DIR" && (cd reels && npm ci --no-audit --no-fund)
# Same setup the cloud hook does: marketplaces + every enabled plugin, claude-mem worker, tools.
CLAUDE_CODE_REMOTE=true CLAUDE_PROJECT_DIR="$REPO_DIR" bash .claude/hooks/session-start.sh || echo "some hook steps failed — see above"
echo
echo "Done. Next:"
echo "  1. claude            # log in once"
echo "  2. export ELEVENLABS_API_KEY=...   (on a server there is no proxy adding it)"
echo "  3. /plugin configure ponytail@ponytail   (it has 4 settings)"
