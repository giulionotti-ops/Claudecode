#!/usr/bin/env python3
"""Seed an isolated Neesmo demo: one Director Studio channel with 8 videos, numbers and chats.

Usage: scripts/demo-seed.py [DEMO_ROOT]   (default ~/neesmo-demo)
Then run the server with:
  NEESMO_DIR=$ROOT/conf NEESMO_AGENT_HOME=$ROOT/agents NEESMO_KIT=$ROOT/kit NEESMO_EDITION=director ...
Nothing here touches the live install (~/.config/neesmo, ~/neesmo-agents).
"""
import datetime as dt
import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / "neesmo-demo").resolve()
CONF, AGENTS, KIT = ROOT / "conf", ROOT / "agents", ROOT / "kit"
AID = "bitesized-history"
CH = AGENTS / AID
N = CH / "neesmo"
random.seed(7)
now = dt.datetime.now().astimezone().replace(microsecond=0)


def w(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data if isinstance(data, str) else json.dumps(data, indent=1))


if ROOT.exists():
    shutil.rmtree(ROOT)
for d in (CONF / "studio", N, CH / "videos", CH / "inspiration", KIT):
    d.mkdir(parents=True, exist_ok=True)

w(CONF / "studio" / "state.json", {"edition": "director", "step": "ready", "channel_name": "Bitesized History",
                                   "warmup_start": (now - dt.timedelta(days=30)).date().isoformat(),
                                   "warmup_done": (now - dt.timedelta(days=20)).date().isoformat(),
                                   "auto_permissions": True, "inspiration_hint_shown": True})
w(CONF / "agents.json", [{"id": AID, "name": "Bitesized History", "folder": str(CH), "role": "History shorts channel",
                          "short": "History", "color": "#5cc8ff", "instructions": "", "kind": "channel"}])
# paused: the demo never makes or posts videos by itself (no Claude spend); "Make a video now" still works
w(N / "settings.json", {"videos_per_day": 1, "post_times": ["13:30", "19:30"], "auto_schedule": True, "paused": True,
                        "trial_start": (now - dt.timedelta(days=20)).date().isoformat()})
w(N / "brief.md", "# Bitesized History\nOne strange true story from history in under 60 seconds.\n")
w(N / "lessons.md", "# Lessons from the numbers\n- Hooks that open on a question keep 18% more viewers past 3 s.\n"
                    "- Paper-cut style beats watercolour on Instagram; equal on YouTube.\n"
                    "- Posts at 19:30 get 1.4x the views of 13:30.\n")
w(N / "board.md", "- [marketer 007] hook: \"This king was buried three times.\"\n- [producer 007] rendered 41 s, paper-cut style\n"
                  "- [main 007] verdict: ok, ship\n- [analyst] 004 is the best so far: question hook + 19:30 slot\n")

TITLES = ["The war that lasted 38 minutes", "Why Napoleon was not short", "The emu war Australia lost",
          "A king buried three times", "The dancing plague of 1518", "Cleopatra and the pyramids",
          "The man who sold the Eiffel Tower", "The great molasses flood"]
HOOKS = ["Britain won a war before lunch.", "Napoleon was taller than you think.", "Birds beat an army.",
         "This king was buried three times.", "A whole town could not stop dancing.",
         "Cleopatra lived closer to us than to the pyramids.", "He sold the Eiffel Tower. Twice.",
         "A wave of syrup hit Boston at 35 mph."]
COLORS = ["0x2b4c7e", "0x7e2b4c", "0x2b7e5c", "0x7e622b", "0x4c2b7e", "0x2b6e7e", "0x7e3b2b", "0x5c7e2b"]
SOURCES = ["Shorts feed", "YouTube search", "Browse features", "Channel pages", "External", "Suggested videos"]
TERMS = ["history facts", "weird history", "shorts history", "napoleon height", "emu war", "eiffel tower scam"]

queue, rows = [], []
for i, title in enumerate(TITLES):
    vid = f"{i + 1:03d}"
    vdir = CH / "videos" / vid
    vdir.mkdir(parents=True)
    age = (len(TITLES) - i) * 3 - 2                     # days since posted; newest last
    posted = i < 6
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={COLORS[i]}:s=360x640",
                    "-frames:v", "1", str(vdir / "poster.jpg")], check=True)
    if i == 5:   # one playable clip so the player shows
        subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={COLORS[i]}:s=360x640:d=4",
                        "-f", "lavfi", "-i", "sine=f=330:d=4", "-shortest", "-pix_fmt", "yuv420p", str(vdir / "final.mp4")],
                       check=True)
    w(vdir / "script.json", {"hook": HOOKS[i], "title": title, "script": HOOKS[i] + " ...", "description": f"{title}. #history #shorts"})
    status = "posted" if posted else ("scheduled" if i == 6 else "ready_for_review")
    q = {"id": vid, "status": status, "created": (now - dt.timedelta(days=age + 1)).isoformat(), "dir": str(vdir),
         "sessions": {}, "rounds": 1, "title": title, "summary": HOOKS[i], "poster": str(vdir / "poster.jpg"),
         **({"video": str(vdir / "final.mp4")} if i == 5 else {})}
    if posted:
        q["platform_ids"] = {"youtube": f"demoYT{vid}", "instagram": f"demoIG{vid}"}
        q["publish_at"] = (now - dt.timedelta(days=age)).replace(hour=19, minute=30).isoformat()
    elif i == 6:
        q["publish_at"] = (now + dt.timedelta(days=1)).replace(hour=19, minute=30).isoformat()
    queue.append(q)

    msgs = [{"role": "neesmo", "ts": q["created"], "text": f"This is the chat for video #{i + 1}. Ask here for any change to it."}]
    if i == 4:
        msgs += [{"role": "owner", "ts": q["created"], "text": "Make the hook punchier and the music quieter."},
                 {"role": "neesmo", "ts": q["created"], "text": "New hook: \"A whole town could not stop dancing.\" Music is 6 dB lower. Re-rendered and checked."}]
    w(vdir / "chat.json", {"name": f"#{i + 1}", "session": None, "messages": msgs, "ctx": 0, "compacted": []})
    if not posted:
        continue

    plats, hist = {}, {}
    for p, mult in (("youtube", 1.0), ("instagram", 0.6)):
        base = random.randint(800, 4000) * (2.2 if i == 3 else 1) * mult
        days, tot, tl, h = min(age, 28), 0, 0, {}
        for d in range(days + 1):
            day = (now - dt.timedelta(days=days - d)).date().isoformat()
            tot += int(base * (0.55 ** d) * random.uniform(.7, 1.3) + base * .02)
            tl += int(tot * random.uniform(.03, .06) / max(1, d + 1))
            h[day] = {"views": tot, "likes": tl, "comments": tl // 12, "shares": tl // 9}
        hist[p] = h
        n = {"views": tot, "likes": tl, "comments": tl // 12, "shares": tl // 9, "avg_seconds": random.randint(14, 38),
             "pct_viewed": random.randint(45, 92), "subs": random.randint(5, 120)}
        if p == "instagram":
            n.update({"reach": int(tot * .8), "saves": tl // 5})
        plats[p] = n
    w(vdir / "stats_history.json", hist)
    rows.append({"id": vid, "title": title, "views": sum(x["views"] for x in plats.values()),
                 "likes": sum(x["likes"] for x in plats.values()), "platforms": plats})
    # cached YouTube Analytics answer (never expires in the demo) so traffic sources and search terms show
    yt = plats["youtube"]
    srcs = sorted(({"name": s, "views": int(yt["views"] * random.uniform(.02, .6))} for s in SOURCES), key=lambda r: -r["views"])
    kws = sorted(({"name": t, "views": int(yt["views"] * random.uniform(.005, .06))} for t in TERMS), key=lambda r: -r["views"])
    w(vdir / "detail_youtube.json", {"_t": 9e12, "totals": {"dislikes": yt["likes"] // 30, "shares": yt["shares"],
                                     "estimatedMinutesWatched": yt["views"] * yt["avg_seconds"] // 60,
                                     "averageViewDuration": yt["avg_seconds"]}, "sources": srcs[:10], "keywords": kws[:5]})

w(N / "queue.json", queue)
w(N / "stats.json", {"updated": now.isoformat(), "totals": {"views": sum(r["views"] for r in rows),
                     "likes": sum(r["likes"] for r in rows), "subs": 412}, "videos": rows})
w(N / "events.jsonl", "\n".join(json.dumps({"ts": q["created"], "kind": "made", "text": f"Video {q['id']} made: {q['title']}",
                                            "video": q["id"]}) for q in queue) + "\n")
w(N / "costs.jsonl", "\n".join(json.dumps({"ts": q["created"], "role": r, "video": q["id"], "cost": c})
                               for q in queue for r, c in (("marketer", .08), ("producer", .31), ("supervisor", .05))) + "\n")
w(N / "daily.json", {"stats": dt.date.today().isoformat()})   # numbers already pulled today
subprocess.run(["git", "init", "-q", str(CH)], check=False)
w(CH / ".gitignore", ".roles/\nvideos/*/final.mp4\n")
print(f"demo seeded at {ROOT}")
