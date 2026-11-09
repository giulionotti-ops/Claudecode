"""voice/words.json -> dragon-eggs.srt (short phrases, one per caption)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
w = json.load(open(os.path.join(HERE, 'voice', 'words.json')))
cues, cur = [], []
for x in w:
    cur.append(x)
    if x['w'][-1] in '.,?:!' or len(cur) >= 6:
        cues.append((cur[0]['t0'], cur[-1]['t1'] + .15, ' '.join(c['w'] for c in cur))); cur = []
if cur: cues.append((cur[0]['t0'], cur[-1]['t1'] + .15, ' '.join(c['w'] for c in cur)))
ts = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)):03d}"
with open(os.path.join(HERE, 'dragon-eggs.srt'), 'w') as f:
    for i, (a, b, s) in enumerate(cues, 1):
        b = min(b, cues[i][0] if i < len(cues) else b); f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{s}\n\n")
print(len(cues), 'cues')
