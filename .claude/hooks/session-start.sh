#!/bin/bash
# Installs OmniRoute and the claude-mem plugin in Claude Code cloud sessions.
set -euo pipefail

# Only run in remote (cloud) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Send install output to stderr so it is not added to the session context
exec 1>&2

cd "${CLAUDE_PROJECT_DIR:-.}"

# OmniRoute: global npm package
if ! command -v omniroute >/dev/null 2>&1; then
  npm install -g omniroute
fi

# claude-mem: plugin + hook launcher for Claude Code
if [ ! -x "$HOME/.local/bin/claude-mem" ] || [ ! -d "$HOME/.claude/plugins/marketplaces/thedotmack" ]; then
  npx -y claude-mem install --ide claude-code
fi

# Start the claude-mem background worker if it isn't running
if ! npx -y claude-mem status 2>/dev/null | grep -q "Worker is running"; then
  npx -y claude-mem start
fi

# Agent Reach: CLI (via uv) + default channels. Its skill lives in this repo
# (.claude/skills/agent-reach), so drop the user-level copy setup links in.
export PATH="$HOME/.local/bin:$PATH"
if ! command -v agent-reach >/dev/null 2>&1; then
  uv tool install https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip
fi
if [ ! -f "$HOME/.agent-reach/state.json" ]; then
  agent-reach setup >/dev/null
fi
rm -f "$HOME/.claude/skills/agent-reach"

# SkillSpector: security scanner for agent skills (update: uv tool update skillspector)
if ! command -v skillspector >/dev/null 2>&1; then
  uv tool install git+https://github.com/NVIDIA/skillspector.git
fi

# Reels engine (reels/): three.js + fonts. Playwright/Chromium and ffmpeg are preinstalled in cloud sessions.
if [ -f reels/package.json ] && [ ! -d reels/node_modules/three ]; then
  (cd reels && npm install --no-audit --no-fund)
fi
python3 -c "import numpy" 2>/dev/null || pip install -q numpy

# Plugins: cloud sessions don't install enabledPlugins from .claude/settings.json by themselves.
# Add every marketplace and install every enabled plugin that is missing (idempotent).
if command -v claude >/dev/null 2>&1 && [ -f .claude/settings.json ]; then
  installed="$(claude plugin list 2>/dev/null || true)"
  python3 - <<'PY' | while read -r kind a b; do
import json
s = json.load(open('.claude/settings.json'))
for name, m in s.get('extraKnownMarketplaces', {}).items():
    print('m', name, m['source'].get('repo', ''))
for p, on in s.get('enabledPlugins', {}).items():
    if on: print('p', p, '-')
PY
    if [ "$kind" = m ] && [ ! -d "$HOME/.claude/plugins/marketplaces/$a" ]; then
      timeout 180 claude plugin marketplace add "$b" || echo "marketplace $a failed"
    elif [ "$kind" = p ] && ! grep -q "> $a" <<<"$installed"; then
      timeout 180 claude plugin install "$a" --scope project || echo "plugin $a failed"
    fi
  done
fi

# Make sure the claude-mem launcher is on PATH for the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi
