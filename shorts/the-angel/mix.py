"""Mix: glass/lead foley from events.json + stone-hall ambience + narration + score (ducked ~9 dB under voice) -> out/mix.wav
Run with the library venv: LIB=<library> $LIB/.venv/bin/python mix.py
"""
import sys, os, json, numpy as np, soundfile as sf, soxr
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio.sfx import SR, t_, bp, lp, hp, noise, brown, compress, limit, add
from scipy.signal import fftconvolve
D = os.path.dirname(os.path.abspath(__file__))
EV = json.load(open(os.path.join(D, 'events.json'))); DUR = EV['dur']; ev = EV['ev']
N = int(DUR * SR)
fx = np.zeros((N, 2)); vo = np.zeros((N, 2)); amb = np.zeros((N, 2))
rng = np.random.default_rng(57)
# timemap.json (retime.py): old cue times -> the film's current timeline
_tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'timemap.json')
TM = json.load(open(_tmp)) if os.path.exists(_tmp) else None
F = (lambda t: float(np.interp(t, [a for a, b in TM['anchors']], [b for a, b in TM['anchors']]))) if TM else (lambda t: t)


def hall_ir(d=2.8, damp=2600, pre=.02):
    n = int(d * SR); e = np.exp(-np.arange(n) / SR / (d / 6.9))
    ir = np.stack([lp(rng.standard_normal(n), damp) * e, lp(rng.standard_normal(n), damp) * e], 1)
    ir = np.concatenate([np.zeros((int(pre * SR), 2)), ir]); ir[0] = 1; return ir / np.abs(ir).sum(0) * 5
def verb(x, ir, mix=.3):
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1); return x * (1 - mix) + y * mix
HALL = hall_ir(); ROOM = hall_ir(1.0, 3500, .008)

# ---------- material foley ----------
def glass_tink(v=1., f0=None, d=1.2, bright=1.):   # struck glass: inharmonic partials 1 : 2.32 : 4.25 : 6.63 : 9.38
    f0 = f0 or rng.uniform(2300, 3400); t = t_(d); y = np.zeros_like(t)
    for r, a, tau in [(1, 1, .5), (2.32, .6, .32), (4.25, .38, .2), (6.63, .22, .12), (9.38, .12, .07)]:
        y += a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 6)) * np.exp(-t / (tau * d))
    return (y + .25 * hp(noise(d), 5000) * np.exp(-t / .004) * bright) * v * .35
def glass_crack(v=1.):   # snap + pane thump + the crack running + a rain of tinkles
    d = 2.4; t = t_(d); y = hp(noise(d), 1500) * np.exp(-t / .03) * 1.2 + bp(noise(d), 160, 900) * np.exp(-t / .07) * 1.0
    for k in range(28):
        at = rng.uniform(0, .26) if k < 12 else rng.uniform(.2, 1.5); n0 = int(at * SR)
        s = glass_tink(rng.uniform(.25, .8) * (1 if k < 12 else .5), rng.uniform(2500, 6400), rng.uniform(.25, .7)); y[n0:n0 + len(s)] += s[:len(y) - n0]
    return y * v
def lead_creak(d=1.0, v=1.):   # soft lead came bending: stick-slip friction
    t = t_(d); ph = np.cumsum(18 + 10 * np.sin(2 * np.pi * .7 * t)) / SR; pulses = (np.sin(2 * np.pi * ph) > .92).astype(float)
    return bp(pulses * noise(d) * .7 + pulses * .6, 260, 1400) * np.sin(np.pi * t / d) ** .5 * v
def grind(d=1.0, v=1.):   # glass sliding in a came: gritty band noise + a faint squeal
    t = t_(d); e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** .7
    y = bp(noise(d), 1800, 5200) * .5 * (1 + .6 * np.sin(2 * np.pi * 23 * t)) + .12 * np.sin(2 * np.pi * (1900 + 200 * np.sin(2 * np.pi * 1.3 * t)) * t) * e
    return y * e * v
def weld(v=1.):   # solder hiss + tick
    d = .7; t = t_(d); y = hp(noise(d), 3500) * np.exp(-t / .12) * .45; g = glass_tink(.5, 3000, .6); y[:len(g)] += g[:len(y)]; return y * v
def air(d=1.2, v=1., lo=300, hi=2400):
    t = t_(d); return bp(noise(d), lo, hi) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * v * .5
def thump(v=1.):
    d = .8; t = t_(d); return (lp(noise(d), 160) * np.exp(-t / .09) * 1.4 + bp(noise(d), 200, 700) * np.exp(-t / .03) * .4) * v
def clash(v=1.):   # two glass blades: a hard tink, a lower ring, the swing's thud
    d = 1.4; t = t_(d); y = np.zeros_like(t)
    for f0, a in [(rng.uniform(1900, 2400), .8), (rng.uniform(1100, 1300), .6)]: g = glass_tink(a, f0, 1.1); y[:len(g)] += g
    return (y + lp(noise(d), 180) * np.exp(-t / .07) * 1.1) * v
def whisper(d=2.6, v=1.):   # breathy syllables, no words: noise shaped into a 6 Hz murmur, three voices panned apart
    t = t_(d); out = np.zeros((len(t), 2))
    for k, pan in enumerate([-.7, .1, .7]):
        syl = np.clip(np.sin(2 * np.pi * (5.2 + k * .8) * t + rng.uniform(0, 6)), 0, 1) ** 2 * (.6 + .4 * np.sin(2 * np.pi * .9 * t + k))
        s = (bp(noise(d), 1200 + k * 500, 4200 + k * 600) * .7 + bp(noise(d), 400, 900) * .3) * syl * np.sin(np.pi * np.clip(t / d, 0, 1)) ** .8
        out[:, 0] += s * (1 - pan) * .5; out[:, 1] += s * (1 + pan) * .5
    return out * v

def flutter(v=1.):
    d = .9; y = np.zeros(int(d * SR))
    for k in range(4): n0 = int((k * .16 + rng.uniform(0, .02)) * SR); s = bp(noise(.12), 300, 2500) * np.hanning(int(round(.12 * SR))); y[n0:n0 + len(s)] += s * (1 - k * .15)
    return y * v * .6
def rs(a, sr): return soxr.resample(a, sr, SR) if sr != SR else a
for e in ev:
    t0, k = e['t'], e['type']
    if k == 'ray': add(fx, air(1.6, .5, 200, 1600), t0 - .1, .8); add(fx, glass_tink(.55, 2940, 1.8), t0, .8)
    elif k == 'crack': add(fx, glass_crack(1.0), t0 - .005, 1.3)
    elif k == 'whoosh': add(fx, air(e['d'], 1.0, 150, 1400), t0, .9, -.1)
    elif k == 'glide': add(fx, air(e['d'] + .3, .5, 300, 2600), t0, .8, .15)
    elif k == 'light': add(fx, glass_tink(.4, 2800, 1.4), t0, .6, .2)
    elif k in ('step', 'raise'): add(fx, glass_tink(.32, rng.uniform(3800, 4600), .3, .6), t0, .6, -.1); add(fx, lead_creak(.5, .35), t0, .5)
    elif k == 'strike': add(fx, clash(1.1), t0, .9, .2)
    elif k == 'thump': add(fx, thump(1), t0, .8)
    elif k == 'whisper':
        w = whisper(e['d'], .5); n0 = int(t0 * SR); n1 = min(N, n0 + len(w)); fx[n0:n1] += w[:n1 - n0] * .55
    elif k == 'creak': add(fx, lead_creak(1.2, .55), t0, .6)
    elif k == 'slide': add(fx, grind(e['d'], .4), t0, .55, -.2); add(fx, lead_creak(e['d'], .35), t0, .5)
    elif k == 'weld': add(fx, weld(.6 if e.get('soft') else 1), t0, .55, rng.uniform(-.25, .25))
    elif k == 'tinkle': add(fx, glass_tink(.28, rng.uniform(4200, 6000), .5), t0, .55, rng.uniform(-.5, .5))
    elif k == 'clash': add(fx, clash(1.2), t0, .95, rng.uniform(-.15, .15))
    elif k == 'wings': add(fx, verb(np.stack([flutter(1.0)] * 2, 1), HALL, .3)[:, 0], t0, .7, -.2)   # great wings opening / folding
    elif k == 'voice':
        a, sr = sf.read(os.path.join(D, 'voice', e['id'] + '.wav')); add(vo, rs(a.astype(np.float64), sr), t0, 1.0, 0)

# ---------- ambience: a large stone hall; birds in the vault at dawn; wind on the march ----------
tt = t_(DUR)
room = lp(brown(DUR), 380) * .06 + bp(noise(DUR), 400, 1600) * .004
for a, b, g in [(28.9, 30.25, .35), (39.4, 40.35, .45), (44.7, 48.6, .5)]: room[int(F(a) * SR):int(F(b) * SR)] *= g     # near-silences
amb[:, 0] += room; amb[:, 1] += np.roll(room, 311)
for at, g in [(8.0, .3), (9.6, .2)]: add(amb, verb(np.stack([flutter(.8)] * 2, 1), HALL, .6)[:, 0], F(at), g, rng.uniform(-.7, .7))
wind = bp(noise(5.0), 120, 700) * np.sin(np.pi * np.linspace(0, 1, int(5.0 * SR))) * .05; add(amb, wind, F(30.4), .8, .3)
iron = np.zeros(int(4 * SR))
for k in range(5): s = glass_tink(.12, rng.uniform(5200, 6800), .2, .2); n0 = int(rng.uniform(0, 3.6) * SR); iron[n0:n0 + len(s)] += s[:len(iron) - n0]
add(amb, iron, F(48.3), .5, .4)                                                                   # iron ticking as it cools

fx = verb(fx, HALL, .38)
vo[:, 0] = compress(vo[:, 0], .2, 3.0); vo[:, 1] = compress(vo[:, 1], .2, 3.0)
vo = verb(vo, hall_ir(3.2, 2400, .02), .28)   # voice 1: cathedral reverb
vo *= 10 ** ((-17.5 - 20 * np.log10(np.sqrt((vo[np.abs(vo).max(1) > 1e-4] ** 2).mean()) * 1.7)) / 20)   # voice at about -17.5 dB RMS

# ---------- score stems, ducked under the narration ----------
st = {}
for n in ['drone', 'harp_chimes', 'war', 'bell']:
    a, sr = sf.read(os.path.join(D, 'music', 'stems', n + '.wav')); a = rs(a, sr); b = np.zeros((N, 2)); b[:min(N, len(a))] = a[:N]; st[n] = b
gains = {'drone': .85, 'harp_chimes': 1.0, 'war': 1.0, 'bell': 1.4}
mus = sum(st[n] * g for n, g in gains.items() if n != 'bell')
env = np.abs(vo).max(1); win = int(.25 * SR); env = np.convolve(env, np.ones(win) / win, 'same')
duck = 1 - .645 * np.clip(env / .04, 0, 1); k = int(.12 * SR); duck = np.convolve(duck, np.ones(k) / k, 'same')
mus = mus * duck[:, None] + st['bell'] * gains['bell']                                         # the bell is never ducked

mix = mus + fx * .9 + amb + vo * 1.7
end = int((DUR - .7) * SR); mix[end:] *= np.linspace(1, 0, N - end)[:, None]
mix = np.stack([limit(mix[:, 0], .85), limit(mix[:, 1], .85)], 1)
os.makedirs(os.path.join(D, 'out'), exist_ok=True)
sf.write(os.path.join(D, 'out', 'mix.wav'), mix.astype(np.float32), SR)
def rms(x): return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
for a, b, n in [(.8, 4.8, 'L1'), (7.4, 11.4, 'L2'), (17.6, 20.8, 'L4'), (22.5, 25.0, 'L5'), (34.8, 39.3, 'L8'), (40.7, 43.2, 'L9'), (46.2, 49.1, 'L10')]:
    s0, s1 = int(F(a) * SR), int(F(b) * SR); print(f'{n}: voice {rms(vo[s0:s1] * 1.7):6.1f}  music {rms(mus[s0:s1]):6.1f}  fx {rms(fx[s0:s1] * .9):6.1f}')
for a, b in [(29.0, 30.2), (39.5, 40.3)]: print(f'silence {a}-{b}: total {rms(mix[int(F(a) * SR):int(F(b) * SR)]):6.1f}')
print('wrote out/mix.wav', mix.shape, 'peak', round(float(np.abs(mix).max()), 3))
