# Daily clipping routine

Run by the daily scheduled task (a fresh cloud session each day). Follow
`CLIPPING_RULES.md` and the `viral-moments` skill throughout.

1. **Scan.** `cd gta6-clips && python3 daily_clips.py --model base`
   (yesterday, UTC). Read `daily/<date>/sheet.md`.
2. **Score.** Each clip is one candidate. Score it with the viral-moments
   rubric (hook, reaction, payoff, shareability), trim to its best 15-45 s
   span, rerank across all clips. Check 2-3 frames of the top picks; fill in a
   missing facecam box (`x:y:w:h`) and add it to `streamers.json`.
3. **Render only APPROVED streamers** (`"approved": true` in
   `streamers.json`): write `daily/<date>/shorts.json` (`"text": false`,
   `facecam`, `credit`, `credit_url` = clip URL, `title` = hook idea for the
   description) and run `python3 make_short.py daily/<date>/shorts.json
   --out daily/<date>/out`. Never render or post a NEEDS PERMISSION clip.
4. **Ask for approval.** Send the owner each rendered short with its
   description (SendUserFile, status proactive) and a short list: streamer,
   views, score, why it could go viral. Also list the best NEEDS PERMISSION
   moments by streamer, so the owner knows who to ask. Then wait.
5. **Record the answer** in `approvals.json` (one entry per short: date,
   streamer, clip URL, score, approved true/false, owner's note), commit and
   push. Approved shorts are posted by the owner during the approval phase.
6. **Posting mode.** `approvals.json` → `"auto_post"`. While false, never
   post. It turns true only when the owner says so (asked after one week).
