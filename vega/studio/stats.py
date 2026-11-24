"""Pull the numbers for every posted video of a channel and rank them (no tokens).

python3 -m studio.stats <aid>  -> neesmo/stats.json, neesmo/stats_summary.md
The analyst session reads the summary; the card shows the totals.
"""
import datetime as dt
import json
import sys

from . import channel, state


def platform(aid: str) -> str:
    return state.load().get("edition", "youtube")


def pull(aid: str) -> dict:
    q = channel.queue(aid)
    posted = [v for v in q if v.get("platform_id")]
    if not posted:
        return {}
    ids = [v["platform_id"] for v in posted]
    if platform(aid) == "instagram":
        from . import instagram as api
    else:
        from . import youtube as api
    if not api.connected():
        return {}
    nums = api.stats(ids)
    now = state.now()
    rows = []
    for v in posted:
        n = nums.get(v["platform_id"]) or {}
        when = v.get("publish_at") or v.get("finished")
        age_h = None
        if when:
            try:
                age_h = round((now - dt.datetime.fromisoformat(when)).total_seconds() / 3600)
            except ValueError:
                pass
        rows.append({"id": v["id"], "title": v.get("title"), "experiment": v.get("experiment"), "age_h": age_h, **n})
    totals = {"videos": len(rows), "views": sum(r.get("views") or 0 for r in rows),
              "subs": sum(r.get("subs") or 0 for r in rows), "likes": sum(r.get("likes") or 0 for r in rows)}
    data = {"updated": now.isoformat(timespec="seconds"), "totals": totals, "videos": rows}
    channel.write_json(channel.paths(aid)["stats"], data)
    ranked = sorted(rows, key=lambda r: r.get("views") or 0, reverse=True)
    lines = [f"# Stats ({dt.date.today()})", "",
             f"{totals['videos']} videos, {totals['views']} views, {totals['subs']} subscribers gained.", "",
             "| video | title | age h | views | % viewed | avg s | subs | likes | experiment |", "|---|---|---|---|---|---|---|---|---|"]
    for r in ranked:
        lines.append(f"| {r['id']} | {(r.get('title') or '')[:50]} | {r.get('age_h')} | {r.get('views')} | "
                     f"{r.get('pct_viewed')} | {r.get('avg_seconds')} | {r.get('subs')} | {r.get('likes')} | "
                     f"{(r.get('experiment') or '')[:60]} |")
    (channel.paths(aid)["n"] / "stats_summary.md").write_text("\n".join(lines) + "\n")
    return data


def mature(aid: str) -> int:
    """Videos old enough (48 h) to judge."""
    d = channel.read_json(channel.paths(aid)["stats"], {})
    return sum(1 for r in d.get("videos", []) if (r.get("age_h") or 0) >= 48)


if __name__ == "__main__":
    print(json.dumps(pull(sys.argv[1]).get("totals", {})))
