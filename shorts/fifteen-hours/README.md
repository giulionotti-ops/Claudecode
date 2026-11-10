# Fifteen Hours (comic short #1)

40.5 s, 1080×1920, 30 fps. Comic style: 2 Gemini pages (9 panels, **2 image calls**), camera glides panel to panel like reading on a phone, bubbles pop in with each voice line, page-turn slide between pages.

**Hook (0–5 s):** BOOM, then "How long does a Guardsman usually last?" / "Fifteen hours, son."
**Retention:** "...and how long have I been here?" / "Fourteen." sets a ticking clock; Ork charge, Commissar, a lucky shot, a medal.
**Payoff + loop:** "You've got one hour left." → shell whistle → BOOM. The video opens on a BOOM, so it loops.

## Build
```
python3 ../comic/gen_page.py page1.txt page1-art.jpg --ref page1-layout.png --ref ../comic/gemini-panel-art.jpg
python3 ../comic/gen_page.py page2.txt page2-art.jpg --ref page2-layout.png --ref page1-art.jpg
python3 panels.py           # finds panel boxes
python3 voice.py            # ElevenLabs v3, one voice per character
python3 words.py            # word timings -> bubble text types out as it is spoken
python3 sfx.py              # ElevenLabs SFX + music bed
python3 render.py --sheet   # contact sheet to check framing
python3 render.py           # fifteen-hours.mp4 + .srt  (~3.5 min)
```
Then: `ffmpeg -i fifteen-hours.mp4 -af "volume=-1.5dB,alimiter=limit=0.79:level=false" -c:v copy ...` (peaks under -1 dBTP, -15 LUFS).

`shots.py` is the whole film: per shot, camera focus, bubble boxes/tails, SFX and lettering.

## Cast (ElevenLabs)
Rookie: Liam · Sarge: Gravel Midnight · Commissar: Daniel · Ork: Harry, pitched down.

## Upload
**Title:** A Guardsman Lasts 15 HOURS... This One Had 1 Left
**Description:**
First day on the front line. The Sergeant has some bad news about the average Guardsman's life expectancy.

#warhammer40k #40k #imperialguard #astramilitarum #40kmemes #shorts

*Unofficial fan work. Warhammer 40,000 is a trademark of Games Workshop Ltd. Original characters and artwork.*

**Tags:** warhammer 40k, imperial guard, astra militarum, guardsman, commissar, ork, 40k comic, 40k funny, 40k memes
