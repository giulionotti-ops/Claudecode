# Neesmo

A voice-assistant HUD. Claude does the thinking, and [VoiceStudio](https://github.com/debpalash/VoiceStudio) speaks and listens.

You speak, then VoiceStudio transcribes what you said and Claude (Opus 5.5) replies. VoiceStudio reads the reply aloud in the voice you picked, and the rings react to the audio.


## Install (product bundle)

```bash
./install.sh            # asks before each optional part
./install.sh --all      # everything: app, login, approval hook, OmniRoute, graphify, claude-mem, skill pack
./install.sh --dry-run  # show what it would do
```

It sets up a Python venv, writes `~/.config/neesmo/neesmo.env` (login on), adds the approval hook,
and runs Neesmo as a systemd service on 127.0.0.1:8080. The skill pack list is `skills.txt`
(licenses in `THIRD_PARTY_NOTICES.md`).

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

## Login and access from anywhere (product mode)

Set `NEESMO_AUTH=1` to require a password. On the first start the server log prints a one-time setup code:
open Neesmo, enter the code and choose the owner password. Each phone or computer then signs in once and is
remembered for a year (`NEESMO_DEVICE_DAYS`). Settings → Devices lists them; tap ✕ to sign one out.
Wrong passwords are limited to 5 per 10 minutes. Local hooks keep using the hook token, not the password.

No Tailscale needed. To open Neesmo from your phone anywhere, put it behind HTTPS, either:

- **Cloudflare Tunnel** (free, no open ports): `cloudflared tunnel --url http://localhost:8080` for a quick
  test URL, or a named tunnel on your own domain for a fixed address (needed for the home-screen app and push).
- **Caddy** on a server with a domain: `caddy reverse-proxy --from neesmo.example.com --to localhost:8080`
  (gets HTTPS certificates by itself).

Keep Neesmo itself on `127.0.0.1`; only the tunnel or proxy should face the internet. Set
`NEESMO_PUSH_CONTACT` to your HTTPS address so push notifications work.
