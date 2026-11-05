"""Original score for "The Angel's Last Stand": D major for the Angel, D Aeolian for the fall. Organ / harp / chimes / timpani / recorder / bell.
Run with the library venv: LIB=<library> $LIB/.venv/bin/python music/score.py  -> music/stems/*.wav. Times follow story.js."""
import sys, os, numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 52.0; N = int(DUR * SR)
S.seed(21)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
T = dict(angel=8.68, death=13.76, went=14.86, met=20.26, offered=22.76, refused=27.9, broke=30.96, down=32.8, struck=35.5, crack=37.4, end=42.12, blood=48.7)
def stem(events, size=.85, mix=.32, damp=.5):
    x = S.render(events, dur=DUR, master=False)
    x = x[:N] if len(x) >= N else np.vstack([x, np.zeros((N - len(x), 2), np.float32)])
    return S.room(x, size=size, mix=mix, damp=damp).astype(np.float32)
def cut(x, a, b=DUR, fade=.02):
    i, j, f = int(a * SR), int(b * SR), int(fade * SR)
    if i - f > 0: x[i - f:i] *= np.linspace(1, 0, f)[:, None]
    x[i:j] = 0
def E(t, inst, p, d, v, pan=0, **k): return dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k)
SILENT = [(28.9, 30.25), (39.4, 40.35), (44.7, T['blood'])]

dr = [E(.2, 'organ_pedal', 'D2', 5.4, .4), E(.2, 'organ_soft', 'D3', 5.4, .3, attack=1.2), E(.2, 'organ_soft', 'A3', 5.4, .26, attack=1.4), E(1.6, 'organ_soft', 'Eb4', 3.8, .13, attack=2.0)]
dr += [E(5.4, 'organ_soft', 'D3', 1.6, .22, attack=.3)]
dr += [E(6.9, 'organ_pedal', 'D2', 4.9, .34)] + [E(6.9, 'organ_soft', p, 4.9, .28, attack=.8) for p in ('D3', 'F#3', 'A3')]          # the Angel: D major
dr += [E(12.35, 'organ_pedal', 'Bb1', 4.3, .34)] + [E(12.35, 'organ_soft', p, 4.3, .26, attack=.8) for p in ('Bb2', 'F3', 'Db4')]    # the vision
dr += [E(17.25, 'organ_pedal', 'C2', 4.4, .36)] + [E(17.25, 'organ_soft', p, 4.4, .26, attack=.8) for p in ('C3', 'G3')]
dr += [E(22.25, 'organ_pedal', 'Eb2', 6.6, .34)] + [E(22.25, 'organ_soft', p, 6.6, .24, attack=1.2) for p in ('Bb2', 'Gb3')]        # the offer: unease
dr += [E(30.25, 'organ', p, 2.6, .4, attack=.2) for p in ('D3', 'A3', 'D4', 'F4')] + [E(30.25, 'organ_pedal', 'D2', 9.1, .36)]
dr += [E(33.0, 'organ_soft', p, 6.3, .22, attack=1.0) for p in ('D3', 'F3', 'A3')]
dr += [E(40.35, 'organ', p, 4.3, .42, attack=.15) for p in ('D3', 'A3', 'D4', 'F4')] + [E(40.35, 'organ_pedal', 'D2', 4.3, .45)]
dr += [E(T['blood'], 'organ_soft', p, 3.2, .2, attack=1.4) for p in ('D3', 'A3', 'D4')]
DRONE = stem(dr)
for a, b in SILENT: cut(DRONE, a, b)
hc = [E(t0, 'hand_chimes', 'A5', 2.5, .5, .15) for t0 in (.3, 6.9, 12.35, 17.25, 22.25, 30.25, 40.35)]
for k in range(17): hc.append(E(7.2 + k * .25, 'harp', ['D4', 'F#4', 'A4', 'D5', 'A4', 'F#4'][k % 6], 1.2, .32, -.2))
for k, p in enumerate(['A4', 'D5', 'F#5', 'A5', 'D6']): hc.append(E(T['angel'] + k * .12, 'hand_chimes', p, 2.0, .4, .2))      # the wings open
hc += [E(T['crack'] + k * .05, 'hand_chimes', p, 1.4, .34, .2) for k, p in enumerate(['C6', 'Db6', 'G6'])]                       # the crack
HC = stem(hc, .85, .34)
for a, b in SILENT: cut(HC, a, b)
wr = [E(T['met'], 'timpani', 'D2', 2.0, .6), E(T['broke'] - .4, 'timpani', 'D2', .2, .25), E(T['broke'], 'timpani', 'D2', 2.0, .75), E(T['down'], 'timpani', 'A2', 2.0, .55), E(T['struck'], 'timpani', 'D2', 1.5, .45), E(T['end'], 'timpani', 'D2', 2.5, .85)]
wr += [E(33.6 + k * .42, 'recorder', p, .4 if k < 3 else 1.6, .32, .1, attack=.04) for k, p in enumerate(['A5', 'G5', 'F5', 'D5'])]   # a lament for the Angel
WAR = stem(wr, .85, .3)
for a, b in SILENT: cut(WAR, a, b)
BELL = stem([E(T['blood'], 'tubular_bells', 'D4', 3.3, .62, release=3.0)], .95, .45)
for name, x in [('drone', DRONE), ('harp_chimes', HC), ('war', WAR), ('bell', BELL)]: sf.write(os.path.join(HERE, 'stems', name + '.wav'), x, SR)
print('stems written')
