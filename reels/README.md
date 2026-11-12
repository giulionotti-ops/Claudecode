# Reels (IT) — blocky 3D referral reels

Vertical 1080×1920 reels in the style of the reference (UniCredit Buddy "GTA 6" reel):
blocky 3D cartoon scenes, young Italian voice, one-word pop captions, money badges, end card with the invite code.

## Make a reel
```bash
cd reels
npm install                                   # three + fonts (once)
bash tools/make.sh <episode> --preview        # voice + contact sheet (build/preview.jpg), ~20 s
bash tools/make.sh <episode>                  # voice → render → music/sfx mix → out/<episode>.mp4 + post text
```
Live view while editing: `node tools/serve.mjs` → http://localhost:8123/engine/?ep=<episode>

## Files
- `brand.json` — invite code, voice, top-bar disclosure, hashtags (shared by every episode).
- `episodes/<ep>/script.json` — the reel. Each line = one sentence of voice-over; a line with `scene` starts a new shot.
  - `text` is the caption, `say` is how the voice should pronounce it (numbers: "79,99€" → "settantanove e novantanove").
  - Cue times are words: `"@banca"`, `"@codice+0.5"`, `"@euro#2"` (2nd match).
  - `post` / `hashtags` → Instagram description in `out/<ep>.txt` (`{code}` = brand code).
- `engine/` — Three.js scenes (`scenes.js`), characters/props (`kit.js`), phone/TV UIs (`ui.js`), captions/badges/end card (`overlay.js`).
- `tools/` — `voice.py` (ElevenLabs + word timings), `render.mjs` (headless Chromium → mp4), `mix.py` (synth music + sfx + ducking, −14 LUFS), `caption.py`.

## Scene types
| type | what | main params |
|---|---|---|
| `city` | night street, billboard, windows light up | `billboard{title,sub,small,after}`, `switchAt`, `lightUp` |
| `room` | hero on sofa, window, wall calendar | `cam` wide/close/duo, `camTo`, `hold` laptop/phone, `faces`, `calendar[]`, `coinAt`, `friend`, `friendFaces`, `note` |
| `park` | friend hands over a code card | `give`, `cardText`, `cardSub`, `faces` |
| `phone` | first-person phone form, code typed in | `form{title,sub,chip,chipAt,typeAt,typeDur,pressAt}` |
| `screen` | over-the-shoulder TV | `panel{kind: store/paid/billboard/poster,...}`, `cardAt` |
| `end` | skyline + code card | `title`, `sub`, `lines[]` |

Every scene also takes `badges: [{text, kind: green/red/yellow, at, out, pos:[x,y], scale}]`.
Faces: neutral, happy, smug, wink, surprised, bored.

## Server variant (no Claude session needed)
Runs the same pipeline on your own machine or VPS, with a small web studio (edit script → preview → make reel → download).
```bash
cd reels
cp server/.env.example server/.env        # fill ELEVENLABS_API_KEY and REELS_TOKEN
docker compose -f server/docker-compose.yml up -d --build
# open http://SERVER:8080, paste the token
```
Without Docker: `npm ci && REELS_TOKEN=... ELEVENLABS_API_KEY=... node server/server.mjs` (needs ffmpeg, python3-numpy, Playwright Chromium).
HTTP API is listed at the top of `server/server.mjs`. Put it behind HTTPS (e.g. Caddy) if it is public.

Full Claude session on your server, with every plugin from `.claude/settings.json`: `bash reels/server/claude-session.sh`.

## Rules for these reels
- Always keep the "Pubblicità" label and say the code is personal (you get a bonus). Italian law (AGCM) wants referral promos disclosed.
- Check the bank's current offer terms (amounts, deadlines) before each reel; they change.
- No bank logos or copied app screens; no other creators' branding. Game names only with the "nessuna affiliazione" line.
- Music and sfx are synthesised in `mix.py`, so they are royalty-free.
