# Daily playbook: 3 shorts a day for Void Atlas

This is what the daily scheduled session follows. One run makes **3 finished shorts**, each with its own title, description and pinned comment, adds them to the Shorts Board, then commits and pushes.

## 0. Setup (every run)
```sh
cd void-atlas   # inside the repo
git fetch origin claude/keen-gauss-j25w2h && git checkout claude/keen-gauss-j25w2h && git pull origin claude/keen-gauss-j25w2h
pip install -q scipy soundfile numpy
```
ElevenLabs is connected through the session's proxy, so no key is needed. Playwright and Chromium are pre-installed. Run Node with `NODE_PATH=$(npm root -g)`.

## 1. Pick 3 topics
- Take the top unused topics from `TOPICS.md`, one of each type: **scale / journey**, **mystery**, **strange world / object**. If a real space news story is happening this week (a launch, a milestone, a new telescope image), it may replace one of them: timely shorts get a boost.
- Move them under "Made" (date, number, folder) and add 3 new ideas to the backlog so it never runs dry.
- What works here: "bigger / older / faster / farther than X", real mysteries with a real (or possible) answer, a twist or callback at the end.

## 2. Write each script (`shorts/NN-slug/lines.json`)
- 9–12 lines, about **110–150 words**. The finished short must be **45–65 s** (the duration `timeline.py` prints). Cut lines if it's long; pass a slower tempo to `build.sh` (e.g. `1.07`) if it's just under 45 s.
- **Line 1 is the hook**: stop the scroll in under 2 seconds with a shocking fact, a number or a question. No greetings, no channel name.
- One fact per line, short spoken sentences. Write numbers the way they should be said when the voice might misread them (catalogue names, years are fine as digits).
- **End with a twist or a callback** (#1: 1,549 light-days to go; #2: still just "Wow"; #3: "at least it's not raining glass").
- **Every fact must be true.** Check with a web search, prefer NASA / ESA / the paper itself, and put the sources in the description. Say "about", "may", "scientists think" when a figure or idea is uncertain. Never invent a number.
- `"ping": true` on lines that start a new scene (a whoosh + chime plays). `"gap": 0.5` adds a breath before a line (use before twists).

## 3. Picture (`scene.js` + `index.html`)
- Copy `index.html` from any short. Write `scene.js` with `lib/kit.js` (`setup()` → `K.frame(draw, { cards, header })`); look at shorts 01–03 for the pattern:
  - 01 = journey (counter, ruler, two-way signal, zoom-out to scale),
  - 02 = mystery (an artefact as hero: a printout, a chart, a spectrum),
  - 03 = strange world (one planet, each fact changes how it looks).
- Reuse `lib/draw.js` (sky, stars, planet, sun, probe, dish, galaxy, blackHole, constellation, atlasFrame, beam, glow, spike, mark). Add new drawings to `draw.js` when a topic needs them, so the library grows.
- **Keep the brand:** indigo-black sky, gold line light, thin mono numbers in the top card, gold-lit word captions at y≈1360, the Void Atlas end card. **Give each short its own visual idea** so the channel never looks copy-pasted.
- Keep key things between y 480 and 1280 (the card sits above, captions below) and away from the right edge (x > 960).
- JavaScript: write `-(x ** 2)` with parentheses; `-x ** 2` is a syntax error that makes the page hang.
- **Always render a contact sheet first and look at it:** `node lib/render.mjs shorts/NN-slug --stills t1,t2,... --out <scratchpad>/sheet.jpg` with one time per line (the middle of each line from `timeline.json`). Fix overlaps, empty frames and things off-screen before the full render.

## 4. Sound (`cues.json`)
Cue types: `boom`, `whoosh`, `rumble`, `signal`, `static`, `chime`, `heartbeat`. Time is `"L6:word"` (start of the first word in that line containing it). Gains around **0.3–0.5**. `mix.py` prints levels: voice must be **≥ 8 dB above** both "music+bed" and "fx".

## 5. Build
```sh
sh lib/build.sh shorts/NN-slug slug [tempo]
```
It voices, times, mixes, renders, muxes (−14 LUFS) and writes the `.srt`. Rendering takes ~10–15 min per short, so start one build in the background while you write the next scene. Then grab ~8 frames from the final `.mp4` and look at them once more. Write `poster.jpg` from a strong frame (`ffmpeg -ss <t> -i ... -frames:v 1 -q:v 2 poster.jpg`).

## 6. Title, description, pinned comment
Write them in `uploads/YYYY-MM-DD.md` (same format as `UPLOADS.md`), one block per short.
- **Title:** under 50 characters. Opens a question the video answers. Concrete and surprising: a number, a comparison, a superlative. One emoji at the end at most. No ALL CAPS, no false claims.
- **Description:** line 1 restates the hook differently (it shows in search). 1–2 short lines of what's inside without giving away the twist. A "Facts:" line with sources. If a sound is a recreation, say so. Then `#shorts` + 3–4 topic hashtags.
- **Pinned comment:** an easy question or a vote.

## 6b. Add the cards to the Shorts Board
The board is a private page: https://claude.ai/artifact/EcH5QWQYKgUi5s2hBxSbTX (source in `board/`). Every short gets one card.
1. Small web copy and poster for each new short (NN = its number):
   ```sh
   mkdir -p board/videos board/posters
   ffmpeg -v error -y -i shorts/NN-slug/slug.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -b:v 1100k -maxrate 1500k -bufsize 3000k -c:a aac -b:a 96k -movflags +faststart board/videos/NN.mp4
   ffmpeg -v error -y -i shorts/NN-slug/poster.jpg -vf scale=360:-1 -q:v 4 board/posters/NN.jpg
   ```
   Each video must stay under 15 MB.
2. Add one entry per short to `board/shorts.json` (fields: `n`, `folder`, `file`, `video`, `poster`, `title`, `description`, `pinned`, `when`, `notes`, `made`, `download`, `size_mb`). `download` is `https://github.com/giulionotti-ops/Claudecode/raw/claude/keen-gauss-j25w2h/<folder>/<file>`; `size_mb` is the full mp4's size. Same text as the day's upload file.
3. **Upload suggestion:** the day's 3 shorts go out on the **day after the run** at **16:00, 21:00 and 02:00 (next night) Rome time** (10:00, 15:00, 20:00 New York), strongest hook first. Write `when` like `Mon 9 Nov · 16:00 Rome / 10:00 New York`. In `notes`, one or two sentences on why that slot, plus the checklist: upload the .srt, pin the comment, tick "Altered or synthetic content: Yes".
4. **Commit and push before publishing** (step 7), so the download links work.
5. Publish: read the board with the Artifact tool (`action: "read"`, the URL above), then publish with that `url`, `file_path` = `board/index.html`, `root` = the `board` folder, and `files` = `shorts.json` plus only the new `videos/NN.mp4` and `posters/NN.jpg` (files you leave out stay on the board). Never create a new artifact.

## 7. Commit and push
```sh
cd .. && git add void-atlas && git commit -m "Void Atlas: shorts NN-NN (<topics>)" && git pull --rebase origin claude/keen-gauss-j25w2h && git push -u origin claude/keen-gauss-j25w2h
```
Final videos are committed so they can be downloaded from GitHub; `out/` folders and board copies are ignored.

## 8. Send them
Send the 3 final `.mp4` files to the owner with SendUserFile (status proactive), then reply in a few short lines: the 3 titles, their upload times, the board link, and anything that failed a gate.

## Quality gates (don't skip)
- Duration 45–65 s, loudness −14 LUFS (±1), voice ≥ 8 dB over music and fx.
- Every fact checked; sources in the description.
- Contact sheet and final frames reviewed: no overlaps with captions or the top card, nothing cut off, no empty scenes.
- If a short fails a gate and can't be fixed, ship 2 good shorts rather than 3 with a bad one, and say so.
