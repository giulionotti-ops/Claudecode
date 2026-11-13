#!/usr/bin/env python3
"""Vice City Clips uploader: posts approved shorts to YouTube and sets the channel's branding.

  python3 upload.py auth                    sign in once with the CLIPS channel's Google account
  python3 upload.py auth "<landing URL>"    (headless server) finish signing in
  python3 upload.py check                   show the signed-in channel
  python3 upload.py branding                set channel description, keywords and banner
  python3 upload.py post <date>             upload daily/<date>'s approved shorts on the posting slots
  python3 upload.py upload <mp4> --title T --desc-file F [--publish "YYYY-MM-DD HH:MM"]
  add --dry-run to print what would be sent

Uses the same Google Cloud OAuth app as the other channels, with its own login
(token) for this channel. Keys live in ~/.config/gta6-clips/ (client_secret.json,
youtube-token.json), never in the repo. Until Google audits the OAuth app, YouTube
keeps every API upload private.
"""
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
CLIPS = HERE.parent
KEYS = Path.home() / ".config" / "gta6-clips"
SECRET, TOKEN, PENDING = KEYS / "client_secret.json", KEYS / "youtube-token.json", KEYS / ".auth-pending.json"
APPROVALS, POSTED = CLIPS / "approvals.json", CLIPS / "posted.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.force-ssl",
          "https://www.googleapis.com/auth/youtube.readonly"]
TZ = ZoneInfo("Europe/Rome")
SLOTS = ["13:00", "19:00"]                       # posting times, Italian time
LAUNCH = (dt.date(2026, 11, 19), dt.date(2026, 11, 25))   # 2 a day in GTA 6 launch week, else 1


def credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    if not TOKEN.exists():
        sys.exit("Not signed in: run  python3 upload.py auth  first.")
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds.valid:
        creds.refresh(Request())
        TOKEN.write_text(creds.to_json())
    return creds


def auth(landing=None):
    from google_auth_oauthlib.flow import InstalledAppFlow
    if not SECRET.exists():
        sys.exit(f"Missing {SECRET}")
    if landing is None:
        flow = InstalledAppFlow.from_client_secrets_file(str(SECRET), SCOPES)
        flow.redirect_uri = "http://localhost:8765/"
        url, state = flow.authorization_url(prompt="consent", access_type="offline")
        PENDING.write_text(json.dumps({"state": state, "verifier": flow.code_verifier}))
        PENDING.chmod(0o600)
        print("Open this link, sign in with the CLIPS channel's account and allow access:\n\n"
              + url + "\n\nThe page you land on (localhost:8765/...) won't load. Copy its whole "
              'address and run:\n  python3 upload.py auth "<that address>"')
        return
    saved = json.loads(PENDING.read_text())
    flow = InstalledAppFlow.from_client_secrets_file(
        str(SECRET), SCOPES, state=saved["state"], code_verifier=saved["verifier"],
        autogenerate_code_verifier=False)
    flow.redirect_uri = "http://localhost:8765/"
    flow.fetch_token(authorization_response=landing.strip().replace("http://", "https://", 1))
    TOKEN.write_text(flow.credentials.to_json())
    TOKEN.chmod(0o600)
    PENDING.unlink()
    print("Signed in. Run  python3 upload.py check  to see which channel.")


def youtube():
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=credentials(), cache_discovery=False)


def check():
    me = youtube().channels().list(part="snippet,statistics", mine=True).execute()["items"][0]
    print(f"Signed in as channel: {me['snippet']['title']} "
          f"({me['statistics'].get('subscriberCount', '?')} subscribers)")
    return me


def branding(dry=False):
    from googleapiclient.http import MediaFileUpload
    desc = (CLIPS / "branding" / "description.txt").read_text().strip()
    keywords = ('"gaming clips" "stream highlights" "twitch clips" "gta 6" "gta vi" '
                '"funny moments" "gaming shorts" "streamer moments"')
    if dry:
        print(desc, "\n", keywords)
        return
    yt = youtube()
    me = yt.channels().list(part="brandingSettings", mine=True).execute()["items"][0]
    bs = me.get("brandingSettings", {})
    bs.setdefault("channel", {}).update({"description": desc, "keywords": keywords})
    banner = yt.channelBanners().insert(
        media_body=MediaFileUpload(str(CLIPS / "branding" / "banner.png"), mimetype="image/png")
    ).execute()
    bs.setdefault("image", {})["bannerExternalUrl"] = banner["url"]
    yt.channels().update(part="brandingSettings",
                         body={"id": me["id"], "brandingSettings": bs}).execute()
    print("Channel description, keywords and banner set. Upload branding/avatar.png "
          "by hand in YouTube Studio > Customisation > Branding (the API can't).")


def to_utc(local):
    t = dt.datetime.strptime(local, "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def upload(video, title, description, tags, publish=None, dry=False):
    from googleapiclient.http import MediaFileUpload
    status = {"selfDeclaredMadeForKids": False, "containsSyntheticMedia": False}
    if publish:
        status.update(privacyStatus="private", publishAt=to_utc(publish))
    else:
        status["privacyStatus"] = "public"
    body = {"snippet": {"title": title[:100], "description": description[:5000], "tags": tags,
                        "categoryId": "20", "defaultLanguage": "en", "defaultAudioLanguage": "en"},
            "status": status}
    if dry:
        print(json.dumps(body, indent=1), "\nvideo:", video)
        return None
    req = youtube().videos().insert(part="snippet,status", body=body, media_body=MediaFileUpload(
        str(video), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True))
    resp, tries = None, 0
    while resp is None:
        try:
            st, resp = req.next_chunk()
            if st:
                print(f"  {int(st.progress() * 100)}%")
        except Exception as e:     # transient: back off and resume; 4xx won't fix itself
            tries += 1
            if tries > 5 or 400 <= getattr(getattr(e, "resp", None), "status", 500) < 500:
                raise
            time.sleep(2 ** tries)
    print(f"  done: https://youtube.com/shorts/{resp['id']}"
          + (f" (publishes {publish} Italian time)" if publish else " (public now)"))
    return resp["id"]


def free_slots(day, taken):
    n = 2 if LAUNCH[0] <= day <= LAUNCH[1] else 1
    now = dt.datetime.now(TZ)
    out = []
    for d in (day, day + dt.timedelta(days=1)):
        for s in (SLOTS if n == 2 else SLOTS[-1:]):
            t = f"{d.isoformat()} {s}"
            if t not in taken and dt.datetime.strptime(t, "%Y-%m-%d %H:%M").replace(tzinfo=TZ) > now:
                out.append(t)
        if out:
            return out[:n]
    return out


def post(date, dry=False):
    """Upload the shorts marked approved for <date> in approvals.json, on the free slots."""
    appr = json.loads(APPROVALS.read_text())
    posted = json.loads(POSTED.read_text()) if POSTED.exists() else []
    done = {p["file"] for p in posted}
    todo = [s for s in appr["shorts"] if s.get("date") == date and s.get("approved")
            and s.get("file") and s["file"] not in done]
    if not todo:
        sys.exit(f"Nothing approved and unposted for {date}.")
    slots = free_slots(dt.datetime.now(TZ).date(), {p["publish"] for p in posted})
    for s, slot in zip(todo, slots):
        video = CLIPS / s["file"]
        txt = video.with_suffix(".txt")
        desc = txt.read_text() if txt.exists() else s.get("title", "")
        title = s.get("youtube_title") or s.get("title") or video.stem
        tags = ["gaming", "twitch clips", "stream highlights", s.get("streamer", ""), "shorts"]
        if "gta" in (s.get("game", "") + title).lower():
            tags += ["gta 6", "gta vi", "gta"]
        print(f"{s.get('streamer')}: {title} -> {slot}")
        vid = upload(video, title, desc, [t for t in tags if t], slot, dry)
        if vid:
            posted.append({"file": s["file"], "video_id": vid, "publish": slot,
                           "streamer": s.get("streamer"), "date": date})
            POSTED.write_text(json.dumps(posted, indent=1) + "\n")
    if len(todo) > len(slots):
        print(f"{len(todo) - len(slots)} approved short(s) left for the next free slots.")


def main():
    a = sys.argv[1:]
    dry = "--dry-run" in a
    a = [x for x in a if x != "--dry-run"]
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == "auth":
        return auth(a[1] if len(a) > 1 else None)
    if cmd == "check":
        return check()
    if cmd == "branding":
        return branding(dry)
    if cmd == "post" and len(a) > 1:
        return post(a[1], dry)
    if cmd == "upload" and len(a) > 1:
        opt = dict(zip(a[2::2], a[3::2]))
        desc = Path(opt["--desc-file"]).read_text() if "--desc-file" in opt else ""
        return upload(Path(a[1]), opt.get("--title", Path(a[1]).stem), desc,
                      ["gaming", "twitch clips", "shorts"], opt.get("--publish"), dry)
    sys.exit(__doc__)


if __name__ == "__main__":
    main()
