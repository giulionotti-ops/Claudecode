"""Neesmo's notification history and the agents' permission requests (approvals).

The approval_hook.py PermissionRequest hook posts each permission prompt of the server's Claude
sessions here and waits for a decision made in the Neesmo app. Everything lives in
~/.config/neesmo (mode 600), never in the repo.
"""
import datetime
import json
import os
import secrets
import threading
import time
from pathlib import Path

DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo"))
FILE = DIR / "notifications.json"
TOKEN = DIR / "hook_token"
WAIT_S = int(os.environ.get("NEESMO_APPROVAL_WAIT_S", 172800))  # how long the hook waits (2 days, so it can be answered the next day)
KEEP = 200
_lock = threading.Lock()
_items: list[dict] = []
_loaded = False


def hook_token() -> str:
    """Shared secret the hook sends, so only local hooks (not a browser) can create approvals."""
    DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not TOKEN.exists():
        fd = os.open(TOKEN, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_urlsafe(32))
    return TOKEN.read_text().strip()


def _load() -> None:
    global _loaded
    if _loaded:
        return
    try:
        _items.extend(json.loads(FILE.read_text()))
    except (OSError, ValueError):
        pass
    _loaded = True


def _save() -> None:
    DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = FILE.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(_items[-KEEP:], f)
    os.replace(tmp, FILE)


def _expire_old() -> None:
    """A pending approval whose hook has given up (or was cancelled) is answered in the Claude app instead."""
    now = time.time()
    for i in _items:
        if i.get("status") == "pending" and now - i["ts"] > WAIT_S + 15:
            i["status"] = "expired"


def add(kind: str, title: str, body: str, **extra) -> dict:
    with _lock:
        _load()
        nid = max((i["id"] for i in _items), default=0) + 1
        item = {"id": nid, "kind": kind, "title": title, "body": body[:4000], "ts": time.time(),
                "at": datetime.datetime.now().strftime("%d %b %H:%M"), **extra}
        _items.append(item)
        del _items[:-KEEP]
        _save()
        return item


def history() -> list[dict]:
    with _lock:
        _load()
        _expire_old()
        return list(reversed(_items))


def get(nid: int) -> dict | None:
    with _lock:
        _load()
        _expire_old()
        return next((i for i in _items if i["id"] == nid), None)


def decide(nid: int, decision: str) -> dict:
    """Approve or deny a pending request. Raises ValueError if it is no longer pending."""
    if decision not in ("allow", "deny"):
        raise ValueError("decision must be allow or deny")
    with _lock:
        _load()
        _expire_old()
        item = next((i for i in _items if i["id"] == nid and i["kind"] == "approval"), None)
        if item is None:
            raise ValueError("no such request")
        if item["status"] != "pending":
            raise ValueError(f"already {item['status']}")
        item["status"] = "approved" if decision == "allow" else "denied"
        item["decided_at"] = datetime.datetime.now().strftime("%d %b %H:%M")
        _save()
        return item


def expire(nid: int) -> None:
    with _lock:
        _load()
        for i in _items:
            if i["id"] == nid and i.get("status") == "pending":
                i["status"] = "expired"
                _save()


def remove(nid: int | None = None) -> int:
    """Delete one notification, or all of them (nid None). A still-pending approval is kept: its chat is waiting on it."""
    with _lock:
        _load()
        _expire_old()
        keep = [i for i in _items if i.get("status") == "pending" or (nid is not None and i["id"] != nid)]
        gone = len(_items) - len(keep)
        _items[:] = keep
        _save()
        return gone


if __name__ == "__main__":  # self-check: python3 notes.py
    import tempfile
    DIR = Path(tempfile.mkdtemp()); FILE = DIR / "n.json"; TOKEN = DIR / "t"
    a = add("approval", "Roblox wants to run a command", "rm -rf build", status="pending", tool="Bash")
    assert get(a["id"])["status"] == "pending"
    assert decide(a["id"], "allow")["status"] == "approved"
    try:
        decide(a["id"], "deny"); raise SystemExit("decided twice")
    except ValueError:
        pass
    b = add("approval", "x", "y", status="pending"); b["ts"] -= WAIT_S + 60
    assert get(b["id"])["status"] == "expired"
    assert history()[0]["id"] == b["id"] and len(hook_token()) > 20
    c = add("info", "hi", "x"); p = add("approval", "a", "b", status="pending")
    assert remove(c["id"]) == 1 and get(c["id"]) is None
    remove(); assert [i["id"] for i in history()] == [p["id"]]
    print("ok")
