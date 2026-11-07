# How to make one Glazier of Terra short (for the daily scheduled sessions)

One run = one finished short (about 50 s, 1080×1920) in the stained-glass lancet style, plus its upload title, description and time.
Keep replies to the user short (CLAUDE.md).

## 0. Setup
```sh
cd <repo>; git fetch origin claude/youtube-banner && git checkout claude/youtube-banner && git pull --rebase origin claude/youtube-banner
python3 -c "import scipy, soundfile, soxr" || pip install -q scipy soundfile soxr
```
The Lemo-Opuscar library is NOT used (running it is blocked). Everything runs from the short's own folder with `tools/film.js`.

## 1. Pick and claim a topic
Open `shorts/TOPICS.md`, take the first topic under **Queue**, move it to **Done** with today's date and the folder name, then commit and push that change right away, so the other daily runs don't pick it too.
Prefer tragic, emotional stories with a famous name (see `shorts/research-40k-shorts.md`). Never repeat a topic in **Done**.

## 2. Research (mandatory)
- **Lore:** WebSearch (standard) for the story beats, dates and names. Use only facts most sources agree on, and keep disputed ones out of the script.
- **Reference art for EVERY character (owner's rule):** before drawing anyone, find real pictures (painted miniatures, official art) and LOOK at them. Download a few images with curl into the scratchpad and open them with Read. Write down the colour scheme and signature gear (helmet shape, pauldron heraldry, weapons, horns, claws, cloaks, icons). For example, the Lamenters' shoulder pad is checkered all over with a red heart, not a small shield.
- Characters must be **instantly recognizable**: give each one its signature details in every panel where it appears.

## 3. Build
1. Copy the newest short folder as the template: `cp -r shorts/vanished shorts/<slug>` (then delete `voice/`, `out/`, `events.json`, `*.mp4`, `*.srt`, `poster.jpg`).
2. `lines.json`: 9–10 short lines, 45–55 s in total. The first line is a hook with the big name, and the last line lands the emotion.
3. Voice: `python3 shorts/voice_el.py shorts/<slug>` (ElevenLabs "James"; the key is added by the proxy). Read `voice/dur.json`.
4. `chapter.js`: six medallion scenes, read bottom to top (index 0 = bottom, 5 = the larger top one). Reuse the rigs: `MARINE` (`marine()` builder, with palette keys `arm/arm2/helm/pauld/knee/rim/trim/cloth/lens`, and heraldry painted via `op.mark`), `SON2`, `FATHER2`, `ANGEL`, `GUARD` (cadia.js), the daemon and the Tyranid (`shorts/lamenters/lamenters.js` has `gaunt`). Add new signature parts as rig parts (see the horns, claws and helms there).
5. `story.js`: put the `LINES` times on the measured durations (about 0.6–1.0 s gaps). There are 6 camera stops (medallion y: 1500, 1170, 840, 510, 180, -230), and the title scroll is at -22 at the start. Key moments go in `T`, the sound cues in `EV`. Set `DUR` to about 54.
6. Change the title text in `win.js` (scroll), `film.js` and `index.html`, and the cue times in `music/score.py` (synthesized score, no samples).
7. Check stills: `node tools/film.js $PWD stills 3,10,20,30,40,47 <scratch-dir>` and LOOK at every panel. Fix overlaps, figures that are too small, and characters that aren't recognizable. Repeat until it's right.

## 4. Render (≈30–40 min; run in the background, don't run two renders at once)
```sh
cd shorts/<slug> && mkdir -p out
python3 music/score.py
node tools/film.js $PWD video $PWD/out/video.mp4 24     # also writes events.json
python3 mix.py                                          # printed levels: voice must sit above music in every line
ffmpeg -y -v error -i out/video.mp4 -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest <slug>.mp4
ffmpeg -v error -y -ss 46 -i <slug>.mp4 -frames:v 1 -q:v 3 poster.jpg
```
Then `python3 tools/srt.py <slug>` for the captions, and update `CREDITS`.

## 5. Upload text (the best for views)
Add a section to `shorts/UPLOADS.md` with:
- **Title:** under 70 characters. A big name or hook in CAPS, plus an emotion word or curiosity gap, one emoji, ending in `#warhammer40k`. Examples: "ANGRON's Story Is the SADDEST in 40k 💔", "A Whole Chapter VANISHED... Then THESE Appeared 🔥".
- **Description:** 2–3 short lines that tease the story without the ending, a question that invites comments 👇, and 5 hashtags (`#warhammer40k`, 2–3 topic tags, `#shorts`).
- **Suggested upload:** the date plus this run's slot (Italy time): run 1 → 13:30, run 2 → 18:30, run 3 → 21:30.

## 6. Deliver
- Commit everything except the video (`*.mp4` and `out/` are gitignored), then `git pull --rebase origin claude/youtube-banner && git push -u origin claude/youtube-banner`.
- Send `<slug>.mp4` to the owner with SendUserFile (status `proactive`).
- Reply in a few lines: the title, the description and the upload time.
