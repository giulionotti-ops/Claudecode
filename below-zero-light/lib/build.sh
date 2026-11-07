#!/bin/sh
# Build one short end to end once lines.json, cues.json, scene.js and index.html exist.
# Usage: sh lib/build.sh shorts/NN-name name
set -e
cd "$(dirname "$0")/.."
D=$1; N=$2; export NODE_PATH=$(npm root -g)
[ -f "$D/voice/dur.json" ] || python3 lib/voice.py "$D"
python3 lib/timeline.py "$D"
python3 lib/mix.py "$D"
node lib/render.mjs "$D" --workers 4
ffmpeg -v error -y -i "$D/out/video.mp4" -i "$D/out/mix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=9 -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$D/$N.mp4"
python3 lib/srt.py "$D" "$N"
ffmpeg -hide_banner -i "$D/$N.mp4" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
