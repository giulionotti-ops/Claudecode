"""The channel agents' clock. The server calls `tick()` every few minutes (in a thread). Plain Python: no tokens.

Each tick:
  - warm-up: when the 10 days are over, say so once and unlock content creation
  - per channel (not paused): post approved videos into the next free slot, send new videos for review,
    keep a small buffer of videos by starting `studio.pipeline make` in the background,
    ask once after the trial week whether Neesmo may schedule by itself, pull stats daily and
    start the analyst when there is enough data, and run the owner's automation scripts that are due.
The server passes `notify(kind, title, body, data)` and `review(aid, video)` so notes reach the phone.
"""
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

from . import channel, pipeline, state, stats

LOG = state.DIR / "pipeline.log"


def spawn(*args: str) -> None:
    """Run `python -m studio.pipeline <args>` detached; it survives server restarts."""
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG, "a") as log:
        subprocess.Popen([sys.executable, "-m", "studio.pipeline", *args], cwd=state.APP, stdout=log,
                         stderr=subprocess.STDOUT, start_new_session=True)


def _channels() -> list[str]:
    import agents
    return [a["id"] for a in agents.load() if channel.is_channel(a)]


def _when(v: dict) -> dt.datetime | None:
    try:
        return dt.datetime.fromisoformat(v["publish_at"]) if v.get("publish_at") else None
    except ValueError:
        return None


def _post(aid: str, notify) -> None:
    """Approved -> scheduled (YouTube: uploaded private with publishAt; Instagram: published at the slot).
    The director edition does both for every video and keeps each post id in platform_ids."""
    plats = state.platforms()
    c = state.channel(aid)
    q = channel.queue(aid)
    taken = [w for v in q if (w := _when(v))]
    for v in q:
        try:
            ids = dict(v.get("platform_ids") or {})
            if v.get("platform_id") and not ids:
                ids[plats[0]] = v["platform_id"]
            if v.get("status") == "approved":
                from .youtube import next_slot
                when = next_slot(c["post_times"], taken, c.get("timezone", ""))
                taken.append(when)
                if "youtube" in plats:
                    from . import youtube
                    if not youtube.connected():
                        return
                    ids["youtube"] = youtube.upload(v, when)
                channel.update_video(aid, v["id"], status="scheduled", platform_ids=ids,
                                     platform_id=ids.get(plats[0]), publish_at=when.isoformat())
                channel.event(aid, "scheduled", f"Video {v['id']} scheduled for {when:%a %d %b %H:%M}", video=v["id"])
            elif v.get("status") == "scheduled":
                w = _when(v)
                if not (w and w <= state.now()):
                    continue
                if "instagram" in plats and not ids.get("instagram"):
                    from . import instagram
                    ids["instagram"] = instagram.publish(v)
                    channel.event(aid, "posted", f"Video {v['id']} is live on Instagram", video=v["id"])
                channel.update_video(aid, v["id"], status="posted", platform_ids=ids, platform_id=ids.get(plats[0]))
                try:
                    from . import automations
                    automations.on(aid, "after_post", v["id"])
                except Exception as e:
                    channel.event(aid, "error", f"Automations after posting failed: {str(e)[:160]}", video=v["id"])
        except Exception as e:   # one bad upload must not stop the others; tell the owner once
            if not v.get("post_error"):
                channel.update_video(aid, v["id"], post_error=str(e)[:300])
                notify("important", "Upload problem", f"Video {v['id']} could not be posted: {str(e)[:160]}", {"agent": aid})


def _reviews(aid: str, review) -> None:
    for v in channel.queue(aid):
        if v.get("status") in ("ready_for_review", "needs_owner") and not v.get("review_sent"):
            review(aid, v)
            channel.update_video(aid, v["id"], review_sent=state.now().isoformat(timespec="seconds"))


def _buffer(aid: str) -> None:
    c = state.channel(aid)
    if pipeline.busy(aid):
        return
    q = channel.queue(aid)
    now = state.now()
    waiting = [v for v in q if v.get("status") in ("making", "ready_for_review", "needs_owner", "approved")
               or (v.get("status") == "scheduled" and (_when(v) or now) > now)]
    made_today = [v for v in q if (v.get("created") or "")[:10] == now.date().isoformat()]
    per_day = max(1, int(c.get("videos_per_day", 1)))
    # in the trial week keep at most one waiting for review, so the owner is never flooded
    cap = 1 if state.needs_approval(aid) else per_day * 2
    stuck = [v for v in waiting if v.get("status") == "making"]
    if stuck:   # a crashed run left "making": mark it failed so the buffer moves on
        for v in stuck:
            channel.update_video(aid, v["id"], status="failed", summary="The run stopped before it finished.")
        return
    if len(waiting) < cap and len(made_today) < per_day + 1:
        channel.event(aid, "start", "The Director started a new video")
        spawn("make", aid)


def _trial(aid: str, notify) -> None:
    c = state.channel(aid)
    if c.get("trial_start") and not state.in_trial(aid) and not c.get("auto_schedule") and not c.get("auto_schedule_asked"):
        state.save_channel(aid, auto_schedule_asked=True)
        notify("auto_schedule", "Trial week done",
               "The first week went well. Can I schedule new videos by myself from now on? You can change this any time.",
               {"agent": aid})


def _daily(aid: str) -> None:
    n = channel.paths(aid)["n"] / "daily.json"
    d = channel.read_json(n, {})
    today = dt.date.today().isoformat()
    if d.get("stats") == today:
        return
    d["stats"] = today
    channel.write_json(n, d)
    try:
        stats.pull(aid)
    except Exception as e:
        channel.event(aid, "stats_failed", f"Could not read the numbers: {str(e)[:160]}")
        return
    try:
        from . import director_learn
        director_learn.learn(aid)   # the director's playbook follows the new numbers
    except Exception as e:
        channel.event(aid, "error", f"Director playbook not updated: {str(e)[:160]}")
    if stats.mature(aid) >= 3 and not pipeline.busy(aid):
        spawn("analyse", aid)


def _automations(aid: str) -> None:
    """The owner's automations: plain Python scripts in neesmo/automations, run on their schedule (no tokens)."""
    from . import automations
    try:
        automations.due(aid)
    except Exception as e:
        channel.event(aid, "error", f"Automations problem: {str(e)[:160]}")


def tick(notify, review) -> None:
    s = state.load()
    left = state.warmup_left(s)
    if left == 0 and not s.get("warmup_done"):
        state.save(warmup_done=True, step="ready")
        notify("important", "Warm-up done", "Your 10 days are over. Neesmo can start making videos now.", {})
    if not state.load().get("warmup_done"):
        return
    for aid in _channels():
        try:
            if state.channel(aid).get("paused"):
                continue
            _reviews(aid, review)
            _post(aid, notify)
            _trial(aid, notify)
            _buffer(aid)
            _daily(aid)
            _automations(aid)
        except Exception as e:
            channel.event(aid, "error", f"Tick problem: {str(e)[:200]}")
    if "instagram" in state.platforms():
        d = channel.read_json(state.DIR / "ig_refresh.json", {})
        if d.get("week") != dt.date.today().isocalendar()[1]:
            try:
                from . import instagram
                if instagram.connected():
                    instagram.refresh_token()
                channel.write_json(state.DIR / "ig_refresh.json", {"week": dt.date.today().isocalendar()[1]})
            except Exception:
                pass


def decide(aid: str, vid: str, decision: str, note: str = "") -> dict | None:
    """The owner's answer on a review: approve / changes / reject."""
    v = next((x for x in channel.queue(aid) if x["id"] == vid), None)
    if not v:
        return None
    if decision == "approve":
        v = channel.update_video(aid, vid, status="approved", approved=state.now().isoformat(timespec="seconds"))
        st = channel.read_json(channel.paths(aid)["style"], {})
        st["template"] = str(Path(v["dir"]).relative_to(state.channel_dir(aid)))   # next video starts from this one
        channel.write_json(channel.paths(aid)["style"], st)
        channel.event(aid, "approved", f"You approved video {vid}", video=vid)
    elif decision == "changes":
        channel.update_video(aid, vid, review_sent=None)
        spawn("fix", aid, vid, note or "Make it better.")
    else:
        v = channel.update_video(aid, vid, status="rejected")
        channel.board_post(aid, "owner", f"@all {vid} rejected" + (f": {note}" if note else ""))
        channel.event(aid, "rejected", f"You rejected video {vid}", video=vid)
    return v


if __name__ == "__main__":   # cron fallback: python3 -m studio.tick
    tick(lambda *a: print("notify", *a), lambda aid, v: print("review", aid, v["id"]))
