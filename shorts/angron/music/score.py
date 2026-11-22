"""Original score for 'The Saddest Primarch': D Aeolian; organ / harp / chimes / timpani / recorder / bell.
Run with the library venv: LIB=<library> $LIB/.venv/bin/python music/score.py  -> music/stems/*.wav. Times follow story.js."""
import sys, os, numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 55.0; N = int(DUR * SR)
S.seed(33)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
T = dict(fight=9.42, nails=13.36, rage=16.38, led=18.22, revolt=19.48, came=28.18, took=29.16, died=33.56, forgave=37.9, soul=43.92, broke=47.62, slave=49.84)
def stem(events, size=.85, mix=.32, damp=.5):
    x = S.render(events, dur=DUR, master=False)
    x = x[:N] if len(x) >= N else np.vstack([x, np.zeros((N - len(x), 2), np.float32)])
    return S.room(x, size=size, mix=mix, damp=damp).astype(np.float32)
def cut(x, a, b=DUR, fade=.02):
    i, j, f = int(a * SR), int(b * SR), int(fade * SR)
    if i - f > 0: x[i - f:i] *= np.linspace(1, 0, f)[:, None]
    x[i:j] = 0
def E(t, inst, p, d, v, pan=0, **k): return dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k)
SILENT = [(30.1, 32.7), (40.6, 41.75), (46.0, T['slave'])]

dr = [E(.2, 'organ_pedal', 'D2', 5.1, .4), E(.2, 'organ_soft', 'D3', 5.1, .3, attack=1.2), E(.2, 'organ_soft', 'F3', 5.1, .24, attack=1.4)]       # dusk on the mountain
dr += [E(6.4, 'organ_pedal', 'A1', 4.6, .34)] + [E(6.4, 'organ_soft', p, 4.6, .26, attack=.6) for p in ('A2', 'E3')]                                  # the arena
dr += [E(11.75, 'organ_pedal', 'Bb1', 5.1, .36)] + [E(11.75, 'organ_soft', p, 5.1, .24, attack=.8) for p in ('Bb2', 'F3')]
dr += [E(T['rage'], 'organ', p, 1.5, .42, attack=.05) for p in ('D3', 'Eb3', 'A3')]                                                                    # rage: a clash
dr += [E(17.55, 'organ_pedal', 'D2', 4.1, .36)] + [E(17.55, 'organ_soft', p, 4.1, .28, attack=.5) for p in ('D3', 'F3', 'A3')]
dr += [E(22.25, 'organ_pedal', 'C2', 5.9, .34)] + [E(22.25, 'organ_soft', p, 5.9, .24, attack=1.0) for p in ('C3', 'G3', 'Eb4')]
dr += [E(T['came'], 'organ_soft', p, 1.9, .3, attack=.3) for p in ('D3', 'F#3', 'A3', 'D4')]                                                          # the Emperor's light: D major, briefly
dr += [E(32.7, 'organ_soft', p, 7.9, .2, attack=1.5) for p in ('D3', 'A3')]
dr += [E(41.75, 'organ', p, 4.2, .36, attack=.4) for p in ('D2', 'A2', 'D3', 'F3')] + [E(41.75, 'organ_pedal', 'D2', 4.2, .42)]                        # the daemon
dr += [E(T['slave'], 'organ_soft', p, 4.6, .2, attack=1.5) for p in ('D3', 'A3')]
DRONE = stem(dr)
for a, b in SILENT: cut(DRONE, a, b)
hc = [E(t0, 'hand_chimes', 'A5', 2.5, .45, .15) for t0 in (.3, 6.4, 11.75, 17.55, 22.25, 32.7, 41.75)]
hc += [E(T['came'] + k * .1, 'hand_chimes', p, 2.0, .38, .2) for k, p in enumerate(['A5', 'D6', 'F#6'])]
hc += [E(T['forgave'] + k * .05, 'hand_chimes', p, 1.4, .32, .2) for k, p in enumerate(['C6', 'Db6', 'G6'])]
HC = stem(hc, .85, .34)
for a, b in SILENT: cut(HC, a, b)
wr = [E(7.0 + k * .6, 'timpani', 'A2' if k % 2 else 'D2', .8, .3) for k in range(4)] + [E(T['fight'], 'timpani', 'D2', 1.6, .6)]                       # arena drums
wr += [E(T['nails'], 'timpani', 'D2', .6, .5), E(T['nails'] + .5, 'timpani', 'D2', .6, .55)]                                                          # the hammer
wr += [E(18.0 + k * .3, 'timpani', 'D2', .5, .2 + k * .05) for k in range(5)] + [E(T['revolt'], 'timpani', 'D2', 2.0, .75)]
wr += [E(T['died'] + .1 + k * .45, 'recorder', p, .44 if k < 3 else 1.8, .3, .1, attack=.05) for k, p in enumerate(['A5', 'G5', 'F5', 'D5'])]          # a lament for the brothers
wr += [E(T['soul'], 'timpani', 'D2', 2.0, .7), E(T['broke'], 'timpani', 'D2', 1.0, .6)]
WAR = stem(wr, .85, .3)
for a, b in SILENT: cut(WAR, a, b)
BELL = stem([E(T['slave'], 'tubular_bells', 'D4', 4.6, .62, release=3.5)], .95, .45)
for name, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]: sf.write(os.path.join(HERE, 'stems', name + '.wav'), x, SR)
print('stems written')
