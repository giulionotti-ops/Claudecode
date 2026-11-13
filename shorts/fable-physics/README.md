# Fable Physics

Creature-science shorts: one mythical creature per short, worked out with real biology and physics, as a "problem → fix → new problem" chain (45–60 s, vertical, Lemo-Opuscar + three.js).

## Rules for new shorts
- **Vary the creatures.** Not only dragons: kraken, griffin, phoenix, unicorn, yeti, basilisk, hydra, mermaid, werewolf, giant spider, kitsune and so on.
- **Use other models** that fit the creature, not just the Quaternius dragon. Only CC0 or CC BY (credit CC BY in `CREDITS`).
- **Sources that work from the cloud session:** GitHub-hosted copies of CC0 packs (raw.githubusercontent.com), Khronos glTF sample models, three.js example models (MIT), Poly Haven. poly.pizza sits behind a bot check: don't try to get around it; find a GitHub copy or ask the user to download the file.
- **Every fact anchored on a real animal**, listed in the short's `TREATMENT.md`.
- Same look: one-word captions (Lilita One), gold-outlined label chips, arrows, cutaways, Liam voice (ElevenLabs).
- Posting: two shorts per day, 13:30 and 21:30 Rome, done by `uploader/upload.py` from cron (`daily.sh`, 09:23 and 17:23). A new short goes live by adding it to `uploader/queue.json`. Pause with `touch PAUSE` in this folder. The upload page is https://claude.ai/artifact/VuPz6mKvGiaifhQsbrnTsa

## Shorts
| # | Folder | Creature |
|---|---|---|
| 1 | `../dragon-eggs` | dragon (eggs in a volcano) |
| 2 | `../dragon-flight` | dragon (how it flies) |
| 3 | `../kraken` | kraken (giant squid: buoyancy, oxygen, eyes) |
