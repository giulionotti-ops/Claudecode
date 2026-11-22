# Plan: a fully automated Glazier of Terra channel

The goal: Claude runs on a VPS, makes three shorts a day, posts them, reads the analytics, and adjusts topics and style toward the most views and revenue.

## 1. The daily loop

```
06:00  ANALYSE  pull yesterday's stats (YouTube Analytics API) → update topic scores
06:30  PLAN     choose 3 topics (best performers + some exploration) → write 3 scripts
07:00  MAKE     per short: voice (ElevenLabs) → scenes → render → score/mix → master
10:00  CHECK    automatic quality gates (below); failures are fixed or skipped
10:30  POST     upload with titles/descriptions/tags/captions, scheduled for 15:00 / 19:00 / 23:00
```

Cron runs one command per stage: `claude -p "<stage prompt>"` in the repo, so every step is logged and can be retried.

## 2. The pieces to build

| Piece | What it does | Status |
|---|---|---|
| **Episode template** | One shared engine; an episode is just `lines.json`, scenes and a timeline. Today each film copies the engine | to build first |
| **Scene library** | Reusable glass figures (Emperor, Primarchs, Marines, Guard, daemons, ships, planets) and scene types (duel, fall, crowd, map, throne). New stories mostly reuse them | partly built (4 films' worth) |
| Script writer | Topic → 10-line script, 45–55 s, hook in the first line, lore checked against the Lexicanum wiki | prompt + check |
| Voice | ElevenLabs "James", plus a speech-to-text check | built (`voice_el.py`) |
| Render | Picture, score, foley, mix, master | built (per film) |
| Quality gates | Speech-to-text match, subtitle reading time, loudness, black frames, a contact sheet Claude reviews | built (manual today) |
| Uploader | YouTube Data API: upload, captions, `publishAt` scheduling | to build |
| Analytics | YouTube Analytics API: views, average view duration, % viewed, swipe-away rate, subs gained per video | to build |
| Planner | Scores topics, title styles, hooks, colors and lengths by results; 80% best-known, 20% new experiments | to build |

## 3. How it learns
- **What it tracks per short:** topic, character, emotion (sad / epic / funny), title style, hook type, length, color, post time.
- **Its main signals:**
  - percentage viewed and the share of viewers who keep watching instead of swiping away (for Shorts these matter most);
  - views at 48 hours;
  - subscribers gained per 1,000 views.
- **Every Sunday:** it compares the categories and shifts the next week's mix toward the winners, always keeping about 20% experiments so it doesn't get stuck.
- **Revenue:** once monetized, it adds RPM (revenue per 1,000 views) per topic from the Analytics API and optimizes views × RPM.

## 4. What you need

| Item | Notes | Rough cost |
|---|---|---|
| VPS with a GPU | Rendering takes ~20 min per short on CPU here. With a GPU, 3 per day fit comfortably. Any Linux GPU server works | ~$50–150/month |
| Claude | Each short is real agent work (script, scenes, review). Three a day needs a high plan (Max) or API billing | check current plans |
| ElevenLabs | ~45k characters a month for 3/day, plus a commercial licence | check current plans |
| Google Cloud project | YouTube Data API + Analytics API, with an OAuth login once on the VPS | free |
| **YouTube API audit** | Until Google audits the app, every API upload is **forced to private**. Apply early; it takes weeks | free |

API quota: an upload costs about 1,600 of the default 10,000 daily units, so 3 a day fits.

## 5. Risks, and how the plan handles them
- **"Inauthentic content" (YouTube can refuse to pay mass-produced channels):** vary stories, scene types and formats; no copy-paste episodes; quality gates stay strict.
- **Wrong lore:** the 40k audience is unforgiving. Facts get checked against the Lexicanum wiki before voicing.
- **Games Workshop IP:** no official art or logos; keep the fan-work line in every description.
- **AI backlash:** the handmade look and a natural voice help. Never claim it's hand-drawn.
- **Runaway costs or bad uploads:** daily caps on API spend, plus a "pause" file the bot checks before posting.

## 6. Recommended rollout
1. **Week 1–2:** build the episode template and scene library; you still upload by hand from `UPLOADS.md`-style sheets.
2. **Week 3:** the VPS makes 3 per day automatically; you approve each in a 2-minute review (a link per short); the uploader posts approved ones.
3. **After the API audit and 2–3 weeks of good results:** turn off the approval step; the analytics loop starts steering.
4. **After monetization:** add revenue (RPM) to the scoring.

Keeping the approval step for the first weeks is strongly recommended: one bad lore error or policy strike costs more than the time saved.
