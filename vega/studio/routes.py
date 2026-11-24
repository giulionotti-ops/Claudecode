"""Neesmo Studio HTTP API: setup wizard, connectors, channel dashboards, @tags, updates, and the tick loop.

server.py includes `router` and calls `start(notify)` at startup. Everything heavy runs in a thread or a
detached process, so the app stays responsive.
"""
import asyncio
import datetime as dt
import json
import os
import re
import secrets
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

import agents
from . import channel, install, pipeline, state, stats, tick, update, video_chat

router = APIRouter(prefix="/api/studio")
LOOKS = state.DIR / "looks"
PUSH_KINDS = {"review", "approval", "important", "auto_schedule"}
_notify = None          # set by start(): server._notify
_loop: asyncio.AbstractEventLoop | None = None
_gh: dict = {}


def push_allowed(kind: str) -> bool:
    """System setting "Notifications": all | important (videos and important things) | off."""
    if not state.STATE.exists():   # not a Studio install: keep the old behaviour
        return True
    level = state.load().get("notify", "important")
    return level == "all" or (level == "important" and kind in PUSH_KINDS)


# ---------------------------------------------------------------- state and wizard

def connectors() -> dict:
    from . import instagram, youtube
    gh = subprocess.run(["gh", "auth", "status"], capture_output=True).returncode == 0 if _which("gh") else False
    return {"github": gh, "youtube": youtube.connected(), "youtube_client": youtube.SECRET.exists(),
            "instagram": instagram.connected()}


def _which(c: str) -> bool:
    from shutil import which
    return which(c) is not None


@router.get("/state")
def get_state():
    s = state.load()
    upd = channel.read_json(update.DIR / "check.json", {})
    return {**s, "studio": state.STATE.exists(), "warmup_left": state.warmup_left(s), "warmup_days": state.WARMUP_DAYS, "trial_days": state.TRIAL_DAYS,
            "steps": state.STEPS, "install": install.progress(), "connectors": connectors(),
            "version": update.version(), "update": upd,
            "studio_label": state.EDITION_LABEL.get(s["edition"], "YouTube Studio"), "platforms": state.platforms(s["edition"]),
            "channels": [a["id"] for a in agents.load() if channel.is_channel(a)]}


class StepIn(BaseModel):
    step: str


@router.post("/step")
def set_step(b: StepIn):
    try:
        return state.advance(b.step)
    except ValueError:
        raise HTTPException(400, "unknown step")


_install_proc: list = [None]


@router.post("/install")
def install_start():
    p = _install_proc[0]
    if p is not None and p.poll() is None:
        return {"running": True}
    _install_proc[0] = subprocess.Popen([sys.executable, "-m", "studio.install"], cwd=state.APP,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    return {"running": True}


@router.get("/install")
def install_get():
    p = _install_proc[0]
    return {**install.progress(), "running": p is not None and p.poll() is None}


class SettingsIn(BaseModel):
    notify: str | None = None             # all | important | off
    auto_permissions: bool | None = None
    auto_update: bool | None = None
    edition: str | None = None


def _claude_mode(auto: bool) -> None:
    """System setting "Auto permissions": Claude sessions stop asking for every step (fewer notifications)."""
    p = Path.home() / ".claude" / "settings.json"
    s = channel.read_json(p, {})
    s.setdefault("permissions", {})["defaultMode"] = "auto" if auto else "default"
    tmp = p.with_suffix(".tmp")
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(s, indent=2))
    os.replace(tmp, p)   # atomic: never leave a half-written settings file


@router.post("/settings")
def set_settings(b: SettingsIn):
    ch = {}
    if b.notify in ("all", "important", "off"):
        ch["notify"] = b.notify
    if b.auto_permissions is not None:
        _claude_mode(b.auto_permissions)
        ch["auto_permissions"] = b.auto_permissions
    if b.auto_update is not None:
        ch["auto_update"] = b.auto_update
    if b.edition in ("youtube", "instagram", "director"):
        ch["edition"] = b.edition
    return state.save(**ch)


class NameIn(BaseModel):
    name: str


@router.post("/name")
async def set_name(b: NameIn):
    name = re.sub(r"\s+", " ", b.name).strip()[:40]
    if not name:
        raise HTTPException(400, "pick a name")
    state.save(channel_name=name, step="look", looks_ready=False, looks_error=None)
    LOOKS.mkdir(parents=True, exist_ok=True)
    banner = ["--banner"] if "youtube" in state.platforms() else []
    seed = str(secrets.randbelow(9999))

    def draw():
        looks, err = [], None
        try:
            r = subprocess.run([sys.executable, "-m", "studio.art", name, str(LOOKS), *banner, "--seed", seed],
                               cwd=state.APP, capture_output=True, text=True, timeout=600)
            looks = json.loads(r.stdout.strip().splitlines()[-1])
        except Exception as e:
            err = str(e)[:200]
        for x in looks:   # bust caches: a new name draws new pictures under the same file names
            x["v"] = seed
        channel.write_json(LOOKS / "looks.json", looks)
        state.save(looks_ready=True, looks_error=None if looks else (err or "Drawing failed. Try again."))
    asyncio.get_running_loop().run_in_executor(None, draw)
    return {"ok": True}


@router.get("/looks")
def looks():
    s = state.load()
    return {"ready": s.get("looks_ready"), "error": s.get("looks_error"), "looks": channel.read_json(LOOKS / "looks.json", [])}


@router.get("/looks/{fname}")
def look_file(fname: str):
    p = (LOOKS / Path(fname).name)
    if not p.is_file() or p.suffix not in (".png", ".jpg"):
        raise HTTPException(404)
    return FileResponse(p)


class LookIn(BaseModel):
    style: str


@router.post("/look")
async def choose_look(b: LookIn):
    pick = next((x for x in channel.read_json(LOOKS / "looks.json", []) if x["style"] == b.style), None)
    if not pick:
        raise HTTPException(404, "no such style")
    state.save(look=pick, step="warmup")
    banner_set = False
    from . import youtube
    if pick.get("banner") and youtube.connected():
        try:
            banner_set = await asyncio.to_thread(youtube.set_banner, pick["banner"])
        except Exception:
            banner_set = False
    return {"ok": True, "banner_set": banner_set}


@router.post("/warmup/start")
def warmup_start():
    s = state.load()
    if not s.get("warmup_start"):
        s = state.save(warmup_start=dt.date.today().isoformat(), step="warmup")
    return {**s, "studio": state.STATE.exists(), "warmup_left": state.warmup_left(s)}


@router.post("/warmup/done")
def warmup_done():
    """The owner says the 10 days are over (or wants to start now)."""
    return state.save(warmup_done=True, step="ready")


# ---------------------------------------------------------------- connectors

@router.post("/youtube/client")
async def youtube_client(file: UploadFile):
    from . import youtube
    data = await file.read(200_000)
    try:
        j = json.loads(data)
        assert "installed" in j or "web" in j
    except (ValueError, AssertionError):
        raise HTTPException(400, "That is not a Google OAuth client file (it should start with {\"installed\": ...}).")
    youtube.SECRET.parent.mkdir(parents=True, exist_ok=True)
    youtube.SECRET.write_bytes(data)
    youtube.SECRET.chmod(0o600)
    return {"ok": True}


@router.get("/youtube/auth-url")
def youtube_auth_url():
    from . import youtube
    try:
        return {"url": youtube.auth_url()}
    except RuntimeError as e:
        raise HTTPException(400, str(e))


class UrlIn(BaseModel):
    url: str


@router.post("/youtube/auth-finish")
async def youtube_auth_finish(b: UrlIn):
    from . import youtube
    try:
        return await asyncio.to_thread(youtube.auth_finish, b.url)
    except Exception as e:
        raise HTTPException(400, f"Sign-in did not work: {str(e)[:200]}")


class TokenIn(BaseModel):
    token: str


@router.post("/instagram")
async def instagram_token(b: TokenIn):
    from . import instagram
    try:
        return await asyncio.to_thread(instagram.save_token, b.token)
    except Exception as e:
        raise HTTPException(400, f"Instagram did not accept the token: {str(e)[:200]}")


@router.post("/github/start")
def github_start():
    """GitHub device sign-in: show the code, the owner enters it at github.com/login/device."""
    if not _which("gh"):
        raise HTTPException(400, "GitHub CLI is not installed yet; run the setup first.")
    p = _gh.get("proc")
    if p is not None and p.poll() is None and _gh.get("code"):
        return {"code": _gh["code"], "url": "https://github.com/login/device"}
    if p is not None and p.poll() is None:
        p.kill()   # an old sign-in that never showed a code
    p = subprocess.Popen(["gh", "auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web"],
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                         env={**os.environ, "BROWSER": "true"})
    _gh.update(proc=p, code=None)
    for _ in range(40):
        line = p.stdout.readline()
        if not line:
            break
        m = re.search(r"code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})", line)
        if m:
            _gh["code"] = m.group(1)
            try:
                p.stdin.write("\n")
                p.stdin.flush()
            except OSError:
                pass
            import threading   # keep reading so gh never blocks on a full pipe while it waits for the owner
            threading.Thread(target=lambda: [None for _ in p.stdout], daemon=True).start()
            return {"code": _gh["code"], "url": "https://github.com/login/device"}
    p.kill()
    raise HTTPException(500, "GitHub did not give a code; try again.")


# ---------------------------------------------------------------- channel agents (dashboard cards)

def _channel_or_404(aid: str) -> dict:
    a = next((x for x in agents.load() if x["id"] == aid), None)
    if not a or not channel.is_channel(a):
        raise HTTPException(404, "no such channel agent")
    return a


class ChannelIn(BaseModel):
    name: str = ""
    brief: str


def create_channel(name: str, brief: str) -> dict:
    s = state.load()
    name = (name or s.get("channel_name") or "My channel").strip()[:40]
    color = None
    return channel.create(name, brief, edition=s["edition"], style=(s.get("look") or {}).get("style"), color=color)


@router.post("/channels")
async def channels_create(b: ChannelIn):
    try:
        return await asyncio.to_thread(create_channel, b.name, b.brief)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/channels/{aid}")
def channel_get(aid: str):
    _channel_or_404(aid)
    out = channel.summary(aid)
    out["stats"] = channel.read_json(channel.paths(aid)["stats"], {}).get("totals")
    out["busy"] = pipeline.busy(aid)
    costs = channel.paths(aid)["n"] / "costs.jsonl"
    total = 0.0
    if costs.exists():
        for ln in costs.read_text().splitlines()[-400:]:
            try:
                total += float(json.loads(ln).get("cost") or 0)
            except ValueError:
                pass
    out["cost_usd"] = round(total, 2)
    out["board"] = channel.paths(aid)["board"].read_text().splitlines()[-30:] if channel.paths(aid)["board"].exists() else []
    out["lessons"] = channel.paths(aid)["lessons"].read_text()[:3000] if channel.paths(aid)["lessons"].exists() else ""
    rows = {r["id"]: r for r in channel.read_json(channel.paths(aid)["stats"], {}).get("videos", [])}
    vids = []
    for v in channel.queue(aid)[-60:]:   # the dashboard list: each video with a couple of numbers per platform
        r = rows.get(v["id"]) or {}
        vids.append({**v, "chat": video_chat.name(v["id"]),
                     "nums": {p: {"views": n.get("views"), "likes": n.get("likes")} for p, n in (r.get("platforms") or {}).items()}})
    out["videos"] = vids
    out["platforms"] = state.platforms()
    return out


# ---------------------------------------------------------------- one video: numbers per platform + its chat

KPIS = {
    "youtube": [("views", "Views"), ("likes", "Likes"), ("per_day", "Average views per day"), ("dislikes", "Dislikes"),
                ("minutes", "Estimated min watched"), ("comments", "Comments"), ("avg_seconds", "Avg view duration (sec)"),
                ("shares", "Shares")],
    "instagram": [("views", "Views"), ("likes", "Likes"), ("per_day", "Average views per day"), ("reach", "Accounts reached"),
                  ("saves", "Saves"), ("comments", "Comments"), ("avg_seconds", "Avg watch time (sec)"), ("shares", "Shares")],
}


def _yt_detail(vdir: Path, pid: str) -> dict:
    """YouTube Analytics for one video, cached 30 min in the video folder (no tokens, few API calls)."""
    cache = vdir / "detail_youtube.json"
    d = channel.read_json(cache, {})
    if d.get("_t", 0) > dt.datetime.now().timestamp() - 1800:
        return d
    try:
        from . import youtube
        if youtube.connected():
            d = {**youtube.detail(pid), "_t": dt.datetime.now().timestamp()}
            channel.write_json(cache, d)
    except Exception:
        pass
    return d


def _daily_from_history(h: dict) -> list[dict]:
    days = sorted(h)
    out, prev = [], {}
    for d in days:
        n = h[d]
        out.append({"d": d, "views": max(0, (n.get("views") or 0) - (prev.get("views") or 0)),
                    "likes": max(0, (n.get("likes") or 0) - (prev.get("likes") or 0))})
        prev = n
    return out[1:] if len(out) > 1 else out


def _platform_view(aid: str, v: dict, plat: str, rows: dict) -> dict:
    vdir = Path(v["dir"])
    n = dict(((rows.get(v["id"]) or {}).get("platforms") or {}).get(plat) or {})
    pid = stats.ids_of(v).get(plat)
    daily = []
    top = {}
    if plat == "youtube" and pid:
        det = _yt_detail(vdir, pid)
        t = det.get("totals") or {}
        n.update({k: t[m] for k, m in (("dislikes", "dislikes"), ("minutes", "estimatedMinutesWatched"),
                                       ("shares", "shares"), ("avg_seconds", "averageViewDuration")) if t.get(m) is not None})
        daily = det.get("daily") or []
        top = {"Traffic sources": det.get("sources") or [], "Top search terms": det.get("keywords") or []}
    if not daily:
        daily = _daily_from_history(channel.read_json(vdir / "stats_history.json", {}).get(plat, {}))
    if n.get("views") is not None and daily:
        n["per_day"] = round(n["views"] / max(1, len(daily)))
    # % against the channel's average video on this platform (the arrows on each tile)
    others = [(r.get("platforms") or {}).get(plat) or {} for k, r in rows.items() if k != v["id"]]
    delta = {}
    for key, _ in KPIS[plat]:
        vals = [o[key] for o in others if isinstance(o.get(key), (int, float))]
        if vals and isinstance(n.get(key), (int, float)) and sum(vals):
            avg = sum(vals) / len(vals)
            delta[key] = round(100 * (n[key] - avg) / avg, 1)
    return {"posted": bool(pid), "kpis": [{"key": k, "label": lab, "value": n.get(k), "delta": delta.get(k)} for k, lab in KPIS[plat]],
            "daily": daily[-28:], "top": {k: x for k, x in top.items() if x},
            "pct_viewed": n.get("pct_viewed"), "subs": n.get("subs")}


@router.get("/channels/{aid}/videos/{vid}")
def video_get(aid: str, vid: str):
    _channel_or_404(aid)
    v = next((x for x in channel.queue(aid) if x["id"] == vid), None)
    if not v:
        raise HTTPException(404, "no such video")
    rows = {r["id"]: r for r in channel.read_json(channel.paths(aid)["stats"], {}).get("videos", [])}
    script = channel.read_json(Path(v["dir"]) / "script.json", {})
    return {"video": {**v, "hook": script.get("hook"), "description": script.get("description")},
            "platforms": {p: _platform_view(aid, v, p, rows) for p in state.platforms()},
            "chat": video_chat.view(aid, vid)}


@router.get("/channels/{aid}/videos/{vid}/chat")
def video_chat_get(aid: str, vid: str):
    _channel_or_404(aid)
    return video_chat.view(aid, vid)


class ChatIn(BaseModel):
    text: str


@router.post("/channels/{aid}/videos/{vid}/chat")
def video_chat_post(aid: str, vid: str, b: ChatIn):
    _channel_or_404(aid)
    if not b.text.strip():
        raise HTTPException(400, "empty message")
    try:
        return video_chat.send(aid, vid, b.text)
    except ValueError as e:
        raise HTTPException(404, str(e))


class ChannelSettingsIn(BaseModel):
    videos_per_day: int | None = None
    post_times: list[str] | None = None
    timezone: str | None = None
    format: str | None = None
    auto_schedule: bool | None = None
    paused: bool | None = None


@router.put("/channels/{aid}/settings")
def channel_settings(aid: str, b: ChannelSettingsIn):
    _channel_or_404(aid)
    ch = {k: v for k, v in b.model_dump().items() if v is not None}
    if "post_times" in ch:
        ch["post_times"] = sorted({t for t in ch["post_times"] if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", t)})[:6] or ["13:30"]
    if "videos_per_day" in ch:
        ch["videos_per_day"] = max(1, min(4, ch["videos_per_day"]))
    if ch.get("timezone"):
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(ch["timezone"])
        except Exception:
            raise HTTPException(400, "Unknown time zone. Use a name like Europe/Rome.")
    if "format" in ch and ch["format"] not in ("short", "long"):
        raise HTTPException(400, "format is short or long")
    if ch.get("auto_schedule") and state.in_trial(aid):
        raise HTTPException(409, f"Automatic scheduling unlocks after the {state.TRIAL_DAYS}-day trial week.")
    return state.save_channel(aid, **ch)


@router.post("/channels/{aid}/make")
def channel_make(aid: str):
    _channel_or_404(aid)
    if not state.load().get("warmup_done"):
        raise HTTPException(409, "Finish the 10-day warm-up first.")
    if pipeline.busy(aid):
        return {"ok": False, "msg": "Already making a video."}
    channel.event(aid, "start", "You asked for a new video")
    tick.spawn("make", aid)
    return {"ok": True}


@router.post("/channels/{aid}/inspiration")
async def channel_inspiration(aid: str, file: UploadFile):
    _channel_or_404(aid)
    name = re.sub(r"[^\w.\-]", "_", Path(file.filename or "image").name)[-80:]
    if not name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4")):
        raise HTTPException(400, "images or short clips only")
    data = await file.read((30 << 20) + 1)
    if len(data) > 30 << 20:
        raise HTTPException(413, "Max 30 MB.")
    channel.paths(aid)["inspiration"].mkdir(parents=True, exist_ok=True)
    dest = channel.paths(aid)["inspiration"] / f"{dt.datetime.now():%Y%m%d-%H%M%S}-{name}"
    dest.write_bytes(data)
    channel.event(aid, "inspiration", f"New inspiration: {name}")
    channel.board_post(aid, "owner", f"@marketer @producer new inspiration image: inspiration/{dest.name}")
    return {"ok": True}


@router.get("/channels/{aid}/media")
def channel_media(aid: str, p: str):
    """Posters, contact sheets and videos inside the channel folder only."""
    _channel_or_404(aid)
    root = state.channel_dir(aid).resolve()
    f = (root / p).resolve() if not os.path.isabs(p) else Path(p).resolve()
    if root not in f.parents or not f.is_file() or f.suffix.lower() not in (".jpg", ".png", ".mp4", ".webp"):
        raise HTTPException(404)
    return FileResponse(f)


class TagIn(BaseModel):
    text: str


def mentions(text: str) -> list[dict]:
    ids = {}
    for a in agents.load():   # @id or the card label (@shop)
        ids[a["id"]] = a
        if a.get("short"):
            ids.setdefault(re.sub(r"[^a-z0-9-]", "", a["short"].lower()), a)
    out = []
    for m in re.findall(r"@([a-z0-9][a-z0-9-]{0,23})", text.lower()):
        if m in ids and ids[m] not in out:
            out.append(ids[m])
    return out


@router.post("/tag")
async def tag(b: TagIn):
    """Home composer with @agent: channel agents get it as an owner request (beats the style);
    other agents get it in their live session."""
    import agent_chat
    hit = mentions(b.text)
    if not hit:
        return {"routed": []}
    clean = re.sub(r"@[a-z0-9-]+\s*", "", b.text, flags=re.I).strip() or b.text
    num = re.search(r"(?<![\w&])#(\d{1,3})\b", clean)   # "@shop #12 shorter hook" -> chat #12 of that channel
    for a in hit:
        vid = num and next((v["id"] for v in channel.queue(a["id"]) if v["id"].isdigit() and int(v["id"]) == int(num.group(1))), None) \
            if channel.is_channel(a) else None
        if vid:
            video_chat.send(a["id"], vid, clean)
        elif channel.is_channel(a):
            channel.add_request(a["id"], clean)
        else:
            await agent_chat.send(a["id"], a["name"], clean)
    return {"routed": [a["id"] for a in hit]}


# ---------------------------------------------------------------- updates

@router.get("/update")
async def update_check():
    return await asyncio.to_thread(update.check)


def _busy() -> list[str]:
    return [a["id"] for a in agents.load() if channel.is_channel(a) and pipeline.busy(a["id"])]


@router.post("/update")
async def update_apply():
    if _busy():   # never cut a video in half; try again when the agents are idle
        return {"ok": False, "msg": "A video is being made. Update again when it is done."}
    try:
        res = await asyncio.to_thread(update.apply)
    except Exception as e:
        raise HTTPException(500, f"Update failed, the old version was put back: {str(e)[:200]}")
    if res.get("ok") and res.get("backup"):
        asyncio.get_running_loop().call_later(1.5, update.restart)
    return res


# ---------------------------------------------------------------- tick loop

def _notify_sync(kind: str, title: str, body: str, data: dict) -> None:
    if _loop is None or _notify is None:
        return
    extra = {}
    if kind == "auto_schedule":   # a yes/no the owner answers in the review dialog
        kind, extra = "review", {"status": "pending", "studio": {"ask": "auto_schedule", "agent": data.get("agent")},
                                 "agent": data.get("agent"), "agent_name": data.get("agent")}
    try:
        asyncio.run_coroutine_threadsafe(_notify(title, body, kind=kind, **extra), _loop).result(30)
    except Exception as e:
        print(f"studio notify: {e}", flush=True)


def _review_sync(aid: str, v: dict) -> None:
    if _loop is None or _notify is None:
        return
    a = next((x for x in agents.load() if x["id"] == aid), {"name": aid})
    trial = state.in_trial(aid)
    media = [m for m in (v.get("video"), v.get("poster")) if m and Path(m).is_file()]
    title = f"{a['name']}: approve this video?" if v.get("status") == "ready_for_review" else f"{a['name']}: this video needs your eye"
    details = "\n".join(x for x in (v.get("summary"), f"Title: {v.get('title')}", v.get("description"),
                                    f"Pinned comment: {v['pinned']}" if v.get("pinned") else None,
                                    "Trial week: every video waits for your OK." if trial else None) if x)
    asyncio.run_coroutine_threadsafe(_notify(
        title, v.get("title") or f"Video {v['id']}", kind="review", status="pending", agent=aid, agent_name=a["name"],
        details=details[:4000], studio={"agent": aid, "video": v["id"]},
        media=[{"name": Path(m).name, "video": m.endswith(".mp4")} for m in media], media_paths=media), _loop).result(30)
    # an exception here propagates so tick does not mark review_sent


def on_decision(item: dict) -> bool:
    """Called by server.approval_decide. Returns True when the item was a Studio one."""
    st = item.get("studio")
    if not st:
        return False
    if st.get("ask") == "auto_schedule":
        if item["status"] == "approved":
            state.save_channel(st["agent"], auto_schedule=True)
            channel.event(st["agent"], "settings", "You turned on automatic scheduling")
        return True
    decision = {"approved": "approve", "changes asked": "changes"}.get(item["status"], "reject")
    tick.decide(st["agent"], st["video"], decision, item.get("note", ""))
    return True


async def _loop_forever(every: int) -> None:
    await asyncio.sleep(20)
    last_upd = ""
    while True:
        try:
            await asyncio.to_thread(tick.tick, _notify_sync, _review_sync)
            today = dt.date.today().isoformat()
            if today != last_upd:
                last_upd = today
                u = await asyncio.to_thread(update.check)
                if u.get("available") and state.load().get("auto_update"):
                    await update_apply()
        except Exception as e:
            print(f"studio tick: {e}", flush=True)
        await asyncio.sleep(every)


def start(notify) -> None:
    """Start the tick loop (only on Studio installs; set NEESMO_STUDIO_TICK=0 to turn it off)."""
    global _notify, _loop
    _notify = notify
    _loop = asyncio.get_running_loop()
    if os.environ.get("NEESMO_STUDIO_TICK", "1") != "0":
        _loop.create_task(_loop_forever(int(os.environ.get("NEESMO_STUDIO_TICK_S", 300))))
