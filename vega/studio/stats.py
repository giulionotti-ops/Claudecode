"""Pull the numbers for every posted video of a channel and rank them (no tokens).

python3 -m studio.stats <aid>  -> neesmo/stats.json, neesmo/stats_summary.md
The analyst session reads the summary; the card shows the totals.
"""
import datetime as dt
import json
import sys
from pathlib import Path

from . import channel, state


def platform(aid: str) -> str:
    return state.load().get("edition", "youtube")


def ids_of(v: dict) -> dict[str, str]:
    """platform -> post id. Old videos only have platform_id (the install's single platform)."""
    ids = dict(v.get("platform_ids") or {})
    if v.get("platform_id") and not ids:
        ids[state.platforms()[0]] = v["platform_id"]
    return ids


def _api(name: str):
    if name == "instagram":
        from . import instagram as api
    else:
        from . import youtube as api
    return api


def _history(aid: str, vid: str, plat: str, n: dict, today: str) -> None:
    """Keep one snapshot per day so the detail view can draw daily views and likes for any platform."""
    v = next((x for x in channel.queue(aid) if x["id"] == vid), None)
    if not v or not v.get("dir"):
        return
    p = Path(v["dir"]) / "stats_history.json"
    h = channel.read_json(p, {})
    h.setdefault(plat, {})[today] = {k: n.get(k) for k in ("views", "likes", "comments", "shares")}
    channel.write_json(p, h)


def pull(aid: str) -> dict:
    q = channel.queue(aid)
    posted = [v for v in q if ids_of(v)]
    if not posted:
        return {}
    nums: dict[str, dict] = {}
    for plat in state.platforms():
        api = _api(plat)
        ids = [ids_of(v)[plat] for v in posted if plat in ids_of(v)]
        if ids and api.connected():
            nums[plat] = api.stats(ids)
    if not nums:          # no platform reachable: keep the numbers we have instead of writing zeros
        return channel.read_json(channel.paths(aid)["stats"], {})
    old = {r["id"]: r.get("platforms") or {} for r in channel.read_json(channel.paths(aid)["stats"], {}).get("videos", [])}
    now = state.now()
    today = now.date().isoformat()
    rows = []
    for v in posted:
        per = {}
        for plat, pid in ids_of(v).items():
            n = (nums.get(plat) or {}).get(pid)
            if n:
                per[plat] = n
                _history(aid, v["id"], plat, n, today)
            elif plat not in nums and old.get(v["id"], {}).get(plat):
                per[plat] = old[v["id"]][plat]      # that platform is not reachable now: last known numbers
        when = v.get("publish_at") or v.get("finished")
        age_h = None
        if when:
            try:
                age_h = round((now - dt.datetime.fromisoformat(when)).total_seconds() / 3600)
            except ValueError:
                pass
        # flat keys = both platforms added up (what the card and the analyst ranking use)
        flat = {k: sum((x.get(k) or 0) for x in per.values()) for k in ("views", "likes", "comments", "shares", "subs")}
        one = next(iter(per.values()), {})
        rows.append({"id": v["id"], "title": v.get("title"), "experiment": v.get("experiment"), "age_h": age_h,
                     **flat, "pct_viewed": one.get("pct_viewed"), "avg_seconds": one.get("avg_seconds"),
                     "platforms": per})
    totals = {"videos": len(rows), "views": sum(r.get("views") or 0 for r in rows),
              "subs": sum(r.get("subs") or 0 for r in rows), "likes": sum(r.get("likes") or 0 for r in rows)}
    data = {"updated": now.isoformat(timespec="seconds"), "totals": totals, "videos": rows}
    channel.write_json(channel.paths(aid)["stats"], data)
    ranked = sorted(rows, key=lambda r: r.get("views") or 0, reverse=True)
    lines = [f"# Stats ({dt.date.today()})", "",
             f"{totals['videos']} videos, {totals['views']} views, {totals['subs']} subscribers gained.", "",
             "| video | platform | title | age h | views | % viewed | avg s | subs | likes | experiment |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for r in ranked:
        for plat, n in (r["platforms"] or {"-": r}).items():
            lines.append(f"| {r['id']} | {plat} | {(r.get('title') or '')[:50]} | {r.get('age_h')} | {n.get('views')} | "
                         f"{n.get('pct_viewed')} | {n.get('avg_seconds')} | {n.get('subs')} | {n.get('likes')} | "
                         f"{(r.get('experiment') or '')[:60]} |")
    (channel.paths(aid)["n"] / "stats_summary.md").write_text("\n".join(lines) + "\n")
    return data


def mature(aid: str) -> int:
    """Videos old enough (48 h) to judge."""
    d = channel.read_json(channel.paths(aid)["stats"], {})
    return sum(1 for r in d.get("videos", []) if (r.get("age_h") or 0) >= 48)


if __name__ == "__main__":
    print(json.dumps(pull(sys.argv[1]).get("totals", {})))
