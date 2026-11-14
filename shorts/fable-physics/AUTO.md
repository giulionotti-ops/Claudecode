# Daily auto job: make one Fable Physics short

`daily.sh` runs this with `claude -p` (cron, twice a day) whenever fewer than 4 shorts are waiting to post.
After Claude finishes, `daily.sh` runs the uploader, which puts every approved `uploader/queue.json` entry into the
next free slot (13:30 or 21:30 Rome). Stop at once if `fable-physics/PAUSE` exists.

## Your task (Claude, headless run). Work from `/root/physics-channel/shorts/` (all paths below are relative to it).

### Keep the run lean (every step re-reads the whole run, so fewer and smaller steps cost less)
- Don't search the disk for files: the paths here are exact.
- Copy engine files with `cp`; don't print them. Read only what you will change: find it with `grep -n`, then read just those lines (`sed -n 'A,Bp'`). Never `cat` a whole `main.js`, `world.js` or `creatures.js`.
- Run long commands (`build.sh`, `voice_ts.py`, stills) once in the foreground with a long timeout (up to 30 min is allowed). Don't background them and don't poll with sleep loops.
- Batch related shell commands into one call.
Make the next short, add it to the queue, commit and push. One short per run.

### 1. Pick what to make
Read `fable-physics/README.md` (channel rules), `fable-physics/creatures.json` (catalogue) and `fable-physics/uploader/queue.json` (done).
- If a creature has an intro short (`"intro"` set) but no physics short yet, make its **physics** short.
- Otherwise pick a new creature, alternating: if the last queued short was about a familiar creature, pick a less known one (`"familiar": false`), and the other way round. Spread cultures: don't pick the same region twice in a row.
- A less known creature's first appearance is an **intro** short. A familiar creature goes straight to a physics short.
- You may add creatures to `creatures.json`. **Don't** use gods, or beings that are sacred in living traditions (for example the Rainbow Serpent, the Thunderbird, the Wendigo). Folklore creatures are fine. Tell each legend with respect, name the culture it comes from, and never mock it.

### 2. Two formats (both 45–60 s, vertical, the same look)
- **Physics short** (like `kraken/`, `dragon-flight/`): problem → fix → new problem, 4–5 links, every fix anchored on a real animal, ending on a twist that explains something about the legend. If the creature already had an intro short, the first line can say "Last time you met the X."
- **Intro short** ("Meet the X"): who tells this story (country, people, era), what the creature looks like and does in the legend, the strangest detail, and one real animal that may have inspired it (only if a source says so). End with a teaser line such as "Could it actually work? Find out next." First chip: the place, e.g. `JAPAN · FOLKLORE`. Show the creature in its home landscape.
- Hook in the first 2 s. About 140–160 words. Plain spoken English.

### 3. Check the facts
Every claim (biology, physics, legend) needs a source. Don't search the web yourself: hand the research to one cheap helper with the Agent tool (`model: "haiku"`, `subagent_type: "general-purpose"`). Give it the creature, its culture and your list of claims, and ask for: the legend's key facts with sources, 4–5 real-animal anchors, and for each claim a URL and a one-line quote, or "no source". Prefer encyclopedias, museums, university pages, papers. Check its answer makes sense; fetch a page yourself only to settle a doubtful claim. List the sources and the real-animal anchors in `shorts/<slug>/TREATMENT.md`. If you can't source a claim, cut it.

### 4. Build it in a new folder `shorts/<slug>/`
Slug: `<creature>` for a physics short, `<creature>-intro` for an intro. Copy the engine from `kraken/`: `index.html`, `overlay.js`, `mix.py`, `master.sh`, `build.sh`, `export_srt.py`, `voice_ts.py`, `fonts/`, `.gitignore`; rename the output in `build.sh` and `export_srt.py`.
- **Voice:** write `script.txt`, then `set -a; . /root/.api-keys.env; set +a; python3 voice_ts.py` (ElevenLabs "Liam", one take, about 1,000 characters).
- **Picture:** write `main.js` (+ a creatures/world file) with scenes timed on `voice/words.json`, exactly like `kraken/main.js`: one-word captions (Lilita One), gold-outlined label chips, arrows, check/cross marks, cutaways or gauges where they help. Build creatures in code in the low-poly style (`kraken/creatures.js`, `fable-physics/brand-lab/beasts/beasts.js` show how: icosahedrons, cones, tapered tubes, flat shading). A CC0/CC BY model is fine if you can fetch it (credit it in `CREDITS`); don't get around bot checks.
- **Sound:** adapt `mix.py` (score mood to the creature's world, foley for the events in `window.EV`).
- **Test stills first:** `cd ~/lemo-opuscar && LEMO_ANGLE=swiftshader node core/render/still.mjs <folder> <t1> <t2> ... --size 540x960 --out <scratch>`; look at every scene and fix framing before the full render.
- **Render:** `sh build.sh` (about 8–10 min). It writes `<slug>.mp4` and `<slug>.srt`. Also save `poster.jpg` (one strong frame).

### 5. Quality gate. Fail the run (write why in `shorts/<slug>/FAILED.md`, commit it, don't queue) unless all hold:
- 45–60 s, 1080×1920, audio present, loudness about −14 LUFS (`ffprobe`, the `master.sh` printout);
- a contact sheet of about 12 frames from the final mp4 (`ffmpeg -ss`) shows: the creature clearly visible in every scene, no chip over a caption or a face, every word spelled right, nothing cut off;
- every fact is in `TREATMENT.md` with a source.
Fix and re-render at most twice.

### 6. Queue it
Append to `fable-physics/uploader/queue.json`:
`{"name": slug, "video": "<slug>/<slug>.mp4", "captions": "<slug>/<slug>.srt", "title", "description", "tags": [6–8], "pinned", "approved": false}`
Always `"approved": false`: the owner approves each short before it is posted (`upload.py approve <slug>`), unless the file `fable-physics/AUTO_APPROVE` exists.
- Title: under 70 characters, one CAPS word, one emoji, ends with `#shorts` (see the existing entries).
- Description: 2–3 sentences, then a question for comments, then hashtags. Intro shorts also name the culture.
Set the creature's `"intro"` or `"physics"` in `creatures.json`. Add a row to the table in `fable-physics/README.md`.

### 7. Commit and push
Commit the new folder and the JSON/README changes (never keys, `token.json`, `client_secret.json`, `out/`). Then `git push -u origin HEAD`.
Do NOT upload to YouTube yourself; `daily.sh` does it.

End with a 3-line summary: what you made, the title, anything you skipped or could not source.
