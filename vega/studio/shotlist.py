"""The director's shot list: check it, render it for humans, and measure a finished video against it (no tokens).

  python3 -m studio.shotlist check <video_dir>     # validate script_review.json + shotlist.json, write shotlist.md
  python3 -m studio.shotlist measure <video_dir>   # scene changes in video.mp4 vs the shot list (JSON)

The supervisor (director pass) runs `check` until it prints ok; the pipeline runs it again to be sure.
gate.py adds `measure` to gate.json so the quality check can see skipped shots.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SIZES = {"EWS", "WS", "MS", "MCU", "CU", "ECU", "INSERT", "POV", "OTS", "TOP", "CUTAWAY"}
TRANSITIONS = ("cut-on-action", "smash-cut", "match-cut", "match-move", "zoom-through", "fade-black",
               "j-cut", "l-cut", "whip", "morph", "iris", "wipe", "flash", "cut")
MOVES = ("static", "push", "pull", "pan", "tilt", "track", "truck", "orbit", "crane", "dolly", "whip", "crash",
         "handheld", "snorricam", "rack", "speed-ramp", "zoom", "drift", "follow", "fly", "descend", "rise", "arc")
FIELDS = ("id", "line", "idea", "size", "angle", "lens", "camera", "lighting", "palette", "composition", "action",
          "vfx", "sfx", "music", "transition", "reference")
VAGUE = re.compile(r"^\s*(nice|cool|good|tbd|todo|n/?a|same|as above|epic|something|stuff|\.\.\.)\s*\.?\s*$", re.I)
FILM = re.compile(r"\(.*\b(1[89]\d\d|20\d\d)\b.*\)")


def _words(x) -> int:
    if isinstance(x, dict):
        x = " ".join(str(v) for v in x.values())
    elif isinstance(x, list):
        x = " ".join(str(v) for v in x)
    return len(str(x or "").split())


def _style(vdir: Path) -> dict:
    for p in (vdir.parent.parent / "neesmo" / "style.json",):
        try:
            return json.loads(p.read_text())
        except (OSError, ValueError):
            pass
    return {}


def load(vdir: Path) -> dict:
    try:
        d = json.loads((vdir / "shotlist.json").read_text())
    except (OSError, ValueError):
        return {}
    if not isinstance(d, dict):
        return {}
    d["shots"] = [x for x in d.get("shots") or [] if isinstance(x, dict)] if isinstance(d.get("shots"), list) else []
    for k in ("look", "sound"):
        if not isinstance(d.get(k), dict):
            d[k] = {"notes": d[k]} if d.get(k) else {}
    return d


def _has(word: str, text: str) -> bool:
    return re.search(rf"\b{re.escape(word)}", text) is not None


def check(vdir: Path, style: dict | None = None) -> list[str]:
    """Every problem as one plain line. Empty list = ok."""
    style = _style(vdir) if style is None else style
    errs: list[str] = []
    try:
        rv = json.loads((vdir / "script_review.json").read_text())
        if not isinstance(rv, dict):
            raise ValueError
        if not isinstance(rv.get("ok"), bool):
            errs.append("script_review.json: `ok` must be true or false")
        if rv.get("ok") is False and not rv.get("fixes"):
            errs.append("script_review.json: ok is false but there are no fixes")
        if len(rv.get("fixes") or []) > 5:
            errs.append("script_review.json: at most 5 fixes")
        if not isinstance(rv.get("score"), (int, float)) or not 1 <= rv["score"] <= 10:
            errs.append("script_review.json: `score` must be a number 1-10 (the pipeline films only 8+)")
        if not str(rv.get("hook_picture") or "").strip():
            errs.append("script_review.json: hook_picture is empty (what does the viewer SEE in the first 1.5 s?)")
    except (OSError, ValueError):
        errs.append("script_review.json is missing or not valid JSON")
    def _refs_ok(f: Path) -> bool:
        try:
            return json.loads(f.read_text()).get("count", 0) > 0
        except (OSError, ValueError, AttributeError):
            return False
    if not any(_refs_ok(f) for f in (vdir / "refs").glob("*/refs.json")):
        errs.append("no art references: run `python3 -m studio.artrefs videos/<NNN> \"<subject>\" ...` for every "
                    "named thing the viewer will see, look at each refs/<subject>/sheet.jpg, then plan the details")
    if not (vdir / "shotlist.json").exists():
        return errs + ["shotlist.json is missing"]
    try:
        raw = json.loads((vdir / "shotlist.json").read_text())
    except (OSError, ValueError):
        raw = None
    if not isinstance(raw, dict):
        return errs + ["shotlist.json is not a valid JSON object"]
    for k in ("look", "sound"):
        if not isinstance(raw.get(k), dict):
            errs.append(f"`{k}` must be an object, e.g. {{\"palette\": ..., \"lighting\": ...}}")
    if not isinstance(raw.get("shots"), list) or not all(isinstance(x, dict) for x in raw["shots"]):
        return errs + ["`shots` must be a list of objects"]
    sl = load(vdir)
    shots = sl.get("shots") or []
    if not shots:
        return errs + ["shotlist.json has no shots"]
    mode = sl.get("mode", "narrated")
    if mode not in ("narrated", "voiceless"):
        errs.append("mode must be narrated or voiceless")
    for k in ("logline", "look", "sound", "loop"):
        if _words(sl.get(k)) < 3:
            errs.append(f"`{k}` is missing or too short")
    short = style.get("format", "short") == "short"
    try:
        max_s = float(style.get("max_seconds") or (59 if short else 1800))
    except (TypeError, ValueError):
        max_s = 59.0 if short else 1800.0
    t = 0.0
    sizes: list[str] = []
    silence = False
    for i, s in enumerate(shots):
        sid = s.get("id") or f"#{i + 1}"
        for f in FIELDS:
            v = s.get(f)
            if v in (None, "", [], {}) or (isinstance(v, str) and VAGUE.match(v)):
                errs.append(f"shot {sid}: `{f}` is empty or vague")
        if mode == "voiceless" and not str(s.get("text") or "").strip():
            errs.append(f"shot {sid}: voiceless videos need on-screen `text` in every shot")
        if s.get("action") and _words(s["action"]) < 8:
            errs.append(f"shot {sid}: `action` needs at least 8 words (what moves, how, how fast)")
        if s.get("lighting") and _words(s["lighting"]) < 5:
            errs.append(f"shot {sid}: `lighting` needs at least 5 words (key, hardness, colour, practicals)")
        size = str(s.get("size") or "").upper()
        if size and size not in SIZES:
            errs.append(f"shot {sid}: size `{s.get('size')}` is not one of {' '.join(sorted(SIZES))}")
        sizes.append(size)
        cam = str(s.get("camera") or "").lower()
        if cam and not any(_has(m, cam) for m in MOVES):
            errs.append(f"shot {sid}: camera `{s['camera'][:40]}` names no move (push-in, pull-out, orbit, static...)")
        tr = str(s.get("transition") or "").lower()
        if tr and not tr.startswith(TRANSITIONS):
            errs.append(f"shot {sid}: transition `{s['transition'][:30]}` must start with one of {', '.join(TRANSITIONS)}")
        if s.get("reference") and not FILM.search(str(s["reference"])):
            errs.append(f"shot {sid}: reference needs a film and year in brackets, e.g. Jaws (Spielberg, 1975) - dolly zoom")
        if "silence" in json.dumps([s.get("sfx"), s.get("music")]).lower():
            silence = True
        try:
            a, b = float(s["start"]), float(s["end"])
        except (KeyError, TypeError, ValueError):
            errs.append(f"shot {sid}: start and end must be numbers (seconds)")
            continue
        if abs(a - t) > 0.05:
            errs.append(f"shot {sid}: starts at {a} but the previous shot ends at {t}")
        d = b - a
        if d <= 0:
            errs.append(f"shot {sid}: ends before it starts")
        elif short:
            if i == 0 and d > 2.0:
                errs.append(f"shot {sid}: the hook shot lasts {d:.1f} s; keep it at most 2 s")
            top = 6.0 if "static" not in cam else 4.0
            if d < 0.4 or d > top:
                errs.append(f"shot {sid}: lasts {d:.1f} s; shorts need 0.4-4 s (6 s only with a moving camera)")
        t = b
    for i in range(2, len(sizes)):
        if sizes[i] and sizes[i] == sizes[i - 1] == sizes[i - 2]:
            errs.append(f"shots {shots[i - 2].get('id')}-{shots[i].get('id')}: three {sizes[i]} in a row; vary the size")
    if t > max_s + 0.05:
        errs.append(f"the shot list runs {t:.1f} s, the channel's max is {max_s:.0f} s")
    if short and shots and t / len(shots) > 2.5:
        errs.append(f"average shot is {t / len(shots):.1f} s; shorts need a new picture every 1-2 s (at most 2.5 s)")
    if not silence:
        errs.append("no shot uses silence; put one silence right before the biggest moment")
    return errs


def render_md(vdir: Path) -> str:
    sl = load(vdir)
    look, sound = sl.get("look") or {}, sl.get("sound") or {}
    out = [f"# Shot list {vdir.name}", "", f"**{sl.get('logline', '')}**", "",
           f"Mode: {sl.get('mode', 'narrated')}  ", "Look: " + "; ".join(f"{k}: {v}" for k, v in look.items()) + "  ",
           "Sound: " + "; ".join(f"{k}: {v}" for k, v in sound.items()), ""]
    for s in sl.get("shots") or []:
        sfx = s.get("sfx")
        sfx = "; ".join(f"{k}: {v}" for k, v in sfx.items()) if isinstance(sfx, dict) else sfx
        vfx = ", ".join(s["vfx"]) if isinstance(s.get("vfx"), list) else s.get("vfx")
        out += [f"## {s.get('id')} - {s.get('start')}-{s.get('end')} s - {s.get('size')}, {s.get('angle')}, {s.get('lens')}",
                f"> {s.get('line', '')}", "",
                f"- **Idea:** {s.get('idea')}", f"- **Camera:** {s.get('camera')}", f"- **Light:** {s.get('lighting')}",
                f"- **Colour:** {s.get('palette')}", f"- **Frame:** {s.get('composition')}",
                f"- **Action:** {s.get('action')}", f"- **VFX:** {vfx}",
                f"- **Text:** {s.get('text') or '-'}", f"- **SFX:** {sfx}", f"- **Music:** {s.get('music')}",
                f"- **Out:** {s.get('transition')}", f"- **Ref:** {s.get('reference')}", ""]
    out += [f"**Loop:** {sl.get('loop', '')}", ""]
    return "\n".join(out)


def scene_changes(video: Path, threshold: float = 0.22) -> list[float]:
    """Times (s) where the picture changes a lot (cuts, smash cuts, whips)."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-an", "-vf",
                        f"scale=180:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=600)
    return [round(float(x), 2) for x in re.findall(r"pts_time:([\d.]+)", r.stderr)]


def measure(vdir: Path) -> dict:
    """Compare the render with the plan: how many picture changes, longest still stretch, shots with no change."""
    sl = load(vdir)
    video = vdir / "video.mp4"
    if not sl or not video.exists():
        return {}
    shots = sl.get("shots") or []
    cuts = scene_changes(video)
    try:
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    str(video)], capture_output=True, text=True, timeout=60).stdout.strip() or 0)
    except ValueError:
        dur = 0.0
    marks = [0.0] + cuts + [dur]
    longest = max((b - a for a, b in zip(marks, marks[1:])), default=dur)
    planned = [float(s.get("start") or 0) for s in shots[1:]]
    # a planned cut counts as seen when the video changes within 0.5 s of it (soft transitions may not register)
    seen = sum(1 for p in planned if any(abs(p - c) <= 0.5 for c in cuts))
    res = {"planned_shots": len(shots), "scene_changes": len(cuts), "planned_cuts_seen": seen,
           "longest_still_s": round(longest, 1), "duration": round(dur, 1)}
    # a planned long hold is allowed; anything longer than the longest planned shot (and over 4.5 s) is not
    hold = max([float(s.get("end") or 0) - float(s.get("start") or 0) for s in shots] + [0.0])
    res["allowed_still_s"] = round(max(4.5, hold + 0.5), 1)
    probs = []
    if planned and seen < 0.7 * len(planned):
        probs.append(f"only {seen} of {len(planned)} planned cuts show in the video; shots were merged or skipped "
                     f"(render each shot on its own: python3 -m studio.shotrender)")
    if longest > res["allowed_still_s"]:
        probs.append(f"the picture barely changes for {longest:.1f} s (longest planned shot allows "
                     f"{res['allowed_still_s']} s)")
    res["problems"] = probs
    return res


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[0] not in ("check", "measure"):
        print(__doc__)
        return 2
    vdir = Path(argv[1])
    if argv[0] == "measure":
        print(json.dumps(measure(vdir)))
        return 0
    errs = check(vdir)
    if errs:
        print("NOT OK - fix these and run again:\n- " + "\n- ".join(errs))
        return 1
    (vdir / "shotlist.md").write_text(render_md(vdir))
    print(f"ok - {len(load(vdir).get('shots', []))} shots, shotlist.md written")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
