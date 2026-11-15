"""Chat with one agent from its box: each message is a turn of that agent's own Claude Code conversation.

The first message starts a `claude -p` conversation in the agent's folder; later ones resume it (--resume), so the
agent remembers the thread. Turns run in the background (they can take minutes); the app polls the thread.
Threads live in NEESMO_DIR/agent_chats/<id>.json.
"""
import asyncio
import datetime
import json
import os
import shutil
from pathlib import Path

DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo")) / "agent_chats"
KEEP = 100
_running: dict[str, asyncio.subprocess.Process] = {}


def _file(aid: str) -> Path:
    return DIR / f"{aid}.json"


def _load(aid: str) -> dict:
    try:
        return json.loads(_file(aid).read_text())
    except (OSError, ValueError):
        return {"session": None, "messages": []}


def _save(aid: str, d: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    d["messages"] = d["messages"][-KEEP:]
    tmp = _file(aid).with_suffix(".tmp")
    tmp.write_text(json.dumps(d, indent=1))
    os.replace(tmp, _file(aid))


def _now() -> str:
    return datetime.datetime.now().strftime("%H:%M")


def thread(aid: str) -> dict:
    d = _load(aid)
    return {"messages": d["messages"], "busy": aid in _running}


def reset(aid: str) -> None:
    if aid in _running:
        raise RuntimeError("it is still answering; wait or stop it first")
    _save(aid, {"session": None, "messages": []})


def stop(aid: str) -> bool:
    p = _running.get(aid)
    if p and p.returncode is None:
        p.terminate()
        return True
    return False


def _parse(out: str) -> tuple[str, str | None, bool]:
    """(reply text, session id, is_error) from `claude -p --output-format json`."""
    for line in reversed(out.strip().splitlines()):
        try:
            j = json.loads(line)
        except ValueError:
            continue
        if isinstance(j, dict) and "result" in j:
            return str(j.get("result") or ""), j.get("session_id"), bool(j.get("is_error"))
    return out.strip()[-2000:] or "No answer.", None, True


async def send(aid: str, folder: str, text: str, brief: str | None, notify=None) -> None:
    """Add the owner's message and start the agent's turn in the background."""
    if aid in _running:
        raise RuntimeError("it is still answering the last message")
    d = _load(aid)
    d["messages"].append({"who": "you", "text": text, "at": _now()})
    _save(aid, d)
    claude = shutil.which("claude") or str(Path.home() / ".local/bin/claude")
    cmd = [claude, "-p", text, "--output-format", "json", "--permission-mode", "auto"]
    if d.get("session"):
        cmd += ["--resume", d["session"]]
    if brief:
        cmd += ["--append-system-prompt", brief]
    proc = await asyncio.create_subprocess_exec(*cmd, cwd=folder, stdin=asyncio.subprocess.DEVNULL,
                                                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    _running[aid] = proc
    asyncio.create_task(_finish(aid, proc, notify))


async def _finish(aid: str, proc, notify) -> None:
    try:
        out, _ = await proc.communicate()
        reply, session, err = _parse(out.decode(errors="replace"))
        if proc.returncode and proc.returncode < 0:
            reply, err = "Stopped.", True
        d = _load(aid)
        if session:
            d["session"] = session
        d["messages"].append({"who": "agent", "text": reply, "at": _now(), **({"error": True} if err else {})})
        _save(aid, d)
        if notify:
            await notify(reply)
    finally:
        _running.pop(aid, None)


if __name__ == "__main__":  # self-check: python3 agent_chat.py
    print(_parse('{"type":"result","result":"done","session_id":"abc","is_error":false}'))
    assert _parse('noise\n{"result":"hi","session_id":"s1"}') == ("hi", "s1", False)
    assert _parse("crash")[2] is True
    print("ok")
