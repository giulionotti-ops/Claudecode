"""Quality gate: measure a finished video with ffprobe/ffmpeg (no tokens) and make a 12-frame contact sheet.

python3 -m studio.gate <video_dir> [--style style.json]   -> writes gate.json, contact.jpg; exit 0 if ok
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def _probe(video: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height",
                          "-of", "json", str(video)], capture_output=True, text=True, timeout=60).stdout
    return json.loads(out or "{}")


def _lufs(video: Path) -> float | None:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=600)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1]) if m else None


def contact_sheet(video: Path, out: Path, duration: float, n: int = 12) -> bool:
    step = max(duration / n, 0.1)
    vf = f"fps=1/{step:.3f},scale=270:-2,tile=4x3:padding=6:color=black"
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vf", vf, "-frames:v", "1", str(out)],
                       capture_output=True, timeout=300)
    return r.returncode == 0 and out.exists()


def check(vdir: Path, style: dict) -> dict:
    video = vdir / "video.mp4"
    problems: list[str] = []
    res: dict = {"ok": False, "problems": problems}
    if not video.exists() or video.stat().st_size < 50_000:
        problems.append("video.mp4 is missing or nearly empty")
        return res
    p = _probe(video)
    streams = p.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), {})
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    dur = float(p.get("format", {}).get("duration") or 0)
    res.update(duration=round(dur, 2), width=v.get("width"), height=v.get("height"), audio=has_audio)
    want = style.get("size", "1080x1920")
    if f"{v.get('width')}x{v.get('height')}" != want:
        problems.append(f"size is {v.get('width')}x{v.get('height')}, the channel uses {want}")
    max_s = style.get("max_seconds") or (59 if style.get("format", "short") == "short" else 1800)
    min_s = style.get("min_seconds") or (15 if style.get("format", "short") == "short" else 120)
    if dur > max_s:
        problems.append(f"{dur:.1f} s is longer than {max_s} s")
    if dur < min_s:
        problems.append(f"{dur:.1f} s is shorter than {min_s} s")
    if not has_audio:
        problems.append("no audio track")
    else:
        lufs = _lufs(video)
        res["lufs"] = lufs
        if lufs is not None and not -17.5 <= lufs <= -11:
            problems.append(f"loudness {lufs} LUFS, aim for about -14")
    for f in ("poster.jpg", "captions.srt"):
        if not (vdir / f).exists():
            problems.append(f"{f} is missing")
    res["contact"] = contact_sheet(video, vdir / "contact.jpg", dur) and "contact.jpg"
    if (vdir / "shotlist.json").exists():   # the director's plan vs. what was rendered (advice for the supervisor)
        try:
            from .shotlist import measure
        except ImportError:
            from shotlist import measure
        try:
            res["shotlist"] = measure(vdir)
        except Exception as e:   # measuring must never break the gate
            res["shotlist"] = {"error": str(e)[:200]}
    res["qa"] = qa(vdir, video)
    if (res["qa"].get("flashes") or []):
        problems.append(f"single-frame flashes at {res['qa']['flashes']} s (a glitch or a broken transition)")
    res["ok"] = not problems
    return res


QA_SCRIPT = Path(__file__).parent / "skills" / "video-director" / "scripts" / "qa_video.py"


def qa(vdir: Path, video: Path) -> dict:
    """video-director's measurements (no tokens): flashes, pops, frozen stretches, cuts, loudest moment, silences,
    plus three sheets the supervisor looks at (qa/hook_sheet.jpg = the muted first 3 s). Never breaks the gate."""
    if not QA_SCRIPT.exists():
        return {"error": "qa script missing"}
    out = vdir / "qa"
    try:
        subprocess.run([sys.executable, "-I", str(QA_SCRIPT), str(video), "--out", str(out)],
                       capture_output=True, text=True, timeout=600)
        rep = json.loads((out / "report.json").read_text())
    except Exception as e:
        return {"error": str(e)[:200]}
    rows = rep.get("checks") or []
    keep = {"fail": [], "warn": []}
    flashes: list = []
    for r in rows if isinstance(rows, list) else []:
        lvl = str(r.get("level", "")).lower()
        if lvl in keep:
            keep[lvl].append(f"{r.get('check')}: {r.get('detail')}"[:200])
        if "flash" in str(r.get("check", "")) and lvl == "fail":
            flashes = [float(x) for x in re.findall(r"\d+\.\d+|\d+", str(r.get("detail")))]
    return {**keep, "flashes": flashes, "sheets": [f"qa/{n}" for n in ("hook_sheet.jpg", "beats_sheet.jpg", "phone_sheet.jpg")
                                                    if (out / n).exists()]}


def main(argv: list[str]) -> int:
    vdir = Path(argv[0])
    style_p = Path(argv[argv.index("--style") + 1]) if "--style" in argv else vdir.parent.parent / "neesmo" / "style.json"
    try:
        style = json.loads(style_p.read_text())
    except (OSError, ValueError):
        style = {}
    res = check(vdir, style)
    (vdir / "gate.json").write_text(json.dumps(res, indent=1))
    print(json.dumps(res))
    return 0 if res["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
