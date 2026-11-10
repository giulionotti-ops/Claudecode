# How to make one Glazier of Terra short (for the daily scheduled sessions)

One run = one finished short (about 50 s, 1080×1920) in the stained-glass lancet style, plus its upload title, description and time.
Keep replies to the user short (CLAUDE.md).

## 0. Setup
In a scheduled run, FIRST call the `add_repo` tool (owner `giulionotti-ops`, repo `claudecode`, access `push`); without it every push is refused with 403.
```sh
cd <repo>; git fetch origin claude/youtube-banner && git checkout claude/youtube-banner && git pull --rebase origin claude/youtube-banner
bash shorts/setup.sh    # ffmpeg, Node + Playwright/Chromium, Python audio libs (skips what's installed)
```
The Lemo-Opuscar library is NOT used (running it is blocked). Everything runs from the short's own folder with `tools/film.js`.

## 1. Pick and claim a topic
Read `shorts/PERFORMANCE.md` first, refresh its numbers from the channel feed, and write the short to the formula that is working.
Open `shorts/TOPICS.md`, take the first topic under **Queue**, move it to **Done** with today's date and the folder name, then commit and push that change right away, so the other daily runs don't pick it too.
Prefer tragic, emotional stories (see `shorts/research-40k-shorts.md`). Mix famous names with **little-known stories, as long as they are canon** (codexes, Imperial Armour books, Black Library novels and short stories, Warhammer Community articles). Never use fan fiction or fan theories presented as fact. Never repeat a topic in **Done**. You may add new canon topics to the queue.

## 2. Research (mandatory)
- **Lore:** WebSearch for the story beats, dates and names, and name the canon source (book, codex or article) for each beat in the commit message. Use only facts most sources agree on, and keep disputed ones out of the script.
- **Fandom wiki:** the normal pages are blocked, but its API works: `curl -s "https://warhammer40k.fandom.com/api.php?action=parse&page=<Page_Name>&prop=wikitext&format=json"` (its pages cite the canon books).
- **Blocked sources:** Lexicanum sits behind a Cloudflare bot check and can't be read from here; don't try to get around it. Warhammer Community works. If you can't confirm a story is canon, pick another topic, and tell the owner in your final reply which pages were blocked.
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
- **Title:** under 70 characters. A big name or hook in CAPS, plus an emotion word or curiosity gap, one emoji, ending in `#warhammer40k`. Examples: "ANGRON's Story Is the SADDEST in 40k 💔", "A Whole Chapter VANISHED... Then THESE Appeared 🔥".
- **Description:** 2–3 short lines that tease the story without the ending, a question that invites comments 👇, then 5 hashtags (`#warhammer40k`, 2–3 topic tags, `#shorts`).
- **Pinned comment:** one line that starts an argument or asks for a theory, with one emoji.
- **Upload slot:** two shorts a day, at **15:30** and **18:30** Italy time. Run 1 of the day takes today's 15:30, run 2 takes today's 18:30; if that time is already past or taken in `shorts/board/shorts.json`, take the next free slot. Write New York time next to it (Italy minus 6 h), e.g. `Tue 10 Nov · 18:30 Rome / 12:30 New York`. Add one line of notes (the pinned comment still has to be added by hand).
Also add the same text as a section in `shorts/UPLOADS.md`.

## 5b. Upload to YouTube, scheduled
```sh
python3 shorts/yt_upload.py shorts/<slug>/<slug>.mp4 --title "<title>" --desc "<description>" --at "YYYY-MM-DD HH:MM" --srt shorts/srt/<slug>.srt
```
`--at` is the slot in Italy time. The video goes up private and turns public at that time; it is marked as synthetic content (AI voice) and not made for kids. Put the printed video id and URL in the board entry (`youtube`) and in UPLOADS.md. If it fails (missing token, quota, refresh error), don't retry in a loop: finish the rest, and tell the owner in the final reply that the short needs a manual upload.

## 6. Add it to the shorts board (the owner's page)
The board is the artifact https://claude.ai/artifact/J3i4eEL1Go3LYtBF4HqkqB, built from `shorts/board/` (index.html, shorts.json, videos/, posters/).
1. `n` = the highest `n` in `shorts/board/shorts.json` + 1. Use two digits `NN` in file names.
2. Full quality for the download button: `cp shorts/<slug>/<slug>.mp4 shorts/videos/NN-<slug>.mp4` (this folder is NOT gitignored, so it gets committed).
3. Preview (the page only holds files up to 15 MB): `ffmpeg -y -v error -i shorts/<slug>/<slug>.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -crf 28 -c:a aac -b:a 96k -movflags +faststart shorts/board/videos/NN.mp4`, and the poster: `ffmpeg -v error -y -i shorts/<slug>/poster.jpg -vf scale=540:-1 -q:v 4 shorts/board/posters/NN.jpg`.
4. Append an entry to `shorts.json`: `n, name, folder, title, description, pinned, when, notes, made` (today), `poster: "posters/NN.jpg"`, `video: "videos/NN.mp4"`, `download: "https://github.com/giulionotti-ops/Claudecode/raw/claude/youtube-banner/shorts/videos/NN-<slug>.mp4"`, and `size_mb` (the full file's size).
5. Keep the page small: when more than 18 entries have a `video`, remove `video` from the oldest ones (their download button stays) and pass those preview paths as `null` in `files` below.
6. Commit and push (step 7) BEFORE publishing, so the download link works. Then `Artifact` action `read` on the URL, then publish with `url` = that URL, `file_path: shorts/board/index.html` and `files` = only the changed ones: `{"shorts.json": "shorts/board/shorts.json", "videos/NN.mp4": "shorts/board/videos/NN.mp4", "posters/NN.jpg": "shorts/board/posters/NN.jpg"}`. Files you leave out are kept.

## 7. Deliver
- Commit everything (the short's own `*.mp4` and `out/` are gitignored; `shorts/videos/` is not), then `git pull --rebase origin claude/youtube-banner && git push -u origin claude/youtube-banner`.
- Send `<slug>.mp4` to the owner with SendUserFile (status `proactive`).
- Reply in a few lines: the title, the upload time and the board link.
