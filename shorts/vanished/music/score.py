"""Original score for 'The Chapter That Vanished', synthesized (no samples): organ drone, chimes, war drums, a lament, a bell.
python3 music/score.py -> music/stems/*.wav. Times follow story.js. Key: D minor."""
import os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from dsp import SR, t_, lp, hp, bp, noise, add
DUR = 54.0; N = int(DUR * SR); rng = np.random.default_rng(21)
T = dict(raise_=10.2, warp=13.5, gone=14.9, appear=30.6, save=36.6, dead=37.0, vanish=38.5, hawk=43.6, unknown=45.6, bell=48.6)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}; NOTE.update({'G#': 8, 'D#': 3, 'A#': 10})
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
dr = chord(.2, 6.2, ['D2', 'A2', 'F3'], a=1.4) + chord(6.4, 6.6, ['D2', 'A2', 'D3', 'F3', 'A3'])           # the window; the Chapter in its pride
dr += chord(13.0, 2.0, ['D2', 'Eb2', 'A2'], soft=False, a=.4)                                               # the warp
dr += chord(16.6, 5.8, ['D2', 'A2'], a=1.6)                                                                 # nothing left
dr += chord(22.4, 8.2, ['Bb1', 'F2', 'D3'], a=1.0) + chord(T['appear'], 3.4, ['D2', 'A2', 'D3', 'F#3', 'A3'], soft=False, a=.2)   # the Legion: D major
dr += chord(34.0, 6.2, ['D2', 'A2', 'F3'], soft=False, a=.4)
dr += chord(40.4, 5.2, ['G1', 'D2', 'Bb2'], a=1.0) + chord(T['hawk'], 2.0, ['D3', 'F#3', 'A3'], a=.3) + chord(T['unknown'], 8.0, ['D2', 'A2', 'D3', 'F3'], a=1.0)
DRONE = stem(dr)
CH = stem([(t, chime(p), .3) for t, p in [(.3, 'A5'), (6.9, 'D6'), (13.45, 'Eb6'), (16.95, 'A5'), (22.75, 'F5'), (T['appear'], 'D6'), (T['appear'] + .12, 'F#6'), (T['appear'] + .24, 'A6'), (34.35, 'D6'), (40.75, 'A5'), (T['hawk'], 'F#6')]])
war = [(T['raise_'], drum('D2', 1.4, .8), 0), (T['gone'], drum('A1', 2.0, 1.0), 0)] + [(23.4 + k * .8, drum('D2', .7, .25 + k * .05), 0) for k in range(9)]
war += [(T['appear'], drum('D2', 1.8, 1.0), 0), (T['save'], drum('D2', 1.2, .9), 0), (T['dead'], drum('A1', 1.6, .8), 0)]
war += [(18.2 + k * .5, flute(p, .48 if k < 4 else 1.8), .1) for k, p in enumerate(['A5', 'G5', 'F5', 'E5', 'D5'])]   # a lament for the lost
WAR = stem(war)
BELL = stem([(T['bell'], bell('D3', 5.4), 0)])
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
for name, x in [('drone', DRONE), ('harp_chimes', CH), ('war', WAR), ('bell', BELL)]:
    x = x / max(1e-9, np.abs(x).max()) * .8; sf.write(os.path.join(HERE, 'stems', name + '.wav'), x.astype(np.float32), SR)
print('stems written')
