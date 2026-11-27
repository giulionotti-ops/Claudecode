# shotlist.json and script_review.json

Both go in the video folder. `python3 -m studio.shotlist check <video folder>` validates them, prints every
problem, and writes `shotlist.md` when they pass. Run it until it prints `ok`.

## script_review.json
```json
{"ok": true,
 "hook_picture": "what the viewer SEES in the first 1.5 s",
 "fixes": [{"line": 4, "fix": "replace 'it's complicated' with the number: 1,200 °C"}],
 "notes": "one sentence on the story shape"}
```
`ok: false` sends the script back to the marketer with `fixes` (max 3). Then you are run again.

## shotlist.json
```json
{"mode": "narrated",                 // or "voiceless": captions + SFX + music carry the story
 "logline": "one sentence: what the video is and why it hooks",
 "look": {"palette": "teal shadows, amber highlights, accent #ff6b35",
          "lighting": "low-key, hard rim from camera left, haze",
          "texture": "fine grain, soft bloom, vignette",
          "lens": "wide 18-24 mm feel, deep focus"},
 "sound": {"music": "dark pulse 100 bpm, drops at the reveal, stops dead at 41 s",
           "bed": "low industrial hum + distant wind"},
 "shots": [
  {"id": "1A", "beat": 1, "start": 0.0, "end": 1.4,
   "line": "the words spoken (or shown) during this shot",
   "idea": "the one thing the viewer must get",
   "size": "ECU", "angle": "low", "lens": "macro",
   "camera": "crash-zoom from 1.0 to 1.5 in 4 frames, then 2 px handheld shake",
   "lighting": "single hard top light 3200K, deep black fill, red warning practical blinking 2 Hz",
   "palette": "black, steel grey, accent orange on the crack",
   "composition": "crack runs diagonal bottom-left to top-right, centre punch",
   "action": "a hairline crack races across the bolt head, a flake of paint pops off and spins away",
   "vfx": ["sparks at crack tip", "chromatic split on impact", "dust motes in the light"],
   "text": "IT'S ABOUT TO SNAP",
   "sfx": {"hit": "metal crack + sub thump", "bed": "low hum", "detail": "paint flake tick"},
   "music": "silent - only the bed",
   "transition": "smash-cut",
   "reference": "Mission: Impossible (De Palma, 1996) - the ECU hang before the drop"}
 ],
 "loop": "last shot ends on the same bolt, cracking again: frame 1 continues it"}
```

## Rules the check enforces
- Every shot has all fields above, filled with real words (no "nice", "cool", "TBD").
- `action` at least 8 words, `lighting` at least 5 words, `camera` names a move from the film grammar.
- `size` is one of: EWS WS MS MCU CU ECU INSERT POV OTS TOP CUTAWAY.
- `transition` starts with one of: cut cut-on-action smash-cut match-cut match-move whip morph zoom-through
  J-cut L-cut iris wipe flash fade-black.
- `reference` names a film and a year in brackets, e.g. `Jaws (Spielberg, 1975) - dolly zoom`.
- Times run from 0 with no gaps or overlaps; the last `end` is within the channel's max length.
- Shorts: shot 1 lasts at most 2 s; each shot 0.4-4 s (up to 6 s only if the camera is not `static`);
  average shot at most 2.5 s.
- Never three shots of the same `size` in a row.
- At least one shot uses silence as a sound (`silence` in `sfx` or `music`).
- `voiceless` mode: every shot has `text`.
- `loop` says how the last frame leads into the first.
