"""Original score for 'The Night Haunter', synthesized (no samples): organ drone, chimes, war drums, a lament, a bell.
python3 music/score.py -> music/stems/*.wav. Times follow story.js. Key: B minor."""
import os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from dsp import SR, t_, lp, hp, bp, noise, add
DUR = 49.0; N = int(DUR * SR); rng = np.random.default_rng(21)
T = dict(vision=7.6, hunt=12.6, lords=17.9, destroyed=24.2, death=28.6, approach=33.8, raise_=38.6, strike=43.9, bell=44.4)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}; NOTE.update({'G#': 8, 'D#': 3, 'A#': 10, 'Db': 1, 'Gb': 6, 'C#': 1, 'F#': 6})
def hz(p): n, o = p[:-1], int(p[-1]); return 440 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)
def env(d, a, r): t = t_(d); e = np.minimum(1, t / max(a, 1e-3)); rel = int(r * SR); e[-rel:] *= np.linspace(1, 0, rel) if rel < len(e) else 1; return e
def organ(p, d, a=.8, r=1.2, soft=False):   # flue pipes: a few octave/fifth ranks, slow chorus, breath
    f = hz(p); t = t_(d); y = np.zeros_like(t)
    for m, g in ([(1, 1), (2, .5), (3, .18), (4, .22)] if not soft else [(1, 1), (2, .3), (4, .08)]):
        for dt in (-.6, .6): y += g * np.sin(2 * np.pi * (f * m + dt * m) * t + rng.uniform(0, 6))
    y += .03 * lp(noise(d), 2000); return y * env(d, a, r) * .12
def chime(p, d=2.5):   # struck bar: inharmonic partials
    f = hz(p); t = t_(d); y = sum(g * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (tau)) for m, g, tau in [(1, 1, .9), (2.76, .45, .4), (5.4, .2, .18), (8.9, .1, .08)])
    return y * .25
def drum(p, d=1.2, v=1.):   # timpani-ish: pitched sine with a pitch drop + felt thump
    f = hz(p); t = t_(d); ph = 2 * np.pi * np.cumsum(f * (1 + .25 * np.exp(-t / .05))) / SR
    return (np.sin(ph) * np.exp(-t / .5) + lp(noise(d), 300) * np.exp(-t / .03) * .6) * v * .5
def flute(p, d, v=.3):   # recorder-like: sine + breath, gentle vibrato
    f = hz(p); t = t_(d); vib = 1 + .004 * np.sin(2 * np.pi * 5 * t) * np.minimum(1, t / .3)
    y = np.sin(2 * np.pi * np.cumsum(f * vib) / SR) + .12 * np.sin(4 * np.pi * np.cumsum(f * vib) / SR) + .05 * bp(noise(d), f, min(f * 3, 20000))
    return y * env(d, .06, .2) * v
def bell(p, d=6.):
    f = hz(p); t = t_(d); y = sum(g * np.sin(2 * np.pi * f * m * t + rng.uniform(0, 6)) * np.exp(-t / tau) for m, g, tau in [(.5, .6, 4), (1, 1, 3), (1.19, .5, 2.2), (1.5, .4, 1.6), (2, .45, 1.4), (2.5, .25, .8), (3.0, .2, .6)])
    return y * .3
def room(x, d=2.6):
    n = int(d * SR); e = np.exp(-np.arange(n) / SR / (d / 6.9)); ir = lp(rng.standard_normal(n), 3000) * e; ir[0] = 0
    from scipy.signal import fftconvolve
    y = fftconvolve(x, ir)[:len(x)]; y /= np.abs(ir).sum() / 4; return x * .7 + y * .3
def stem(evs):
    L = np.zeros(N); R = np.zeros(N)
    for t0, y, pan in evs:
        s = int(t0 * SR); e = min(N, s + len(y)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        L[s:e] += y[:e - s] * l; R[s:e] += y[:e - s] * r
    return np.stack([room(L), room(R)], 1)
def chord(t0, d, notes, soft=True, a=1.0): return [(t0, organ(p, d, a, 1.2, soft), (k - 1) * .2) for k, p in enumerate(notes)]
dr = chord(.2, 5.4, ['B1', 'F#2', 'D3'], a=1.6) + chord(5.6, 4.8, ['B1', 'F#2', 'D3', 'F#3'], a=1.2)
dr += chord(T['vision'], 2.4, ['B1', 'C2', 'F#2'], soft=False, a=.3)                                       # the vision: a semitone of dread
dr += chord(10.9, 5.0, ['G1', 'D2', 'B2'], a=1.0) + chord(16.4, 4.2, ['B1', 'F#2', 'D3'], soft=False, a=.5)
dr += chord(21.0, 4.6, ['E2', 'B2', 'G3'], a=.8) + chord(T['destroyed'], 1.6, ['B1', 'F2', 'B2'], soft=False, a=.1)
dr += chord(25.9, 6.8, ['B1', 'C2', 'F#2'], soft=False, a=.8)
dr += chord(33.1, 11.0, ['B1', 'F#2', 'D3'], a=1.6) + chord(T['strike'], 5.0, ['B1', 'F#2', 'B2', 'D3'], a=.4)
DRONE = stem(dr)
CH = stem([(t, chime(p), .3) for t, p in [(.3, 'F#5'), (5.8, 'B5'), (11.05, 'D6'), (16.55, 'F#6'), (21.15, 'B5'), (26.05, 'C6'), (33.25, 'F#5')]])
war = [(T['hunt'], drum('B1', 1.2, .8), 0), (T['lords'], drum('B1', 1.8, 1.0), 0), (T['destroyed'], drum('F#1', 2.2, 1.0), 0)]
war += [(T['approach'] + .7 * k, drum('B1', .6, .25 + k * .05), 0) for k in range(7)] + [(T['strike'], drum('B1', 2.0, 1.0), 0)]
war += [(26.4 + k * .45, flute(p, .42 if k < 3 else 1.6), .1) for k, p in enumerate(['F#5', 'E5', 'D5', 'C#5'])]
WAR = stem(war)
BELL = stem([(T['bell'], bell('B2', 4.4), 0)])
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
for name, x in [('drone', DRONE), ('harp_chimes', CH), ('war', WAR), ('bell', BELL)]:
    x = x / max(1e-9, np.abs(x).max()) * .8; sf.write(os.path.join(HERE, 'stems', name + '.wav'), x.astype(np.float32), SR)
print('stems written')
