"""Render a neesmo-3d film shot by shot, then join the shots with hard cuts.

One long camera move through the whole film hides the director's cuts. This script renders every shot in
shotlist.json on its own (render.js --from <start> --to <end>) and joins them, so each planned cut really is a cut.

  python3 -m studio.shotrender videos/<NNN> scene.html [--w 540 --h 960 --fps 15] [--only 4B,7A] [--out picture.mp4]

- Runs studio.looklint on the scene first and stops if the film-look basics are missing (--force skips it).

- The scene page still holds the whole timeline; window.seek(t) must jump straight to any time (the contract).
- Shots already rendered are kept (shots/<id>.mp4); --only re-renders just those shots, e.g. after a fix.
- Writes <video>/shots/<id>.mp4 and <video>/<out> (picture only, no sound; mix sound and captions after).
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ENGINE = Path(__file__).parent / "skills" / "neesmo-3d" / "engine" / "render.js"


def _opt(argv: list[str], key: str, default: str) -> str:
    if key in argv:
        i = argv.index(key)
        if i + 1 < len(argv):
            v = argv[i + 1]
            del argv[i:i + 2]
            return v
    return default


def render(vdir: Path, scene: Path, w: int, h: int, fps: int, only: set[str], out: str) -> int:
    sl = json.loads((vdir / "shotlist.json").read_text())
    shots = sl.get("shots") or []
    if not shots:
        print("shotlist.json has no shots")
        return 1
    ids = [str(s.get("id") or "") for s in shots]
    bad = [i for i in ids if not re.fullmatch(r"[A-Za-z0-9_-]+", i)]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if bad or dup:
        print(f"shot ids must be unique letters/numbers: bad {bad or '-'}, repeated {dup or '-'}")
        return 1
    sd = vdir / "shots"
    sd.mkdir(exist_ok=True)
    # a kept clip is reused only if the scene, the size and the shot times are exactly what made it
    scene_hash = hashlib.md5(scene.read_bytes()).hexdigest()
    done = []
    for s, sid in zip(shots, ids):
        try:
            a, b = float(s.get("start") or 0), float(s.get("end") or 0)
        except (TypeError, ValueError):
            print(f"shot {sid}: start/end are not numbers")
            return 1
        if b - a < 1 / fps:
            print(f"shot {sid}: end must be after start ({a}-{b}); fix shotlist.json")
            return 1
        f, meta = sd / f"{sid}.mp4", sd / f"{sid}.json"
        want = {"start": a, "end": b, "w": w, "h": h, "fps": fps, "scene": scene_hash}
        try:
            same = json.loads(meta.read_text()) == want
        except (OSError, ValueError):
            same = False
        if same and f.exists() and sid not in only:
            done.append(f)
            continue
        print(f"shot {sid}: {a:.2f}-{b:.2f} s", flush=True)
        part = sd / f"{sid}.part.mp4"
        part.unlink(missing_ok=True)
        r = subprocess.run(["node", str(ENGINE), str(scene), str(part), "--w", str(w), "--h", str(h),
                            "--fps", str(fps), "--from", str(a), "--to", str(b)])
        if r.returncode or not part.exists() or part.stat().st_size < 1000:
            part.unlink(missing_ok=True)
            print(f"shot {sid} failed; fix the scene and run again (finished shots are kept)")
            return 1
        part.replace(f)
        meta.write_text(json.dumps(want))
        done.append(f)
    lst = sd / "concat.txt"
    lst.write_text("".join(f"file '{f.name}'\n" for f in done))
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c:v", "libx264", "-preset", "veryfast" if w <= 720 else "medium", "-crf", "18",
                        "-pix_fmt", "yuv420p", "-r", str(fps), str(vdir / out)])
    if r.returncode:
        print("joining the shots failed")
        return 1
    print(f"{vdir / out}: {len(done)} shots joined with hard cuts")
    return 0


def main(argv: list[str]) -> int:
    try:
        w, h, fps = int(_opt(argv, "--w", "540")), int(_opt(argv, "--h", "960")), int(_opt(argv, "--fps", "15"))
    except ValueError:
        print("--w, --h and --fps need whole numbers")
        return 2
    only = {x.strip() for x in _opt(argv, "--only", "").split(",") if x.strip()}
    out = _opt(argv, "--out", "picture.mp4")
    force = "--force" in argv
    if force:
        argv.remove("--force")
    if len(argv) != 2:
        print(__doc__)
        return 2
    vdir, scene = Path(argv[0]), Path(argv[1])
    if not (vdir / "shotlist.json").exists():
        print(f"no shotlist.json in {vdir}")
        return 1
    if not scene.exists():
        scene = vdir / argv[1]
    if not scene.exists():
        print(f"no such scene page: {argv[1]}")
        return 1
    try:
        from .looklint import check
    except ImportError:
        from looklint import check
    errs = check(scene)
    if errs and not force:
        print("LOOK NOT OK - fix these before rendering:\n- " + "\n- ".join(errs))
        return 1
    if errs:
        (vdir / "look_skipped.txt").write_text("\n".join(errs))
    return render(vdir, scene.resolve(), w, h, fps, only, out)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
