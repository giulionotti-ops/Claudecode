"""Neesmo: a voice assistant HUD. Claude thinks, VoiceStudio speaks and listens.

Run:  uv run --with-requirements requirements.txt uvicorn server:app --port 8080
"""
import asyncio
import os
from pathlib import Path

import httpx
import datetime
import itertools
import json
import re
import secrets
import shutil
import sys
import time

from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, ResultMessage, TextBlock,
                              create_sdk_mcp_server, tool)
from fastapi import FastAPI, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import agents
import notes
import push

VS_URL = os.environ.get("VOICESTUDIO_URL", "http://localhost:3900").rstrip("/")
VS_KEY = os.environ.get("VOICESTUDIO_API_KEY", "")
DEFAULT_VOICE = os.environ.get("VEGA_VOICE", "expr-voice-3-m")  # KittenTTS deep male (~106 Hz)
MODEL = os.environ.get("VEGA_MODEL", "claude-opus-5-5")
# Optional: run Neesmo's chat through a local OmniRoute gateway (free models) instead of the Claude login.
# VEGA_BASE_URL=http://127.0.0.1:20128  VEGA_MODEL=neesmo-free  key read from VEGA_GATEWAY_KEY_FILE.
BASE_URL = os.environ.get("VEGA_BASE_URL", "")
GATEWAY_KEY_FILE = os.environ.get("VEGA_GATEWAY_KEY_FILE", str(Path.home() / ".config" / "omniroute" / "api.key"))


def _gateway_env() -> dict:
    """Env for the Claude CLI subprocess when a gateway is configured; empty means the normal Claude login."""
    if not BASE_URL:
        return {}
    key = Path(GATEWAY_KEY_FILE).read_text().strip()
    return {"ANTHROPIC_BASE_URL": BASE_URL, "ANTHROPIC_API_KEY": key,
            "ANTHROPIC_DEFAULT_HAIKU_MODEL": MODEL, "ANTHROPIC_SMALL_FAST_MODEL": MODEL,
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"}
HERE = Path(__file__).parent
UPLOADER = HERE.parent / "shorts" / "uploader"   # its token.json is the channel login
# The server's project folders (one git worktree per channel), as set up in ~/start-claude.sh
CHANNELS = {
    "setup": Path.home() / "Claudecode",          # uploader, skills, Neesmo itself
    "glazier": Path.home() / "glazier-40k",       # Glazier of Terra, 40k lore shorts
    "comics": Path.home() / "comics-40k",         # Warhammer 40K comics
    "gta6": Path.home() / "gta6",                 # GTA 6 clips and shorts
    "physics": Path.home() / "physics-channel",   # Fable Physics
    "roblox": Path.home() / "roblox",             # Roblox games (Luau + Rojo)
}
JOB_LOGS = Path.home() / "neesmo-jobs"

SYSTEM_PROMPT = (
    "You are Neesmo, a calm, witty personal assistant speaking through a voice interface. "
    "Your replies are read aloud, so answer in one to three short spoken sentences: "
    "no markdown, lists, code, emoji or URLs. Address the user as 'sir' or 'ma'am' only if they ask you to. "
    "For questions about the Glazier of Terra YouTube channel, call the channel_stats tool and answer from its numbers only. "
    "The user's project sessions run on this same server, named Setup & uploader, Glazier of Terra, Warhammer 40K comics, "
    "GTA6 clips and shorts, Fable physics and Roblox games (each tagged server). To talk to one, find it with ListAgents and message it with "
    "SendMessage; its reply arrives later as a new message, which you then summarise aloud. "
    "Only if a session is not listed, fall back to run_channel with setup, glazier, comics, gta6, physics or roblox. "
    "Write every task as a clear, complete instruction. "
    "Before starting anything that changes, uploads or deletes something, repeat the task back in one sentence and wait for a yes. "
    "Jobs run in the background: say it started, and use channel_jobs when asked how they are going."
)

def _channel_stats() -> dict:
    """Read-only snapshot of the channel signed in through the uploader."""
    sys.path.insert(0, str(UPLOADER))
    from upload import credentials  # noqa: E402  (reuses the uploader's login and token refresh)
    from googleapiclient.discovery import build
    creds = credentials()
    yt = build("youtube", "v3", credentials=creds, cache_discovery=False)
    ch = yt.channels().list(part="snippet,statistics,contentDetails", mine=True).execute()["items"][0]
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]
    ids = [i["contentDetails"]["videoId"] for i in
           yt.playlistItems().list(part="contentDetails", playlistId=uploads, maxResults=10).execute().get("items", [])]
    vids = yt.videos().list(part="snippet,statistics,status", id=",".join(ids)).execute().get("items", []) if ids else []
    end = datetime.date.today(); start = end - datetime.timedelta(days=28)
    yta = build("youtubeAnalytics", "v2", credentials=creds, cache_discovery=False)
    rep = yta.reports().query(ids="channel==MINE", startDate=str(start), endDate=str(end),
                              metrics="views,estimatedMinutesWatched,averageViewPercentage,subscribersGained").execute()
    last28 = dict(zip([h["name"] for h in rep.get("columnHeaders", [])], (rep.get("rows") or [[0, 0, 0, 0]])[0]))
    return {
        "channel": ch["snippet"]["title"], "subscribers": ch["statistics"].get("subscriberCount"),
        "total_views": ch["statistics"].get("viewCount"), "videos": ch["statistics"].get("videoCount"),
        "last_28_days": last28,
        "latest_videos": [{"title": v["snippet"]["title"], "views": v["statistics"].get("viewCount", "0"),
                           "likes": v["statistics"].get("likeCount", "0"), "status": v["status"]["privacyStatus"],
                           "publish_at": v["status"].get("publishAt")} for v in vids],
    }


@tool("channel_stats", "Glazier of Terra YouTube channel: subscribers, views, last 28 days analytics and the latest videos", {})
async def channel_stats(_args):
    try:
        data = await _cached_stats()  # same 10-minute copy as the side cards: no YouTube call per question
    except (Exception, SystemExit) as e:  # missing token (uploader exits), expired login, API error: tell the model instead of crashing the chat
        return {"content": [{"type": "text", "text": f"Could not read the channel: {e}"}], "is_error": True}
    return {"content": [{"type": "text", "text": json.dumps(data)}]}


_jobs: dict[int, dict] = {}
_job_ids = itertools.count(1)


@tool("run_channel", "Start a background Claude Code agent in one of the server's project folders to do a task",
      {"channel": str, "task": str})
async def run_channel(args):
    folder = CHANNELS.get(str(args.get("channel", "")).lower())
    task = str(args.get("task", "")).strip()
    if not folder or not task:
        return {"content": [{"type": "text", "text": f"Need a task and one of: {', '.join(CHANNELS)}"}], "is_error": True}
    claude = shutil.which("claude") or str(Path.home() / ".local/bin/claude")
    JOB_LOGS.mkdir(exist_ok=True)
    jid = next(_job_ids)
    log = JOB_LOGS / f"{jid}-{args['channel']}.log"
    with open(log, "wb") as out:  # the child keeps its own copy of the file handle
        proc = await asyncio.create_subprocess_exec(claude, "-p", task, "--permission-mode", "auto",
                                                    cwd=folder, stdout=out, stderr=asyncio.subprocess.STDOUT)
    _jobs[jid] = {"channel": args["channel"], "task": task, "proc": proc, "log": log,
                  "started": datetime.datetime.now().strftime("%H:%M")}
    asyncio.create_task(_watch_job(jid))
    return {"content": [{"type": "text", "text": f"Job {jid} started in {args['channel']}."}]}


async def _watch_job(jid: int) -> None:
    """Push a notification when a background job ends."""
    j = _jobs[jid]
    code = await j["proc"].wait()
    await _notify(f"Job {jid} ({j['channel']}) " + ("finished" if code == 0 else f"failed (exit {code})"),
                  j["task"][:150], tag=f"job-{jid}")


async def _notify(title: str, body: str, tag: str | None = None, kind: str = "info", **extra) -> dict:
    """Record in the notification history, then push to every subscribed device."""
    item = await asyncio.to_thread(notes.add, kind, title, body, **extra)
    try:
        await asyncio.to_thread(push.send, title, body, tag, f"/?n={item['id']}")
    except Exception as e:  # never let a push problem break a reply or a job
        print(f"push error: {e}", flush=True)
    return item


@tool("channel_jobs", "Status and latest output of the background jobs started with run_channel", {})
async def channel_jobs(_args):
    rows = []
    for jid, j in _jobs.items():
        code = j["proc"].returncode
        state = "running" if code is None else ("done" if code == 0 else f"failed (exit {code})")
        tail = j["log"].read_text(errors="replace")[-600:] if j["log"].exists() else ""
        rows.append({"job": jid, "channel": j["channel"], "started": j["started"], "state": state,
                     "task": j["task"][:200], "latest_output": tail})
    return {"content": [{"type": "text", "text": json.dumps(rows) if rows else "No jobs yet."}]}


app = FastAPI()
notes.hook_token()  # create the hook's secret at start, so approval_hook.py can read it
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
_client: ClaudeSDKClient | None = None
_lock = asyncio.Lock()  # one conversation, one turn at a time

# One reader drains the Claude session for its whole life. While /api/chat waits, messages go to that
# turn; otherwise they are turns the session ran on its own (a project session's SendMessage reply
# arriving), which become an inbox entry and a push notification.
_turn: asyncio.Queue | None = None
_side_parts: list[str] = []
_side_active = asyncio.Event()  # set while an unprompted turn is in progress
_inbox: list[dict] = []
_inbox_ids = itertools.count(1)


async def _pump(client: ClaudeSDKClient) -> None:
    global _client
    try:
        async for m in client.receive_messages():
            if _turn is not None:
                await _turn.put(m)
                continue
            if isinstance(m, ResultMessage):
                text = " ".join(_side_parts).strip()
                _side_parts.clear(); _side_active.clear()
                if text:
                    _inbox.append({"id": next(_inbox_ids), "text": text, "at": datetime.datetime.now().strftime("%H:%M")})
                    del _inbox[:-50]
                    await _notify("Neesmo", text, tag="reply", kind="reply")
            else:
                _side_active.set()
                if isinstance(m, AssistantMessage):
                    _side_parts.extend(b.text for b in m.content if isinstance(b, TextBlock))
    except Exception as e:
        print(f"session reader stopped: {e}", flush=True)
    finally:
        if _client is client:  # reconnect on the next chat
            _client = None
        if _turn is not None:
            await _turn.put(None)


def _vs_headers() -> dict:
    return {"Authorization": f"Bearer {VS_KEY}"} if VS_KEY else {}


async def _vs(method: str, path: str, **kw) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.request(method, VS_URL + path, headers=_vs_headers(), **kw)
    except httpx.HTTPError as e:
        raise HTTPException(503, f"VoiceStudio is not reachable at {VS_URL} ({type(e).__name__})")
    if r.status_code >= 400:
        try:
            msg = r.json().get("error", {}).get("message") or r.text
        except ValueError:
            msg = r.text
        raise HTTPException(r.status_code, f"VoiceStudio: {msg[:300]}")
    return r


KITTEN_VOICES = [("expr-voice-3-m", "Male · deep"), ("expr-voice-2-m", "Male · warm"), ("expr-voice-4-m", "Male · bright"),
                 ("expr-voice-5-m", "Male · light"), ("expr-voice-2-f", "Female · 2"), ("expr-voice-3-f", "Female · 3"),
                 ("expr-voice-4-f", "Female · 4"), ("expr-voice-5-f", "Female · 5")]


class ChatIn(BaseModel):
    text: str


class SpeakIn(BaseModel):
    text: str
    voice: str | None = None


@app.get("/")
def index():
    return FileResponse(HERE / "index.html")


_stats_cache: dict = {"at": 0.0, "data": None}
_last_chat = [0.0]
IDLE_RESET_S = float(os.environ.get("VEGA_IDLE_RESET_S", 2 * 3600))


async def _cached_stats() -> dict:
    """Channel snapshot, cached 10 minutes to spare the YouTube quota (side cards and the stats tool share it)."""
    loop = asyncio.get_running_loop()
    if _stats_cache["data"] is None or loop.time() - _stats_cache["at"] > 600:
        _stats_cache["data"] = await asyncio.to_thread(_channel_stats)
        _stats_cache["at"] = loop.time()
    return _stats_cache["data"]


@app.get("/api/stats")
async def stats():
    try:
        return await _cached_stats()
    except (Exception, SystemExit) as e:
        raise HTTPException(503, f"Could not read the channel: {e}")


@app.get("/api/agents")
async def agents_overview():
    """One card per server agent: name, status, last activity, latest reply."""
    return {"agents": await asyncio.to_thread(agents.overview)}


@app.get("/api/agents/{aid}")
async def agent_report(aid: str):
    rep = await asyncio.to_thread(agents.report, aid)
    if rep is None:
        raise HTTPException(404, "unknown agent")
    return rep


@app.get("/api/config")
def config():
    return {"voice": DEFAULT_VOICE, "voicestudio": VS_URL, "model": MODEL}


@app.get("/api/voices")
async def voices():
    """The engine's real preset voices. VoiceStudio's OpenAI aliases (alloy, onyx, ...) all fall back to
    KittenTTS's one default female voice, so they are not offered."""
    await _vs("GET", "/v1/audio/voices")  # still checks VoiceStudio is reachable
    return {"voices": [{"id": v, "name": n, "type": "profile"} for v, n in KITTEN_VOICES]}


@app.post("/api/chat")
async def chat(body: ChatIn):
    global _client
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "empty message")
    async with _lock:
        if _client is not None and time.monotonic() - _last_chat[0] > IDLE_RESET_S:
            old, _client = _client, None  # long pause: start a fresh, small conversation (faster, cheaper)
            try:
                await old.disconnect()
            except Exception as e:
                print(f"disconnect: {e}", flush=True)
        if _client is None:
            _client = ClaudeSDKClient(ClaudeAgentOptions(
                model=MODEL,
                system_prompt=SYSTEM_PROMPT,
                tools=["ListAgents", "SendMessage"],  # talk to the local project sessions; still no file or shell tools
                mcp_servers={"neesmo": create_sdk_mcp_server("neesmo", tools=[channel_stats, run_channel, channel_jobs])},
                allowed_tools=["ListAgents", "SendMessage", "mcp__neesmo__channel_stats",
                               "mcp__neesmo__run_channel", "mcp__neesmo__channel_jobs"],
                setting_sources=[],    # don't load this repo's plugins/hooks
                effort="low",          # snappy replies for voice
                env=_gateway_env(),
            ))
            await _client.connect()
            asyncio.create_task(_pump(_client))
        global _turn
        for _ in range(240):  # let an unprompted turn (a session's reply) finish first, up to 2 minutes
            if not _side_active.is_set():
                break
            await asyncio.sleep(0.5)
        _turn = asyncio.Queue()
        parts = []
        try:
            await _client.query(text)
            while (m := await _turn.get()) is not None and not isinstance(m, ResultMessage):
                if isinstance(m, AssistantMessage):
                    parts.extend(b.text for b in m.content if isinstance(b, TextBlock))
        finally:
            _turn = None
    _last_chat[0] = time.monotonic()
    return {"reply": " ".join(parts).strip()}


@app.get("/api/inbox")
def inbox(after: int = 0):
    """Replies that arrived on their own (from the project sessions), newer than `after`."""
    return {"items": [i for i in _inbox if i["id"] > after]}


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(HERE / "static" / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return FileResponse(HERE / "static" / "sw.js", media_type="text/javascript", headers={"Cache-Control": "no-cache"})


@app.get("/api/push/key")
def push_key():
    return {"key": push.public_key()}


@app.post("/api/push/subscribe")
async def push_subscribe(sub: dict):
    try:
        push.subscribe(sub)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await _notify("Neesmo", "Notifications are on. You'll hear from me when a session replies.", tag="hello")
    return {"ok": True}


@app.post("/api/push/unsubscribe")
async def push_unsubscribe(sub: dict):
    await asyncio.to_thread(push.unsubscribe, str(sub.get("endpoint", "")))
    return {"ok": True}


# ── notification history + approvals ──
def _agent_for(cwd: str) -> tuple[str, str]:
    for aid, name, folder, _role in agents.AGENTS:
        if cwd == str(folder) or cwd.startswith(str(folder) + "/"):
            return aid, name
    return "other", Path(cwd).name or "A session"


def _describe(tool: str, inp: dict) -> tuple[str, str]:
    """Plain-words action and the details to show on the approval screen."""
    if tool == "Bash":
        return "run a command", (inp.get("description", "") + "\n\n$ " + inp.get("command", "")).strip()
    if tool in ("Edit", "MultiEdit"):
        edits = inp.get("edits") or [inp]
        diff = "\n\n".join(f"- {e.get('old_string', '')}\n+ {e.get('new_string', '')}" for e in edits)
        return "edit a file", f"{inp.get('file_path', '')}\n\n{diff}"
    if tool == "Write":
        return "write a file", f"{inp.get('file_path', '')}\n\n{inp.get('content', '')}"
    if tool in ("WebFetch", "WebSearch"):
        return "use the web", inp.get("url") or inp.get("query") or json.dumps(inp, indent=1)
    return f"use {tool}", json.dumps(inp, indent=1)


MEDIA_EXT = r"(?:mp4|mov|m4v|webm|png|jpe?g|gif|webp)"
_MEDIA_RE = re.compile(r"""(?:['"]([^'"\n]+\.%s)['"])|((?:~|\.{0,2}/)?[\w@%%+=:,./-]+\.%s)\b""" % (MEDIA_EXT, MEDIA_EXT), re.I)


def _media(inp: dict, cwd: str) -> list[str]:
    """Existing video/image files a request mentions (e.g. a test render it wants to upload), to preview."""
    found: list[str] = []
    for m in _MEDIA_RE.finditer(" ".join(str(v) for v in inp.values())):
        raw = m.group(1) or m.group(2)
        path = Path(os.path.expanduser(raw))
        if not path.is_absolute():
            path = Path(cwd or "/") / path
        try:
            path = path.resolve(strict=True)
        except OSError:
            continue
        if path.is_file() and str(path) not in found:
            found.append(str(path))
    return found[:4]


def _hook_only(token: str | None) -> None:
    if not token or not secrets.compare_digest(token, notes.hook_token()):
        raise HTTPException(403, "hook token required")


@app.post("/api/approvals")
async def approval_create(event: dict, x_neesmo_hook: str | None = Header(None)):
    """Called by approval_hook.py when a server session asks for permission."""
    _hook_only(x_neesmo_hook)
    tool, inp = str(event.get("tool_name", "?")), event.get("tool_input") or {}
    aid, name = _agent_for(str(event.get("cwd", "")))
    inp = inp if isinstance(inp, dict) else {"input": inp}
    action, details = _describe(tool, inp)
    media = _media(inp, str(event.get("cwd", "")))
    item = await _notify(f"{name} needs approval", f"Wants to {action}", tag=f"approval-{aid}", kind="approval",
                         status="pending", agent=aid, agent_name=name, tool=tool, action=action,
                         details=details[:4000], expires_in=notes.WAIT_S,
                         media=[{"name": Path(m).name, "video": not m.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))} for m in media],
                         media_paths=media)
    return {"id": item["id"]}


@app.get("/api/approvals/{nid}")
def approval_status(nid: int):
    item = notes.get(nid)
    if item is None or item["kind"] != "approval":
        raise HTTPException(404, "no such request")
    return {"status": item["status"]}


class DecisionIn(BaseModel):
    decision: str


@app.post("/api/approvals/{nid}")
def approval_decide(nid: int, body: DecisionIn):
    try:
        return notes.decide(nid, body.decision)
    except ValueError as e:
        raise HTTPException(409, str(e))


@app.get("/api/approvals/{nid}/media/{i}")
def approval_media(nid: int, i: int):
    """Only files the hook itself attached to this request are served, never a path from the browser."""
    item = notes.get(nid)
    paths = (item or {}).get("media_paths") or []
    if not 0 <= i < len(paths) or not Path(paths[i]).is_file():
        raise HTTPException(404, "no such file")
    return FileResponse(paths[i])


@app.post("/api/approvals/{nid}/expire")
def approval_expire(nid: int, x_neesmo_hook: str | None = Header(None)):
    _hook_only(x_neesmo_hook)
    notes.expire(nid)
    return {"ok": True}


@app.get("/api/notifications")
def notifications():
    return {"items": notes.history()}


@app.post("/api/speak")
async def speak(body: SpeakIn):
    r = await _vs("POST", "/v1/audio/speech", json={
        "model": "tts-1", "voice": body.voice or DEFAULT_VOICE,
        "input": body.text, "response_format": "wav",
    })
    return Response(r.content, media_type="audio/wav")


@app.post("/api/transcribe")
async def transcribe(file: UploadFile):
    r = await _vs("POST", "/v1/audio/transcriptions",
                  files={"file": (file.filename or "speech.webm", await file.read(), file.content_type)},
                  data={"model": "whisper-1", "response_format": "json"})
    return {"text": r.json().get("text", "")}
