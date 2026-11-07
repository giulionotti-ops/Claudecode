"""Sound for a Void Atlas short: deep-space drone, airy cosmic wind, slow pad, a soft chime on each new scene,
one-off cues, narration on top with ducking.
Usage: python3 lib/mix.py <short-dir>   (reads timeline.json and voice/fast/*.wav, writes out/mix.wav)
Optional <short-dir>/cues.json: [{"t": 12.3 | "L6:word", "type": "boom"|"whoosh"|"rumble"|"signal"|"static"|"chime"|"heartbeat", "gain": .4}, ...]
Optional "mood" in timeline lines is ignored; the pad follows the thirds of the short.
"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
P = os.path.abspath(sys.argv[1]); TL = json.load(open(os.path.join(P, 'timeline.json'))); SR = 48000
N = int(TL['dur'] * SR); rng = np.random.default_rng(23)
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

fx = np.zeros((N, 2)); vo = np.zeros((N, 2)); mus = np.zeros((N, 2)); bed = np.zeros((N, 2))
T = np.arange(N) / SR; L = TL['lines']

# ---- cosmic wind: slow-swept band noise, stereo ----
w = rng.standard_normal((N, 2)); sweep = .5 + .5 * np.sin(2 * np.pi * T / 17)
lo, hi = filt(w, 'band', [200, 700]), filt(w, 'band', [900, 2600])
bed += (lo * (1 - sweep[:, None]) + hi * sweep[:, None] * .5) * .05
# ---- drone: low A, beating ----
dr = sum(a * np.sin(2 * np.pi * f * T + p) for f, a, p in [(55.0, 1, 0), (55.3, .7, 1), (82.4, .45, 2), (110.0, .2, .5)])
mus += np.stack([dr, np.roll(dr, 400)], 1) * .08
# ---- pad: three chords over the thirds of the short (A minor → F → C/E, opening up at the end) ----
def pad(freqs, t0, t1, g):
    d = t1 - t0; tt = t_(d); env = np.clip(tt / 3, 0, 1) * np.clip((d - tt) / 2.5, 0, 1); y = np.zeros((len(tt), 2))
    for f in freqs:
        for det, pan in [(-.2, -.6), (.2, .6)]: s = np.sin(2 * np.pi * (f + det) * tt + rng.uniform(0, 6)) * (1 + .3 * np.sin(2 * np.pi * .11 * tt + f)); y[:, 0] += s * (1 - pan) / 2; y[:, 1] += s * (1 + pan) / 2
    add(mus, y * env[:, None] / len(freqs), t0, g)
n = len(L); a1, a2 = L[n // 3]['t0'], L[2 * n // 3]['t0']
pad([220.0, 261.63, 329.63], L[1]['t0'] - 1, a1 + 1, .15)
pad([174.61, 220.0, 261.63, 349.23], a1 - .5, a2 + 1, .16)
pad([164.81, 261.63, 329.63, 392.0, 523.25], a2 - .5, TL['dur'], .18)
# twinkle: high glassy arpeggio notes, sparse
for k in range(int(TL['dur'] / 2.2)):
    f = rng.choice([880, 987.77, 1318.5, 1760.0]); tt = t_(2.5); s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .8) * np.minimum(1, tt / .01)
    add(mus, s, 1.5 + k * 2.2 + rng.uniform(0, .6), .05, rng.uniform(-.8, .8))

# ---- foley ----
def chime(f=660): tt = t_(2.0); return (np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / .2)) * np.exp(-tt / .6) * np.minimum(1, tt / .003)
def whoosh(d=1.7): tt = t_(d); e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2; return filt(noise(d), 'band', [300, 3000]) * e * .45
def boom(): tt = t_(3.5); f = 28 + 45 * np.exp(-tt / .25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .9) * 1.2 + filt(noise(3.5), 'low', 200) * np.exp(-tt / .25) * .8
def rumble(d=5): tt = t_(d); return (filt(noise(d), 'low', 80) * 1.4 + np.sin(2 * np.pi * 31 * tt) * .5) * np.sin(np.pi * tt / d) ** 1.4
def signal(d=2.4):   # narrowband radio tone fading up and down, like a source drifting through the beam
    tt = t_(d); env = np.exp(-((tt - d / 2) / (d / 5)) ** 2); return (np.sin(2 * np.pi * 1420 / 2 * tt) * .6 + filt(noise(d), 'band', [600, 800]) * .3) * env
def static(d=1.5): tt = t_(d); return filt(noise(d), 'band', [800, 6000]) * (.4 + .6 * (rng.random(len(tt)) > .97)) * np.sin(np.pi * tt / d) * .5
def heartbeat(): y = np.zeros(int(1.2 * SR)); tt = t_(.25); b = np.sin(2 * np.pi * 50 * tt) * np.exp(-tt / .06); y[:len(b)] += b; y[int(.28 * SR):int(.28 * SR) + len(b)] += b * .7; return y

for i in range(1, len(L)):
    if L[i].get('ping'): add(fx, whoosh(), L[i]['t0'] - 1.5, .5, rng.uniform(-.3, .3)); add(fx, chime(660 + (i % 4) * 110), L[i]['t0'] - .05, .25, .2)
cues = json.load(open(os.path.join(P, 'cues.json'))) if os.path.exists(os.path.join(P, 'cues.json')) else []
for c in cues: add(fx, {'boom': boom, 'whoosh': whoosh, 'rumble': rumble, 'signal': signal, 'static': static, 'chime': chime, 'heartbeat': heartbeat}[c['type']](), word_t(c['t']), c.get('gain', 1), c.get('pan', 0))
add(fx, chime(523.25), TL['end'] + .2, .4); add(fx, chime(784), TL['end'] + .55, .25)
fx = verb(fx, ir(3.5, 4000), .5)
mus = verb(mus, ir(5, 3000), .45)

# ---- narration ----
for l in L:
    x, sr = sf.read(os.path.join(P, 'voice', 'fast', l['id'] + '.wav')); assert sr == SR
    add(vo, x * .9, l['t0'])
vo = verb(vo, ir(.9, 6000, .01), .08)
env = np.abs(vo[:, 0]); env = filt(env, 'low', 4, 1); env = np.clip(env / (env.max() * .25), 0, 1)
duck = 1 - .6 * env
out = vo + (mus + bed) * .26 * duck[:, None] + fx * .4 * (1 - .6 * env)[:, None]
_r = lambda x: round(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9), 1); _m = env > .5
print('voice', _r(vo[_m]), 'music+bed under voice', _r(((mus + bed) * .26 * duck[:, None])[_m]), "fx under voice", _r((fx * .4 * (1 - .6 * env)[:, None])[_m]))
fade = np.clip((TL['dur'] - T) / 1.2, 0, 1); out *= fade[:, None]
out = np.tanh(out / np.abs(out).max() * 1.6) * .89
os.makedirs(os.path.join(P, 'out'), exist_ok=True); sf.write(os.path.join(P, 'out', 'mix.wav'), out.astype(np.float32), SR, subtype='FLOAT')
print('mix', round(TL['dur'], 2), 's')
