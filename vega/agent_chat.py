"""An agent's chat box is its real Claude Code session.

Each agent is an interactive `claude` running in a tmux pane in the agent's folder: the same session you would get by
opening a terminal there. Neesmo finds that pane (or starts one: `tmux new-session -s neesmo-<id> claude --continue`),
types your message into it, and shows the conversation from the session's own transcript
(~/.claude/projects/<folder>/<session>.jsonl). You can attach to the same session in a terminal at any time
(`tmux attach -t neesmo-<id>`), and the chat box and the terminal stay in step.

Stop sends Esc and New thread sends /clear, just like in the terminal. When Claude asks a numbered question
(a permission prompt, a choice), the choices are read from the screen and offered as buttons.

A folder driven by a Claude app Remote Control worker (`claude remote-control`) has no terminal to type into, so it
is shown read-only. Start agents with `claude --remote-control` in tmux instead to use both the app and Neesmo.
NEESMO_RC=1 makes the sessions Neesmo starts join Remote Control too.
"""
import asyncio
import os
import re
import shlex
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

import agents

KEEP = 80
_watch: dict[str, asyncio.Task] = {}
_locks: dict[str, threading.Lock] = {}


def _tmux(*args: str, input: str | None = None) -> str:
    r = subprocess.run(["tmux", *args], capture_output=True, text=True, timeout=5, input=input)
    if r.returncode:
        raise RuntimeError(r.stderr.strip() or "tmux failed")
    return r.stdout


def _claude_ttys(folder: Path) -> list[str]:
    """Terminals of interactive claude processes working in this folder (not -p runs, not Remote Control)."""
    out = []
    for pid in filter(str.isdigit, os.listdir("/proc")):
        try:
            if os.readlink(f"/proc/{pid}/cwd") != str(folder):
                continue
            argv = Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0")
            if b"claude" not in b" ".join(argv[:2]):
                continue
            if {b"-p", b"--print", b"--sdk-url", b"remote-control"} & set(argv):
                continue
            tty = os.readlink(f"/proc/{pid}/fd/0")
            if tty.startswith("/dev/pts/"):
                out.append(tty)
        except OSError:
            continue
    return out


def _app_worker(folder: Path) -> bool:
    """A Claude app Remote Control worker (claude --sdk-url ...) owns this folder."""
    for pid in filter(str.isdigit, os.listdir("/proc")):
        try:
            if os.readlink(f"/proc/{pid}/cwd") == str(folder) and b"--sdk-url" in Path(f"/proc/{pid}/cmdline").read_bytes():
                return True
        except OSError:
            continue
    return False


def _pane(aid: str, folder: Path) -> str | None:
    """The tmux pane running this agent's Claude session, if any."""
    if not shutil.which("tmux"):
        return None
    try:
        panes = dict(l.split(" ", 1) for l in _tmux("list-panes", "-a", "-F", "#{pane_tty} #{pane_id}").split("\n") if " " in l)
    except (RuntimeError, OSError, subprocess.SubprocessError):
        return None
    for tty in _claude_ttys(folder):
        if tty in panes:
            return panes[tty]
    return None


def _screen(pane: str) -> str:
    try:
        return _tmux("capture-pane", "-p", "-t", pane)
    except (RuntimeError, subprocess.SubprocessError):
        return ""


def _ready(screen: str) -> bool:
    return bool(re.search(r"^─{20,}", screen, re.M)) and "❯" in screen


def _start(aid: str, folder: Path, name: str) -> str:
    if not shutil.which("tmux"):
        raise RuntimeError("tmux is not installed on the server (needed to run agent sessions)")
    claude = shutil.which("claude") or str(Path.home() / ".local/bin/claude")
    cmd = [claude] + (["--continue"] if agents._log_file(folder) else [])
    if os.environ.get("NEESMO_RC") == "1":
        cmd += ["--remote-control", name]
    sess = f"neesmo-{aid}"
    subprocess.run(["tmux", "kill-session", "-t", sess], capture_output=True)
    _tmux("new-session", "-d", "-s", sess, "-x", "160", "-y", "50", "-c", str(folder), shlex.join(cmd))
    pane = _tmux("display-message", "-p", "-t", sess, "#{pane_id}").strip()
    trusted = False
    for _ in range(60):  # up to ~30 s for the prompt; accept the folder-trust question (the owner chose this folder)
        time.sleep(0.5)
        s = _screen(pane)
        if "trust this folder" in s:
            if not trusted:  # pick the "Yes, I trust this folder" line, wherever it sits in the list
                lines = [l for l in s.split("\n") if re.match(r"\s*(❯\s*)?\d\.", l)]
                yes = next((re.search(r"(\d)\.", l).group(1) for l in lines if "trust" in l.lower() and "yes" in l.lower()), None)
                _tmux("send-keys", "-t", pane, *([yes] if yes else ["Down", "Enter"]))
                trusted = True
        elif _ready(s):
            return pane
    raise RuntimeError(f"the Claude session did not start; look at it with: tmux attach -t {sess}")


_CHOICE = re.compile(r"^\s*(?:❯\s*)?(\d{1,2})\.\s+(.+?)\s*$")


def _choices(screen: str) -> dict | None:
    """A numbered question Claude is waiting on (permission prompt, choice list), read from the bottom of the screen."""
    lines = screen.rstrip().split("\n")[-30:]
    found = [(i, m) for i, l in enumerate(lines) if (m := _CHOICE.match(l))]
    tail = "\n".join(lines[-6:])
    if len(found) < 2 or not any("❯" in lines[i] for i, _ in found) or not re.search(r"Esc to cancel|Enter to (confirm|select)", tail):
        return None
    first = found[0][0]
    q = next((lines[i].strip(" │╭╰─") for i in range(first - 1, max(first - 8, -1), -1) if lines[i].strip(" │╭╰─")), "")
    return {"question": q, "options": [{"key": m.group(1), "label": m.group(2)} for _, m in found]}


_SKIP = ("<command-", "<local-command", "<system-reminder", "Caveat:", "[Request interrupted")


def _messages(folder: Path) -> tuple[list[dict], bool]:
    """(messages, looks busy) from the session's transcript."""
    log = agents._log_file(folder)
    if log is None:
        return [], False
    msgs: list[dict] = []
    busy = False
    for e in agents._entries(log):
        t, m = e.get("type"), e.get("message") or {}
        ts = agents._ts(e)
        at = ts.strftime("%H:%M") if ts else ""
        if t == "user" and not e.get("isMeta"):
            c = m.get("content")
            if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
                continue
            raw = agents._text(c).strip()
            if raw.startswith("<command-name>"):
                cmd = re.search(r"<command-name>(.*?)</command-name>", raw)
                if cmd and cmd.group(1).strip() == "/clear":
                    msgs = []
                continue
            if raw.startswith(_SKIP):
                continue
            note = agents._note(raw)
            if note:
                msgs.append({"who": "note", "text": note, "at": at, "ts": ts.timestamp() if ts else 0})
            text = agents._clean_prompt(raw)
            if not text:
                continue
            msgs.append({"who": "you", "text": text, "at": at, "ts": ts.timestamp() if ts else 0})
            busy = True
        elif t == "assistant":
            for b in m.get("content") or []:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "text" and b.get("text", "").strip():
                    if msgs and msgs[-1]["who"] == "agent":
                        msgs[-1]["text"] += "\n\n" + b["text"]
                    else:
                        msgs.append({"who": "agent", "text": b["text"], "at": at, "ts": ts.timestamp() if ts else 0})
                elif b.get("type") == "tool_use":
                    msgs.append({"who": "tool", "text": agents._tool_label(b), "at": at, "ts": ts.timestamp() if ts else 0})
            busy = m.get("stop_reason") not in ("end_turn", "stop_sequence", None) or (
                m.get("stop_reason") is None and any(b.get("type") == "tool_use" for b in m.get("content") or [] if isinstance(b, dict)))
    # fold runs of tool steps into one line so the chat stays readable
    out: list[dict] = []
    for x in msgs:
        if x["who"] == "tool" and out and out[-1]["who"] == "tool":
            out[-1]["steps"] = out[-1].get("steps", 1) + 1
            out[-1]["text"] = x["text"]
        else:
            out.append(dict(x))
    return out[-KEEP:], busy


def thread(aid: str) -> dict:
    folder = agents.folders()[aid]
    pane = _pane(aid, folder)
    msgs, busy = _messages(folder)
    d = {"messages": msgs, "busy": busy, "mode": "live" if pane else "idle", "attach": None, "ask": None}
    if pane:
        s = _screen(pane)
        d["busy"] = "esc to interrupt" in s.lower()
        d["ask"] = _choices(s)
        try:
            d["attach"] = "tmux attach -t " + _tmux("display-message", "-p", "-t", pane, "#S").strip()
        except RuntimeError:
            pass
    elif _claude_ttys(folder):
        d["mode"] = "terminal"  # open in a plain terminal: read-only here
        d["busy"] = busy
    elif _app_worker(folder):
        d["mode"] = "app"  # a Claude app Remote Control worker owns this folder: read-only here
        d["busy"] = busy
    else:
        d["busy"] = False
    return d


def _paste(pane: str, text: str) -> None:
    text = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", "", text)  # no escape codes: they could end the bracketed paste early
    buf = f"neesmo-{uuid.uuid4().hex[:12]}"
    _tmux("load-buffer", "-b", buf, "-", input=text)
    _tmux("paste-buffer", "-p", "-d", "-b", buf, "-t", pane)
    time.sleep(0.3)
    _tmux("send-keys", "-t", pane, "Enter")


def _live_pane(aid: str, name: str) -> str:
    with _locks.setdefault(aid, threading.Lock()):  # one start at a time per agent
        return _live_pane_locked(aid, name)


def _live_pane_locked(aid: str, name: str) -> str:
    folder = agents.folders()[aid]
    pane = _pane(aid, folder)
    if pane:
        return pane
    if _claude_ttys(folder):
        raise RuntimeError("a Claude session is already open in a terminal in this folder, outside tmux; "
                           "close it or run it inside tmux so Neesmo can type into it")
    if _app_worker(folder):
        raise RuntimeError("this folder is run from the Claude app (Remote Control); reply there, "
                           "or run the agent as `claude --remote-control` in tmux to use both")
    return _start(aid, folder, name)


async def send(aid: str, name: str, text: str, notify=None) -> None:
    pane = await asyncio.to_thread(_live_pane, aid, name)
    # a message typed while Claude works is queued by Claude Code, same as in the terminal
    await asyncio.to_thread(_paste, pane, text)
    if notify:
        old = _watch.get(aid)
        if old and not old.done():
            old.cancel()
        _watch[aid] = asyncio.create_task(_notify_when_done(aid, notify))


async def _notify_when_done(aid: str, notify) -> None:
    """Tell the owner when the turn ends, so they can close the box."""
    await asyncio.sleep(4)
    idle = 0
    for _ in range(2400):  # up to ~2 h
        d = await asyncio.to_thread(thread, aid)
        if d["ask"]:
            await notify(f"needs an answer: {d['ask']['question'][:120]}")
            return
        idle = 0 if d["busy"] else idle + 1
        if idle >= 3:  # "esc to interrupt" can blink off between steps
            last = next((m["text"] for m in reversed(d["messages"]) if m["who"] == "agent"), "Done.")
            await notify(last)
            return
        await asyncio.sleep(3)


def key(aid: str, k: str) -> None:
    """Answer a numbered question (1-9), or Esc."""
    if not re.fullmatch(r"[1-9]|Escape", k):
        raise ValueError("bad key")
    pane = _pane(aid, agents.folders()[aid])
    if not pane:
        raise RuntimeError("no live session")
    ask = _choices(_screen(pane))
    if k != "Escape" and (not ask or k not in {o["key"] for o in ask["options"]}):
        raise RuntimeError("that question is no longer on screen")
    _tmux("send-keys", "-t", pane, k)


def stop(aid: str) -> bool:
    pane = _pane(aid, agents.folders()[aid])
    if pane:
        _tmux("send-keys", "-t", pane, "Escape")
    return bool(pane)


def reset(aid: str, name: str) -> None:
    pane = _live_pane(aid, name)
    s = _screen(pane)
    if "esc to interrupt" in s.lower() or _choices(s):
        raise RuntimeError("it is still working or waiting on a question; stop it first")
    _paste(pane, "/clear")


if __name__ == "__main__":  # self-check: python3 agent_chat.py
    s = "Bash command\n\n  rm x\n\n Do you want to proceed?\n ❯ 1. Yes\n   2. No, and tell Claude what to do differently (esc)\n\n Esc to cancel"
    c = _choices(s)
    assert c and [o["key"] for o in c["options"]] == ["1", "2"] and c["question"] == "Do you want to proceed?", c
    assert _choices("1. just a list\n2. in a reply") is None
    print("ok")
