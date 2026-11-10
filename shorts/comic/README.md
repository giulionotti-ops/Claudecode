# Comic-style 40k shorts

Look: flat cartoon webcomic. Thick black outlines, flat colours with one shadow tone, a warm orange/yellow sky, dusty brown ground, chunky expressive characters, white speech bubbles, a boxed caption ("SOMEWHERE ON..."), big hand-lettered SFX (BOOM, KACHUNK). Original characters only: no Games Workshop art, logos or copied webcomic characters.

## Files
- `sample-panel.html` → `sample-panel.jpg`: hand-built SVG sample (no AI). Joke hook: "how long does a Guardsman last?" / "Fifteen hours, son."
- `gen_panel.py`: makes panels with Gemini image models once the key works.
- `fonts/`: Bangers (SFX) and Comic Neue (lettering), both OFL.

## Short format (same rules as the other films)
- 45–60 s vertical, 4–6 panels revealed one by one with camera push-ins, voiced dialogue, music + SFX.
- **Hook in panel 1, first 2 s:** a question or shock line ("FIFTEEN HOURS. That's how long a Guardsman lasts.").
- **Retention:** each panel ends on a beat that needs the next one; the punchline lands in the last 3 s and loops back to the first panel.
- Topics that win (see `../research-40k-shorts.md`): Guardsmen, Krieg, Ogryns, Orks, Commissars, the Emperor. Mix funny with sad.
- Lettering is drawn by code on top of the art (so text is always spelled right and can be animated), not by the image model.

## Gemini setup
The environment's saved key uses header `-goog-api-key` (typo). It must be `x-goog-api-key`: edit the environment → Network secrets → Gemini API key, then start a new session.
