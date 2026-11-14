# Comic-style 40k shorts

Look: flat cartoon webcomic. Thick black outlines, flat colours with one shadow tone, a warm orange/yellow sky, dusty brown ground, chunky expressive characters, white speech bubbles, a boxed caption ("SOMEWHERE ON..."), big hand-lettered SFX (BOOM, KACHUNK). Original characters only: no Games Workshop art, logos or copied webcomic characters.

## Files
- `sample-panel.html` → `sample-panel.jpg`: hand-built SVG sample (no AI). Joke hook: "how long does a Guardsman last?" / "Fifteen hours, son."
- `gemini-panel-art.jpg` → `gemini-panel.html` → `gemini-panel.jpg`: same panel, art by Gemini 3 Pro Image, lettering by code. **This is the pipeline to use.**
- `gen_panel.py`: makes panel art with Gemini (`--model gemini-3-pro-image-preview` for best results, `--ref` to keep characters consistent).
- `fonts/`: Bangers (SFX) and Comic Neue (lettering), both OFL.

## Short format (same rules as the other films)
- 45–60 s vertical, 4–6 panels revealed one by one with camera push-ins, voiced dialogue, music + SFX.
- **On-screen hook text** (3–5 words, `HOOK` in `shots.py`) on frame 1; viral checklists in `comic/AUTO.md` step 3.
- **Hook in panel 1, first 2 s:** a question or shock line ("FIFTEEN HOURS. That's how long a Guardsman lasts.").
- **Retention:** each panel ends on a beat that needs the next one; the punchline lands in the last 3 s and loops back to the first panel.
- Topics that win (see `../research-40k-shorts.md`): Guardsmen, Krieg, Ogryns, Orks, Commissars, the Emperor. Mix funny with sad.
- Lettering is drawn by code on top of the art (so text is always spelled right and can be animated), not by the image model.

## Gemini setup
The key is injected by the cloud proxy under `x-goog-api-key`. Tested Nov 10 2026: works; image models available: gemini-3-pro-image(-preview), gemini-3.1-flash-image(-preview), gemini-2.5-flash-image.

## Engine (`engine/`)
Every new short is a folder with `script.json` (layout, voices, lines, SFX, music), `page1.txt`/`page2.txt` (Gemini prompts) and `shots.py` (camera, bubbles, SFX lettering). Run the engine scripts from that folder; see `../red-wunz/README.md` for the full command list. Output: `<folder>.mp4` + `.srt`.

## Channel rules (40k Comic Shorts)
- **Every description explains the lore of the short.** Order: a one-line hook, then a `📜 THE LORE` section of 3–5 short bullets that explain each 40k idea the joke relies on (factions, ranks, terms, famous memes and where they come from), then a question for the comments, hashtags, and the fan-work line. Check facts against the Lexicanum wiki; label fan jokes as fan jokes, not canon.
- Audience: "No, it's not made for kids". Tick "Altered or synthetic content: Yes" (AI voices and art).
- One short a day at 21:30 Rome / 15:30 New York. Add each new short to the board: https://claude.ai/artifact/2hJXCNcCu4RNQRWdhCZZHF (`shorts.json`, preview video ≤15 MB, poster).
