#!/bin/bash
# Fable Physics auto-poster: uploads every short in uploader/queue.json not yet uploaded, two a day (13:30 and 21:30 Rome).
# Cron: 23 9,17 * * * /root/physics-channel/shorts/fable-physics/daily.sh
# Pause: touch /root/physics-channel/shorts/fable-physics/PAUSE
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HERE/logs/$(date +%F).log"; mkdir -p "$HERE/logs"
exec >>"$LOG" 2>&1
echo "=== $(date) ==="
[ -f "$HERE/PAUSE" ] && { echo "paused"; exit 0; }
exec 9>"$HERE/.daily.lock"; flock -n 9 || { echo "already running"; exit 0; }
cd "$HERE/uploader" && python3 upload.py auto || echo "upload failed ($?)"
