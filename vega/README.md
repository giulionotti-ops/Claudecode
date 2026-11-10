# Neesmo

A voice-assistant HUD. Claude does the thinking, and [VoiceStudio](https://github.com/debpalash/VoiceStudio) speaks and listens.

You speak, then VoiceStudio transcribes what you said and Claude (Opus 5.5) replies. VoiceStudio reads the reply aloud in the voice you picked, and the rings react to the audio.

## Run it (on the laptop/server where VoiceStudio runs)

Needs: Python 3.11+, [uv](https://docs.astral.sh/uv/), Claude Code signed in (`claude` → log in), VoiceStudio running.

```bash
cd vega
uv venv && uv pip install -r requirements.txt
.venv/bin/uvicorn server:app --port 8080
```

Open http://localhost:8080. Then:
- Click ● to start talking and ● again to send, or hold **Space**.
- You can also type in the box.
- Choose a voice at the top right. It lists your saved VoiceStudio voices, and the choice is remembered.

## Settings (environment variables)

| Variable | Default | |
|---|---|---|
| `VOICESTUDIO_URL` | `http://localhost:3900` | Where VoiceStudio's backend runs |
| `VOICESTUDIO_API_KEY` | *(none)* | Only if your VoiceStudio requires a key |
| `VEGA_VOICE` | `alloy` | Default voice ID (`/v1/audio/voices`) |
| `VEGA_MODEL` | `claude-opus-5-5` | Claude model |

Claude runs through the Claude Agent SDK with your Claude Code login, so no API key is needed. Every built-in tool is turned off: Vega can only talk, not touch your files. If VoiceStudio is off, Vega still answers in text.
