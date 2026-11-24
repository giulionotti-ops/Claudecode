"""One chat per video, named "#<number>". Neesmo opens it when the video is made; the owner asks for changes
there and the editor session works on that video only. There is no "new chat": every chat belongs to a video.

Each turn is a short `claude -p --resume` run in the editor's role folder (general + marketing + content
skills). The chat is stored next to the video in chat.json:
  {"name": "#12", "session": id|null, "messages": [{role, text, ts}], "ctx": tokens, "compacted": [40, 60]}

Cost: when the chat's context first reaches 40% of the window, and once more at 60%, Neesmo compacts it.
It waits until the chat has been idle for COMPACT_IDLE_S, never runs during a turn, and a new message
simply waits for the (short) compaction to finish.
"""
import json
import os
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

from . import audit, channel, state

WINDOW = int(os.environ.get("NEESMO_CTX_WINDOW", "200000"))     # tokens in the model's context window
STEPS = (40, 60)                                                 # compact once at each of these %
COMPACT_IDLE_S = int(os.environ.get("NEESMO_COMPACT_IDLE_S", "45"))
TURN_TIMEOUT = 60 * 60
TOOLS = "Bash Read Write Edit Glob Grep Skill Agent WebSearch WebFetch TodoWrite"

_locks: dict[str, threading.Lock] = {}
_turn_no: dict[str, int] = {}          # bumps on every owner message; a pending compaction checks it
_busy: dict[str, str] = {}             # key -> "working" | "compacting"


def name(vid: str) -> str:
    return f"#{int(vid)}" if vid.isdigit() else f"#{vid}"


def _key(aid: str, vid: str) -> str:
    return f"{aid}/{vid}"


def _vdir(aid: str, vid: str) -> Path | None:
    v = next((x for x in channel.queue(aid) if x["id"] == vid), None)
    return Path(v["dir"]) if v and v.get("dir") else None


def _path(aid: str, vid: str) -> Path | None:
    d = _vdir(aid, vid)
    return d / "chat.json" if d else None


def load(aid: str, vid: str) -> dict:
    p = _path(aid, vid)
    c = channel.read_json(p, {}) if p else {}
    c.setdefault("name", name(vid))
    c.setdefault("session", None)
    c.setdefault("messages", [])
    c.setdefault("ctx", 0)
    c.setdefault("compacted", [])
    return c


def _save(aid: str, vid: str, c: dict) -> None:
    p = _path(aid, vid)
    if p:
        channel.write_json(p, c)


def open_chat(aid: str, vid: str) -> dict:
    """Called when a video is created (and lazily for older videos). Idempotent."""
    p = _path(aid, vid)
    if p and not p.exists():
        c = load(aid, vid)
        c["messages"].append({"role": "neesmo", "ts": state.now().isoformat(timespec="seconds"),
                              "text": f"This is the chat for video {name(vid)}. Ask here for any change to it."})
        _save(aid, vid, c)
    return load(aid, vid)


def view(aid: str, vid: str) -> dict:
    c = open_chat(aid, vid)
    return {"name": c["name"], "messages": c["messages"][-80:], "busy": _busy.get(_key(aid, vid)),
            "ctx_pct": round(100 * (c.get("ctx") or 0) / WINDOW, 1), "compacted": c["compacted"]}


def _context_tokens(folder: Path, sid: str) -> int:
    """Context size now = the last assistant message's input side (same count the agent report uses)."""
    ctx = 0
    try:
        for ln in audit.transcript(folder, sid).read_text(errors="replace").splitlines():
            if '"usage"' not in ln:
                continue
            try:
                u = (json.loads(ln).get("message") or {}).get("usage") or {}
            except ValueError:
                continue
            n = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
            if n:
                ctx = n
    except OSError:
        pass
    return ctx


def _claude(args: list[str], cwd: Path, aid: str, timeout: int) -> dict:
    claude = shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
    try:
        r = subprocess.run([claude, *args, "--output-format", "json"], cwd=cwd, capture_output=True, text=True,
                           timeout=timeout, env={**os.environ, "NEESMO_ROLE": "editor", "NEESMO_CHANNEL": aid})
        out = json.loads(r.stdout or "{}")
        return {"ok": r.returncode == 0 and not out.get("is_error"), "text": str(out.get("result") or r.stderr[-400:]).strip(),
                "cost": float(out.get("total_cost_usd") or 0)}
    except subprocess.TimeoutExpired:
        return {"ok": False, "text": f"Stopped after {timeout // 60} min.", "cost": 0.0}
    except (OSError, ValueError) as e:
        return {"ok": False, "text": str(e), "cost": 0.0}


def _brief(aid: str, vid: str) -> str:
    d = _vdir(aid, vid)
    rel = d.relative_to(state.channel_dir(aid)) if d else f"videos/{vid}"
    return (f"You are the editor of video {name(vid)} of this channel. Its folder is `{rel}`. The owner talks to you in "
            f"this chat about this video only. Make the changes they ask for on this video (script.json, scenes, voice, "
            f"render) using your skills and the channel style; keep everything else as it is. Re-render when the picture "
            f"or words change and check the result. When done, reply in 1-3 plain sentences and append one line to "
            f"`neesmo/board.md` starting with `- [editor {vid}]` so the other roles learn from the change.")


def _log_cost(aid: str, vid: str, sid: str, cost: float, ok: bool, kind: str) -> None:
    with open(channel.paths(aid)["n"] / "costs.jsonl", "a") as f:
        f.write(json.dumps({"ts": state.now().isoformat(timespec="seconds"), "role": kind, "video": vid,
                            "session": sid, "cost": cost, "ok": ok}) + "\n")


def send(aid: str, vid: str, text: str) -> dict:
    """Owner message -> background turn. Returns at once; the UI polls view()."""
    if not _vdir(aid, vid):
        raise ValueError(f"no video {vid}")
    k = _key(aid, vid)
    c = open_chat(aid, vid)
    c["messages"].append({"role": "owner", "text": text.strip()[:4000], "ts": state.now().isoformat(timespec="seconds")})
    _save(aid, vid, c)
    _turn_no[k] = _turn_no.get(k, 0) + 1
    _busy[k] = "working"
    threading.Thread(target=_turn, args=(aid, vid, text.strip()[:4000]), daemon=True).start()
    channel.event(aid, "chat", f"{name(vid)}: {text.strip()[:120]}", video=vid)
    return view(aid, vid)


def _turn(aid: str, vid: str, text: str) -> None:
    k = _key(aid, vid)
    lock = _locks.setdefault(k, threading.Lock())
    with lock:                      # waits for a running compaction, never overlaps another turn
        _busy[k] = "working"
        c = load(aid, vid)
        cwd = channel.role_dir(aid, "editor")
        sid = c["session"] or str(uuid.uuid4())
        args = ["-p", text, "--model", os.environ.get("NEESMO_ROLE_MODEL", "sonnet"), "--allowedTools", TOOLS,
                "--permission-mode", "acceptEdits", "--append-system-prompt", _brief(aid, vid),
                "--settings", json.dumps({"enabledPlugins": channel.ROLE_PLUGINS["editor"]})]
        args += ["--resume", sid] if c["session"] else ["--session-id", sid]
        r = _claude(args, cwd, aid, TURN_TIMEOUT)
        c = load(aid, vid)
        c["session"] = sid
        c["messages"].append({"role": "neesmo", "text": r["text"] or ("Done." if r["ok"] else "That did not work."),
                              "ts": state.now().isoformat(timespec="seconds"), **({} if r["ok"] else {"error": True})})
        c["ctx"] = _context_tokens(cwd, sid) or c["ctx"]
        _save(aid, vid, c)
        _log_cost(aid, vid, sid, r["cost"], r["ok"], "editor")
        _busy.pop(k, None)
    threading.Thread(target=_compact_when_idle, args=(aid, vid, _turn_no.get(k, 0)), daemon=True).start()


def due(c: dict) -> int | None:
    """The step (40 or 60) this chat should compact for now, or None."""
    pct = 100 * (c.get("ctx") or 0) / WINDOW
    for s in STEPS:
        if pct >= s and s not in c.get("compacted", []):
            return s
    return None


def _compact_when_idle(aid: str, vid: str, turn: int) -> None:
    k = _key(aid, vid)
    if due(load(aid, vid)) is None:
        return
    time.sleep(COMPACT_IDLE_S)
    if _turn_no.get(k, 0) != turn:          # the owner wrote again: that turn will schedule its own check
        return
    lock = _locks.setdefault(k, threading.Lock())
    if not lock.acquire(blocking=False):    # a turn is running: not idle
        return
    try:
        c = load(aid, vid)
        step = due(c)
        if step is None or not c["session"]:
            return
        _busy[k] = "compacting"
        cwd = channel.role_dir(aid, "editor")
        r = _claude(["-p", "/compact", "--resume", c["session"], "--model", os.environ.get("NEESMO_ROLE_MODEL", "sonnet")],
                    cwd, aid, 10 * 60)
        c = load(aid, vid)
        if r["ok"]:
            c["compacted"] = sorted(set(c["compacted"]) | {step})
            c["ctx"] = 0            # the real size is read again after the next turn
            _save(aid, vid, c)
        _log_cost(aid, vid, c["session"], r["cost"], r["ok"], "compact")
    finally:
        _busy.pop(k, None)
        lock.release()
