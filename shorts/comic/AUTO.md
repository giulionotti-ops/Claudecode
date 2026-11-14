# Daily auto job: make one comic short

`daily.sh` runs this every morning (cron, 09:00 Rome) with `claude -p`. After Claude finishes, `daily.sh`
uploads every entry in `uploader/schedule.json` that is not in `uploader/uploaded.json` yet.

## Your task (Claude, headless run)
Make the next 40k comic short and add it to `uploader/schedule.json`. Work from `shorts/`.

1. **Pick a topic.** Read `comic/README.md` (format + channel rules), `research-40k-shorts.md` (what wins) and
   `comic/board/shorts.json` + `comic/uploader/schedule.json` (what's done). Choose a topic not done yet.
   Reuse the recurring cast (rookie, sarge, commissar, Orks) when it fits. Mix funny with sad.
   Use the `viral-short-form-ideas` skill to shortlist 3 angles and pick the one with the clearest stake.
2. **Check the lore** on the Lexicanum wiki (wh40k.lexicanum.com). Fan jokes are labelled as fan jokes.
3. **Write the hook and script with the viral skills.** Read `../.claude/skills/viral-hooks/assets/hook-checklist.md`
   and `../.claude/skills/viral-youtube-shorts/assets/shorts-vvsa-checklist.md`. Write 3 hooks of different archetypes,
   keep the one that passes the hook checklist. Panel 1's first line lands inside ~1.5 s; escalation around 5–8 s;
   the last beat loops back to the first panel. Put a 3–5 word on-screen hook in `shots.py`:
   `HOOK = {'text': '...', 'until': 2.5, 'y': 0.27}` (sharpens the spoken line, does not repeat it; move `y`
   between 0.22 and 0.75 so it covers no face or bubble; never above 0.2).
4. **Build the short** in a new folder `shorts/<slug>/`, copying the structure of `red-wunz/`
   (`script.json`, `page1.txt`, `page2.txt`, `shots.py`) and running the commands in `red-wunz/README.md`.
   - Gemini pages: at most 2 pages plus at most 2 redraws per run (cost cap ~$0.60).
   - Look at the generated art before placing bubbles. If a character is drawn wrong, recast the line
     before paying for a redraw.
5. **Quality gate.** Render the contact sheet (`render.py --sheet`) and look at it. Then render the video. Fail the run
   (and write why in `shorts/<slug>/FAILED.md`) unless all of these hold:
   - 45–60 s, 1080×1920, audio present (`ffprobe`);
   - every bubble readable, no text over faces, spelling correct;
   - hook in the first 2 s, punchline in the last 3 s;
   - the first six VVSA items pass (first frame is the hook, on-screen hook text on frame 1, no intro, payoff delivered);
   - the hook text (first contact-sheet tile) covers no face or bubble.
6. **Write `shorts/<slug>/README.md`** like `red-wunz/README.md`: title, description, pinned comment.
   The description MUST have a `📜 THE LORE` section (3–5 bullets) per `comic/README.md`.
   Write title, first description line, pinned comment and hashtags with `viral-captions-and-ctas`
   (`assets/caption-template.md`, `cta-picker.md`, `bait-check.md`): title under 60 chars with a concrete stake,
   first line works alone, one send/comment CTA that is not engagement bait, 3–5 hashtags incl. #warhammer40k #shorts.
7. **Schedule it.** Append to `comic/uploader/schedule.json`:
   `{"name": slug, "video": "../../<slug>/<slug>.mp4", "captions": "../../<slug>/<slug>.srt",
     "publish": "<next day with no entry> 21:30", "title", "description", "tags": [8 tags], "pinned", "synthetic": true}`.
   Also append it to `comic/board/shorts.json` in the same shape as the existing entries.
8. **Commit** the new folder and the JSON changes (no keys, no `token.json`). Don't push.

Do NOT upload yourself; `daily.sh` does it. Stop if `comic/PAUSE` exists.
