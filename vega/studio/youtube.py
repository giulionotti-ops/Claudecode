"""YouTube for channel agents: sign-in, scheduled uploads, banner, stats. Plain API calls, no tokens.

The owner uses their own free Google Cloud "Desktop app" OAuth client (the setup guide walks them through it);
its JSON goes to <conf>/studio/youtube_client.json, the sign-in token to <conf>/studio/youtube_token.json.
Videos go up private with publishAt, so YouTube itself publishes them at the slot.

  python3 -m studio.youtube auth-url | auth-finish '<url>' | check | stats <aid>
"""
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path
from zoneinfo import ZoneInfo

from . import state

SECRET = state.DIR / "youtube_client.json"
TOKEN = state.DIR / "youtube_token.json"
AUTH = state.DIR / "youtube_auth.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl",
          "https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"]
REDIRECT = "http://localhost:8765/"
LEAD = dt.timedelta(minutes=90)


def connected() -> bool:
    return TOKEN.exists()


def _flow():
    from google_auth_oauthlib.flow import Flow
    if not SECRET.exists():
        raise RuntimeError("Add your Google OAuth client file first (setup step: YouTube).")
    return Flow.from_client_secrets_file(str(SECRET), SCOPES, redirect_uri=REDIRECT)


def auth_url() -> str:
    f = _flow()
    url, st = f.authorization_url(prompt="consent", access_type="offline")
    AUTH.write_text(json.dumps({"state": st, "code_verifier": getattr(f, "code_verifier", None)}))
    os.chmod(AUTH, 0o600)
    return url


def auth_finish(resp: str) -> dict:
    st = json.loads(AUTH.read_text())
    f = _flow()
    f.code_verifier = st.get("code_verifier")
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"   # localhost redirect; the code goes to Google over https
    f.fetch_token(authorization_response=resp.strip(), state=st["state"])
    TOKEN.write_text(f.credentials.to_json())
    os.chmod(TOKEN, 0o600)
    AUTH.unlink(missing_ok=True)
    return me()


def _creds():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds.valid:
        creds.refresh(Request())
        TOKEN.write_text(creds.to_json())
    return creds


def _yt():
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=_creds(), cache_discovery=False)


def me() -> dict:
    c = _yt().channels().list(part="snippet,statistics", mine=True).execute()["items"][0]
    return {"id": c["id"], "title": c["snippet"]["title"], "subscribers": c["statistics"].get("subscriberCount")}


def next_slot(times: list[str], taken: list[dt.datetime], tz: str = "") -> dt.datetime:
    """First free posting slot after now + LEAD and after every slot already used (keeps order)."""
    zone = ZoneInfo(tz) if tz else dt.datetime.now().astimezone().tzinfo
    after = max([dt.datetime.now(zone) + LEAD] + [t.astimezone(zone) for t in taken])
    day = after.date()
    times = sorted(times or ["13:30", "19:30"])
    while True:
        for s in times:
            t = dt.datetime.combine(day, dt.time(*map(int, s.split(":"))), zone)
            if t > after:
                return t
        day += dt.timedelta(days=1)


def upload(v: dict, when: dt.datetime | None) -> str:
    """Upload one queue item (absolute paths). Returns the YouTube video id."""
    from googleapiclient.http import MediaFileUpload
    status = {"privacyStatus": "private", "selfDeclaredMadeForKids": False}
    if when:
        status["publishAt"] = when.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {"snippet": {"title": (v.get("title") or "")[:100], "description": (v.get("description") or "")[:5000],
                        "tags": v.get("tags") or [], "categoryId": v.get("category", "27")}, "status": status}
    yt = _yt()
    req = yt.videos().insert(part="snippet,status", body=body,
                             media_body=MediaFileUpload(v["video"], mimetype="video/mp4", chunksize=8 << 20, resumable=True))
    resp, tries = None, 0
    while resp is None:
        try:
            _, resp = req.next_chunk()
        except Exception as e:   # transient: back off and resume; 4xx (quota) won't fix itself
            tries += 1
            if tries > 5 or 400 <= getattr(getattr(e, "resp", None), "status", 500) < 500:
                raise
            time.sleep(2 ** tries)
    vid = resp["id"]
    srt = Path(v["video"]).with_name("captions.srt")
    if srt.exists():
        try:
            yt.captions().insert(part="snippet", body={"snippet": {"videoId": vid, "language": "en", "name": "English"}},
                                 media_body=MediaFileUpload(str(srt), mimetype="application/octet-stream")).execute()
        except Exception:
            pass
    if v.get("pinned"):
        try:   # owner comment; pinning itself is not in the API, the owner pins it with one tap
            yt.commentThreads().insert(part="snippet", body={"snippet": {"videoId": vid, "topLevelComment": {
                "snippet": {"textOriginal": v["pinned"][:9000]}}}}).execute()
        except Exception:
            pass
    return vid


def set_banner(path: str) -> bool:
    """Upload the chosen banner (2560x1440). The avatar has no API: the guide shows where to set it."""
    from googleapiclient.http import MediaFileUpload
    yt = _yt()
    url = yt.channelBanners().insert(media_body=MediaFileUpload(path, mimetype="image/jpeg")).execute()["url"]
    cid = me()["id"]
    yt.channels().update(part="brandingSettings", body={"id": cid, "brandingSettings": {"image": {"bannerExternalUrl": url}}}).execute()
    return True


def stats(ids: list[str]) -> dict[str, dict]:
    """Views/likes/comments from the Data API plus % viewed and subs from the Analytics API."""
    from googleapiclient.discovery import build
    out: dict[str, dict] = {}
    yt = _yt()
    for i in range(0, len(ids), 50):
        r = yt.videos().list(part="statistics,snippet", id=",".join(ids[i:i + 50])).execute()
        for it in r.get("items", []):
            s = it["statistics"]
            out[it["id"]] = {"views": int(s.get("viewCount", 0)), "likes": int(s.get("likeCount", 0)),
                             "comments": int(s.get("commentCount", 0)), "published": it["snippet"].get("publishedAt")}
    try:
        ya = build("youtubeAnalytics", "v2", credentials=_creds(), cache_discovery=False)
        start = (dt.date.today() - dt.timedelta(days=90)).isoformat()
        for i in range(0, len(ids), 200):
            r = ya.reports().query(ids="channel==MINE", startDate=start, endDate=dt.date.today().isoformat(),
                                   metrics="views,averageViewPercentage,averageViewDuration,subscribersGained",
                                   dimensions="video", filters="video==" + ",".join(ids[i:i + 200])).execute()
            for row in r.get("rows", []):
                out.setdefault(row[0], {}).update(pct_viewed=row[2], avg_seconds=row[3], subs=row[4])
    except Exception:
        pass
    return out


def detail(video_id: str, days: int = 28) -> dict:
    """Numbers for one video's detail page: totals, daily views/likes, traffic sources, search terms."""
    from googleapiclient.discovery import build
    ya = build("youtubeAnalytics", "v2", credentials=_creds(), cache_discovery=False)
    end = dt.date.today().isoformat()
    start = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    base = dict(ids="channel==MINE", startDate=start, endDate=end, filters=f"video=={video_id}")
    out: dict = {}
    m = "views,likes,dislikes,comments,shares,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained"
    r = ya.reports().query(metrics=m, **base).execute()
    if r.get("rows"):
        out["totals"] = dict(zip(m.split(","), r["rows"][0]))
    r = ya.reports().query(metrics="views,likes", dimensions="day", sort="day", **base).execute()
    out["daily"] = [{"d": d, "views": v, "likes": lk} for d, v, lk in r.get("rows", [])]
    try:
        r = ya.reports().query(metrics="views", dimensions="insightTrafficSourceType", sort="-views", maxResults=8, **base).execute()
        out["sources"] = [{"name": n.replace("_", " ").title(), "views": v} for n, v in r.get("rows", [])]
        r = ya.reports().query(metrics="views", dimensions="insightTrafficSourceDetail", sort="-views", maxResults=5,
                               ids=base["ids"], startDate=start, endDate=end,
                               filters=f"video=={video_id};insightTrafficSourceType==YT_SEARCH").execute()
        out["keywords"] = [{"name": n, "views": v} for n, v in r.get("rows", [])]
    except Exception:
        pass
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["auth-url"]:
        print(auth_url())
    elif a[:1] == ["auth-finish"]:
        print(auth_finish(a[1]))
    elif a[:1] == ["check"]:
        print(me())
    else:
        print(__doc__)
