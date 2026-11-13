#!/usr/bin/env python3
"""Daily scan: yesterday's most-watched gaming moments on Twitch -> a review sheet.

The best signal for "viral" is what viewers already clipped: every Twitch clip
is a 20-60 s moment someone thought was worth sharing, with a view count. This
script collects yesterday's most-viewed clips, downloads them, transcribes them
and scores their energy, and writes one sheet for the viral-moments skill to
pick from.

Where the clips come from:
  * With TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET set, in the environment or
    in ~/.config/gta6-clips/twitch.env (a free app from dev.twitch.tv): yesterday's top clips across the top gaming categories,
    so the most-watched streams are found automatically.
  * Without them: the channels listed in streamers.json.

Only streamers marked "approved": true in streamers.json are rendered (see
CLIPPING_RULES.md). Others still show up in the sheet, marked NEEDS PERMISSION,
so you can see who is worth applying to.

Usage:
    python3 daily_clips.py                 # yesterday, top 12 clips
    python3 daily_clips.py --top 20 --date 2026-11-20
Output: daily/<date>/sheet.md (read this), sheet.json, clips/*.mp4
"""
import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import viral_moments as vm

HERE = Path(__file__).resolve().parent
KEYFILE = Path.home() / ".config" / "gta6-clips" / "twitch.env"


def load_keys():
    """TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET from the environment, else from
    ~/.config/gta6-clips/twitch.env (KEY=value lines, outside the repo)."""
    if KEYFILE.exists():
        for line in KEYFILE.read_text().splitlines():
            k, _, v = line.strip().partition("=")
            if k in ("TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET") and v:
                os.environ.setdefault(k, v.strip().strip('"'))
NON_GAMING = {"just chatting", "music", "irl", "talk shows & podcasts", "art",
              "asmr", "sports", "travel & outdoors", "pools, hot tubs, and beaches",
              "special events", "science & technology", "food & drink",
              "makers & crafting", "beauty & body art", "software and game development",
              "politics", "animals, aquariums, and zoos", "slots", "virtual casino"}


# ---------- sources ----------

def helix(path, token, client_id, **params):
    url = f"https://api.twitch.tv/helix/{path}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(url, headers={"Client-Id": client_id,
                                               "Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def helix_clips(day, categories, games_n, per_game):
    cid, secret = os.environ["TWITCH_CLIENT_ID"], os.environ["TWITCH_CLIENT_SECRET"]
    body = urllib.parse.urlencode({"client_id": cid, "client_secret": secret,
                                   "grant_type": "client_credentials"}).encode()
    with urllib.request.urlopen("https://id.twitch.tv/oauth2/token", body, timeout=30) as r:
        token = json.load(r)["access_token"]
    if categories:
        games = helix("games", token, cid, name=categories)["data"]
    else:
        games = [g for g in helix("games/top", token, cid, first=40)["data"]
                 if g["name"].lower() not in NON_GAMING][:games_n]
    start = dt.datetime.combine(day, dt.time(), dt.timezone.utc)
    clips = []
    for g in games:
        data = helix("clips", token, cid, game_id=g["id"], first=per_game,
                     started_at=start.isoformat().replace("+00:00", "Z"),
                     ended_at=(start + dt.timedelta(days=1)).isoformat().replace("+00:00", "Z"))
        for c in data["data"]:
            clips.append({"url": c["url"], "streamer": c["broadcaster_name"].lower(),
                          "title": c["title"], "views": c["view_count"],
                          "duration": c["duration"], "game": g["name"],
                          "vod": c.get("video_id") or "", "vod_offset": c.get("vod_offset")})
    return clips


def channel_clips(streamers, per_channel):
    clips = []
    for name in streamers:
        out = subprocess.run(
            ["yt-dlp", "--flat-playlist", "--playlist-end", str(per_channel),
             "--print", "%(url)s\t%(view_count)s\t%(duration)s\t%(title)s",
             f"https://www.twitch.tv/{name}/clips?filter=clips&range=24hr"],
            capture_output=True, text=True)
        for line in out.stdout.strip().splitlines():
            url, views, dur, title = (line.split("\t") + ["", "", ""])[:4]
            if url.startswith("http"):
                clips.append({"url": url, "streamer": name.lower(), "title": title,
                              "views": int(views) if views.isdigit() else 0,
                              "duration": float(dur or 0), "game": "", "vod": "",
                              "vod_offset": None})
    return clips


# ---------- pipeline ----------

def download(url, dest):
    out = subprocess.run(
        ["yt-dlp", "-f", "best[height<=1080][vcodec^=avc]/best[height<=1080]/best",
         "-o", str(dest / "%(channel)s_%(id)s.%(ext)s"), "--print", "after_move:filepath",
         "--no-simulate", url], capture_output=True, text=True)
    lines = out.stdout.strip().splitlines()
    return Path(lines[-1]) if out.returncode == 0 and lines else None


def analyse(path, model):
    dur, energy = vm.energy_track(path, 0.3)
    if not energy:
        return None
    lines = vm.transcribe(path, model, None)
    return vm.build(path, lines, dur, energy)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", help="UTC day to scan, YYYY-MM-DD (default: yesterday)")
    ap.add_argument("--top", type=int, default=12, help="clips to analyse (default 12)")
    ap.add_argument("--per-streamer", type=int, default=3)
    ap.add_argument("--model", default="small")
    ap.add_argument("--config", default=str(HERE / "streamers.json"))
    args = ap.parse_args()

    load_keys()
    day = (dt.date.fromisoformat(args.date) if args.date
           else dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1))
    cfg = json.loads(Path(args.config).read_text())
    roster = {s["name"].lower(): s for s in cfg.get("streamers", [])}

    if os.environ.get("TWITCH_CLIENT_ID") and os.environ.get("TWITCH_CLIENT_SECRET"):
        print(f"Source: Twitch API, top gaming clips of {day}", flush=True)
        clips = helix_clips(day, cfg.get("categories", []), cfg.get("top_games", 10), 20)
    else:
        if not roster:
            sys.exit("No TWITCH_CLIENT_ID/SECRET and no streamers in streamers.json")
        print(f"Source: {len(roster)} channels from streamers.json (last 24 h)", flush=True)
        clips = channel_clips(list(roster), 10)

    # most viewed first, capped per streamer
    clips.sort(key=lambda c: c["views"], reverse=True)
    picked, per = [], {}
    for c in clips:
        if per.get(c["streamer"], 0) < args.per_streamer:
            per[c["streamer"]] = per.get(c["streamer"], 0) + 1
            picked.append(c)
        if len(picked) >= args.top:
            break

    out = HERE / "daily" / day.isoformat()
    (out / "clips").mkdir(parents=True, exist_ok=True)
    md = [f"# Daily clips: {day}", "",
          f"{len(picked)} most-viewed clips. Score with .claude/skills/viral-moments "
          "(each clip is one candidate; trim to the best span). Render only APPROVED.", ""]
    for i, c in enumerate(picked, 1):
        s = roster.get(c["streamer"], {})
        c["approved"] = bool(s.get("approved"))
        c["facecam"] = s.get("facecam")
        print(f"[{i}/{len(picked)}] {c['streamer']}: {c['title']} ({c['views']} views)", flush=True)
        path = download(c["url"], out / "clips")
        if not path:
            print("  ! download failed, skipped")
            continue
        c["file"] = str(path.relative_to(HERE))
        sheet = analyse(path, args.model)
        tag = "APPROVED" if c["approved"] else "NEEDS PERMISSION"
        md += [f"## {i}. {c['streamer']} | {c['views']} views | {tag}",
               f"{c['title']} | {c['game']} | {c['url']}",
               f"file: `{c['file']}`" + (f" | facecam: {c['facecam']}" if c["facecam"]
                                          else " | facecam: unknown (check a frame)"), ""]
        if sheet:
            c["cutoffs"] = sheet["cutoffs"]
            for x in (x for w in sheet["windows"] for x in w["items"]):
                md.append(f"[{vm.mmss(x['start'])}-{vm.mmss(x['end'])}] "
                          f"{vm.bar(x['energy'], sheet['cutoffs']):<3} {x['text']}")
        md.append("")
    (out / "sheet.json").write_text(json.dumps(picked, indent=1) + "\n")
    (out / "sheet.md").write_text("\n".join(md) + "\n")
    print(f"\nWrote {out / 'sheet.md'}")


if __name__ == "__main__":
    main()
