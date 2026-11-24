"""Instagram for channel agents: publish Reels and read insights through the official Instagram API (free).

The owner makes a free Meta developer app with "Instagram API with Instagram Login" (the setup guide walks
them through it) and pastes the long-lived token; <conf>/studio/instagram.json = {"token", "user_id"}.
Instagram's API cannot schedule, so Neesmo's tick publishes at the slot time itself.
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from . import state

CONF = state.DIR / "instagram.json"
API = "https://graph.instagram.com/v21.0"
RUPLOAD = "https://rupload.facebook.com/ig-api-upload/v21.0"


def connected() -> bool:
    return CONF.exists()


def _conf() -> dict:
    return json.loads(CONF.read_text())


def _call(method: str, url: str, params: dict | None = None, data: bytes | None = None, headers: dict | None = None) -> dict:
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=data if data is not None else (b"" if method == "POST" else None),
                                 method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read() or b"{}")


def save_token(token: str) -> dict:
    me = _call("GET", f"{API}/me", {"fields": "user_id,username", "access_token": token.strip()})
    CONF.parent.mkdir(parents=True, exist_ok=True)
    CONF.write_text(json.dumps({"token": token.strip(), "user_id": me.get("user_id") or me.get("id"),
                                "username": me.get("username")}))
    CONF.chmod(0o600)
    return {"username": me.get("username")}


def refresh_token() -> None:
    """Long-lived tokens last 60 days; refresh weekly from the tick."""
    c = _conf()
    r = _call("GET", f"{API.rsplit('/', 1)[0]}/refresh_access_token",
              {"grant_type": "ig_refresh_token", "access_token": c["token"]})
    if r.get("access_token"):
        c["token"] = r["access_token"]
        CONF.write_text(json.dumps(c))


def publish(v: dict) -> str:
    """Upload the local video as a Reel and publish it now. Returns the media id."""
    c = _conf()
    tok, uid = c["token"], c["user_id"]
    caption = (v.get("description") or v.get("title") or "")[:2200]
    box = _call("POST", f"{API}/{uid}/media", {"media_type": "REELS", "upload_type": "resumable",
                                                 "caption": caption, "share_to_feed": "true", "access_token": tok})["id"]
    data = Path(v["video"]).read_bytes()
    _call("POST", f"{RUPLOAD}/{box}", data=data,
          headers={"Authorization": f"OAuth {tok}", "offset": "0", "file_size": str(len(data))})
    for _ in range(60):
        st = _call("GET", f"{API}/{box}", {"fields": "status_code,status", "access_token": tok})
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram could not process the video: {st.get('status')}")
        time.sleep(10)
    mid = _call("POST", f"{API}/{uid}/media_publish", {"creation_id": box, "access_token": tok})["id"]
    if v.get("pinned"):
        try:
            _call("POST", f"{API}/{mid}/comments", {"message": v["pinned"][:2200], "access_token": tok})
        except Exception:
            pass
    return mid


def stats(ids: list[str]) -> dict[str, dict]:
    tok = _conf()["token"]
    out: dict[str, dict] = {}
    for mid in ids:
        try:
            r = _call("GET", f"{API}/{mid}/insights", {"metric": "views,reach,likes,comments,shares,saved,ig_reels_avg_watch_time",
                                                      "access_token": tok})
            m = {x["name"]: (x.get("values") or [{}])[0].get("value") for x in r.get("data", [])}
            out[mid] = {"views": m.get("views"), "likes": m.get("likes"), "comments": m.get("comments"),
                        "shares": m.get("shares"), "saves": m.get("saved"), "reach": m.get("reach"),
                        "avg_seconds": (m.get("ig_reels_avg_watch_time") or 0) / 1000}
        except Exception:
            continue
    return out
