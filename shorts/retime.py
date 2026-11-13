"""Fit a finished short to a new narration: writes <project>/timemap.json.
Usage: python3 retime.py <project-dir> <git-rev-with-old-words>
Old timeline = story.js LINES (start, length) + the old voice/words.json at <rev>; new = voice/dur.json + voice/words.json now.
Each line keeps its old gap to the previous line, widened when a subtitle needs more reading time. Anchors map old -> new
at every line start/end and every word both narrations share in order, so beats stay on their words.
film.js, music/score.py and mix.py read timemap.json and remap their times."""
import sys, os, re, json, subprocess
P = os.path.abspath(sys.argv[1]); REV = sys.argv[2]
rel = os.path.relpath(os.path.join(P, 'voice', 'words.json'), subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=P, capture_output=True, text=True).stdout.strip())
old_words = json.loads(subprocess.run(['git', 'show', f'{REV}:{rel}'], cwd=P, capture_output=True, text=True, check=True).stdout)
new_words = json.load(open(os.path.join(P, 'voice', 'words.json'))); new_dur = json.load(open(os.path.join(P, 'voice', 'dur.json')))
src = open(os.path.join(P, 'story.js'), encoding='utf-8').read()
L = re.findall(r"\['(L\d+)', ([\d.]+), ([\d.]+), (['\"])(.*?)\4\]", src)
DUR = float(re.search(r'export const DUR = ([\d.]+)', src).group(1))
chars = lambda s: len(re.sub(r'\s', '', s))
norm = lambda w: re.sub(r"[^a-z0-9]", '', w.lower())

anchors, lines, t_new = [[0.0, 0.0]], {}, None
for i, (lid, t0, d, _, text) in enumerate(L):
    t0, d, dn = float(t0), float(d), new_dur[lid]
    if i == 0: t_new = t0
    else:
        pid, pt0, pd, _, ptext = L[i - 1]; pt0, pd = float(pt0), float(pd)
        gap = t0 - (pt0 + pd)                                                          # the old pause, kept
        need = lines[pid][0] + .36 + chars(ptext) / 15 + 1.5 + .35                     # the previous subtitle's reading time
        t_new = max(lines[pid][0] + lines[pid][1] + gap, need)
    lines[lid] = [round(t_new, 3), dn]
    anchors += [[t0, t_new]]
    ow, nw, j = old_words[lid], new_words[lid], 0                                      # shared words, in order
    for w in ow:
        for k in range(j, len(nw)):
            if norm(nw[k][0]) and norm(nw[k][0]) == norm(w[0]):
                a, b = t0 + max(0, w[1]), t_new + max(0, nw[k][1])
                if 0 < a - t0 < d and 0 < b - t_new < dn: anchors.append([a, b])
                j = k + 1; break
    anchors += [[t0 + d, t_new + dn]]
end_old = float(L[-1][1]) + float(L[-1][2]); end_new = lines[L[-1][0]][0] + lines[L[-1][0]][1]
new_DUR = round(end_new + (DUR - end_old), 2)
anchors.append([DUR, new_DUR])
anchors.sort(); mono = [anchors[0]]
for a in anchors[1:]:                                                                  # keep it strictly increasing
    if a[0] > mono[-1][0] + 1e-3 and a[1] > mono[-1][1] + 1e-3: mono.append([round(a[0], 3), round(a[1], 3)])
assert mono[-1] == [DUR, new_DUR] or abs(mono[-1][0] - DUR) < 1e-3
json.dump({'dur': new_DUR, 'anchors': mono, 'lines': lines}, open(os.path.join(P, 'timemap.json'), 'w'), indent=1)
print(f'{os.path.basename(P)}: {DUR}s -> {new_DUR}s, {len(mono)} anchors')
