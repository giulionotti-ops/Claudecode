#!/bin/sh
# One command rebuilds the short: voice -> events -> picture -> mix -> master.
# Needs the Lemo-Opuscar library (sh setup.sh deps) and ffmpeg. No GPU here, so WebGL runs in software (swiftshader).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
[ -f "$HERE/voice/words.json" ] || python3 "$HERE/voice_ts.py"
mkdir -p "$HERE/out"
cd "$LIB"
export LEMO_ANGLE=${LEMO_ANGLE:-swiftshader}
node core/render/events.mjs "$HERE" --size 1080x1920
node core/render/video.mjs "$HERE" --fps 30 --workers 6 --size 1080x1920 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
"$LIB/.venv/bin/python" "$HERE/export_srt.py"
sh "$HERE/master.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/yeti.mp4"
