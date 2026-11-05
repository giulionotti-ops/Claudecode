"""Write horus-heresy.srt from the subtitle cues in story.js (the same numbers the page uses)."""
import os, re, json, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar')
src = open(os.path.join(HERE, 'story.js'), encoding='utf-8').read()
lines = re.findall(r"\['(L\d+)', ([\d.]+), ([\d.]+), (['\"])(.*?)\4\]", src)
dur = float(re.search(r'export const DUR = ([\d.]+)', src).group(1))
chars = lambda s: len(re.sub(r'\s', '', s))
cues = []
for i, (lid, t0, d, _, text) in enumerate(lines):
    t0, d = float(t0), float(d); nxt = float(lines[i + 1][1]) - .35 if i + 1 < len(lines) else dur - .3
    cues.append({'t0': t0, 't1': min(nxt, max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), 'text': text})
p = os.path.join(HERE, 'out', 'cues.json'); os.makedirs(os.path.dirname(p), exist_ok=True); json.dump(cues, open(p, 'w'), indent=1)
subprocess.run([os.path.join(LIB, '.venv/bin/python'), os.path.join(LIB, 'core/render/srt.py'), p, os.path.join(HERE, 'horus-heresy.srt')], check=True)
print(len(cues), 'cues')
