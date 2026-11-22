"""Password login with remembered devices (product mode only).

Off unless NEESMO_AUTH=1, so a private Neesmo behind Tailscale keeps working as before.
On: the first visit sets the owner password (with the one-time setup code printed in the server log),
then each device logs in once and gets a long-lived cookie. Devices can be listed and signed out.
"""
import datetime
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from pathlib import Path

ENABLED = os.environ.get("NEESMO_AUTH", "") == "1"
DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo"))
FILE = DIR / "auth.json"
COOKIE = "neesmo_device"
DEVICE_DAYS = int(os.environ.get("NEESMO_DEVICE_DAYS", 365))
_lock = threading.Lock()
_fails: dict[str, list[float]] = {}
SETUP_CODE = secrets.token_hex(6) if ENABLED else ""


def _load() -> dict:
    try:
        return json.loads(FILE.read_text())
    except (OSError, ValueError):
        return {"password": None, "devices": []}


def _save(d: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = FILE.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(d, f, indent=1)
    os.replace(tmp, FILE)


def _hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1)
    return salt.hex() + "$" + h.hex()


def _check_pw(pw: str, stored: str) -> bool:
    salt, _, h = stored.partition("$")
    return hmac.compare_digest(_hash_pw(pw, bytes.fromhex(salt)).partition("$")[2], h)


def _tok_hash(tok: str) -> str:
    return hashlib.sha256(tok.encode()).hexdigest()


def has_password() -> bool:
    return bool(_load().get("password"))


def limited(ip: str) -> bool:
    """At most 5 wrong passwords per 10 minutes per address."""
    now = time.time()
    _fails[ip] = [t for t in _fails.get(ip, []) if now - t < 600]
    return len(_fails[ip]) >= 5


def _new_device(d: dict, name: str) -> str:
    tok = secrets.token_urlsafe(32)
    now = time.time()
    d["devices"].append({"id": secrets.token_hex(6), "name": (name or "Device")[:60], "hash": _tok_hash(tok),
                         "created": now, "seen": now})
    return tok


def setup(code: str, pw: str, name: str) -> str:
    """Set the owner password the first time. Returns a device token."""
    if len(pw) < 8:
        raise ValueError("use at least 8 characters")
    with _lock:
        d = _load()
        if d.get("password"):
            raise ValueError("password already set")
        if limited("setup"):   # one shared counter: the code can't be guessed from many addresses
            raise ValueError("too many tries, wait 10 minutes")
        if not hmac.compare_digest(code.strip().lower().encode(), SETUP_CODE.encode()):
            _fails.setdefault("setup", []).append(time.time())
            raise ValueError("wrong setup code (see the Neesmo server log)")
        d["password"] = _hash_pw(pw)
        tok = _new_device(d, name)
        _save(d)
        return tok


def login(ip: str, pw: str, name: str) -> str:
    if limited(ip):
        raise PermissionError("too many tries, wait 10 minutes")
    with _lock:
        d = _load()
        if not d.get("password") or not _check_pw(pw, d["password"]):
            _fails.setdefault(ip, []).append(time.time())
            raise ValueError("wrong password")
        tok = _new_device(d, name)
        _save(d)
        return tok


def device_for(tok: str | None) -> dict | None:
    if not tok:
        return None
    h = _tok_hash(tok)
    with _lock:
        d = _load()
        dev = next((x for x in d["devices"] if hmac.compare_digest(x["hash"], h)), None)
        if dev is None or time.time() - dev["seen"] > DEVICE_DAYS * 86400:
            return None
        if time.time() - dev["seen"] > 3600:  # keep "last seen" fresh without writing on every request
            dev["seen"] = time.time()
            _save(d)
        return dev


def devices(current: dict | None) -> list[dict]:
    fmt = lambda t: datetime.datetime.fromtimestamp(t).strftime("%d %b %Y")
    return [{"id": x["id"], "name": x["name"], "created": fmt(x["created"]), "seen": fmt(x["seen"]),
             "current": bool(current and current["id"] == x["id"])} for x in _load()["devices"]]


def forget(dev_id: str) -> bool:
    with _lock:
        d = _load()
        n = len(d["devices"])
        d["devices"] = [x for x in d["devices"] if x["id"] != dev_id]
        _save(d)
        return len(d["devices"]) < n


def change_password(old: str, new: str, keep: str | None = None) -> None:
    """Sets a new password and signs out every device except `keep` (the one changing it)."""
    if len(new) < 8:
        raise ValueError("use at least 8 characters")
    if limited("password"):
        raise ValueError("too many tries, wait 10 minutes")
    with _lock:
        d = _load()
        if not d.get("password") or not _check_pw(old, d["password"]):
            _fails.setdefault("password", []).append(time.time())
            raise ValueError("wrong password")
        d["password"] = _hash_pw(new)
        d["devices"] = [x for x in d["devices"] if x["id"] == keep]
        _save(d)


if __name__ == "__main__":  # self-check: python3 auth.py
    import tempfile
    DIR = Path(tempfile.mkdtemp()); FILE = DIR / "a.json"; SETUP_CODE = "abcd1234"
    try:
        setup("nope", "longpassword", "x"); raise SystemExit("bad code accepted")
    except ValueError:
        pass
    t = setup("ABCD1234", "longpassword", "iPhone")
    assert device_for(t)["name"] == "iPhone" and device_for("x") is None
    t2 = login("1.1.1.1", "longpassword", "Laptop")
    assert len(devices(device_for(t2))) == 2
    for _ in range(5):
        try: login("2.2.2.2", "wrong", "")
        except ValueError: pass
    assert limited("2.2.2.2")
    assert forget(device_for(t)["id"]) and device_for(t) is None
    change_password("longpassword", "newpassword1", device_for(t2)["id"]); login("3.3.3.3", "newpassword1", "")
    assert device_for(t2) and len(devices(None)) == 2
    change_password("newpassword1", "newpassword2"); assert device_for(t2) is None
    for _ in range(5):
        try: change_password("wrong", "newpassword3")
        except ValueError: pass
    assert limited("password")
    print("ok")
