"""Sound for a dive short: underwater bed, drone + pad, sonar pings on each depth, foley cues, narration on top.
Usage: python3 lib/mix.py <short-dir>   (reads timeline.json and voice/fast/*.wav, writes out/mix.wav)
Optional <short-dir>/cues.json adds one-off sounds: [{"t": 12.3, "type": "boom"|"creak"|"whale"}, ...] (t may be "L6:Titanic" = that word's start).
"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
P = os.path.abspath(sys.argv[1]); TL = json.load(open(os.path.join(P, 'timeline.json'))); SR = 48000
N = int(TL['dur'] * SR); rng = np.random.default_rng(11)
def t_(d): return np.arange(int(d * SR)) / SR
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x, axis=0)
def noise(d): return rng.standard_normal(int(d * SR))
def add(buf, x, t, gain=1., pan=0.):
    n0 = int(t * SR); x = np.asarray(x) * gain
    if x.ndim == 1: x = np.stack([x * np.sqrt((1 - pan) / 2), x * np.sqrt((1 + pan) / 2)], 1)
    n1 = min(len(buf), n0 + len(x)); s = max(0, -n0)
    if n1 > max(n0, 0): buf[max(n0, 0):n1] += x[s:n1 - n0]
def ir(d, lp=5000, pre=.03):
    n = int(d * SR); e = np.exp(-np.arange(n) / SR / (d / 6.9)); r = np.stack([filt(noise(d), 'low', lp) * e, filt(noise(d), 'low', lp) * e], 1)
    r = np.concatenate([np.zeros((int(pre * SR), 2)), r]); return r / np.sqrt((r ** 2).sum(0))
def verb(x, r, mix):
    y = np.stack([fftconvolve(x[:, c], r[:, c])[:len(x)] for c in range(2)], 1); return x * (1 - mix) + y * mix
def word_t(ref):
    if isinstance(ref, (int, float)): return ref
    lid, w = ref.split(':'); l = next(l for l in TL['lines'] if l['id'] == lid); return next(a for ww, a, b in l['words'] if w.lower() in ww.lower())

bed = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros((N, 2)); mus = np.zeros((N, 2))
T = np.arange(N) / SR
# depth over time (same easing as the picture) -> darker, lower bed as we sink
L = TL['lines']; dep = np.zeros(N)
for i in range(1, len(L)):
    a, b = L[i]['t0'] - 1.5, L[i]['t0'] + .1; k = np.clip((T - a) / (b - a), 0, 1); k = k * k * (3 - 2 * k)
    m = T >= a; dep[m] = L[i - 1].get('depth', 2500) + (L[i].get('depth', 2500) - L[i - 1].get('depth', 2500)) * k[m]
dk = np.clip(np.log1p(dep / 40) / np.log1p(11000 / 40), 0, 1)

# ---- underwater bed: muffled rumble, brighter near the surface ----
br = np.cumsum(rng.standard_normal(N)) ; br = filt(br - filt(br, 'low', 8), 'low', 500)
br /= np.abs(br).max(); hi = filt(rng.standard_normal(N), 'band', [300, 1800]) * .25
bedm = br * (.55 + .2 * dk) + hi * (1 - dk) ** 2
bed += np.stack([bedm, np.roll(bedm, 900)], 1) * .22
# drone: low D, slowly beating, grows with depth
dr = sum(a * np.sin(2 * np.pi * f * T + p) for f, a, p in [(36.71, 1, 0), (36.95, .7, 1), (55.0, .5, 2), (73.42, .25, .5)]) * (.25 + .75 * dk)
mus += np.stack([dr, dr], 1) * .09
# pad: D minor, soft detuned sines, enters after the first beat
def pad(freqs, t0, t1, g):
    d = t1 - t0; tt = t_(d); env = np.clip(tt / 3, 0, 1) * np.clip((d - tt) / 2.5, 0, 1); y = np.zeros((len(tt), 2))
    for f in freqs:
        for det, pan in [(-.15, -.6), (.15, .6)]: s = np.sin(2 * np.pi * (f + det) * tt + rng.uniform(0, 6)) * (1 + .3 * np.sin(2 * np.pi * .13 * tt + f)); y[:, 0] += s * (1 - pan) / 2; y[:, 1] += s * (1 + pan) / 2
    add(mus, y * env[:, None] / len(freqs), t0, g)
pad([146.83, 220.0, 293.66], L[1]['t0'] - 1, L[5]['t0'], .16)
pad([116.54, 174.61, 233.08, 293.66], L[5]['t0'] - .3, L[8]['t0'], .17)   # Bb: the wreck, the abyss
pad([73.42, 110.0, 146.83, 174.61], L[8]['t0'] - .5, TL['dur'], .2)

# ---- foley ----
def ping(f=1150): tt = t_(1.2); return np.sin(2 * np.pi * f * tt) * np.exp(-tt / .18) * np.minimum(1, tt / .004) + .3 * np.sin(2 * np.pi * f * 2.01 * tt) * np.exp(-tt / .07)
def whoosh(d): tt = t_(d); e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2; return filt(noise(d), 'band', [120, 900]) * e * .5
def boom(): tt = t_(3.5); f = 30 + 40 * np.exp(-tt / .25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .9) * 1.2 + filt(noise(3.5), 'low', 200) * np.exp(-tt / .25) * .8
def creak(d=2.2):
    tt = t_(d); ph = np.cumsum(9 + 6 * np.sin(2 * np.pi * .4 * tt)) / SR; pulses = (np.sin(2 * np.pi * ph) > .9).astype(float)
    return filt(pulses * noise(d) * .6 + pulses, 'band', [90, 700]) * np.sin(np.pi * tt / d) ** .6 * .8
def whale(d=3.5):
    tt = t_(d); f = 210 - 70 * tt / d + 8 * np.sin(2 * np.pi * 5 * tt); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * .5
def bloop():   # a rising, rumbling sweep, like the sped-up hydrophone recording
    d = 3.2; tt = t_(d); f = 40 + 260 * (tt / d) ** 1.8; ph = np.cumsum(f) / SR; e = np.minimum(1, tt / .3) * np.exp(-np.maximum(0, tt - 2.2) / .35)
    y = sum(a * np.sin(2 * np.pi * k * ph) for k, a in [(1, 1), (2, .5), (3, .3), (5, .12)]) * (1 + .5 * np.sin(2 * np.pi * 11 * tt))
    return (y + filt(noise(d), 'low', 400) * .4) * e * .6
def crack():   # ice fracturing: sharp snaps, then a long low groan
    d = 3.5; tt = t_(d); y = filt(noise(d), 'low', 120) * np.exp(-tt / 1.2) * 1.2
    for _ in range(40):
        n0 = int(rng.uniform(0, 1.4) ** 1.5 * SR); s = filt(noise(.05), 'high', 1500) * np.exp(-t_(.05) / .008) * rng.uniform(.3, 1); y[n0:n0 + len(s)] += s[:len(y) - n0]
    return y
def growl():   # sub rumble with a slow wobble: the 'monster'
    d = 6; tt = t_(d); return (np.sin(2 * np.pi * (28 + 3 * np.sin(2 * np.pi * .7 * tt)) * tt) + filt(noise(d), 'low', 90) * .8) * np.sin(np.pi * tt / d) ** 1.5 * .9
def splash(): tt = t_(1.6); return filt(noise(1.6), 'low', 2500) * np.exp(-tt / .18) * 1.2 + filt(noise(1.6), 'band', [200, 600]) * np.exp(-tt / .5) * .6
def bubble(): d = rng.uniform(.04, .12); tt = t_(d); f = rng.uniform(500, 1500) * (1 + 2.5 * tt / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (d / 3)) * .3

if L[0].get('depth') == 0: add(fx, splash(), 0, .8)
for _ in range(70 if L[0].get('depth') == 0 else 0): add(fx, bubble(), rng.uniform(.05, 2.6) ** 1.3, rng.uniform(.3, 1), rng.uniform(-.7, .7))
for i in range(1, len(L)):
    if L[i].get('ping') or ('depth' in L[i] and L[i]['depth'] != L[i - 1]['depth']): add(fx, whoosh(1.7), L[i]['t0'] - 1.6, .7, rng.uniform(-.3, .3)); add(fx, ping(1150 - i * 30), L[i]['t0'] - .05, .45, .15)
cues = json.load(open(os.path.join(P, 'cues.json'))) if os.path.exists(os.path.join(P, 'cues.json')) else []
for c in cues: add(fx, {'boom': boom, 'creak': creak, 'whale': whale, 'bloop': bloop, 'crack': crack, 'growl': growl, 'splash': splash}[c['type']](), word_t(c['t']), c.get('gain', 1), c.get('pan', 0))
add(fx, ping(880), TL['end'] + .2, .5); add(fx, ping(1320), TL['end'] + .55, .25)
fx = verb(fx, ir(3.2, 3500), .45)
mus = verb(mus, ir(4, 2500), .4)

# ---- narration ----
for l in L:
    x, sr = sf.read(os.path.join(P, 'voice', 'fast', l['id'] + '.wav')); assert sr == SR
    add(vo, x * .9, l['t0'])
vo = verb(vo, ir(.9, 6000, .01), .1)
env = np.abs(vo[:, 0]); env = filt(env, 'low', 4, 1); env = np.clip(env / (env.max() * .25), 0, 1)
duck = 1 - .6 * env
out = vo + (mus + bed * .9) * .7 * duck[:, None] + fx * (1 - .6 * env)[:, None]
_r = lambda x: round(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9), 1); _m = env > .5
print('voice', _r(vo[_m]), 'music+bed under voice', _r(((mus + bed * .9) * .7 * duck[:, None])[_m]), 'fx under voice', _r((fx * (1 - .6 * env)[:, None])[_m]))
fade = np.clip((TL['dur'] - T) / 1.2, 0, 1); out *= fade[:, None]
out = np.tanh(out / np.abs(out).max() * 1.6) * .89
os.makedirs(os.path.join(P, 'out'), exist_ok=True); sf.write(os.path.join(P, 'out', 'mix.wav'), out.astype(np.float32), SR, subtype='FLOAT')
print('mix', round(TL['dur'], 2), 's')
