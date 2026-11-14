# Fable Physics

Creature-science shorts: one mythical creature per short, worked out with real biology and physics, as a "problem → fix → new problem" chain (45–60 s, vertical, Lemo-Opuscar + three.js).

## Rules for new shorts
- **Vary the creatures.** Not only dragons: kraken, griffin, phoenix, unicorn, yeti, basilisk, hydra, mermaid, werewolf, giant spider, kitsune and so on.
- **Use other models** that fit the creature, not just the Quaternius dragon. Only CC0 or CC BY (credit CC BY in `CREDITS`).
- **Sources that work from the cloud session:** GitHub-hosted copies of CC0 packs (raw.githubusercontent.com), Khronos glTF sample models, three.js example models (MIT), Poly Haven. poly.pizza sits behind a bot check: don't try to get around it; find a GitHub copy or ask the user to download the file.
- **Every fact anchored on a real animal**, listed in the short's `TREATMENT.md`.
- Same look: one-word captions (Lilita One), gold-outlined label chips, arrows, cutaways, Liam voice (ElevenLabs).
- **Fully automatic:** `daily.sh` (cron 04:17 and 15:17) has Claude make new shorts by `AUTO.md` while fewer than 4 are waiting, then `uploader/upload.py` posts two a day, 13:30 and 21:30 Rome. Creature catalogue: `creatures.json` (all cultures; less known creatures get a "Meet the X" intro short first). Logs: `logs/`. Pause with `touch PAUSE` in this folder. The upload page is https://claude.ai/artifact/VuPz6mKvGiaifhQsbrnTsa

## Shorts
| # | Folder | Creature |
|---|---|---|
| 1 | `../dragon-eggs` | dragon (eggs in a volcano) |
| 2 | `../dragon-flight` | dragon (how it flies) |
| 3 | `../kraken` | kraken (giant squid: buoyancy, oxygen, eyes) |
| 4 | `../kappa-intro` | kappa (Japan · folklore; intro short: who tells it, the dish of water, the bow, the softshell turtle) |
| 5 | `../kappa` | kappa (physics: crocodile ambush, softshell-turtle breathing, water-holding-frog water storage, the spilled dish) |
| 6 | `../yeti` | yeti (Himalaya · folklore; physics: snowshoe-hare feet, yak altitude genes, brown-bear hibernation, the 2017 DNA twist: eight Asian bears and a dog) |
