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

# yt-dlp: YouTube downloads for the youtube-downloader skill and auto_clip.py --url
if ! command -v yt-dlp >/dev/null 2>&1; then
  uv tool install yt-dlp
fi

# Make sure the claude-mem launcher is on PATH for the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi

# graphify: CLI for the graphify skill and its hooks (update: uv tool upgrade graphifyy)
if ! command -v graphify >/dev/null 2>&1; then
  uv tool install graphifyy
fi
