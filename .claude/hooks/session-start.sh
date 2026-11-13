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
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

# Node 20+ (Lemo-Opuscar needs it) and uv
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  command -v npm >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq nodejs npm; }
  npm install -g n --loglevel=error && n 22
  hash -r
fi
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi

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

# Make sure the claude-mem launcher is on PATH for the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

# Lemo-Opuscar: film-style library + render tools (three.js, headless browser, Python venv) in ~/lemo-opuscar
if [ ! -f "$HOME/lemo-opuscar/core/render/video.mjs" ]; then
  git clone -q --depth 1 https://github.com/lemomo-ai/lemo-opuscar "$HOME/lemo-opuscar"
fi
git -C "$HOME/lemo-opuscar" config lemo.managed true
# core = render, voice = speech check, music = pluck.py (some shorts use both). Fast no-op when already installed.
(cd "$HOME/lemo-opuscar" && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice music) || true
# YouTube uploader packages, into the same venv
if [ -x "$HOME/lemo-opuscar/.venv/bin/python" ]; then
  uv pip install --quiet --python "$HOME/lemo-opuscar/.venv/bin/python" -r shorts/uploader/requirements.txt || true
fi

# graphify: CLI for the graphify skill and its hooks (update: uv tool upgrade graphifyy)
if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy
fi
