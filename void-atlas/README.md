# Void Atlas

A faceless Shorts channel about space: black holes, alien worlds, deep-space signals, missions and the true scale of the universe. Each short is one "map": a big thin number up top, one clear visual idea, and a twist at the end.

**Why this niche:** space is one of the most-watched evergreen Shorts topics. It works in every country, never runs out of topics, has a steady stream of real news (missions, telescope images), and every fact can be checked against NASA / ESA sources.

## Channel kit
- **Name:** Void Atlas · **handle:** @VoidAtlas (fallback @VoidAtlasShorts)
- **Profile picture:** `brand/pfp-mark.jpg` (gold atlas sphere). Alternatives: `pfp-planet`, `pfp-hole`, `pfp-monogram`.
- **Banner:** `brand/banner-orbit.jpg` (2560×1440, text inside the phone-safe 1546×423 area). Alternatives: `banner-chart`, `banner-voyage`.
- **Description:**
  > Space, mapped one short at a time.
  >
  > Black holes, alien worlds, signals from deep space, and the true scale of the universe, told in under a minute. Every fact is checked and sourced in the description.
  >
  > New shorts every day. Follow for the next map.

## Look (nothing like the other two channels)
- An old star atlas brought to life: indigo-black sky, violet haze, warm **gold** line art, thin mono numbers.
- Planets as glowing gold-rimmed spheres; probes and telescopes as gold line drawings.
- Bold word-by-word captions with the active word lit gold. End card: the atlas mark + "FOLLOW FOR THE NEXT MAP".
- Fonts: Space Grotesk, JetBrains Mono, Montserrat 900 (all OFL, in `fonts/`).
- Voice: ElevenLabs "Brian" (deep, resonant American), sped up 15%.

## Folders
| Path | What |
|---|---|
| `brand/` | Profile pictures, banners, `brand.js` (redraw with `node brand/render.mjs`) |
| `lib/draw.js` | Drawing kit: sky, stars, planets, sun, probe, dish, galaxy, black hole, constellation, beam, the mark |
| `lib/kit.js` | Scene boilerplate: timeline, timing helpers, stat card, captions, end card |
| `lib/voice.py`, `timeline.py`, `mix.py`, `render.mjs`, `srt.py`, `build.sh` | Voice → timing → sound → picture → final mp4 + captions |
| `shorts/NN-name/` | One short: `lines.json`, `cues.json`, `scene.js`, final `.mp4`, `.srt`, `poster.jpg` |
| `board/` | The Shorts Board page (artifact source) |
| `UPLOADS.md`, `uploads/` | Titles, descriptions, pinned comments, upload times |
| `PLAYBOOK.md`, `TOPICS.md` | The daily 3-shorts routine and the topic list |

## Make a short
```sh
cd void-atlas
sh lib/build.sh shorts/NN-name name [tempo]
```
Needs `pip install scipy soundfile numpy`, ffmpeg, Node with Playwright (`NODE_PATH=$(npm root -g)`). ElevenLabs is reached through the session proxy, so no key is stored here.
