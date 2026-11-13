#!/bin/bash
# Fable Physics daily job: Claude makes new shorts (fable-physics/AUTO.md) while fewer than 4 are waiting to post,
# then the uploader schedules every new queue entry into the next free slot (13:30 / 21:30 Rome).
# Cron: 17 4,15 * * * /root/physics-channel/shorts/fable-physics/daily.sh
# Pause everything: touch /root/physics-channel/shorts/fable-physics/PAUSE
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HERE/logs/$(date +%F).log"; mkdir -p "$HERE/logs"
exec >>"$LOG" 2>&1
echo "=== $(date) ==="
[ -f "$HERE/PAUSE" ] && { echo "paused"; exit 0; }
exec 9>"$HERE/.daily.lock"; flock -n 9 || { echo "already running"; exit 0; }
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
[ -f /root/.api-keys.env ] && { set -a; . /root/.api-keys.env; set +a; }
cd "$HERE/.."   # shorts/

waiting() { python3 - <<'EOF'
import json, os, datetime
from zoneinfo import ZoneInfo
q = json.load(open('fable-physics/uploader/queue.json')); p = 'fable-physics/uploader/uploaded.json'
done = json.load(open(p)) if os.path.exists(p) else {}
now = datetime.datetime.now(ZoneInfo('Europe/Rome')).strftime('%Y-%m-%d %H:%M')
print(sum(1 for e in q if e['name'] not in done or (done[e['name']].get('publish') or '') > now))
EOF
}

for run in 1 2; do   # at most 2 new shorts per job
  W=$(waiting); echo "waiting to post: $W"
  [ "$W" -ge 4 ] && break
  [ -f "$HERE/PAUSE" ] && break
  timeout 3h claude -p "Follow fable-physics/AUTO.md exactly (you are in shorts/): make the next short." \
    --permission-mode acceptEdits --allowedTools Bash Read Write Edit Glob Grep WebFetch WebSearch \
    --output-format text </dev/null || { echo "claude run failed ($?)"; break; }
done

(cd "$HERE/uploader" && python3 upload.py auto) || echo "upload failed ($?)"
