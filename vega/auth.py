"""Login for Neesmo: password + 6-digit authenticator code, for when it is reachable from the internet.

Setup (on the server, over ssh):   .venv/bin/python auth.py setup
Log out every device:              .venv/bin/python auth.py logout-all

Design:
- Fails closed: until setup has run, nothing but the login page answers.
- Password stored only as a scrypt hash; authenticator secret and sessions live in
  ~/.config/neesmo (mode 600). Sessions are stored as SHA-256 hashes of the cookie.
- 5 wrong tries from one address lock that address for 15 minutes; 20 wrong tries in
  15 minutes from anywhere lock all logins for 15 minutes. Codes can't be reused.
- Cookie: __Host- prefix, Secure, HttpOnly, SameSite=Strict, 30 days. POSTs must come
  from this site (Origin check). Every attempt is logged to ~/neesmo-logins.log.
"""
import asyncio
import base64
import datetime
import getpass
import hashlib
import hmac
import html
import json
import os
import secrets
import struct
import sys
import time
from collections import deque
from pathlib import Path
from urllib.parse import urlsplit

DIR = Path(os.environ.get("NEESMO_AUTH_DIR", Path.home() / ".config" / "neesmo"))
CONF = DIR / "auth.json"
SESSIONS = DIR / "sessions.json"
LOG = Path(os.environ.get("NEESMO_LOGIN_LOG", Path.home() / "neesmo-logins.log"))
COOKIE = "__Host-neesmo"
SESSION_DAYS = 30
IP_MAX, GLOBAL_MAX, WINDOW = 5, 20, 15 * 60
SCRYPT = dict(n=2**15, r=8, p=1, maxmem=64 * 1024 * 1024, dklen=32)
PUBLIC = {"/login"}


# ── storage ──
def _write(path: Path, data: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(data, f)
    os.replace(tmp, path)


def _read(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return {}


# ── password ──
def _hash_pw(pw: str, salt: bytes) -> bytes:
    return hashlib.scrypt(pw.encode(), salt=salt, **SCRYPT)


# ── TOTP (RFC 6238, SHA-1, 30 s, 6 digits) ──
def _totp(secret_b32: str, counter: int) -> str:
    key = base64.b32decode(secret_b32)
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = mac[-1] & 0x0F
    return f"{(struct.unpack('>I', mac[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000:06d}"


def _totp_match(secret_b32: str, code: str, now: float) -> int | None:
    """Counter of the matching code within ±1 step, or None."""
    if not (len(code) == 6 and code.isdigit()):
        return None
    c = int(now // 30)
    for k in (c - 1, c, c + 1):
        if hmac.compare_digest(_totp(secret_b32, k), code):
            return k
    return None


# ── login state ──
_fails_ip: dict[str, deque] = {}
_fails_all: deque = deque()
_locked_ip: dict[str, float] = {}
_locked_all = [0.0]
_login_lock = asyncio.Lock()


def _log(ip: str, result: str, ua: str = "") -> None:
    line = f"{datetime.datetime.now().isoformat(timespec='seconds')}  {ip:<40} {result:<22} {ua[:120]}\n"
    try:
        fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        with os.fdopen(fd, "a") as f:
            f.write(line)
    except OSError:
        pass


def _prune(q: deque, now: float) -> None:
    while q and now - q[0] > WINDOW:
        q.popleft()


def _locked(ip: str, now: float) -> bool:
    return _locked_all[0] > now or _locked_ip.get(ip, 0) > now


def _fail(ip: str, now: float) -> None:
    q = _fails_ip.setdefault(ip, deque())
    q.append(now); _fails_all.append(now)
    _prune(q, now); _prune(_fails_all, now)
    if len(q) >= IP_MAX:
        _locked_ip[ip] = now + WINDOW; q.clear()
        _log(ip, "LOCKED (this address)")
    if len(_fails_all) >= GLOBAL_MAX:
        _locked_all[0] = now + WINDOW; _fails_all.clear()
        _log(ip, "LOCKED (all logins)")
    if len(_fails_ip) > 10_000:  # bound memory under a flood
        _fails_ip.clear()


async def check_login(ip: str, pw: str, code: str) -> str:
    """Returns 'ok', 'locked', 'bad' or 'unconfigured'."""
    conf = _read(CONF)
    if not conf.get("hash") or not conf.get("totp"):
        return "unconfigured"
    async with _login_lock:  # one attempt at a time: no parallel guessing, no code reuse races
        now = time.time()
        if _locked(ip, now):
            return "locked"
        pw_ok = hmac.compare_digest(
            await asyncio.to_thread(_hash_pw, pw[:1024], bytes.fromhex(conf["salt"])), bytes.fromhex(conf["hash"]))
        counter = _totp_match(conf["totp"], code.strip().replace(" ", ""), now)
        if pw_ok and counter is not None and counter > conf.get("last_counter", 0):
            conf["last_counter"] = counter
            _write(CONF, conf)
            _fails_ip.pop(ip, None)
            return "ok"
        _fail(ip, now)
        return "bad"


# ── sessions ──
def _sid_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_session() -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    s = {k: v for k, v in _read(SESSIONS).items() if v > now}
    s[_sid_hash(token)] = now + SESSION_DAYS * 86400
    _write(SESSIONS, s)
    return token


def valid_session(token: str | None) -> bool:
    if not token or len(token) > 100:
        return False
    exp = _read(SESSIONS).get(_sid_hash(token))
    return bool(exp and exp > time.time())


def end_session(token: str | None) -> None:
    if token:
        s = _read(SESSIONS)
        if s.pop(_sid_hash(token), None) is not None:
            _write(SESSIONS, s)


# ── HTTP glue ──
def client_ip(request) -> str:
    # Uvicorn listens on 127.0.0.1 only, so every request comes through Tailscale on this
    # machine; the last X-Forwarded-For entry is the one Tailscale itself added.
    xff = request.headers.get("x-forwarded-for", "")
    return (xff.split(",")[-1].strip() if xff else "") or (request.client.host if request.client else "?")


def same_origin(request) -> bool:
    origin = request.headers.get("origin")
    if origin is None:  # browsers always send Origin on POST; non-browser clients still need the cookie
        return True
    return urlsplit(origin).netloc == request.headers.get("host", "")


SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000",
    "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(self)",
    "Cache-Control": "no-store",
}


def login_page(msg: str = "") -> str:
    m = f'<p class="err">{html.escape(msg)}</p>' if msg else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Neesmo · Sign in</title>
<style>
 html,body{{margin:0;height:100%;background:radial-gradient(ellipse at center,#06331a 0%,#02070d 70%);color:#3dff8f;
  font:15px/1.4 ui-monospace,"SF Mono",Menlo,Consolas,monospace;display:grid;place-items:center}}
 form{{width:min(320px,calc(100vw - 32px));display:grid;gap:12px}}
 h1{{font-size:18px;letter-spacing:.2em;text-align:center;margin:0 0 8px}}
 label{{font-size:12px;opacity:.8}}
 input,button{{font:inherit;padding:10px;border:1px solid rgba(61,255,143,.5);background:rgba(0,0,0,.4);color:#3dff8f;border-radius:6px;width:100%;box-sizing:border-box}}
 button{{cursor:pointer;background:rgba(61,255,143,.15)}} .err{{color:#ff5f6d;margin:0;text-align:center}}
</style></head><body>
<form method="post" action="/login">
 <h1>NEESMO</h1>{m}
 <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
 <label for="code">6-digit code</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{{6,7}}" maxlength="7" required>
 <button>Sign in</button>
</form></body></html>"""


# ── CLI ──
def _setup() -> None:
    print("Neesmo login setup. Choose a password of at least 14 characters (a few random words works well).")
    while True:
        pw = getpass.getpass("New password: ")
        if len(pw) < 14:
            print("Too short, at least 14 characters."); continue
        if pw != getpass.getpass("Repeat it: "):
            print("They don't match, try again."); continue
        break
    salt = secrets.token_bytes(16)
    secret = base64.b32encode(secrets.token_bytes(20)).decode()
    uri = f"otpauth://totp/Neesmo:server?secret={secret}&issuer=Neesmo&digits=6&period=30"
    print("\nAdd Neesmo to your authenticator app (iPhone Passwords app, Google Authenticator, ...).")
    print("Scan this QR code, or type the setup key by hand.\n")
    if os.system(f"command -v qrencode >/dev/null && qrencode -t ANSIUTF8 '{uri}'") != 0:
        print("(install qrencode to see a QR code here)")
    print(f"\nSetup key: {' '.join(secret[i:i + 4] for i in range(0, len(secret), 4))}\n")
    while True:
        code = input("Type the 6-digit code the app shows now, to confirm: ").strip().replace(" ", "")
        if _totp_match(secret, code, time.time()) is not None:
            break
        print("That code doesn't match. Check the app and try the current code.")
    _write(CONF, {"salt": salt.hex(), "hash": _hash_pw(pw, salt).hex(), "totp": secret, "last_counter": 0})
    _write(SESSIONS, {})
    print("\nDone. Every device is logged out; sign in again with the password and a code.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "setup":
        _setup()
    elif cmd == "logout-all":
        _write(SESSIONS, {}); print("All devices logged out.")
    else:
        print(__doc__)
