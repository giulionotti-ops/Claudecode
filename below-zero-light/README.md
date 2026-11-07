# Below Zero Light

A faceless Shorts channel about the deep ocean. Each short is one dive: a depth counter ticks down while a calm documentary voice tells you what lives (or lies) at that depth.

**Why this niche:** fear of the deep ocean (thalassophobia) is one of the most-watched faceless Shorts topics. It appeals to everyone, never runs out of topics, and stock-style facts are easy to check.

## Look (nothing like Glazier of Terra)
- Near-black water, glowing cyan line light, marine snow, sonar rings.
- A big thin monospace depth counter, zone name, and pressure / temperature / light readouts.
- Bold word-by-word captions with the active word lit cyan.
- Fonts: Space Grotesk (name), JetBrains Mono (numbers), Montserrat 900 (captions), all OFL.
- Voice: ElevenLabs "David – British Documentary", sped up 15%.

## Folders
| Path | What |
|---|---|
| `brand/` | 4 profile pics, 3 banners (2560×1440, key art inside the 1546×423 phone-safe area), `mockups.jpg` |
| `lib/draw.js` | Shared drawing kit: water, snow, creatures, wreck, sonar, the channel mark |
| `lib/voice.py` | ElevenLabs narration with word timings |
| `lib/timeline.py` | Speeds the voice, lays lines on a timeline |
| `lib/render.mjs` | Renders a short (headless Chromium → ffmpeg), or a contact sheet with `--stills` |
| `lib/mix.py` | Underwater bed, drone, pad, sonar pings, foley cues, narration, ducking |
| `lib/srt.py` | Caption file for upload |
| `shorts/NN-name/` | One short: `lines.json`, `cues.json`, `scene.js`, final `.mp4` |

## Make a short
```sh
cd below-zero-light
python3 lib/voice.py shorts/01-bottom-of-the-ocean
python3 lib/timeline.py shorts/01-bottom-of-the-ocean
NODE_PATH=$(npm root -g) node lib/render.mjs shorts/01-bottom-of-the-ocean --workers 4
python3 lib/mix.py shorts/01-bottom-of-the-ocean
python3 lib/srt.py shorts/01-bottom-of-the-ocean bottom-of-the-ocean
ffmpeg -i shorts/01-bottom-of-the-ocean/out/video.mp4 -i shorts/01-bottom-of-the-ocean/out/mix.wav \
  -af loudnorm=I=-14:TP=-1.5:LRA=9 -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
  shorts/01-bottom-of-the-ocean/bottom-of-the-ocean.mp4
```
Needs `pip install scipy soundfile numpy`, ffmpeg, Node with Playwright.

## Next short ideas
1. The sound louder than a blue whale ("the Bloop") and what it really was
2. What happens to a body at the bottom of the ocean
3. The deepest a submarine has ever imploded
4. Creatures that have never seen sunlight
5. The Titanic, 3,800 m down: what's left today
6. How deep a human can free-dive on one breath
