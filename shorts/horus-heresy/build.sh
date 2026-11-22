#!/bin/sh
# One command rebuilds the film: voice -> check -> score -> events -> picture -> mix -> master.
# Needs the Lemo-Opuscar library (core tools + voice tier) and ffmpeg 7+:  LIB=~/lemo-opuscar sh build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
[ -f "$HERE/voice/dur.json" ] || { "$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voice/raw" && "$PY" "$HERE/voice_fx.py"; }
"$PY" core/tts/asr_check.py "$HERE/lines.json" "$HERE/voice" --lang en
"$PY" "$HERE/music/score.py"
node core/render/events.mjs "$HERE" --size 1080x1920
node core/render/readcheck.mjs "$HERE" --size 1080x1920 --q 'textsonly=1'
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --size 1080x1920 --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
"$PY" "$HERE/export_srt.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/horus-heresy.mp4" 24
