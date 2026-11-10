# Comic-style 40k shorts

Look: flat cartoon webcomic. Thick black outlines, flat colours with one shadow tone, a warm orange/yellow sky, dusty brown ground, chunky expressive characters, white speech bubbles, a boxed caption ("SOMEWHERE ON..."), big hand-lettered SFX (BOOM, KACHUNK). Original characters only: no Games Workshop art, logos or copied webcomic characters.

## Files
- `sample-panel.html` → `sample-panel.jpg`: hand-built SVG sample (no AI). Joke hook: "how long does a Guardsman last?" / "Fifteen hours, son."
- `gemini-panel-art.jpg` → `gemini-panel.html` → `gemini-panel.jpg`: same panel, art by Gemini 3 Pro Image, lettering by code. **This is the pipeline to use.**
- `gen_panel.py`: makes panel art with Gemini (`--model gemini-3-pro-image-preview` for best results, `--ref` to keep characters consistent).
- `fonts/`: Bangers (SFX) and Comic Neue (lettering), both OFL.

## Short format (same rules as the other films)
- 45–60 s vertical, 4–6 panels revealed one by one with camera push-ins, voiced dialogue, music + SFX.
- **Hook in panel 1, first 2 s:** a question or shock line ("FIFTEEN HOURS. That's how long a Guardsman lasts.").
- **Retention:** each panel ends on a beat that needs the next one; the punchline lands in the last 3 s and loops back to the first panel.
- Topics that win (see `../research-40k-shorts.md`): Guardsmen, Krieg, Ogryns, Orks, Commissars, the Emperor. Mix funny with sad.
- Lettering is drawn by code on top of the art (so text is always spelled right and can be animated), not by the image model.

## Gemini setup
The key is injected by the cloud proxy under `x-goog-api-key`. Tested Nov 10 2026: works; image models available: gemini-3-pro-image(-preview), gemini-3.1-flash-image(-preview), gemini-2.5-flash-image.

## Engine (`engine/`)
Every new short is a folder with `script.json` (layout, voices, lines, SFX, music), `page1.txt`/`page2.txt` (Gemini prompts) and `shots.py` (camera, bubbles, SFX lettering). Run the engine scripts from that folder; see `../red-wunz/README.md` for the full command list. Output: `<folder>.mp4` + `.srt`.
