"""License keys, checked offline.

A key is "NEESMO-<payload>.<signature>" (base64url). The payload is JSON like {"id": "...", "plan": "pro", "to": "...",
"issued": "2026-11-15"}; the signature is Ed25519 over the payload bytes. Only the seller holds the private key, so the
app can check a key with no server to call.

Nothing is locked without a key: the Settings menu shows the trial or license state. The owner's own copy (no
NEESMO_AUTH=1, the private setup) is shown as "Owner copy".

Two kinds of key:
- Store keys (a UUID from Lemon Squeezy, which takes the payment and sends the key). Activated once online on this
  server (one seat; the store sets how many servers a key may use), then re-checked about once a week. If the store
  can't be reached the copy keeps working for 30 days. Removing the key frees the seat for another server.
- Signed keys (below) for gifts, press and manual sales; checked offline, never call home.

Early-access buyers keep their key for good: every update, including the full release, is free.

Seller side (keep the private key off the repo):
    python3 license.py issue --plan pro --to "Buyer name"        # prints a key
    python3 license.py check NEESMO-...                          # checks one
"""
import base64
import datetime
import json
import os
import sys
import threading
import time
from pathlib import Path

PUBLIC_KEY = "6q10xKeKwpPQR9GmAD5KbimjDo1xa2G28RUclx7oEwI="
PRIVATE_KEY = Path(os.environ.get("NEESMO_SELLER_KEY", Path.home() / ".config" / "neesmo-seller" / "license_private.pem"))
DIR = Path(os.environ.get("NEESMO_DIR", Path.home() / ".config" / "neesmo"))
FILE = DIR / "license.json"
TRIAL_DAYS = 14
STORE = "https://api.lemonsqueezy.com/v1/licenses"
# Seller: fill these two in once the store exists (see SELLING.md).
STORE_PRODUCT = os.environ.get("NEESMO_STORE_PRODUCT", "")   # Lemon Squeezy product id; keys for other products are refused
BUY_URL = os.environ.get("NEESMO_BUY_URL", "")               # the checkout page, shown as "Buy a key" in Settings
RECHECK_DAYS, GRACE_DAYS = 7, 30
_UUID = __import__("re").compile(r"^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$")
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


def _store(action: str, **form) -> dict:
    """One call to the store's license API. ValueError with a plain message on a refusal, OSError when offline."""
    import httpx
    try:
        r = httpx.post(f"{STORE}/{action}", data=form, headers={"Accept": "application/json"}, timeout=15)
    except httpx.HTTPError as e:
        raise OSError(f"could not reach the store: {e}") from e
    try:
        d = r.json()
    except ValueError:
        raise OSError(f"the store answered {r.status_code}")
    if r.status_code >= 500 or r.status_code in (401, 403, 408, 429):   # store trouble, not a verdict on the key
        raise OSError(f"the store answered {r.status_code}")
    if d.get("error") or not d.get("valid", d.get("activated", d.get("deactivated", False))):
        raise ValueError(d.get("error") or "this key is not valid")
    if action != "deactivate" and d.get("meta") and str(d["meta"].get("product_id", "")) != STORE_PRODUCT:
        raise ValueError("this key is for another product")
    if (d.get("license_key") or {}).get("status") in ("disabled", "expired"):
        raise ValueError(f"this key is {d['license_key']['status']}")
    return d


def _plan(meta: dict) -> str:
    v = f"{meta.get('variant_name', '')} {meta.get('product_name', '')}".lower()
    return "early access" if "early" in v else "pro"


def _today() -> str:
    return datetime.date.today().isoformat()


def _load() -> dict:
    try:
        return json.loads(FILE.read_text())
    except (OSError, ValueError):
        return {}


def _save(d: dict) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    FILE.write_text(json.dumps(d, indent=1))


def _age(day) -> int:
    """Days since an ISO date; a missing or edited value counts as very old. A clock set back counts as old too."""
    try:
        n = (datetime.date.today() - datetime.date.fromisoformat(day)).days
    except (TypeError, ValueError):
        return 9999
    return n if n >= 0 else 9999


_lock = threading.Lock()


def _store_status(d: dict) -> dict:
    s = d["store"]
    if _age(s.get("checked")) >= RECHECK_DAYS and time.time() - s.get("last_try", 0) > 3600:   # at most one try an hour
        s["last_try"] = time.time()
        try:
            r = _store("validate", license_key=d["key"], instance_id=s["instance"])
            s.update(checked=_today(), plan=_plan(r.get("meta") or {}), to=(r.get("meta") or {}).get("customer_name", s.get("to", "")))
            s.pop("error", None)
        except ValueError as e:   # refunded, disabled, seat removed in the store
            s["error"] = str(e)
        except OSError:
            pass   # offline: keep going inside the grace period
        _save(d)
    if s.get("error"):
        return {"state": "invalid", "error": s["error"]}
    if _age(s.get("checked")) > GRACE_DAYS:
        return {"state": "invalid", "error": "could not check the key with the store for 30 days; check the internet connection"}
    return {"state": "licensed", "plan": s.get("plan", "pro"), "to": s.get("to", ""), "id": s.get("instance", "")[:8],
            "expires": None, "key_end": d["key"][-6:], "store": True}


def status() -> dict:
    with _lock:
        return _status()


def _status() -> dict:
    d = _load()
    if d.get("key") and d.get("store"):
        return _store_status(d)
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
    with _lock:
        _activate(key)
    return status()


def _activate(key: str) -> None:
    key = "".join(key.split())
    d = _load()
    if _UUID.match(key):
        import socket
        if not STORE_PRODUCT:
            raise ValueError("this copy is not set up for store keys yet")
        if d.get("key") == key and d.get("store", {}).get("instance"):   # already this server's seat: just re-check it
            d["store"]["checked"] = "2000-01-01"
            d["store"].pop("last_try", None)
            _save(d)
            return
        try:
            r = _store("activate", license_key=key, instance_name=f"neesmo@{socket.gethostname()}"[:100])
        except OSError as e:
            raise ValueError(f"{e}. Activation needs the internet once.")
        meta = r.get("meta") or {}
        if not (r.get("instance") or {}).get("id"):
            raise ValueError("the store did not register this server; try again")
        _release(d)
        d["key"], d["store"] = key, {"instance": (r.get("instance") or {}).get("id", ""), "checked": _today(),
                                     "plan": _plan(meta), "to": meta.get("customer_name", "")}
    else:
        verify(key)
        _release(d)
        d["key"] = key
        d.pop("store", None)
    _save(d)


def _release(d: dict) -> None:
    """Free this server's seat in the store (best effort)."""
    if d.get("key") and d.get("store", {}).get("instance"):
        try:
            _store("deactivate", license_key=d["key"], instance_id=d["store"]["instance"])
        except (OSError, ValueError):
            pass


def remove() -> dict:
    with _lock:
        d = _load()
        _release(d)
        d.pop("key", None)
        d.pop("store", None)
        _save(d)
    return status()


def allowed() -> bool:
    """False only for a product copy whose trial ended with no working key."""
    return status()["state"] in ("owner", "licensed", "trial")


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
