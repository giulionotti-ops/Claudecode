#!/usr/bin/env bash
# Neesmo installer: the app, its login, the approval hook, and the optional bundle
# (OmniRoute free-model gateway, graphify, claude-mem, skill pack).
#
#   ./install.sh                 ask before each optional part
#   ./install.sh --all           install everything without asking
#   ./install.sh --dry-run       print what would happen, change nothing
#   ./install.sh --no-service    skip the systemd service (run it yourself)
#   ./install.sh --tunnel        also set up a Cloudflare Tunnel for access from anywhere
#
# Safe to run again: each step checks first and skips what is already done.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="${NEESMO_DIR:-$HOME/.config/neesmo}"
PORT="${NEESMO_PORT:-8080}"
DRY=0; ALL=0; SERVICE=1; TUNNEL=0

for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --all) ALL=1 ;;
    --no-service) SERVICE=0 ;;
    --tunnel) TUNNEL=1 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

say()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
run()  { if [ "$DRY" = 1 ]; then printf '   [dry-run] %s\n' "$*"; else "$@"; fi; }
have() { command -v "$1" >/dev/null 2>&1; }
ask()  {  # ask "question" -> 0 for yes
  [ "$ALL" = 1 ] && return 0
  [ -t 0 ] || return 1
  local r; read -r -p "$1 [Y/n] " r; [[ -z "$r" || "$r" =~ ^[Yy] ]]
}

# ---- 1. requirements ----------------------------------------------------------
say "Checking requirements"
have python3 || { warn "python3 is needed (3.10+)"; exit 1; }
python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' || { warn "python 3.10+ is needed"; exit 1; }
if ! have tmux; then
  if have apt-get && ask "tmux runs the agent sessions. Install it now (apt-get install -y tmux)?"; then
    run $([ "$(id -u)" = 0 ] || echo sudo) apt-get install -y tmux
  else
    warn "tmux is needed for agent chats: install it with your package manager"
  fi
fi
have node || warn "node/npm not found: OmniRoute, claude-mem and the skill pack need Node 20+ (https://nodejs.org)"
if ! have claude; then
  if have npm && ask "Claude Code is not installed. Install it now (npm install -g @anthropic-ai/claude-code)?"; then
    run npm install -g @anthropic-ai/claude-code
  else
    warn "Install Claude Code later: https://code.claude.com"
  fi
fi

# ---- 2. app -------------------------------------------------------------------
say "Installing Neesmo into $HERE/.venv"
[ -d "$HERE/.venv" ] || run python3 -m venv "$HERE/.venv"
run "$HERE/.venv/bin/pip" install -q --upgrade pip
run "$HERE/.venv/bin/pip" install -q -r "$HERE/requirements.txt"

say "Writing settings to $CONF/neesmo.env"
run mkdir -p "$CONF"
if [ -f "$CONF/neesmo.env" ]; then
  echo "   kept the existing $CONF/neesmo.env"
else
  contact="${NEESMO_PUSH_CONTACT:-}"
  if [ -z "$contact" ] && [ -t 0 ] && [ "$ALL" = 0 ]; then
    read -r -p "Email for push-notification servers (Apple asks for one; press Enter to skip): " contact
  fi
  env_text="# Neesmo settings (read by the service at start)
NEESMO_AUTH=1
NEESMO_DIR=$CONF
NEESMO_URL=http://127.0.0.1:$PORT${contact:+
NEESMO_PUSH_CONTACT=mailto:$contact}"
  if [ "$DRY" = 1 ]; then printf '   [dry-run] write:\n%s\n' "$env_text"
  else (umask 077; printf '%s\n' "$env_text" > "$CONF/neesmo.env"); fi
fi

# ---- 3. approval hook ---------------------------------------------------------
say "Adding the approval hook to ~/.claude/settings.json"
hook_py="import json, pathlib
p = pathlib.Path.home() / '.claude' / 'settings.json'
p.parent.mkdir(parents=True, exist_ok=True)
s = json.loads(p.read_text()) if p.exists() else {}
hook = {'type': 'command', 'command': 'python3 $HERE/approval_hook.py', 'timeout': 172860}
groups = s.setdefault('hooks', {}).setdefault('PermissionRequest', [])
if any(h.get('command', '').endswith('approval_hook.py') for g in groups for h in g.get('hooks', [])):
    print('   already there')
else:
    groups.append({'matcher': '*', 'hooks': [hook]})
    p.write_text(json.dumps(s, indent=2))
    print('   added')"
run python3 -c "$hook_py"

# ---- 4. optional bundle -------------------------------------------------------
if have npm && ask "Install OmniRoute (free-model gateway for cheap text jobs, MIT)?"; then
  have omniroute || run npm install -g omniroute
  echo "   Add free providers later with: omniroute providers add <name> --credential-stdin --yes"
fi

if ask "Install graphify (code knowledge graph, Apache-2.0)?"; then
  if have graphify; then echo "   already installed"
  elif have uv; then run uv tool install graphifyy
  elif have pipx; then run pipx install graphifyy
  else run python3 -m pip install --user graphifyy; fi
fi

if have npx && ask "Install claude-mem (long-term memory for Claude, Apache-2.0)?"; then
  run npx -y claude-mem install --ide claude-code
  run npx -y claude-mem start
fi

if have npx && ask "Install the skill pack ($(grep -vc '^#' "$HERE/skills.txt") skills: engineering, review, video, link reading, skill finder)?"; then
  repo=""; skills=()
  flush() { [ -n "$repo" ] && [ "${#skills[@]}" -gt 0 ] || return 0
    local args=(); for s in "${skills[@]}"; do args+=(--skill "$s"); done
    run npx -y skills add "$repo" "${args[@]}" -a claude-code -g -y || warn "could not add skills from $repo"; }
  while read -r r s; do
    [[ -z "$r" || "$r" == \#* ]] && continue
    if [ "$r" != "$repo" ]; then flush; repo="$r"; skills=(); fi
    skills+=("$s")
  done < <(sort "$HERE/skills.txt")
  flush
fi

if have claude && ask "Install the caveman plugin (short, plain replies from Claude that keep every technical detail; Apache-2.0)?"; then
  run claude plugin marketplace add JuliusBrussee/caveman || warn "could not add the caveman marketplace"
  run claude plugin install caveman@caveman -s user || warn "could not install the caveman plugin"
  echo "   Turn it (and any skill) on or off later in Neesmo: Settings > System"
fi

# ---- 5. service ---------------------------------------------------------------
if [ "$SERVICE" = 1 ] && have systemctl; then
  say "Setting up the neesmo service (127.0.0.1:$PORT, starts at boot)"
  unit_dir="$HOME/.config/systemd/user"; target="default.target"
  if [ "$(id -u)" = 0 ]; then unit_dir=/etc/systemd/system; target="multi-user.target"; fi
  unit="[Unit]
Description=Neesmo
After=network-online.target

[Service]
WorkingDirectory=$HERE
EnvironmentFile=$CONF/neesmo.env
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$HERE/.venv/bin/uvicorn server:app --host 127.0.0.1 --port $PORT
Restart=always
RestartSec=10

[Install]
WantedBy=$target"
  ctl=(systemctl); [ "$(id -u)" = 0 ] || ctl=(systemctl --user)
  if [ "$DRY" = 1 ]; then printf '   [dry-run] write %s/neesmo.service:\n%s\n' "$unit_dir" "$unit"
  else mkdir -p "$unit_dir"; printf '%s\n' "$unit" > "$unit_dir/neesmo.service"; fi
  run "${ctl[@]}" daemon-reload
  run "${ctl[@]}" enable --now neesmo
  [ "$(id -u)" = 0 ] || run loginctl enable-linger "$(id -un)" || true
elif [ "$SERVICE" = 1 ]; then
  warn "systemd not found. Start Neesmo with:"
  echo "   set -a; . $CONF/neesmo.env; set +a; cd $HERE && .venv/bin/uvicorn server:app --host 127.0.0.1 --port $PORT"
fi

# ---- 6. access from anywhere --------------------------------------------------
if [ "$TUNNEL" = 1 ]; then
  if have cloudflared; then
    say "Cloudflare Tunnel: a quick test link (changes on each start; see README for a fixed name)"
    echo "   run: cloudflared tunnel --url http://127.0.0.1:$PORT"
  else
    warn "cloudflared is not installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  fi
fi

say "Done."
cat <<EOF
   1. Sign in to Claude once:   claude
   2. Open http://127.0.0.1:$PORT (or your tunnel link)
   3. First visit asks for the setup code. Find it with:
        journalctl $( [ "$(id -u)" = 0 ] || echo --user ) -u neesmo | grep -i "setup code"
   Each device signs in once and is remembered. Manage devices in Settings.
EOF
