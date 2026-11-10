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
import shutil
import sys

from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, TextBlock, create_sdk_mcp_server, tool
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

VS_URL = os.environ.get("VOICESTUDIO_URL", "http://localhost:3900").rstrip("/")
VS_KEY = os.environ.get("VOICESTUDIO_API_KEY", "")
DEFAULT_VOICE = os.environ.get("VEGA_VOICE", "alloy")
MODEL = os.environ.get("VEGA_MODEL", "claude-opus-5-5")
HERE = Path(__file__).parent
UPLOADER = HERE.parent / "shorts" / "uploader"   # its token.json is the channel login
# The server's project folders (one git worktree per channel), as set up in ~/start-claude.sh
CHANNELS = {
    "setup": Path.home() / "Claudecode",          # uploader, skills, Neesmo itself
    "glazier": Path.home() / "glazier-40k",       # Glazier of Terra, 40k lore shorts
    "comics": Path.home() / "comics-40k",         # Warhammer 40K comics
    "gta6": Path.home() / "gta6",                 # GTA 6 clips and shorts
    "physics": Path.home() / "physics-channel",   # Fable Physics
}
JOB_LOGS = Path.home() / "neesmo-jobs"

SYSTEM_PROMPT = (
    "You are Neesmo, a calm, witty personal assistant speaking through a voice interface. "
    "Your replies are read aloud, so answer in one to three short spoken sentences: "
    "no markdown, lists, code, emoji or URLs. Address the user as 'sir' or 'ma'am' only if they ask you to. "
    "For questions about the Glazier of Terra YouTube channel, call the channel_stats tool and answer from its numbers only. "
    "The user's project sessions run on this same server, named Setup & uploader, Glazier of Terra, Warhammer 40K comics, "
    "GTA6 clips and shorts, and Fable physics (each tagged server). To talk to one, find it with ListAgents and message it with "
    "SendMessage; its reply arrives later as a new message, which you then summarise aloud. "
    "Only if a session is not listed, fall back to run_channel with setup, glazier, comics, gta6 or physics. "
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
        data = await asyncio.to_thread(_channel_stats)
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
    return {"content": [{"type": "text", "text": f"Job {jid} started in {args['channel']}."}]}


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
_client: ClaudeSDKClient | None = None
_lock = asyncio.Lock()  # one conversation, one turn at a time


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


class ChatIn(BaseModel):
    text: str


class SpeakIn(BaseModel):
    text: str
    voice: str | None = None


@app.get("/")
def index():
    return FileResponse(HERE / "index.html")


_stats_cache: dict = {"at": 0.0, "data": None}


@app.get("/api/stats")
async def stats():
    """Numbers for the side cards; cached 10 minutes to spare the YouTube quota."""
    loop = asyncio.get_running_loop()
    if _stats_cache["data"] is None or loop.time() - _stats_cache["at"] > 600:
        try:
            _stats_cache["data"] = await asyncio.to_thread(_channel_stats)
        except (Exception, SystemExit) as e:
            raise HTTPException(503, f"Could not read the channel: {e}")
        _stats_cache["at"] = loop.time()
    return _stats_cache["data"]


@app.get("/api/config")
def config():
    return {"voice": DEFAULT_VOICE, "voicestudio": VS_URL, "model": MODEL}


@app.get("/api/voices")
async def voices():
    return (await _vs("GET", "/v1/audio/voices")).json()


@app.post("/api/chat")
async def chat(body: ChatIn):
    global _client
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "empty message")
    async with _lock:
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
            ))
            await _client.connect()
        await _client.query(text)
        parts = [b.text for m in [m async for m in _client.receive_response()]
                 if isinstance(m, AssistantMessage) for b in m.content if isinstance(b, TextBlock)]
    return {"reply": " ".join(parts).strip()}


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
