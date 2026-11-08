#!/bin/sh
# Rebuild the short: voice -> score -> picture (+ events.json) -> mix -> mux. Needs node + playwright, python3 (numpy, scipy, soundfile, soxr), ffmpeg.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); cd "$HERE"
[ -f voice/dur.json ] || python3 ../voice_el.py .
python3 music/score.py
node tools/film.js "$HERE" video "$HERE/out/video.mp4" 24
python3 mix.py
ffmpeg -y -v error -i out/video.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest brother-against-brother.mp4
echo "wrote brother-against-brother.mp4"
