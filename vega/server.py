"""Neesmo: a voice assistant HUD. Claude thinks, VoiceStudio speaks and listens.

Run:  uv run --with-requirements requirements.txt uvicorn server:app --port 8080
"""
import asyncio
import os
from pathlib import Path

import httpx
from claude_agent_sdk import AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, TextBlock
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

VS_URL = os.environ.get("VOICESTUDIO_URL", "http://localhost:3900").rstrip("/")
VS_KEY = os.environ.get("VOICESTUDIO_API_KEY", "")
DEFAULT_VOICE = os.environ.get("VEGA_VOICE", "alloy")
MODEL = os.environ.get("VEGA_MODEL", "claude-opus-5-5")
HERE = Path(__file__).parent

SYSTEM_PROMPT = (
    "You are Neesmo, a calm, witty personal assistant speaking through a voice interface. "
    "Your replies are read aloud, so answer in one to three short spoken sentences: "
    "no markdown, lists, code, emoji or URLs. Address the user as 'sir' or 'ma'am' only if they ask you to."
)

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
                tools=[],              # pure conversation: no file or shell access
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
