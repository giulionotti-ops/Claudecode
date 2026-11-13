# Daily auto job: make one comic short

`daily.sh` runs this every morning (cron, 09:00 Rome) with `claude -p`. After Claude finishes, `daily.sh`
uploads every entry in `uploader/schedule.json` that is not in `uploader/uploaded.json` yet.

## Your task (Claude, headless run)
Make the next 40k comic short and add it to `uploader/schedule.json`. Work from `shorts/`.

1. **Pick a topic.** Read `comic/README.md` (format + channel rules), `research-40k-shorts.md` (what wins) and
   `comic/board/shorts.json` + `comic/uploader/schedule.json` (what's done). Choose a topic not done yet.
   Reuse the recurring cast (rookie, sarge, commissar, Orks) when it fits. Mix funny with sad.
2. **Check the lore** on the Lexicanum wiki (wh40k.lexicanum.com). Fan jokes are labelled as fan jokes.
3. **Build the short** in a new folder `shorts/<slug>/`, copying the structure of `red-wunz/`
   (`script.json`, `page1.txt`, `page2.txt`, `shots.py`) and running the commands in `red-wunz/README.md`.
   - Gemini pages: at most 2 pages plus at most 2 redraws per run (cost cap ~$0.60).
   - Look at the generated art before placing bubbles. If a character is drawn wrong, recast the line
     before paying for a redraw.
4. **Quality gate.** Render the contact sheet (`render.py --sheet`) and look at it. Then render the video. Fail the run
   (and write why in `shorts/<slug>/FAILED.md`) unless all of these hold:
   - 45–60 s, 1080×1920, audio present (`ffprobe`);
   - every bubble readable, no text over faces, spelling correct;
   - hook in the first 2 s, punchline in the last 3 s.
5. **Write `shorts/<slug>/README.md`** like `red-wunz/README.md`: title, description, pinned comment.
   The description MUST have a `📜 THE LORE` section (3–5 bullets) per `comic/README.md`.
6. **Schedule it.** Append to `comic/uploader/schedule.json`:
   `{"name": slug, "video": "../../<slug>/<slug>.mp4", "captions": "../../<slug>/<slug>.srt",
     "publish": "<next day with no entry> 21:30", "title", "description", "tags": [8 tags], "pinned", "synthetic": true}`.
   Also append it to `comic/board/shorts.json` in the same shape as the existing entries.
7. **Commit** the new folder and the JSON changes (no keys, no `token.json`). Don't push.

Do NOT upload yourself; `daily.sh` does it. Stop if `comic/PAUSE` exists.
