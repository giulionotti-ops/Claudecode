"""Original score for 'The Horus Heresy in 60 seconds': D Dorian rising, D Aeolian after the turn.
Run with the library venv: $LIB/.venv/bin/python music/score.py   (LIB = the Lemo-Opuscar library folder)
Writes music/stems/{drone,harp_chimes,war,bell}.wav. Times come from the cue map in TREATMENT.md and story.js.
"""
import sys, os, numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 57.0; N = int(DUR * SR)
S.seed(40)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)

def stem(events, size=.85, mix=.32, damp=.5):
    x = S.render(events, dur=DUR, master=False)
    x = x[:N] if len(x) >= N else np.vstack([x, np.zeros((N - len(x), 2), np.float32)])
    return S.room(x, size=size, mix=mix, damp=damp).astype(np.float32)
def cut(x, a, b=DUR, fade=.02):   # hard stop, reverb tail included
    i, j, f = int(a * SR), int(b * SR), int(fade * SR)
    if i - f > 0: x[i - f:i] *= np.linspace(1, 0, f)[:, None]
    x[i:j] = 0
def ramp(x, a, b, g0, g1): i, j = int(a * SR), int(b * SR); x[i:j] *= np.linspace(g0, g1, j - i)[:, None]
def E(t, inst, p, d, v, pan=0, **k): return dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k)

# ---------------- drone: organ pedal + soft organ ----------------
dr = []
dr += [E(.2, 'organ_pedal', 'D2', 5.4, .4), E(.2, 'organ_soft', 'D3', 5.4, .32, -.2, attack=1.5), E(.2, 'organ_soft', 'A3', 5.4, .28, .2, attack=1.8)]
dr += [E(5.4, 'organ_soft', 'D3', 1.6, .24, attack=.3)]                                  # held through the fall down the window
dr += [E(6.7, 'organ_pedal', 'D2', 5.1, .34)] + [E(6.7, 'organ_soft', p, 5.1, .28, attack=.8) for p in ('D3', 'F3', 'A3')]   # dawn: Dm
dr += [E(11.75, 'organ_pedal', 'G2', 4.6, .34)] + [E(11.75, 'organ_soft', p, 4.6, .3, attack=.4) for p in ('G3', 'B3', 'D4')]   # noon: G (Dorian IV)
dr += [E(17.15, 'organ_pedal', 'C2', 8.8, .4)] + [E(17.15, 'organ_soft', p, 8.8, .26, attack=1.0) for p in ('C3', 'G3')]       # the wound: a low C drone
dr += [E(23.0, 'organ_soft', 'Db4', 2.9, .16, attack=1.5)]                                 # the whisper bends the fifth
dr += [E(28.4, 'organ_pedal', 'D2', 4.4, .36)] + [E(28.4, 'organ_soft', p, 4.4, .28, attack=.5) for p in ('D3', 'F3', 'A3')]   # Aeolian now
dr += [E(44.4, 'organ_soft', p, 3.5, .2, attack=1.2) for p in ('D3', 'A3')]                # grief under 'sealed'
dr += [E(50.6, 'organ_soft', p, 6.0, .16, attack=2.0) for p in ('A3', 'E4')]               # moonlight
DRONE = stem(dr)
cut(DRONE, 26.2, 27.4); cut(DRONE, 48.1, 50.5)

# ---------------- harp arpeggios + the light note + the re-leading scale ----------------
hc = []
for t0 in [.3, 6.7, 11.75, 17.15, 33.45, 38.05]: hc.append(E(t0, 'hand_chimes', 'A5', 2.5, .5, .15))   # a pane wakes
for k in range(19): hc.append(E(7.2 + k * .25, 'harp', ['D4', 'F4', 'A4', 'D5', 'A4', 'F4'][k % 6], 1.2, .34, -.2))
for k in range(18): hc.append(E(11.9 + k * .25, 'harp', ['G3', 'B3', 'D4', 'G4', 'B4', 'D5'][k % 6], 1.2, .36, -.2))
hc.append(E(12.42, 'harp', 'G5', 2.0, .5, .1))                                             # the sword goes up
WELDS = [28.375, 28.875, 29.375, 29.875, 30.375]
for t0, p in zip(WELDS, ['D5', 'E5', 'F5', 'G5', 'A5']): hc.append(E(t0, 'hand_chimes', p, 2.0, .45, .2))
hc.append(E(46.155, 'hand_chimes', 'D5', 3.0, .32))                                        # the throne seals
HC = stem(hc, .85, .34)
cut(HC, 26.2, 27.4); cut(HC, 48.1, 50.5)

# ---------------- war: timpani, full organ, the recorder falling ----------------
wr = []
wr += [E(19.3 + k * .06, 'timpani', 'D2', .2, .18 + k * .012) for k in range(8)]           # roll under the strike
wr.append(E(19.78, 'timpani', 'D2', 2.5, .7))
for k, t0 in enumerate([20.6, 20.95, 21.3, 21.65]): wr.append(E(t0, 'recorder', ['A5', 'G5', 'F5', 'D5'][k], .4 if k < 3 else 1.0, .34, .1, attack=.04))
for k in range(9): wr.append(E(33.0 + k * .5, 'timpani', 'D2' if k % 2 == 0 else 'A2', 1.0, .38 + (k % 2 == 0) * .12))   # the march
wr += [E(33.4, 'organ_soft', p, 2.0, .3, attack=.3) for p in ('Bb2', 'F3', 'D4')] + [E(35.4, 'organ_soft', p, 1.9, .32, attack=.3) for p in ('C3', 'G3', 'E4')]
wr += [E(38.2, 'organ', p, 2.4, .42, attack=.15) for p in ('D3', 'A3', 'D4', 'F4')] + [E(38.2, 'organ_pedal', 'D2', 5.28, .45)]
wr += [E(40.6, 'organ', p, 2.88, .42, attack=.15) for p in ('Bb2', 'F3', 'Bb3', 'D4')]
wr += [E(39.02, 'timpani', 'D2', 2.0, .75), E(41.0, 'timpani', 'A2', 1.5, .45), E(42.0, 'timpani', 'A2', 1.5, .5), E(43.48, 'timpani', 'D2', 3.5, .85)]
WAR = stem(wr, .85, .3)
cut(WAR, 43.48 + .01)                       # full organ cuts out on 'Horus fell' (the last timpani hit is re-added below)
tail = stem([E(43.48, 'timpani', 'D2', 3.5, .85)], .9, .4); i0 = int(43.48 * SR) - 40; WAR[i0:] += tail[i0:]
cut(WAR, 26.2, 27.4)

# ---------------- the bell at nightfall ----------------
BELL = stem([E(50.0, 'tubular_bells', 'D4', 7.0, .6, release=4.0)], .95, .45)

for name, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]:
    sf.write(os.path.join(HERE, 'stems', name + '.wav'), x, SR)
print('stems written', {n: round(float(np.abs(x).max()), 3) for n, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]})
