"""Original score for 'The Fall of Cadia': D Aeolian, organ / harp / chimes / timpani / one bell.
Run with the library venv: LIB=<library> $LIB/.venv/bin/python music/score.py  -> music/stems/{drone,harp_chimes,war,bell}.wav
Times follow story.js (T, LINES)."""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 52.5; N = int(DUR * SR)
# timemap.json (retime.py): old cue times -> the film's current timeline
_tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'timemap.json')
TM = json.load(open(_tmp)) if os.path.exists(_tmp) else None
F = (lambda t: float(np.interp(t, [a for a, b in TM['anchors']], [b for a, b in TM['anchors']]))) if TM else (lambda t: t)
if TM: DUR = TM['dur']; N = int(DUR * SR)
S.seed(13)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
T = dict(ringed=9.4, handed=13.78, led=20.6, held=25.26, fortress=30.14, hurled=31.82, crack=33.24, shatter=35.9, split=37.38, fought=41.94, stands=47.88)

def stem(events, size=.85, mix=.32, damp=.5):
    x = S.render(events, dur=DUR, master=False)
    x = x[:N] if len(x) >= N else np.vstack([x, np.zeros((N - len(x), 2), np.float32)])
    return S.room(x, size=size, mix=mix, damp=damp).astype(np.float32)
def cut(x, a, b=DUR, fade=.02):   # hard stop, reverb tail included
    i, j, f = int(F(a) * SR), int(F(b) * SR), int(fade * SR)
    if i - f > 0: x[i - f:i] *= np.linspace(1, 0, f)[:, None]
    x[i:j] = 0
def ramp(x, a, b, g0, g1): i, j = int(F(a) * SR), int(F(b) * SR); x[i:j] *= np.linspace(g0, g1, j - i)[:, None]
def E(t, inst, p, d, v, pan=0, **k): return dict(t=F(t), inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k)
SILENT = [(26.0, 27.05), (T['crack'], 34.6), (38.5, 39.5), (44.9, T['stands'])]

# ---------------- drone ----------------
dr = [E(.2, 'organ_pedal', 'D2', 5.4, .42), E(.2, 'organ_soft', 'D3', 5.4, .3, attack=1.2), E(.2, 'organ_soft', 'A3', 5.4, .26, attack=1.4), E(1.4, 'organ_soft', 'Eb4', 4.0, .14, attack=2.0)]   # the omen
dr += [E(5.4, 'organ_soft', 'D3', 1.6, .22, attack=.3)]
dr += [E(6.9, 'organ_pedal', 'D2', 4.9, .34)] + [E(6.9, 'organ_soft', p, 4.9, .28, attack=.8) for p in ('D3', 'F3', 'A3')]
dr += [E(12.35, 'organ_pedal', 'G2', 4.7, .34)] + [E(12.35, 'organ_soft', p, 4.7, .3, attack=.4) for p in ('G3', 'Bb3', 'D4')]
dr += [E(17.75, 'organ_pedal', 'C2', 8.2, .4)] + [E(17.75, 'organ_soft', p, 8.2, .26, attack=1.0) for p in ('C3', 'G3')]
dr += [E(27.05, 'organ_pedal', 'Bb1', 4.3, .4)] + [E(27.05, 'organ_soft', p, 4.3, .26, attack=1.2) for p in ('Bb2', 'F3', 'Db4')]   # the fortress: dread
dr += [E(31.3, 'organ', p, 1.95, .38, attack=1.2) for p in ('A2', 'E3', 'A3', 'C4', 'Eb4')]                                         # swelling into the impact
dr += [E(34.6, 'organ_pedal', 'D2', 3.9, .34), E(34.6, 'organ_soft', 'D3', 3.9, .22, attack=.6)]
dr += [E(39.5, 'organ_soft', p, 5.4, .26, attack=.8) for p in ('D3', 'F3', 'A3')] + [E(39.5, 'organ_pedal', 'D2', 5.4, .34)]
dr += [E(T['stands'], 'organ_soft', p, 4.6, .2, attack=1.5) for p in ('D3', 'A3', 'D4')]                                           # an open fifth, held
DRONE = stem(dr); ramp(DRONE, 31.3, T['crack'], .6, 1.4)
for a, b in SILENT: cut(DRONE, a, b)

# ---------------- harp, light notes, the pylons waking ----------------
hc = [E(t0, 'hand_chimes', 'A5', 2.5, .5, .15) for t0 in (.3, 6.9, 12.35, 17.75, 27.05, 39.5)]
for k in range(17): hc.append(E(7.3 + k * .25, 'harp', ['D4', 'F4', 'A4', 'D5', 'A4', 'F4'][k % 6], 1.2, .32, -.2))
for k in range(17): hc.append(E(12.7 + k * .25, 'harp', ['G3', 'Bb3', 'D4', 'G4', 'Bb4', 'D5'][k % 6], 1.2, .34, -.2))
for k, p in enumerate(['D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6', 'D6']): hc.append(E(T['ringed'] + k * .15, 'hand_chimes', p, 1.6, .38, .2))
hc.append(E(T['handed'] + .4, 'harp', 'D5', 1.6, .45))
HC = stem(hc, .85, .34)
for a, b in SILENT: cut(HC, a, b)

# ---------------- war: twelve strokes, the strike, the march ----------------
wr = [E(17.9 + k * (T['held'] - 17.9) / 12, 'timpani', 'D2' if k % 2 == 0 else 'A2', .9, .28 + k * .025) for k in range(12)]
wr += [E(T['led'] - .45 + k * .06, 'timpani', 'D2', .2, .2 + k * .012) for k in range(7)] + [E(T['led'], 'timpani', 'D2', 2.0, .7), E(T['held'], 'timpani', 'D2', 2.5, .85)]
wr += [E(39.6 + k * 1.0, 'timpani', 'D2' if k % 2 == 0 else 'A2', 1.0, .4 + (k % 2 == 0) * .12) for k in range(5)] + [E(T['fought'], 'timpani', 'D2', 2.0, .7)]
wr += [E(42.6 + k * .4, 'recorder', p, .38 if k < 3 else 1.6, .32, .1, attack=.04) for k, p in enumerate(['A5', 'G5', 'F5', 'D5'])]   # a lament
WAR = stem(wr, .85, .3)
for a, b in SILENT: cut(WAR, a, b)

BELL = stem([E(T['stands'], 'tubular_bells', 'D4', 4.5, .62, release=4.0)], .95, .45)
for name, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]: sf.write(os.path.join(HERE, 'stems', name + '.wav'), x, SR)
print('stems written', {n: round(float(np.abs(x).max()), 3) for n, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]})
