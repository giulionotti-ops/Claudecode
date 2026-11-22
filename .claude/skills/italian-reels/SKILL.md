---
name: italian-reels
description: Make Italian Instagram reels in the blocky 3D cartoon referral style (invite code B2601MNRKTZ348, UniCredit Buddy). Use when the user asks for a new reel, a new episode/script, or changes to the reels engine in reels/.
---

# Italian blocky-3D reels

Everything lives in `reels/` (read `reels/README.md` first).

1. Write `reels/episodes/<slug>/script.json` (copy `episodes/gta6-buddy/script.json`). Hook in the first line (a trending event/product + price), then: friend gives code → open account with code by the deadline → spend with card → bonus arrives → the punchline (money math) → friend also earns → end card. 30–40 s, ~95–110 words, Italian, casual "io" voice.
2. Numbers: caption in `text` ("79,99€"), pronunciation in `say` ("settantanove e novantanove").
3. `bash tools/make.sh <slug> --preview`, then look at `build/preview.jpg`; fix framing/cues; then `bash tools/make.sh <slug>`.
4. Check the final video: contact sheet + listen check (ElevenLabs STT on `out/<slug>.mp4` should match the script).
5. Deliver `out/<slug>.mp4` and `out/<slug>.txt` (post text) to the user.

Keep: "Pubblicità" label, personal-code disclosure, current offer terms (verify on the bank's site), no logos or other creators' branding.

## Always (user rule)
Every reel is made with the `viral-hooks` and `viral-instagram-reels` skills:
1. `viral-hooks`: write 6+ hooks across 3+ archetypes, pick one; first spoken word = most interesting word; 3-5 word on-screen text from frame 1.
2. `viral-instagram-reels`: structure for sends (CTA = "Mandalo a [specific person]"), caption keyword in line 1, 3-5 hashtags.
3. Before delivering, run `viral-hooks/assets/hook-checklist.md` and `viral-instagram-reels/assets/reels-hook-checklist.md` on stills of the first 3 seconds; fix every fail (text out of top/bottom fifth, topic legible on mute, picture matches the hook). Report the checklist result to the user.
4. For explainer reels, follow `docs/viral-explainer-lessons.md` (paradox hook, correct a wrong belief, step-by-step mechanism with live numbers, sourced facts, flip ending, named-persona send CTA, seamless loop).
