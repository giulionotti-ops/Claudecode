# Neesmo product audit (step a)

What in `vega/` is tied to one user and one server, and what can be reused as is.

## Personal or hard-coded (must change before selling)

| Where | What | Fix |
|---|---|---|
| `server.py:50-58`, `agents.py:16-22` | Project list hard-coded (Claudecode, glazier-40k, comics-40k, gta6, physics-channel, roblox, neesmo-product) | Load agents from a config file (`~/.config/neesmo/agents.json`) made by a setup wizard |
| `server.py:60-73` | System prompt names the user's channels and sessions | Build the prompt from the agent config |
| `server.py:49, 76-110, 261` | `channel_stats` imports the user's YouTube uploader (`../shorts/uploader`) and its `token.json`; tool says "Glazier of Terra" | Make YouTube an optional plugin with its own OAuth step; off by default |
| `index.html:347-349` | Agent short names, colours and "in development" set hard-coded | Serve them from `/api/agents` |
| `push.py:18` | Push contact defaults to the user's Tailscale hostname | Default to empty/required in setup; never ship a real host |
| `server.py:32` | Default voice `expr-voice-3-m`; README says `alloy` | Pick one default, fix README |
| `server.py:35-47` | OmniRoute gateway path assumed at `~/.config/omniroute/api.key` | Keep as optional "bring your own gateway" setting |
| `README.md` | Hook install path `~/Claudecode/vega/approval_hook.py` | Use the install location |
| `agents.py:29-30` | Reads `~/.claude/projects/` logs by folder name (Claude Code internals) | OK for self-host; document it as a dependency |

## No auth (blocker)

Every route in `server.py` (`/api/chat`, `/api/approvals/{id}` POST, `/api/notifications` DELETE, `/api/transcribe` …) is open. Today it is safe only because it sits behind Tailscale. Anyone who can reach the port can approve agent actions. Only the hook-to-server call has a token (`X-Neesmo-Hook`).

## Single user by design

One notifications file, one push subscription list, one chat history, one Claude login for the whole server. No idea of "account".

## Reusable as is

- HUD UI, rings, voice in/out (`index.html`, VoiceStudio client in `server.py:205-240, 527-541`)
- Approval hook flow with media preview (`approval_hook.py`, `notes.py`, `server.py:427-510`) — the strongest, most sellable part
- Notifications + web push (`push.py`, `notes.py`) once the contact is configurable
- Background job runner (`run_channel` / `channel_jobs`) once folders come from config
- PWA install (manifest, service worker)
- All settings already read from env vars with `NEESMO_` / `VEGA_` prefixes
