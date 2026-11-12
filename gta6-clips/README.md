# Vice City Clips: GTA 6 Shorts channel kit

GTA 6 launches **November 19, 2026**. This folder has everything needed to run a
GTA 6 clips channel on YouTube Shorts, TikTok and Instagram Reels from day one.

- `CHANNEL.md`: name, handles, bio, branding, upload plan and content rules
- `make_short.py`: turns 16:9 gameplay into a finished 9:16 short (blurred fill,
  hook title, timed captions, handle watermark, -14 LUFS audio)
- `auto_clip.py`: scans long recordings for the best moments (loudness spikes,
  fast action) and writes a ready-to-render config
- `shorts.json`: the first two shorts, ready to render once footage exists

## Make the shorts

1. Record gameplay (PS5: Create button → save last 15 min / record; Xbox: Win+G or
   Capture) and drop the files in `footage/` as `launch-day.mp4` and
   `police-chase.mp4`, or edit the `source` paths in `shorts.json`.
2. Set each short's `start` / `end` to the moment you want (max 3 min; aim for 20–35 s).
3. Render:

```bash
python3 make_short.py shorts.json
```

Finished files land in `out/`. Render one short with `--only 2`. Use `zoom`
(e.g. `1.25`) to crop in tighter on the action.

## Auto-clip a long session

Drop a long recording (or a whole folder) in `footage/` and let the script find
the moments:

```bash
python3 auto_clip.py footage/ -n 8           # writes auto_shorts.json
# edit each "title" (the hook) and the captions, then:
python3 make_short.py auto_shorts.json
```

`--render` does both in one go (titles stay as placeholders). `--url <link>`
downloads a video with yt-dlp into `footage/` first. Only use it for **your own**
uploads or streams, never other creators' videos or leaks (see `CHANNEL.md`).
Tune with `--length 30`, `--lead 10` (build-up before the peak) and
`--min-score 1` (stricter).

`footage/` and `out/` are git-ignored, so videos never get committed.
