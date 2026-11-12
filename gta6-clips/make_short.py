#!/usr/bin/env python3
"""Turn a 16:9 gameplay clip into a 9:16 YouTube Short / TikTok / Reel.

Usage:
    python3 make_short.py shorts.json            # render every short in the file
    python3 make_short.py shorts.json --only 2   # render one short by id

Optional "credit" ("@streamer") and "credit_url" (top level or per short) put
"via @streamer" on screen and write a description .txt with the source link.

Each short in the JSON names a source video, a start/end time, a hook title
(top of screen) and timed captions (lower third). Output: 1080x1920, 30 fps,
H.264 + AAC, loudness-normalised, ready to upload.

Requires ffmpeg on PATH.
"""
import argparse
import json
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

W, H = 1080, 1920
FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-Black.otf",
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "C:/Windows/Fonts/ariblk.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def find_font(override=None):
    for f in ([override] if override else []) + FONT_CANDIDATES:
        if f and Path(f).exists():
            return f
    sys.exit("No bold font found; pass \"font\" in the JSON config.")


def to_seconds(t):
    if isinstance(t, (int, float)):
        return float(t)
    parts = [float(p) for p in str(t).split(":")]
    s = 0.0
    for p in parts:
        s = s * 60 + p
    return s


def esc(text):
    """Escape text for an ffmpeg drawtext value inside a filtergraph."""
    return (text.replace("\\", "\\\\\\\\").replace("'", "\u2019")
            .replace(":", "\\:").replace("%", "\\%").replace(",", "\\,"))


def drawtext(font, text, size, y, color="white", box=None, enable=None):
    opts = [
        f"fontfile='{font}'", f"text='{esc(text)}'", f"fontsize={size}",
        f"fontcolor={color}", "x=(w-text_w)/2", f"y={y}",
        "borderw=6", "bordercolor=black@0.9",
    ]
    if box:
        opts += ["box=1", f"boxcolor={box}", "boxborderw=24"]
    if enable:
        opts.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(opts)


def build_filter(short, font, duration, handle, credit=""):
    zoom = float(short.get("zoom", 1.0))  # >1 crops in on the action
    fg_w = int(W * zoom) // 2 * 2
    f = [
        # blurred, darkened fill so the frame is never letterboxed black
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        "boxblur=30:3,eq=brightness=-0.15[bg]",
        # sharp gameplay in the middle
        f"[0:v]scale={fg_w}:-2,crop='min(iw,{W})':ih[fg]",
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[base]",
    ]
    layers = []
    # hook title, wrapped to two lines max
    lines = textwrap.wrap(short["title"].upper(), 16)[:3]
    # shrink to fit: heavy caps run ~0.68 em wide, keep 40 px margins
    size = min(96, int((W - 80) / (0.68 * max(len(l) for l in lines)))) if lines else 96
    for i, line in enumerate(lines):
        layers.append(drawtext(font, line, size, 230 + i * int(size * 1.23), "white"))
    # timed captions
    for c in short.get("captions", []):
        a, b = to_seconds(c["from"]), to_seconds(c["to"])
        for i, line in enumerate(textwrap.wrap(c["text"].upper(), 22)[:2]):
            layers.append(drawtext(font, line, 70, 1400 + i * 92,
                                   c.get("color", "#FFE14D"),
                                   enable=f"between(t,{a},{b})"))
    if credit:  # whose footage this is, e.g. "via @streamer"
        layers.append(drawtext(font, credit, 50, H - 290, "#4DE1FF"))
    if handle:
        layers.append(drawtext(font, handle, 44, H - 210, "white@0.85"))
    fade_out = max(duration - 0.4, 0)
    chain = ",".join(layers + [f"fade=t=in:st=0:d=0.25",
                                f"fade=t=out:st={fade_out}:d=0.4", "fps=30",
                                "format=yuv420p"])
    f.append(f"[base]{chain}[v]")
    return ";".join(f)


def render(short, cfg, base_dir, out_dir):
    src = (base_dir / short["source"]).resolve()
    if not src.exists():
        print(f"  ! source not found: {src}", file=sys.stderr)
        return False
    start, end = to_seconds(short["start"]), to_seconds(short["end"])
    duration = end - start
    if not 0 < duration <= 180:
        print("  ! clip must be between 0 and 180 s", file=sys.stderr)
        return False
    font = find_font(cfg.get("font"))
    out = out_dir / f"short_{short['id']:02d}_{short.get('slug', 'clip')}.mp4"
    has_audio = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
         "stream=index", "-of", "csv=p=0", str(src)],
        capture_output=True, text=True).stdout.strip() != ""
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(duration),
           "-i", str(src)]
    if not has_audio:
        cmd += ["-f", "lavfi", "-t", str(duration), "-i",
                "anullsrc=channel_layout=stereo:sample_rate=48000"]
    credit = short.get("credit", cfg.get("credit", ""))
    if credit and not credit.lower().startswith(("via ", "clip:", "credit")):
        credit = f"via {credit}"
    fc = build_filter(short, font, duration, cfg.get("handle", ""), credit)
    fc += (f";[{0 if has_audio else 1}:a]loudnorm=I=-14:TP=-1.5:LRA=11,"
           f"afade=t=out:st={max(duration - 0.4, 0)}:d=0.4[a]")
    cmd += ["-filter_complex", fc, "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart", "-shortest", str(out)]
    subprocess.run(cmd, check=True)
    print(f"  -> {out}")
    if credit:  # ready-to-paste description with the credit and source link
        link = short.get("credit_url", cfg.get("credit_url", ""))
        desc = f"{short['title']} #GTA6 #Shorts\n\nClip from {credit[4:] if credit.startswith('via ') else credit}"
        desc += f": {link}\n" if link else "\n"
        out.with_suffix(".txt").write_text(desc)
        print(f"  -> {out.with_suffix('.txt')}")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("--only", type=int)
    ap.add_argument("--out", default="out")
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found on PATH")
    cfg_path = Path(args.config)
    cfg = json.loads(cfg_path.read_text())
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ok = True
    for short in cfg["shorts"]:
        if args.only and short["id"] != args.only:
            continue
        print(f"Short {short['id']}: {short['title']}")
        ok &= render(short, cfg, cfg_path.parent, out_dir)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
