# Daily playbook: 3 shorts a day for Below Zero Light

This is what the daily scheduled session follows. One run makes **3 finished shorts**, each with its own title and description, then commits and pushes them.

## 0. Setup (every run)
```sh
cd below-zero-light   # inside the repo
git fetch origin claude/relaxed-darwin-ih2a5z && git checkout claude/relaxed-darwin-ih2a5z && git pull origin claude/relaxed-darwin-ih2a5z
pip install -q scipy soundfile numpy
```
ElevenLabs is already connected through the session's proxy, so no key is needed. Playwright and Chromium are pre-installed. Run Node with `NODE_PATH=$(npm root -g)`.

## 1. Pick 3 topics
- Take the top 3 unused topics from `TOPICS.md`. Mix the types: one **descent / scale** short, one **mystery**, one **creature**. Avoid the same type twice in a row.
- Mark them as done in `TOPICS.md` (move them under "Made", with the date and folder). Add 3 new ideas to the backlog so it never runs dry.
- What works on this channel: fear of the deep, "louder / older / deeper than X", real mysteries with a real answer, a twist at the end.

## 2. Write each script (`shorts/NN-slug/lines.json`)
- 9–12 lines, about **110–150 words**. The finished short should be **45–65 s** (check `timeline.py`'s printed duration; cut lines if it's over 65 s).
- **Line 1 is the hook.** It must make someone stop scrolling in under 2 seconds: a shocking fact, a number, or a question. No "hey guys", no channel name.
- One fact per line. Short sentences, written to be spoken. Spell numbers the way they're said only when that helps ("nearly four hundred").
- **End with a twist or a callback** that makes people replay or comment (short #1: the plastic bag; #3: "already old when the Titanic sank").
- **Every fact must be true.** Check it with a web search and note the source in the description. If a figure is uncertain, say "about", "nearly" or "may". Never invent a number.
- Add `"ping": true` to lines that start a new scene (a sonar ping plays). For descent shorts, give each line a `"depth"` in metres instead.

## 3. Picture (`scene.js` + `index.html`)
- Copy the nearest existing short (01 = descent with depth counter, 02 = sonar room / mystery, 03 = stat cards / creature file) and adapt it. Reuse `lib/draw.js` (water, snow, sonar, orb, angler, jelly, eye, snailfish, whale, diver, titanicBow, bag, globe, iceberg, shark, bear, walker, mark) and `lib/captions.js`. Add new drawings to `lib/draw.js` when a topic needs them.
- **Keep the brand:** near-black water, glowing cyan line light (amber for warnings/highlights, pink for soft creatures), thin mono numbers up top, Montserrat word-by-word captions at y≈1360, the Below Zero Light end card.
- **Give each short its own visual idea** (a counter, a map, a comparison, a reveal), so the channel never looks copy-pasted. Change the layout, not the brand.
- Keep key things between y 250 and 1450 and away from the right edge (x > 960), where the Shorts buttons sit.
- **Always render a contact sheet first and look at it:** `node lib/render.mjs shorts/NN-slug --stills t1,t2,... --out <scratchpad>/sheet.jpg` with one time per line. Fix overlaps, empty frames and things off-screen before the full render.

## 4. Sound (`cues.json`)
Cue types: `boom`, `creak`, `whale`, `bloop`, `crack`, `growl`, `splash`. Time is `"L6:Titanic"` (the start of that word). Keep gains around **0.3–0.5**. `mix.py` prints levels: voice should be **≥ 9 dB above** both music and effects.

## 5. Build
```sh
sh lib/build.sh shorts/NN-slug slug
```
It voices, times, mixes, renders, muxes (−14 LUFS) and writes the `.srt`. Then grab 6 frames from the final `.mp4` and look at them once more. Write `poster.jpg` from a strong frame.

## 6. Title and description (best for views)
Write them in `uploads/YYYY-MM-DD.md` (same format as `UPLOADS.md`), one block per short.
- **Title:** under 50 characters. Opens a question the video answers. Concrete and surprising: a number, a comparison, a superlative ("louder than a blue whale", "older than America"). One emoji at the end at most. No ALL CAPS, no false claims.
- **Description:** line 1 restates the hook in other words (it shows in search). 2–3 short lines of what's inside without giving away the twist. A "Facts/Source" line. If the sound is a recreation, say so. Then `#shorts` + 3–4 topic hashtags.
- **Pinned comment:** a question that is easy to answer.
- Always note: tick "Altered or synthetic content → Yes" (AI voice).

## 6b. Add the cards to the Shorts Board
The board is a private page: https://claude.ai/artifact/9S7wZjm9G2FsGnDeJG7Sas (source in `board/`). Every short gets one card: number, video, title, description, pinned comment, upload suggestion.
1. Make the small web copy and poster for each new short (NN = its number):
   ```sh
   mkdir -p board/videos board/posters
   ffmpeg -v error -y -i shorts/NN-slug/slug.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -b:v 1100k -maxrate 1500k -bufsize 3000k -c:a aac -b:a 96k -movflags +faststart board/videos/NN.mp4
   ffmpeg -v error -y -i shorts/NN-slug/poster.jpg -vf scale=360:-1 -q:v 4 board/posters/NN.jpg
   ```
   Each video must stay under 15 MB (lower `-b:v` if not).
2. Add one entry per short to `board/shorts.json` (same fields as the existing ones: `n`, `folder`, `file`, `video`, `poster`, `title`, `description`, `pinned`, `when`, `notes`, `made`). Use the same title, description and pinned comment as in the day's upload file.
3. **Upload suggestion** (`when` and `notes`): spread the day's 3 shorts over the next day at **15:00, 20:00 and 01:00 Rome time** (9:00, 14:00, 19:00 New York), the strongest hook first. Write `when` like `Sun 8 Nov · 15:00 Rome / 9:00 New York`. In `notes`, say in one or two sentences why it goes in that slot, and repeat the checklist: upload the .srt as captions, pin the comment, tick "Altered or synthetic content: Yes".
4. Publish: first read the board with the Artifact tool (`action: "read"`, the URL above), then publish with that `url`, `file_path` = `board/index.html`, `root` = the `board` folder, and `files` = `shorts.json` plus only the new `videos/NN.mp4` and `posters/NN.jpg` (files you leave out stay on the board).

## 7. Commit and push
```sh
cd .. && git add below-zero-light && git commit -m "Below Zero Light: shorts NN-NN (<topics>)" && git push -u origin claude/relaxed-darwin-ih2a5z
```
Videos are committed so they can be downloaded from GitHub; `out/` folders are ignored.

## Quality gates (don't skip)
- Duration 45–65 s, loudness −14 LUFS (±1).
- Every fact checked; sources in the description.
- Contact sheet reviewed: no overlaps with captions, nothing cut off, no empty scenes.
- If a short fails a gate and can't be fixed, ship 2 good shorts rather than 3 with a bad one, and say so in the day's upload file.
