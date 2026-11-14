"""Score, foley and voice -> out/mix.wav. Run with the library's Python: $LIB/.venv/bin/python mix.py"""
import os, sys, json, subprocess
import numpy as np
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, add, t_, env_exp, lp, hp, bp, noise

HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int(DUR * SR) + SR
music = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros((N, 2))
T = {e['type']: e['t'] for e in ev['ev']}
T['splash_end'] = max(e['t'] for e in ev['ev'] if e['type'] == 'splash')

# ---------------------------------------------------------------- voice
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
wav = os.path.join(HERE, 'out', 'voice48.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'voice', 'narration.mp3'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', wav], check=True)
v = np.fromfile(wav, dtype='<f4').astype(float)
v = hp(v, 90); v = sfx.compress(v, thr=.18, ratio=3.0)
add(vo, v, 0.0, 1.0, 0)

# ---------------------------------------------------------------- score: a light, curious koto-like pluck in a Japanese in-scale (D), soft frame drum, 100 bpm
BPM = 100; B = 60 / BPM
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def pluck(f, d=1.2, v=1.0):   # Karplus-Strong string
    n = int(d * SR); P = max(2, int(SR / f)); buf = np.random.default_rng(int(f)).uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]; buf[i % P] = .996 * .5 * (buf[i % P] + buf[(i + 1) % P])
    return v * out * np.minimum(1, t_(d) * 400)
def bass(f, d, v=1.0):
    x = t_(d); e = np.minimum(1, x * 40) * np.exp(-x / (d * .6))
    return v * e * (np.sin(2 * np.pi * f * x) + .2 * np.sin(4 * np.pi * f * x))
def pad(f, d, v=1.0, cut=900):
    x = t_(d); e = np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / 1.0)
    s = sum(np.sin(2 * np.pi * f * k * x * (1 + .002 * k) + k) / k for k in range(1, 5))
    return v * e * lp(s, cut)
def drum(v=1.0): x = t_(.35); return v * np.sin(2 * np.pi * (70 + 50 * np.exp(-x / .03)) * x) * np.exp(-x / .14)
def flute(f, d, v=1.0):   # breathy bamboo-flute tone with a slow vibrato
    x = t_(d); vib = 1 + .006 * np.sin(2 * np.pi * 5 * x) * np.minimum(1, x / .6)
    e = np.minimum(1, x / .25) * np.minimum(1, (d - x) / .4)
    tone = np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + .15 * np.sin(4 * np.pi * f * np.cumsum(vib) / SR)
    return v * e * (tone + .25 * bp(noise(d), f * .8, f * 2.5) )
_cache = {}
def P(m, d=1.2, v=1.0):
    if (m, d) not in _cache: _cache[(m, d)] = pluck(mid(m), d, 1)
    return _cache[(m, d)] * v
# D in-scale: D Eb G A Bb
figs = [[62, 69, 67, 70, 69, 67, 63, 62], [62, 63, 67, 69, 70, 69, 67, 69], [67, 70, 74, 70, 69, 67, 63, 67], [62, 69, 67, 63, 62, 63, 67, 62]]
roots = [50, 50, 55, 46]
t = 0.0; bar = 0
while t < DUR - 1.5:
    fig = figs[bar % 4]
    for i in range(8):
        if i % 2 and bar % 2 == 0 and i in (3, 7): continue
        add(music, P(fig[i], 1.2, .28), t + i * B / 2, 1, -.4 + .8 * (i % 2))
    add(music, bass(mid(roots[bar % 4] - 12), B * 3.6, .3), t, 1, 0)
    add(music, drum(.35), t, 1, 0); add(music, drum(.22), t + 2.5 * B, 1, 0)
    if bar % 2 == 0: add(music, pad(mid(roots[bar % 4]), B * 8, .05), t, 1, 0)
    t += 4 * B; bar += 1
# a flute line over the dusk ending
end0 = T['splash_end']
for k, (m, d) in enumerate([(74, 1.2), (70, .6), (69, 1.0), (67, 2.0)]):
    add(music, flute(mid(m), d + .2, .12), end0 + sum(x[1] for x in [(74, 1.2), (70, .6), (69, 1.0), (67, 2.0)][:k]), 1, .1)
fade = np.ones(N); e0 = int((DUR - 2.2) * SR); fade[e0:] = np.linspace(1, 0, N - e0); music *= fade[:, None]

# ---------------------------------------------------------------- foley from the picture's events
def river(d, v=1.0): x = noise(d); return v * (.6 * bp(x, 300, 1800) + .3 * hp(noise(d), 3000)) * (.8 + .2 * np.sin(2 * np.pi * .3 * t_(d)))
def splash(v=1.0, seed=1):
    d = 1.0; r = np.random.default_rng(seed); x = bp(noise(d), 400, 6000) * env_exp(d, .18) * np.minimum(1, t_(d) * 200)
    for k in range(10):
        f = 400 + r.random() * 1200; dd = .05; xx = t_(dd); w = np.sin(2 * np.pi * f * (1 + 2 * xx / dd) * xx) * np.exp(-xx / .02); s = int((.1 + r.random() * .6) * SR); x[s:s + len(w)] += w * .3
    return v * x
def pour(d=1.4, v=1.0):
    r = np.random.default_rng(4); out = .25 * bp(noise(d), 800, 4000) * np.sin(np.pi * t_(d) / d)
    for k in range(int(d * 18)):
        f = 600 + r.random() * 1400; dd = .04; xx = t_(dd); w = np.sin(2 * np.pi * f * (1 + 1.5 * xx / dd) * xx) * np.exp(-xx / .015); s = int(r.random() * (d - .1) * SR); out[s:s + len(w)] += w * .4
    return v * out
def buzz(v=1.0): d = .45; x = t_(d); return v * np.sign(np.sin(2 * np.pi * 110 * x)) * .3 * env_exp(d, .16) * np.minimum(1, x * 80)
def neigh(v=1.0):
    d = 1.1; x = t_(d); f = 520 + 380 * np.sin(np.pi * x / d) * (1 + .15 * np.sin(2 * np.pi * 14 * x)); ph = 2 * np.pi * np.cumsum(f) / SR
    return v * lp((np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3 * ph)) * np.sin(np.pi * x / d) ** 1.5 * .35, 3500)
def chime(v=1.0): x = t_(1.6); return v * (np.sin(2 * np.pi * mid(86) * x) + .4 * np.sin(2 * np.pi * mid(86) * 2.76 * x)) * np.exp(-x / .5) * .4
def shimmer(d=1.6, v=1.0):
    out = np.zeros(int((d + .7) * SR))
    for k in range(10):
        f = mid(86 + [0, 1, 5, 7, 8][k % 5]); x = t_(.6); w = np.sin(2 * np.pi * f * x) * np.exp(-x / .18); s = int(k * d / 12 * SR); out[s:s + len(w)] += w * v * .25
    return out
def swell(d=1.2, v=1.0): x = t_(d); return v * pad(mid(62), d, 1, 1800) * (x / d) ** 2
def crunch(v=1.0): d = .25; return v * bp(noise(d), 1500, 7000) * env_exp(d, .05) * (1 + np.sign(np.sin(2 * np.pi * 30 * t_(d)))) * .4
add(fx, river(DUR, .12), 0, 1, 0)
for e in ev['ev']:
    k, at = e['type'], e['t']
    if k == 'whoosh': add(fx, sfx.whoosh(.3, .45), at - .15, .5, 0)
    elif k == 'river': pass
    elif k == 'splash': add(fx, splash(1, int(at * 10)), at, .55, .1)
    elif k == 'pour': add(fx, pour(1.4, 1), at, .55, 0)
    elif k == 'buzz': add(fx, buzz(1), at, .45, 0)
    elif k == 'pop': add(fx, sfx.pop(.7), at, .5, 0)
    elif k == 'neigh': add(fx, neigh(1), at, .5, -.3)
    elif k == 'shimmer': add(fx, shimmer(1.6, 1), at, .5, .2)
    elif k == 'swell': add(fx, swell(1.2, .8), at - .2, .45, 0)
    elif k == 'chime': add(fx, chime(1), at, .5, 0)
    elif k == 'ding': add(fx, sfx.ding(.6), at, .45, 0)
    elif k == 'toss': add(fx, sfx.whoosh(.35, .5), at, .4, -.4)
    elif k == 'crunch': add(fx, crunch(1), at, .6, 0)

venv = np.abs(vo[:, 0]); k = int(.25 * SR); venv = np.convolve(venv, np.ones(k) / k, 'same')
duck = 1 - .45 * np.clip(venv / (venv.max() * .25 + 1e-9), 0, 1)
mix = vo * 1.0 + music * .55 * duck[:, None] + fx * .6
mix = sfx.limit(mix / (np.abs(mix).max() + 1e-9) * .9, .95)
out = os.path.join(HERE, 'out', 'mix.wav')
import soundfile as sf; sf.write(out, mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('wrote', out)
