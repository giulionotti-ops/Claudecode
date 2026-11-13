#!/bin/bash
# Daily 40k Comic Shorts job: Claude makes one short (see AUTO.md), then the uploader posts what's scheduled.
# Cron: 0 9 * * * /root/comics-40k/shorts/comic/daily.sh
# Pause: touch /root/comics-40k/shorts/comic/PAUSE
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE/.."
LOG="$HERE/logs/$(date +%F).log"; mkdir -p "$HERE/logs"
exec >>"$LOG" 2>&1
echo "=== $(date) ==="
[ -f "$HERE/PAUSE" ] && { echo "paused"; exit 0; }
exec 9>"$HERE/.daily.lock"; flock -n 9 || { echo "already running"; exit 0; }
export PATH="$HOME/.local/bin:$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
[ -f /root/.api-keys.env ] && { set -a; . /root/.api-keys.env; set +a; }

# Only make a new short if fewer than 2 are waiting to publish (keeps a 1-day buffer).
WAITING=$(python3 - <<'EOF'
import json, datetime, os
p = 'comic/uploader/schedule.json'; plan = json.load(open(p)) if os.path.exists(p) else []
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
print(sum(1 for e in plan if e['publish'] > now))
EOF
)
echo "waiting to publish: $WAITING"
if [ "$WAITING" -lt 2 ]; then
  timeout 3h claude -p "Follow comic/AUTO.md exactly (you are in shorts/): make today's short." \
    --permission-mode acceptEdits --allowedTools Bash Read Write Edit Glob Grep WebFetch WebSearch \
    --output-format text </dev/null || echo "claude run failed ($?)"
fi

(cd "$HERE/uploader" && python3 upload.py upload --all) || echo "upload: nothing new or failed"
BR=$(git -C "$HERE" rev-parse --abbrev-ref HEAD)
git -C "$HERE" push -q origin "$BR" || echo "push failed"
echo "=== done $(date) ==="
