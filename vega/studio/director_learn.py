"""The director learns from its own videos (no tokens).

  python3 -m studio.director_learn log <aid> <vid>   # after a video: record what the shot list did + the check score
  python3 -m studio.director_learn learn <aid>       # join with real views, rewrite neesmo/director/playbook.md

Each video adds one row to `neesmo/director/log.jsonl`: shot count, average shot length, hook length, shot sizes,
camera moves, transitions, film references, mode, the supervisor's score and what it sent back. `learn` joins
that with `neesmo/stats.json` (views, % viewed) and writes the playbook the director reads first: what to do
more, what to do less, what is still untested, the supervisor's repeated complaints, and the director's own notes
(`neesmo/director/notes.md`, one line per video, written by the director session).
"""
import json
import re
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path

from . import channel, shotlist, state

MIN_VIDEOS = 3   # below this the numbers are noise: the playbook says so and only lists the check results


def _dir(aid: str) -> Path:
    d = channel.paths(aid)["n"] / "director"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _first_word(x: str, vocab) -> str:
    """The vocabulary word that appears first in the text (whole-word start), else the text's first word."""
    x = str(x or "").lower()
    hits = [(m.start(), -len(v), v) for v in vocab if (m := re.search(rf"\b{re.escape(v)}", x))]
    return min(hits)[2] if hits else (x.split()[0] if x.split() else "")


def features(vdir: Path) -> dict:
    sl = shotlist.load(vdir)
    shots = sl.get("shots") or []
    if not shots:
        return {}
    lens = [max(0.0, float(s.get("end") or 0) - float(s.get("start") or 0)) for s in shots]
    refs = [str(s.get("reference") or "").split("(")[0].strip() for s in shots]
    return {"mode": sl.get("mode", "narrated"), "shots": len(shots), "avg_shot": round(st.mean(lens), 2),
            "hook_s": round(lens[0], 2), "length": round(sum(lens), 1),
            "sizes": dict(Counter(str(s.get("size", "")).upper() for s in shots)),
            "moves": dict(Counter(_first_word(s.get("camera"), shotlist.MOVES) for s in shots)),
            "transitions": dict(Counter(_first_word(s.get("transition"), shotlist.TRANSITIONS) for s in shots)),
            "hook_move": _first_word(shots[0].get("camera"), shotlist.MOVES),
            "hook_size": str(shots[0].get("size", "")).upper(),
            "refs": [r for r in dict.fromkeys(refs) if r][:12],
            "text_shots": sum(1 for s in shots if str(s.get("text") or "").strip())}


def log(aid: str, vid: str) -> dict:
    vdir = channel.paths(aid)["videos"] / vid
    f = features(vdir)
    if not f:
        return {}
    verdict = channel.read_json(vdir / "verdict.json", {})
    gate = channel.read_json(vdir / "gate.json", {})
    review = channel.read_json(vdir / "script_review.json", {})
    row = {"video": vid, "ts": state.now().isoformat(timespec="seconds"), **f,
           "score": verdict.get("score"), "ok": verdict.get("ok"),
           "issues": [str(i.get("fix") or "")[:160] for i in verdict.get("issues") or [] if isinstance(i, dict)][:4],
           "script_sent_back": review.get("ok") is False,
           "measured": {k: (gate.get("shotlist") or {}).get(k) for k in ("scene_changes", "planned_cuts_seen", "longest_still_s")}}
    p = _dir(aid) / "log.jsonl"
    rows = [r for r in _rows(aid) if r.get("video") != vid] + [row]
    p.write_text("".join(json.dumps(r) + "\n" for r in rows))
    learn(aid)
    return row


def _rows(aid: str) -> list[dict]:
    out = []
    try:
        for ln in (_dir(aid) / "log.jsonl").read_text().splitlines():
            try:
                out.append(json.loads(ln))
            except ValueError:
                pass
    except OSError:
        pass
    return out


def _perf(aid: str) -> tuple[dict[str, float], str]:
    """Per video one number: % viewed when the platform gives it, else views relative to the channel median.
    Only videos 48 h or older count (newer numbers still move)."""
    rows = [r for r in channel.read_json(channel.paths(aid)["stats"], {}).get("videos", []) if (r.get("age_h") or 0) >= 48]
    unit = "views vs. channel median (100 = median)"
    if not rows:
        return {}, unit
    if sum(1 for r in rows if r.get("pct_viewed") is not None) >= len(rows) / 2:
        return {r["id"]: float(r["pct_viewed"]) for r in rows if r.get("pct_viewed") is not None}, "% viewed"
    med = st.median([r.get("views") or 0 for r in rows]) or 1
    return {r["id"]: round(100 * (r.get("views") or 0) / med, 1) for r in rows}, unit


def _compare(rows: list[dict], perf: dict[str, float]) -> list[tuple[str, float, float, int]]:
    """(finding, mean with, mean without, n with) for simple yes/no traits of each video."""
    traits: dict[str, set[str]] = defaultdict(set)
    for r in rows:
        v = r["video"]
        if v not in perf:
            continue
        traits[f"hook shot is {r.get('hook_size')}"].add(v)
        traits[f"hook camera is {r.get('hook_move')}"].add(v)
        traits["shots average under 1.5 s" if r.get("avg_shot", 9) < 1.5 else "shots average 1.5 s or more"].add(v)
        traits["hook shot under 1.2 s" if r.get("hook_s", 9) < 1.2 else "hook shot 1.2 s or more"].add(v)
        traits[f"{r.get('mode')} video"].add(v)
        for t, n in (r.get("transitions") or {}).items():
            if t and t != "cut" and n >= 2:
                traits[f"uses {t} transitions (2+)"].add(v)
        for m, n in (r.get("moves") or {}).items():
            if m and n >= 3:
                traits[f"camera {m} on 3+ shots"].add(v)
        for ref in r.get("refs") or []:
            traits[f"borrows from {ref}"].add(v)
    vids = {r["video"] for r in rows if r["video"] in perf}
    out = []
    for name, have in traits.items():
        rest = vids - have
        if len(have) < 2 or not rest:
            continue
        out.append((name, st.mean(perf[v] for v in have), st.mean(perf[v] for v in rest), len(have)))
    return sorted(out, key=lambda x: x[1] - x[2], reverse=True)


def learn(aid: str) -> str:
    rows = _rows(aid)
    perf, unit = _perf(aid)
    d = _dir(aid)
    lines = ["# Director playbook (written by `studio.director_learn` - do not edit by hand)", "",
             f"{len(rows)} shot lists logged, {len(perf)} with real numbers ({unit}).", ""]
    judged = [r for r in rows if r["video"] in perf]
    if len(judged) >= MIN_VIDEOS:
        cmp = _compare(rows, perf)
        better = [c for c in cmp if c[1] > c[2] * 1.1][:6]
        worse = [c for c in reversed(cmp) if c[1] < c[2] * 0.9][:6]
        lines += ["## Do more (beat the rest)"] + ([f"- {n}: {a:.0f} vs {b:.0f} ({k} videos)" for n, a, b, k in better] or ["- nothing clear yet"])
        lines += ["", "## Do less (lose to the rest)"] + ([f"- {n}: {a:.0f} vs {b:.0f} ({k} videos)" for n, a, b, k in worse] or ["- nothing clear yet"])
        best = sorted(judged, key=lambda r: perf[r["video"]], reverse=True)[:3]
        lines += ["", "## Best videos - reuse their shape"]
        lines += [f"- {r['video']}: {perf[r['video']]:.0f}; {r['shots']} shots, avg {r['avg_shot']} s, hook {r['hook_size']} "
                  f"{r['hook_move']} {r['hook_s']} s; refs: {', '.join(r.get('refs', [])[:4])}" for r in best]
        tried = Counter(ref for r in rows for ref in r.get("refs") or [])
        lines += ["", "## Untested - try one per video",
                  "- film references not used yet: pick from references/film-playbook.md, not: " + ", ".join(list(tried)[:12])]
    else:
        lines += [f"Not enough judged videos yet (need {MIN_VIDEOS}). Follow the skill as written and vary one thing per video."]
    issues = Counter(i for r in rows[-12:] for i in r.get("issues") or [])
    if issues:
        lines += ["", "## The quality check keeps sending back (last 12 videos) - prevent it in the shot list"]
        lines += [f"- {n}x {i}" for i, n in issues.most_common(5)]
    stills = [r for r in rows[-8:] if ((r.get("measured") or {}).get("longest_still_s") or 0) > 4.5]
    if stills:
        lines += ["", f"## Renders with long still stretches: {', '.join(r['video'] for r in stills)} - plan more motion per shot"]
    scores = [r["score"] for r in rows[-10:] if isinstance(r.get("score"), (int, float))]
    if scores:
        lines += ["", f"Average quality-check score, last {len(scores)}: {st.mean(scores):.1f}/10"]
    try:
        notes = [n for n in (d / "notes.md").read_text().splitlines() if n.strip().startswith("-")][-15:]
    except OSError:
        notes = []
    if notes:
        lines += ["", "## Your own notes (newest last)"] + notes
    text = "\n".join(lines) + "\n"
    (d / "playbook.md").write_text(text)
    return text


def main(argv: list[str]) -> int:
    if argv[:1] == ["log"] and len(argv) == 3:
        print(json.dumps(log(argv[1], argv[2])))
    elif argv[:1] == ["learn"] and len(argv) == 2:
        print(learn(argv[1]))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
