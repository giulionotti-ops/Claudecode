#!/usr/bin/env python3
"""Find the best moments in long gameplay recordings and turn them into shorts.

Scores every second of each recording by how loud it is, how suddenly it gets
loud (crashes, gunfire, explosions) and how fast the picture changes (chases,
cuts), picks the top non-overlapping moments, and writes a config that
make_short.py renders.

Usage:
    python3 auto_clip.py footage/                    # every video in footage/
    python3 auto_clip.py footage/session1.mp4 -n 8   # top 8 moments
    python3 auto_clip.py --url https://youtu.be/ID   # download first (yt-dlp)
    python3 auto_clip.py footage/ --render           # find + render in one go
    python3 auto_clip.py --url https://www.twitch.tv/videos/ID \
        --section 2:10:00-2:40:00 --credit @streamer  # 30 min of a Twitch VOD

Output: auto_shorts.json (edit the titles/captions, then
`python3 make_short.py auto_shorts.json`). Requires ffmpeg; --url needs yt-dlp.
"""
import argparse
import array
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}
RATE = 8000          # audio sample rate used for analysis
STEP = 0.5           # analysis resolution in seconds


def download(url, dest):
    if not shutil.which("yt-dlp"):
        sys.exit("yt-dlp not found (install: uv tool install yt-dlp)")
    dest.mkdir(parents=True, exist_ok=True)
    out = subprocess.run(
        ["yt-dlp", "-f", "bv*[height<=1080]+ba/b[height<=1080]",
         "--merge-output-format", "mp4", "--no-playlist",
         "-o", str(dest / "%(title).80s [%(id)s].%(ext)s"),
         "--print", "after_move:filepath", url],
        capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"download failed:\n{out.stderr.strip()}")
    return Path(out.stdout.strip().splitlines()[-1])


def hms(t):
    """'1:02:03' / '62:03' / '3723' -> seconds."""
    sec = 0.0
    for part in str(t).split(":"):
        sec = sec * 60 + float(part)
    return sec


def fetch(url, dest, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                dest.write_bytes(r.read())
            return
        except OSError:
            if k == tries - 1:
                raise


def download_section(url, dest, section, height=1080):
    """Fetch only the HLS segments covering START-END of a long VOD (e.g. Twitch).

    Pulling a whole 10-hour stream takes hours; this grabs just the part you want,
    8 segments at a time, and remuxes it into one mp4 without re-encoding.
    """
    if not shutil.which("yt-dlp"):
        sys.exit("yt-dlp not found (install: uv tool install yt-dlp)")
    a, b = (hms(x) for x in section.split("-", 1))
    if b <= a:
        sys.exit("--section must be START-END, e.g. 1:02:00-1:12:00")
    meta = subprocess.run(
        ["yt-dlp", "--no-playlist", "-f", f"best[height<={height}]/best",
         "--print", "%(id)s", "--print", "urls", url],
        capture_output=True, text=True)
    lines = meta.stdout.strip().splitlines()
    if meta.returncode != 0 or len(lines) < 2:
        sys.exit(f"could not read the stream:\n{meta.stderr.strip()}")
    vid, m3u8 = lines[0], lines[-1]
    with urllib.request.urlopen(m3u8, timeout=60) as r:
        playlist = r.read().decode()
    base = m3u8.rsplit("/", 1)[0] + "/"
    t, init, segs = 0.0, None, []          # segs: (init_uri, seg_uri)
    dur = 0.0
    for line in playlist.splitlines():
        if line.startswith("#EXT-X-MAP:"):
            init = line.split('URI="', 1)[1].split('"', 1)[0]
        elif line.startswith("#EXTINF:"):
            dur = float(line[8:].split(",", 1)[0])
        elif line and not line.startswith("#"):
            if t + dur > a and t < b:
                segs.append((init, line, t))
            t += dur
    if not segs:
        sys.exit(f"section {section} is outside the video (length {ts(t)})")
    offset = a - segs[0][2]                # trim to the exact start
    print(f"Fetching {len(segs)} segments ({ts(a)}-{ts(min(b, t))}) of {vid} ...", flush=True)
    dest.mkdir(parents=True, exist_ok=True)
    out = dest / f"{vid}_{int(a)}-{int(b)}.mp4"
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        jobs = {}
        for i, (ini, seg, _) in enumerate(segs):
            jobs[tmp / f"s{i:05d}"] = base + seg if "://" not in seg else seg
        for ini in {s[0] for s in segs if s[0]}:
            jobs[tmp / ("init_" + Path(ini).name)] = base + ini if "://" not in ini else ini
        with ThreadPoolExecutor(8) as pool:
            list(pool.map(lambda kv: fetch(kv[1], kv[0]), jobs.items()))
        # glue each run of segments onto its init header, then join the runs
        parts, cur, fh = [], None, None
        for i, (ini, _, _) in enumerate(segs):
            if ini != cur or fh is None:
                if fh:
                    fh.close()
                cur = ini
                part = tmp / f"part{len(parts):03d}.mp4"
                parts.append(part)
                fh = open(part, "wb")
                if ini:
                    fh.write((tmp / ("init_" + Path(ini).name)).read_bytes())
            fh.write((tmp / f"s{i:05d}").read_bytes())
        fh.close()
        lst = tmp / "list.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                        "-i", str(lst), "-ss", f"{offset:.2f}", "-t", f"{min(b, t) - a:.2f}",
                        "-c", "copy", "-movflags", "+faststart", str(out)], check=True)
    print(f"  -> {out}")
    return out


def duration_of(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def loudness(path, n):
    """RMS level in dB for each STEP-second bin (silence = -90)."""
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1",
         "-ar", str(RATE), "-f", "s16le", "-"], capture_output=True)
    samples = array.array("h")
    samples.frombytes(proc.stdout[: len(proc.stdout) // 2 * 2])
    per = int(RATE * STEP)
    db = []
    for i in range(n):
        chunk = samples[i * per:(i + 1) * per]
        if not chunk:
            db.append(-90.0)
            continue
        rms = math.sqrt(sum(s * s for s in chunk) / len(chunk)) / 32768
        db.append(20 * math.log10(rms) if rms > 1e-5 else -90.0)
    return db


def scene_changes(path, n, threshold):
    """Count of hard picture changes per STEP-second bin."""
    proc = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(path), "-an",
         "-vf", f"fps=6,scale=160:-2,select='gt(scene,{threshold})',showinfo",
         "-f", "null", "-"], capture_output=True, text=True)
    bins = [0] * n
    for m in re.finditer(r"pts_time:([0-9.]+)", proc.stderr):
        i = int(float(m.group(1)) / STEP)
        if 0 <= i < n:
            bins[i] += 1
    return bins


def zscores(xs):
    mean = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - mean) ** 2 for x in xs) / len(xs)) or 1.0
    return [(x - mean) / sd for x in xs]


def smooth(xs, radius):
    out = []
    for i in range(len(xs)):
        win = xs[max(0, i - radius):i + radius + 1]
        out.append(sum(win) / len(win))
    return out


def score(path, threshold):
    dur = duration_of(path)
    n = int(dur / STEP)
    if n < 10:
        return dur, []
    db = loudness(path, n)
    jumps = [0.0] + [max(0.0, db[i] - db[i - 1]) for i in range(1, n)]
    cuts = scene_changes(path, n, threshold)
    s = [1.0 * a + 0.8 * b + 0.6 * c for a, b, c in
         zip(zscores(db), zscores(jumps), zscores(cuts))]
    return dur, smooth(s, int(2 / STEP))   # ~4 s window


def pick(dur, scores, count, length, lead, gap):
    """Top peaks -> non-overlapping [start, end] windows, peak `lead` s in."""
    order = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    chosen = []
    for i in order:
        if len(chosen) >= count:
            break
        peak = i * STEP
        start = min(max(0.0, peak - lead), max(0.0, dur - length))
        end = min(dur, start + length)
        if all(end + gap <= a or start >= b + gap for a, b, _ in chosen):
            chosen.append((start, end, scores[i]))
    return sorted(chosen)


def ts(sec):
    return f"{int(sec // 60)}:{sec % 60:04.1f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="*", help="video files or folders")
    ap.add_argument("--url", action="append", default=[],
                    help="download a video with yt-dlp first (repeatable)")
    ap.add_argument("--section", metavar="START-END",
                    help="with --url: grab only this part of a long VOD, e.g. 2:10:00-2:40:00")
    ap.add_argument("-n", "--count", type=int, default=5,
                    help="moments to keep across all inputs (default 5)")
    ap.add_argument("--length", type=float, default=25, help="clip seconds (default 25)")
    ap.add_argument("--lead", type=float, default=8,
                    help="seconds of build-up before the peak (default 8)")
    ap.add_argument("--zoom", type=float, default=1.2)
    ap.add_argument("--scene", type=float, default=0.3,
                    help="scene-change sensitivity 0-1, lower = more (default 0.3)")
    ap.add_argument("--min-score", type=float, default=0.5,
                    help="drop moments scoring below this (default 0.5; 0 = average)")
    ap.add_argument("-o", "--out", default="auto_shorts.json")
    ap.add_argument("--handle", default="@ClipRush")
    ap.add_argument("--credit", default="",
                    help='footage owner shown on screen, e.g. "@streamer"')
    ap.add_argument("--credit-url", default="", help="source link for the description")
    ap.add_argument("--facecam", metavar="X:Y:W:H",
                    help="streamer camera box in source pixels -> camera-on-top layout")
    ap.add_argument("--text", action="store_true",
                    help="write hook/captions on screen (default: clean, no text)")
    ap.add_argument("--render", action="store_true", help="render with make_short.py")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")
    here = Path(__file__).resolve().parent
    files = [download_section(u, here / "footage", args.section) if args.section
             else download(u, here / "footage") for u in args.url]
    for inp in args.inputs:
        p = Path(inp)
        files += sorted(f for f in p.rglob("*") if f.suffix.lower() in VIDEO_EXT) \
            if p.is_dir() else [p]
    if not files:
        sys.exit("no videos given (pass files, a folder, or --url)")

    candidates = []
    for f in files:
        print(f"Scanning {f} ...", flush=True)
        dur, scores = score(f, args.scene)
        if not scores:
            print("  ! too short or unreadable, skipped")
            continue
        for start, end, sc in pick(dur, scores, args.count, args.length, args.lead, 3):
            if sc >= args.min_score:
                candidates.append((sc, f, start, end))

    candidates.sort(key=lambda c: c[0], reverse=True)
    out_path = Path(args.out).resolve()
    shorts = []
    for i, (sc, f, start, end) in enumerate(candidates[:args.count], 1):
        try:
            src = str(f.resolve().relative_to(out_path.parent))
        except ValueError:
            src = str(f.resolve())
        shorts.append({
            "id": i, "slug": f"auto-{i:02d}", "source": src,
            "start": ts(start), "end": ts(end), "zoom": args.zoom,
            "score": round(sc, 2),
            "title": "EDIT ME: hook for this moment",
            "captions": [
                {"from": 0, "to": args.lead - 1, "text": "Wait for it..."},
                {"from": end - start - 5, "to": end - start,
                 "text": "Follow for daily GTA 6 clips", "color": "#4DE1FF"},
            ],
        })
        print(f"  #{i}  {f.name}  {ts(start)}-{ts(end)}  score {sc:.2f}", flush=True)

    cfg = {"handle": args.handle, "text": args.text, "shorts": shorts}
    if args.facecam:
        cfg["facecam"] = args.facecam
    if args.credit:
        cfg.update(credit=args.credit, credit_url=args.credit_url or (args.url[0] if args.url else ""))
    out_path.write_text(json.dumps(cfg, indent=2) + "\n")
    print(f"\nWrote {len(shorts)} moments to {out_path}", flush=True)
    if args.render and shorts:
        subprocess.run([sys.executable, str(here / "make_short.py"), str(out_path),
                        "--out", str(here / "out")], check=True)
    elif shorts:
        print("Edit the titles/captions, then: python3 make_short.py", out_path.name)


if __name__ == "__main__":
    main()
