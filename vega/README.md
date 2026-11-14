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

## Approvals from Neesmo

`approval_hook.py` is a Claude Code `PermissionRequest` hook. When a server session asks for permission, Neesmo shows it in the bell menu (and as a push notification). Open it to see exactly what the agent wants to do, then Approve or Deny. It waits up to 2 days (`NEESMO_APPROVAL_WAIT_S`, default 172800), so you can answer the next day; after that, or if Neesmo is down, the normal prompt in the Claude app takes over. While it waits, that chat is paused on the request. If the request mentions a video or image file that exists (say a test render it wants to upload), the approval screen plays it above the details.

Install it once for every session on the server (adds the hook to `~/.claude/settings.json`):

```bash
python3 - <<'PY'
import json, pathlib
p = pathlib.Path.home() / ".claude" / "settings.json"
s = json.loads(p.read_text()) if p.exists() else {}
hook = {"type": "command", "command": "python3 ~/Claudecode/vega/approval_hook.py", "timeout": 172860}
groups = s.setdefault("hooks", {}).setdefault("PermissionRequest", [])
if not any(h.get("command", "").endswith("approval_hook.py") for g in groups for h in g.get("hooks", [])):
    groups.append({"matcher": "*", "hooks": [hook]})
p.write_text(json.dumps(s, indent=2))
PY
```

Sessions pick it up when they restart. The hook's secret lives in `~/.config/neesmo/hook_token`, created by Neesmo.
