"""Writes timing.json (line starts, story beats T, DUR) from voice/dur.json, or from an estimate if there is no voice yet.
story.js and music/score.py both read timing.json, so re-voicing only needs: python3 timing.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(HERE, 'lines.json')))
df = os.path.join(HERE, 'voice', 'dur.json')
D = json.load(open(df)) if os.path.exists(df) else {l['id']: round(len(l['text']) / 15.0, 3) for l in lines}
MED = {'L1': 0, 'L2': 0, 'L3': 1, 'L4': 2, 'L5': 3, 'L6': 4, 'L7': 4, 'L8': 5, 'L9': 5}
S, t = {}, .6
for k, l in enumerate(lines):
    i = l['id']; S[i] = round(t, 2)
    nxt = lines[k + 1]['id'] if k + 1 < len(lines) else None
    t += D[i] + (1.4 if nxt and MED[nxt] != MED[i] else .7)
end9 = S['L9'] + D['L9']
T = {
    'shift': S['L2'] + .4, 'gaunt': S['L3'] + D['L3'] * .55, 'salute': S['L3'] + D['L3'] + .1,
    'fleet': S['L4'] + .3, 'fire': S['L5'] + .2, 'order': S['L5'] + D['L5'] * .7,
    'burn': S['L6'] + D['L6'] * .6, 'rawne': S['L7'] - .1, 'draw': S['L7'] + D['L7'] * .55,
    'raise': S['L8'] + D['L8'] * .3, 'row': S['L9'] + .3, 'bell': end9 + .4,
}
out = {'dur': round(end9 + 4.6, 2), 'D': D, 'S': S, 'MED': MED, 'T': {k: round(v, 2) for k, v in T.items()}, 'estimated': not os.path.exists(df)}
json.dump(out, open(os.path.join(HERE, 'timing.json'), 'w'), indent=1)
print(json.dumps(out['S']), 'DUR', out['dur'], '(estimated)' if out['estimated'] else '')
