#!/bin/sh
# Rebuild the three Split Orbit shorts and the brand art. Needs python3 with numpy + pycairo, and ffmpeg.
set -e
cd "$(dirname "$0")"
python3 engine.py overflow --seed 2 --out uploader/will-it-overflow.mp4
python3 engine.py escape   --seed 2 --out uploader/can-it-escape.mp4
python3 engine.py fill     --seed 1 --out uploader/will-it-fill.mp4
python3 brand.py
