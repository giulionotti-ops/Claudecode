"""Web Push for the Neesmo home-screen app (iOS 16.4+ when added to the home screen).

Keys and subscriptions live in ~/.config/neesmo (mode 600), never in the repo.
"""
import base64
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid
from pywebpush import WebPushException, webpush

DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo"))
KEY = DIR / "vapid_private.pem"
SUBS = DIR / "push_subscriptions.json"
# Apple requires a mailto: or https: contact in the token; use the app's own address, no personal email.
CONTACT = os.environ.get("NEESMO_PUSH_CONTACT", "https://vmi3743434.tail90037e.ts.net")


def _vapid() -> Vapid:
    DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not KEY.exists():
        v = Vapid(); v.generate_keys()
        fd = os.open(KEY, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(v.private_pem())
    return Vapid.from_file(str(KEY))


def public_key() -> str:
    raw = _vapid().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _load() -> list[dict]:
    try:
        return json.loads(SUBS.read_text())
    except (OSError, ValueError):
        return []


def _save(subs: list[dict]) -> None:
    DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = SUBS.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(subs, f)
    os.replace(tmp, SUBS)


def subscribe(sub: dict) -> None:
    if not isinstance(sub, dict) or not str(sub.get("endpoint", "")).startswith("https://") or "keys" not in sub:
        raise ValueError("not a push subscription")
    subs = [s for s in _load() if s.get("endpoint") != sub["endpoint"]]
    subs.append({"endpoint": sub["endpoint"], "keys": sub["keys"]})
    _save(subs[-10:])  # a few devices at most


def unsubscribe(endpoint: str) -> None:
    _save([s for s in _load() if s.get("endpoint") != endpoint])


def send(title: str, body: str, tag: str | None = None, url: str = "/") -> int:
    """Send to every subscribed device; drops ones the push service says are gone. Returns how many got it."""
    subs, keep, sent = _load(), [], 0
    data = json.dumps({"title": title, "body": body[:300], "tag": tag, "url": url})
    for s in subs:
        try:
            webpush(s, data, vapid_private_key=str(KEY), vapid_claims={"sub": CONTACT}, ttl=3600)
            keep.append(s); sent += 1
        except WebPushException as e:
            code = getattr(e.response, "status_code", None)
            if code not in (404, 410):  # 404/410: the device unsubscribed or the app was removed
                keep.append(s)
            print(f"push failed ({code}): {str(e)[:200]}", flush=True)
    if len(keep) != len(subs):
        _save(keep)
    return sent
