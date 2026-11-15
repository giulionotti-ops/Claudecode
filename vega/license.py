"""License keys, checked offline.

A key is "NEESMO-<payload>.<signature>" (base64url). The payload is JSON like {"id": "...", "plan": "pro", "to": "...",
"issued": "2026-11-15"}; the signature is Ed25519 over the payload bytes. Only the seller holds the private key, so the
app can check a key with no server to call.

Nothing is locked without a key: the Settings menu shows the trial or license state. The owner's own copy (no
NEESMO_AUTH=1, the private setup) is shown as "Owner copy".

Seller side (keep the private key off the repo):
    python3 license.py issue --plan pro --to "Buyer name"        # prints a key
    python3 license.py check NEESMO-...                          # checks one
"""
import base64
import datetime
import json
import os
import sys
from pathlib import Path

PUBLIC_KEY = "6q10xKeKwpPQR9GmAD5KbimjDo1xa2G28RUclx7oEwI="
PRIVATE_KEY = Path(os.environ.get("NEESMO_SELLER_KEY", Path.home() / ".config" / "neesmo-seller" / "license_private.pem"))
DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo"))
FILE = DIR / "license.json"
TRIAL_DAYS = 14
PRODUCT = os.environ.get("NEESMO_AUTH", "") == "1"


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def verify(key: str) -> dict:
    """The key's payload, or ValueError."""
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    key = "".join(key.split())
    if not key.startswith("NEESMO-") or "." not in key:
        raise ValueError("that is not a Neesmo license key")
    body, _, sig = key[7:].partition(".")
    try:
        raw = _b64d(body)
        Ed25519PublicKey.from_public_bytes(base64.b64decode(PUBLIC_KEY)).verify(_b64d(sig), raw)
        data = json.loads(raw)
    except (InvalidSignature, ValueError):
        raise ValueError("this key is not valid")
    if data.get("expires") and data["expires"] < datetime.date.today().isoformat():
        raise ValueError(f"this key expired on {data['expires']}")
    return data


def _load() -> dict:
    try:
        return json.loads(FILE.read_text())
    except (OSError, ValueError):
        return {}


def _save(d: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    FILE.write_text(json.dumps(d, indent=1))


def status() -> dict:
    d = _load()
    if d.get("key"):
        try:
            p = verify(d["key"])
            return {"state": "licensed", "plan": p.get("plan", "pro"), "to": p.get("to", ""), "id": p.get("id", ""),
                    "expires": p.get("expires"), "key_end": d["key"][-6:]}
        except ValueError as e:
            return {"state": "invalid", "error": str(e)}
    if not PRODUCT:
        return {"state": "owner"}
    if "first_run" not in d:
        d["first_run"] = datetime.date.today().isoformat()
        _save(d)
    left = TRIAL_DAYS - (datetime.date.today() - datetime.date.fromisoformat(d["first_run"])).days
    return {"state": "trial" if left > 0 else "expired", "days_left": max(0, left)}


def activate(key: str) -> dict:
    verify(key)
    d = _load()
    d["key"] = "".join(key.split())
    _save(d)
    return status()


def remove() -> dict:
    d = _load()
    d.pop("key", None)
    _save(d)
    return status()


def issue(plan: str, to: str, expires: str | None = None) -> str:
    import secrets
    from cryptography.hazmat.primitives import serialization
    k = serialization.load_pem_private_key(PRIVATE_KEY.read_bytes(), password=None)
    p = {"id": secrets.token_hex(4), "plan": plan, "to": to, "issued": datetime.date.today().isoformat()}
    if expires:
        p["expires"] = expires
    raw = json.dumps(p, separators=(",", ":")).encode()
    return "NEESMO-" + _b64e(raw) + "." + _b64e(k.sign(raw))


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Neesmo license keys")
    sub = ap.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("issue"); i.add_argument("--plan", default="pro"); i.add_argument("--to", default="")
    i.add_argument("--expires", help="YYYY-MM-DD, leave out for a lifetime key")
    c = sub.add_parser("check"); c.add_argument("key")
    sub.add_parser("selftest")
    a = ap.parse_args()
    if a.cmd == "issue":
        print(issue(a.plan, a.to, a.expires))
    elif a.cmd == "check":
        try:
            print(verify(a.key))
        except ValueError as e:
            sys.exit(str(e))
    else:
        k = issue("pro", "Test")
        assert verify(k)["to"] == "Test"
        bad = k[:-4] + ("AAAA" if not k.endswith("AAAA") else "BBBB")
        for b in (bad, "hello", "NEESMO-x.y"):
            try:
                verify(b); sys.exit("bad key accepted: " + b)
            except ValueError:
                pass
        print("ok")
