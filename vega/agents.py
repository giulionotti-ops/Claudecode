"""Read-only status of the server's Claude agents for Neesmo's agent cards and report view.

Sources (all local, nothing is sent anywhere): each project's newest Claude Code transcript in
~/.claude/projects, its git checkout, and whether a Remote Control worker process runs in it.
"""
import datetime
import json
import os
import re
import subprocess
import time
from collections import Counter
from pathlib import Path

HOME = Path.home()
NEESMO_DIR = Path(os.environ.get("NEESMO_DIR", HOME / ".config" / "neesmo"))
CONFIG = NEESMO_DIR / "agents.json"   # made by the setup wizard / Settings → Agents
AGENT_HOME = Path(os.environ.get("NEESMO_AGENT_HOME", HOME / "neesmo-agents"))  # default folder for new agents
COLORS = ["#ff6b6b", "#ff7ac6", "#5cc8ff", "#b388ff", "#ffd166", "#3dff8f", "#ff9f43", "#7ee8fa"]
# Without agents.json: the original private setup, unchanged.
DEFAULTS = [
    {"id": "setup", "name": "Setup & uploader", "folder": str(HOME / "Claudecode"), "role": "Server setup, uploader, Neesmo", "short": "Setup", "color": "#3dff8f", "hidden": True},
    {"id": "glazier", "name": "Glazier of Terra", "folder": str(HOME / "glazier-40k"), "role": "40k lore shorts", "short": "YouTube", "color": "#7d8a83", "dev": True},
    {"id": "comics", "name": "Warhammer 40K comics", "folder": str(HOME / "comics-40k"), "role": "Comic shorts", "short": "Comics", "color": "#ff6b6b"},
    {"id": "gta6", "name": "GTA6 clips", "folder": str(HOME / "gta6"), "role": "Clips and shorts", "short": "Clips", "color": "#ff7ac6"},
    {"id": "physics", "name": "Fable physics", "folder": str(HOME / "physics-channel"), "role": "Physics shorts", "short": "Physics", "color": "#5cc8ff"},
    {"id": "roblox", "name": "Roblox games", "folder": str(HOME / "roblox"), "role": "Roblox games", "short": "Roblox", "color": "#b388ff"},
    {"id": "product", "name": "Neesmo product", "folder": str(HOME / "neesmo-product"), "role": "Make Neesmo sellable", "short": "Product", "color": "#ffd166"},
]
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,23}$")


def load() -> list[dict]:
    try:
        items = json.loads(CONFIG.read_text())
        return items if isinstance(items, list) else DEFAULTS
    except (OSError, ValueError):
        return DEFAULTS


def configured() -> bool:
    return CONFIG.exists()


def instructions(a: dict) -> str:
    """The dedicated agent's brief: what it is for and how it finishes a job."""
    return (a.get("instructions") or "").strip() or (
        f"You are {a['name']}, a dedicated Neesmo agent. Your job area: {a.get('role') or a['name']}. "
        "When given a task, finish it end to end on your own: work out the steps, do them, check the result works, "
        "and commit your work if this folder is a git repository. Ask the owner only for things that cost money, "
        "publish something, or delete data. End with a 2-3 line report: what you did, what is left, and anything the owner must do.")


def save(items: list[dict]) -> list[dict]:
    """Validate and store the agent list. New agents get a folder under ~/neesmo-agents."""
    out, seen = [], set()
    for i, raw in enumerate(items[:16]):
        name = str(raw.get("name", "")).strip()[:40]
        aid = str(raw.get("id") or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"))[:24]
        if not name or not _ID.match(aid):
            raise ValueError(f"agent {i + 1}: give it a name that starts with a letter or number")
        if aid in seen:
            raise ValueError(f"{name}: another agent already uses this name")
        seen.add(aid)
        folder = Path(os.path.expanduser(str(raw.get("folder") or AGENT_HOME / aid))).resolve()
        if folder != HOME and HOME not in folder.parents:
            raise ValueError(f"{name}: folder must be inside {HOME}")
        folder.mkdir(parents=True, exist_ok=True)
        color = str(raw.get("color") or COLORS[i % len(COLORS)])
        if not re.match(r"^#[0-9a-fA-F]{6}$", color):
            raise ValueError(f"{name}: colour must look like #33ff99")
        out.append({"id": aid, "name": name, "folder": str(folder), "role": str(raw.get("role", "")).strip()[:120],
                    "short": (str(raw.get("short") or name.split()[0]).strip())[:10], "color": color,
                    "instructions": str(raw.get("instructions", "")).strip()[:4000],
                    **({"hidden": True} if raw.get("hidden") else {}), **({"dev": True} if raw.get("dev") else {})})
    NEESMO_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG.write_text(json.dumps(out, indent=1))
    _cache.clear()
    return out


def folders() -> dict[str, Path]:
    return {a["id"]: Path(a["folder"]) for a in load()}


def _get(aid: str) -> dict | None:
    return next((a for a in load() if a["id"] == aid), None)


TAIL_BYTES = 6 * 1024 * 1024   # enough for today's activity without reading whole multi-MB logs
_cache: dict[str, tuple[float, dict]] = {}


def _log_file(folder: Path) -> Path | None:
    d = HOME / ".claude" / "projects" / ("-" + str(folder).strip("/").replace("/", "-"))
    logs = sorted(d.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True) if d.exists() else []
    for p in logs:  # skip the nightly chat-refresh helper's own chats
        with open(p, "rb") as f:
            if b"NIGHTLY-CHAT-REFRESH" not in f.read(30000):
                return p
    return None


def _entries(path: Path) -> list[dict]:
    size = path.stat().st_size
    with open(path, "rb") as f:
        if size > TAIL_BYTES:
            f.seek(size - TAIL_BYTES)
            f.readline()  # skip the partial first line
        raw = f.read()
    out = []
    for line in raw.splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def _online(folder: Path) -> bool:
    """A Remote Control worker (claude --sdk-url ...) is running in this folder."""
    for pid in filter(str.isdigit, os.listdir("/proc")):
        try:
            if os.readlink(f"/proc/{pid}/cwd") != str(folder):
                continue
            if b"--sdk-url" in Path(f"/proc/{pid}/cmdline").read_bytes():
                return True
        except OSError:
            continue
    return False


def _git(folder: Path, *args: str) -> str:
    try:
        return subprocess.run(["git", "-C", str(folder), *args], capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def _ts(e: dict) -> datetime.datetime | None:
    try:
        return datetime.datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")).astimezone()
    except (KeyError, ValueError, AttributeError):
        return None


def _text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def _clean_prompt(t: str) -> str:
    t = t.strip()
    if t.startswith("[Image"):
        return "(sent an image)"
    if t.startswith("<cross-session-message"):
        body = t.split("\n\n", 1)[-1].rsplit("</cross-session-message>", 1)[0].strip()
        return "[from another session] " + body
    return t


def _tool_label(b: dict) -> str:
    i = b.get("input") or {}
    detail = i.get("description") or i.get("file_path") or i.get("pattern") or i.get("query") or i.get("url") or ""
    return f"{b.get('name', '?')}: {str(detail)[:90]}".rstrip(": ")


def _summarise(aid: str, name: str, folder: Path, role: str) -> dict:
    log = _log_file(folder)
    online = _online(folder)
    rep: dict = {"id": aid, "name": name, "role": role, "folder": str(folder), "online": online,
                 "status": "offline" if not online else "idle"}
    if log is None:
        return rep
    entries = _entries(log)
    now = datetime.datetime.now().astimezone()
    today = now.date()
    last_ts, last_reply, last_reply_at, last_request, last_request_at = None, "", None, "", None
    requests, tools, model, stop, context = [], [], "", "", 0
    tool_counts, day = Counter(), Counter()
    for e in entries:
        t = e.get("type")
        ts = _ts(e)
        if t == "custom-title" and e.get("customTitle"):
            rep["name"] = e["customTitle"].replace(" (server)", "")
        if t not in ("user", "assistant") or e.get("isSidechain"):
            continue
        if ts:
            last_ts = ts
        msg = e.get("message") or {}
        content = msg.get("content")
        if t == "user":
            if isinstance(content, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
                continue
            txt = _clean_prompt(_text(content))
            if not txt or txt.startswith("<") and not txt.startswith("[from"):
                continue
            last_request, last_request_at = txt, ts
            requests.append({"at": ts.strftime("%d %b %H:%M") if ts else "", "text": txt[:400]})
            if ts and ts.date() == today:
                day["requests"] += 1
        else:
            model = msg.get("model") or model
            stop = msg.get("stop_reason") or stop
            u = msg.get("usage") or {}
            ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
            if ctx:
                context = ctx
            if ts and ts.date() == today:
                day["output_tokens"] += u.get("output_tokens", 0)
                day["input_tokens"] += u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
                day["cached_tokens"] += u.get("cache_read_input_tokens", 0)
            for b in content or []:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "text" and b.get("text", "").strip():
                    last_reply, last_reply_at = b["text"].strip(), ts
                elif b.get("type") == "tool_use":
                    tools.append({"at": ts.strftime("%H:%M") if ts else "", "label": _tool_label(b)})
                    if ts and ts.date() == today:
                        tool_counts[b.get("name", "?")] += 1
                        day["tool_calls"] += 1
    age = (now - last_ts).total_seconds() if last_ts else None
    if online and (time.time() - log.stat().st_mtime < 45 or (stop == "tool_use" and age is not None and age < 900)):
        rep["status"] = "working"
    behind_ahead = _git(folder, "rev-list", "--left-right", "--count", "@{u}...HEAD").split()
    commits = [dict(zip(("hash", "ago", "subject"), l.split("\x1f", 2)))
               for l in _git(folder, "log", "-8", "--format=%h\x1f%cr\x1f%s").splitlines() if l]
    changed = [l for l in _git(folder, "status", "--porcelain").splitlines() if l]
    rep.update({
        "last_active": last_ts.isoformat() if last_ts else None,
        "last_active_ago": _ago(age),
        "model": model, "context_tokens": context,
        "last_reply": last_reply[:2000], "last_reply_at": last_reply_at.strftime("%d %b %H:%M") if last_reply_at else "",
        "last_request": last_request[:600], "last_request_at": last_request_at.strftime("%d %b %H:%M") if last_request_at else "",
        "requests": requests[-6:][::-1], "tools": tools[-12:][::-1],
        "today": dict(day), "tool_counts": tool_counts.most_common(6),
        "git": {"branch": _git(folder, "branch", "--show-current"), "commits": commits,
                "uncommitted": len(changed), "unpushed": int(behind_ahead[1]) if len(behind_ahead) == 2 else None},
    })
    return rep


def _ago(sec: float | None) -> str:
    if sec is None:
        return "never"
    if sec < 60:
        return "just now"
    for unit, n in (("d", 86400), ("h", 3600), ("m", 60)):
        if sec >= n:
            return f"{int(sec // n)}{unit} ago"
    return ""


def report(aid: str) -> dict | None:
    a = _get(aid)
    if a is None:
        return None
    folder = Path(a["folder"])
    log = _log_file(folder)
    key = (log.stat().st_mtime if log else 0, _online(folder))
    hit = _cache.get(aid)
    if hit and hit[0] == key and time.time() - hit[1]["_at"] < 60:
        return hit[1]
    rep = _summarise(aid, a["name"], folder, a.get("role", ""))
    rep.update(color=a.get("color"), short=a.get("short"), dev=bool(a.get("dev")))
    rep["_at"] = time.time()
    _cache[aid] = (key, rep)
    return rep


def overview() -> list[dict]:
    keep = ("id", "name", "role", "online", "status", "last_active_ago", "last_reply", "model", "today", "git",
            "color", "short", "dev")
    out = []
    for a in load():
        if a.get("hidden"):
            continue
        r = report(a["id"]) or {}
        card = {k: r.get(k) for k in keep}
        card["last_reply"] = (card.get("last_reply") or "")[:160]
        out.append(card)
    return out
