"""Shorten the long pauses Kitten leaves between sentences: every gap over MAXG s is cut down to MAXG s.
Rewrites voice/narration.mp3 and voice/words.json in place. Run once, after voice_ts.py."""
import json, os, subprocess, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(HERE, 'voice')
MAXG = .32
sr = 44100; a = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(V, 'narration.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True, check=True).stdout, np.float32); w = json.load(open(os.path.join(V, 'words.json')))
cuts = []                                   # (start, end) of audio to drop, in seconds
for i in range(len(w) - 1):
    g0, g1 = w[i]['t1'], w[i + 1]['t0']
    if g1 - g0 > MAXG: m = (g0 + g1) / 2; cuts.append((m - (g1 - g0 - MAXG) / 2, m + (g1 - g0 - MAXG) / 2))
keep, last = [], 0
for c0, c1 in cuts: keep.append(a[int(last * sr):int(c0 * sr)]); last = c1
keep.append(a[int(last * sr):]); b = np.concatenate(keep)
def shift(t): return t - sum(min(c1, t) - c0 for c0, c1 in cuts if t > c0)
for x in w: x['t0'] = round(shift(x['t0']), 3); x['t1'] = round(shift(x['t1']), 3)
tmp = os.path.join(V, 'tight.wav'); sf.write(tmp, b, sr)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', '44100', '-b:a', '192k', os.path.join(V, 'narration.mp3')], check=True)
os.remove(tmp)
json.dump(w, open(os.path.join(V, 'words.json'), 'w'), indent=0)
print(len(cuts), 'gaps cut; ends at', w[-1]['t1'])
