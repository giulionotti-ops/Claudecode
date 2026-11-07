"""Export captions (one line per sentence chunk) from timeline.json: python3 lib/srt.py <short-dir> <name>"""
import sys, os, json, re
P = sys.argv[1]; TL = json.load(open(os.path.join(P, 'timeline.json'))); out = []
ts = lambda s: f"{int(s // 3600):02}:{int(s % 3600 // 60):02}:{int(s % 60):02},{int(round(s % 1 * 1000)) % 1000:03}"
for l in TL['lines']:
    parts = [p.strip() for p in re.split(r'(?<=[.?!])\s+', l['text']) if p.strip()]; w = l['words']; i = 0
    for p in parts:
        n = len(p.split()); a, b = w[i][1], w[min(i + n, len(w)) - 1][2]; i += n; out.append((a, min(b, l['t1']) + .25, p))
out = [(a, min(b, out[k + 1][0] - .05) if k + 1 < len(out) else b, t) for k, (a, b, t) in enumerate(out)]
open(os.path.join(P, sys.argv[2] + '.srt'), 'w').write('\n'.join(f"{k + 1}\n{ts(a)} --> {ts(b)}\n{t}\n" for k, (a, b, t) in enumerate(out)))
