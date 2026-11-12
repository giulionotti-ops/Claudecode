---
name: viral-moments
description: Pick the moments of a Twitch stream or gameplay video most likely to go viral as Shorts, then turn the picks into a render config. Use when the owner says to start clipping, asks "what should we clip", "find the viral moments", "best moments of this VOD", or gives a stream/VOD to clip. Builds a moments sheet with gta6-clips/viral_moments.py (local transcript + loudness/scene energy), scores it with the rubric below, reranks across the whole video, and checks frames before rendering.
---

# Viral moments

Method inspired by SupoClip (github.com/FujiwaraChoki/supoclip, AGPL-3.0):
transcript-driven span picking, four-part virality score, overlapping windows,
then one comparative rerank. Rewritten from scratch for gaming streams; no code
or prompt text is copied. Scoring is done by you in the session, so no API key
is needed.

Always follow `gta6-clips/CLIPPING_RULES.md` (wait for the go, Twitch only with
permission, facecam on top, no text on screen).

## 1. Build the moments sheet

```bash
cd gta6-clips
python3 viral_moments.py --url https://www.twitch.tv/videos/<id> --section 1:00:00-1:30:00
# or a local file: python3 viral_moments.py footage/<file>.mp4
```

Sections of 20-40 min work best (transcription runs about 3-5x faster than
real time on CPU with the default `small` model). Read
`analysis/<name>.moments.md`. Each line is `[start-end] energy-marker score text`.
Spike lines are loud or hectic moments nobody spoke over.

## 2. Score candidates, one window at a time

In each window pick the 3-5 strongest spans. A span is one continuous stretch,
15-45 s (sweet spot 20-35 s). Never stitch distant moments together. Score each
on four parts, 0-25 each, total 0-100:

1. **Hook (first 2 s).** Does the opening frame and line stop the scroll on
   its own? 20-25: something is already happening (crash mid-air, streamer
   screaming, cops swarming, a bold line like "watch this"). 10-19: builds fast.
   0-9: slow walk-up, menu, loading, calm chat reading.
2. **Reaction.** How strong is the streamer's emotion? 20-25: genuine scream,
   laughing fit, rage, stunned silence then outburst. 10-19: clear reaction.
   0-9: flat commentary. Energy `!!`/`!!!` lines plus excited words are the tell.
3. **Payoff.** Does something actually happen and land? 20-25: clean
   setup-tension-payoff (the plan, the chaos, the result), clutch escape, absurd
   physics, perfect timing fail. 10-19: payoff present but soft. 0-9: no
   resolution, cut off before the punchline.
4. **Shareability.** Would a viewer send it or rewatch it? 20-25: "you have to
   see this", loops cleanly, relatable fail, a "did GTA 6 really do that"
   detail. 10-19: fun once. 0-9: needs stream context or inside jokes.

Rules while scoring:
- Use only what the sheet shows. Never invent what happened between lines.
- Start where a stranger understands it: not mid-sentence, not on "so", "and",
  "he", "that", or a reply to something off-clip. Include the setup line if the
  payoff needs it.
- End right after the payoff lands (the laugh, the "NO WAY", the crash). Cut
  the cool-down.
- Skip: intros, BRB/starting soon, ads, sponsor reads, menus, loading screens,
  chat-reading, donation alerts, music the streamer can't own (Content ID).
- A loud spike with no speech can still be the best clip: score it on hook and
  payoff, then confirm on frames.
- Prefer fewer strong picks over filling a quota.

## 3. Rerank across the whole video

Window scores are not comparable. Put all candidates side by side and give one
best-first ranking with comparative scores: the best should land 80-95, weak or
context-dependent ones below 50. Drop duplicates (same moment from overlapping
windows: keep the better-bounded one).

## 4. Check frames before presenting

For the top picks, extract 3 frames (start, peak, end) and look at them:

```bash
ffmpeg -v error -ss <sec> -i <video> -frames:v 1 -vf scale=640:-1 <scratch>/f_<sec>.png
```

Reject picks where the picture is a menu, black screen, BRB slate, or the
action is off-screen. While there, find the facecam box (x:y:w:h in source
pixels) and which side of the game the action is on (`game_x`).

## 5. Present, then render on approval

Give the owner the top 2-4 picks: timestamp in the VOD (add the section
offset from the sheet header), score breakdown, and one line on why it could
go viral. Wait for their pick. Then write a config (`text: false`, `facecam`,
per-short `start`/`end`/`game_x`, `credit`, `credit_url`) and render:

```bash
python3 make_short.py <config>.json
```

Put the hook idea in `title`: it is not burned in (no text on screen), but it
goes into the description `.txt`.
