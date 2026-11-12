#!/usr/bin/env python3
"""Build a "moments sheet" so an AI (or you) can pick the viral moments of a stream.

Transcribes the video locally (faster-whisper, free, offline) and lines every
spoken line up with how loud and how hectic that moment is. Loud moments with
no speech (crashes, explosions, screams the transcript missed) get their own
lines. Long videos are split into overlapping windows so each part gets a fair
look. The sheet is then read with the rubric in
.claude/skills/viral-moments/SKILL.md.

Usage:
    python3 viral_moments.py footage/stream.mp4
    python3 viral_moments.py --url https://www.twitch.tv/videos/ID --section 1:00:00-1:30:00
    python3 viral_moments.py footage/stream.mp4 --model medium --language en

Output: analysis/<name>.moments.md (read this) and analysis/<name>.moments.json.
"""
import argparse
import json
import sys
from pathlib import Path

import auto_clip as ac   # reuses the downloader and the loudness / scene scoring

WINDOW = 12 * 60      # seconds per window
OVERLAP = 2 * 60      # overlap between windows, so no moment is cut in half


def mmss(sec):
    sec = int(sec)
    h, m, s = sec // 3600, sec % 3600 // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def transcribe(path, model_name, language):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper missing: pip install faster-whisper")
    print(f"Transcribing with whisper '{model_name}' (first run downloads the model) ...",
          flush=True)
    import subprocess
    import numpy as np
    # decode with ffmpeg ourselves: faster-whisper's own decoder (PyAV) breaks
    # across versions, ffmpeg is already required everywhere else
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1",
                          "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    audio = np.frombuffer(pcm[: len(pcm) // 2 * 2], np.int16).astype(np.float32) / 32768
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, info = model.transcribe(audio, language=language, vad_filter=True,
                                  beam_size=1, condition_on_previous_text=False)
    lines = [{"start": round(s.start, 1), "end": round(s.end, 1), "text": s.text.strip()}
             for s in segs if s.text.strip()]
    print(f"  {len(lines)} lines, language {info.language}", flush=True)
    return lines


def energy_track(path, threshold):
    """Per-STEP energy: z-scored mix of loudness, loudness jumps and scene cuts."""
    dur = ac.duration_of(path)
    n = int(dur / ac.STEP)
    if n < 10:
        return dur, []
    db = ac.loudness(path, n)
    jumps = [0.0] + [max(0.0, db[i] - db[i - 1]) for i in range(1, n)]
    cuts = ac.scene_changes(path, n, threshold)
    raw = [1.0 * a + 0.8 * b + 0.6 * c for a, b, c in
           zip(ac.zscores(db), ac.zscores(jumps), ac.zscores(cuts))]
    return dur, raw


def peak_between(energy, a, b):
    i, j = int(a / ac.STEP), max(int(a / ac.STEP) + 1, int(b / ac.STEP) + 1)
    win = energy[i:j]
    return max(win) if win else 0.0


def cutoffs(energy):
    """Energy values at the top 35% / 15% / 5% of this video, so the markers
    rank moments within the stream instead of against a fixed scale."""
    s = sorted(energy)
    return [s[min(len(s) - 1, int(len(s) * q))] for q in (0.65, 0.85, 0.95)]


def bar(e, cuts):
    """'.' calm, '!' top 35%, '!!' top 15%, '!!!' top 5% of this video."""
    return "!!!" if e >= cuts[2] else "!!" if e >= cuts[1] else "!" if e >= cuts[0] else "."


def build(path, lines, dur, energy, section_offset=0.0):
    items = []
    for ln in lines:
        e = peak_between(energy, ln["start"], ln["end"])
        items.append({**ln, "energy": round(e, 2), "kind": "speech"})
    # loud moments nobody spoke over (or whisper skipped)
    spoken = [(ln["start"] - 1, ln["end"] + 1) for ln in lines]
    i, n = 0, len(energy)
    while i < n:
        hi, lo = cutoffs(energy)[2], cutoffs(energy)[1]
        if energy[i] >= hi:
            j = i
            while j + 1 < n and energy[j + 1] >= lo:
                j += 1
            a, b = i * ac.STEP, (j + 1) * ac.STEP
            if not any(sa <= a <= sb or sa <= b <= sb for sa, sb in spoken):
                items.append({"start": a, "end": b, "energy": round(max(energy[i:j + 1]), 2),
                              "kind": "spike", "text": "(no speech: loud / hectic moment)"})
            i = j + 1
        else:
            i += 1
    items.sort(key=lambda x: x["start"])
    windows, start = [], 0.0
    while True:
        end = min(dur, start + WINDOW)
        windows.append((start, end))
        if end >= dur:
            break
        start = end - OVERLAP
    return {"source": str(path), "duration": round(dur, 1), "section_offset": section_offset,
            "cutoffs": [round(c, 2) for c in cutoffs([x["energy"] for x in items] or [0])],
            "windows": [{"start": a, "end": b,
                         "items": [x for x in items if a <= x["start"] < b]}
                        for a, b in windows]}


def to_markdown(sheet):
    out = [f"# Moments sheet: {Path(sheet['source']).name}",
           "",
           f"Length {mmss(sheet['duration'])}. Times are from the start of this file"
           + (f" (file starts at {mmss(sheet['section_offset'])} of the VOD)."
              if sheet["section_offset"] else "."),
           "Energy, ranked within this video: `.` calm, `!` top 35%, `!!` top 15%, "
           "`!!!` top 5% (screams, crashes, gunfights). The number is the raw score.",
           "Read with `.claude/skills/viral-moments/SKILL.md`.", ""]
    for k, w in enumerate(sheet["windows"], 1):
        out += [f"## Window {k}: {mmss(w['start'])} - {mmss(w['end'])}", ""]
        for x in w["items"]:
            out.append(f"[{mmss(x['start'])}-{mmss(x['end'])}] {bar(x['energy'], sheet['cutoffs']):<3} "
                       f"{x['energy']:+.1f}  {x['text']}")
        out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", nargs="?")
    ap.add_argument("--url", help="download first (Twitch VOD, etc.)")
    ap.add_argument("--section", metavar="START-END", help="with --url: only this part")
    ap.add_argument("--model", default="small",
                    help="whisper model: tiny, base, small (default), medium, large-v3")
    ap.add_argument("--language", help="force a language code, e.g. en")
    ap.add_argument("--scene", type=float, default=0.3)
    ap.add_argument("--out", default="analysis")
    args = ap.parse_args()

    here = Path(__file__).resolve().parent
    offset = 0.0
    if args.url:
        if args.section:
            path = ac.download_section(args.url, here / "footage", args.section)
            offset = ac.hms(args.section.split("-", 1)[0])
        else:
            path = ac.download(args.url, here / "footage")
    elif args.video:
        path = Path(args.video)
    else:
        sys.exit("give a video file or --url")

    print(f"Scoring energy of {path} ...", flush=True)
    dur, energy = energy_track(path, args.scene)
    if not energy:
        sys.exit("video too short or unreadable")
    lines = transcribe(path, args.model, args.language)
    sheet = build(path, lines, dur, energy, offset)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / Path(path).stem
    Path(f"{base}.moments.json").write_text(json.dumps(sheet, indent=1) + "\n")
    Path(f"{base}.moments.md").write_text(to_markdown(sheet) + "\n")
    print(f"\nWrote {base}.moments.md (read this) and {base}.moments.json")


if __name__ == "__main__":
    main()
