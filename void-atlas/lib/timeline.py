"""Lay the narration on a timeline: speed the voice up a touch, leave short gaps, add an end card.
Usage: python3 lib/timeline.py <short-dir> [tempo]   -> voice/fast/*.wav and timeline.json (read by the scene and the mix).
"""
import sys, os, json, subprocess
P = os.path.abspath(sys.argv[1]); TEMPO = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
lines = json.load(open(os.path.join(P, 'lines.json'))); W = json.load(open(os.path.join(P, 'voice', 'words.json')))
os.makedirs(os.path.join(P, 'voice', 'fast'), exist_ok=True)
probe = lambda f: float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
GAP = {l['id']: l['gap'] for l in lines if 'gap' in l}   # optional extra breath before a line: "gap": 0.6 in lines.json
t, out = .9, []
for l in lines:
    src = os.path.join(P, 'voice', l['id'] + '.wav'); dst = os.path.join(P, 'voice', 'fast', l['id'] + '.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', f'atempo={TEMPO}', dst], check=True)
    t += GAP.get(l['id'], .32); d = probe(dst)
    out.append({**l, 't0': round(t, 3), 't1': round(t + d, 3), 'words': [[w, round(t + a / TEMPO, 3), round(t + b / TEMPO, 3)] for w, a, b in W[l['id']]]})
    t += d
END = round(t + 1.1, 3)   # end card starts here
json.dump({'dur': round(END + 2.6, 3), 'end': END, 'lines': out}, open(os.path.join(P, 'timeline.json'), 'w'), indent=1)
print('duration', round(END + 2.6, 2))
