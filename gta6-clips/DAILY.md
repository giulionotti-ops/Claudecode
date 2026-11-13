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
4. **Post or ask.** Read `approvals.json`.
   - `"auto_post": true` (on since 2026-11-13): add the top picks to
     `approvals.json` as approved (`date`, `streamer`, `file` = the rendered
     mp4 path relative to gta6-clips, `title`, `youtube_title`, `score`,
     `approved: true`, `by: "auto"`), max 1 per day (2 a day Nov 19-25),
     then run `python3 uploader/upload.py post <date>`. Send the owner a
     short report: what was posted (links), what was skipped and why.
   - `"auto_post": false`: send the owner each rendered short with its
     description (SendUserFile, status proactive) and wait for approval.
   Either way, list the best NEEDS PERMISSION moments by streamer, so the
   owner knows who to ask.
5. **Record** every decision in `approvals.json` (and uploads land in
   `posted.json`), commit and push.
6. **Titles.** `youtube_title`: the hook, 40-70 characters, plus `#Shorts`;
   name the streamer and game when known (e.g. "xQc can't believe this GTA
   crash #Shorts"). Never clickbait beyond what the clip shows.
