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

# ---------------------------------------------------------------- voice
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
wav = os.path.join(HERE, 'out', 'voice48.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'voice', 'narration.mp3'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', wav], check=True)
v = np.fromfile(wav, dtype='<f4').astype(float)
v = hp(v, 90); v = sfx.compress(v, thr=.18, ratio=3.0)
add(vo, v, 0.0, 1.0, 0)

# ---------------------------------------------------------------- score: a curious, watery mallet figure in D minor over a deep pulse, 96 bpm
BPM = 96; B = 60 / BPM
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def mallet(f, d=.7, v=1.0):
    x = t_(d); e = np.exp(-x / .28) * np.minimum(1, x * 300)
    return v * e * (np.sin(2 * np.pi * f * x) + .25 * np.sin(2 * np.pi * f * 3.01 * x) * np.exp(-x / .05) + .15 * np.sin(2 * np.pi * f * 2 * x))
def bass(f, d, v=1.0):
    x = t_(d); e = np.minimum(1, x * 40) * np.exp(-x / (d * .8))
    return v * e * (np.sin(2 * np.pi * f * x) + .3 * np.sin(4 * np.pi * f * x))
def pad(f, d, v=1.0, cut=1100):
    x = t_(d); e = np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / 1.0)
    s = sum(np.sin(2 * np.pi * f * k * x * (1 + .002 * k) + k) / k for k in range(1, 6))
    return v * e * lp(s, cut)
def knock(v=1.0): x = t_(.3); return v * np.sin(2 * np.pi * (45 + 60 * np.exp(-x / .04)) * x) * np.exp(-x / .12)
prog = [(50, [62, 65, 69, 67, 65, 62, 60, 62]), (46, [62, 65, 70, 69, 65, 62, 65, 67]), (48, [64, 67, 72, 69, 67, 64, 67, 69]), (45, [61, 64, 69, 67, 64, 61, 64, 65])]
DARK = (T['drone'] - 1.0, T['swell'] - .1)      # pitch black: music drops out
t = 0.0; bar = 0
while t < DUR - 1.0:
    root, fig = prog[(bar // 2) % 4]
    for i in range(8):
        at = t + i * B / 2
        if DARK[0] < at < DARK[1]: continue
        late = at > T['whale']
        add(music, mallet(mid(fig[i] - (12 if late and i % 2 else 0)), .7, .2), at, 1, -.35 + .7 * (i % 2))
    if not (DARK[0] < t < DARK[1]):
        add(music, bass(mid(root - 12), B * 3.8, .34), t, 1, 0); add(music, knock(.3), t, 1, 0); add(music, knock(.2), t + 2 * B, 1, 0)
    if bar % 2 == 0: add(music, pad(mid(root), B * 8, .06), t, 1, 0)
    t += 4 * B; bar += 1
add(music, pad(mid(38), DARK[1] - DARK[0] + 1.5, .1, 500), DARK[0] - .2, 1, 0)   # a deep drone under the dark
fade = np.ones(N); e0 = int((DUR - 2.2) * SR); fade[e0:] = np.linspace(1, 0, N - e0); music *= fade[:, None]

# ---------------------------------------------------------------- foley from the picture's events
def bubbles(d=2.0, v=1.0, seed=3):
    out = np.zeros(int(d * SR)); r = np.random.default_rng(seed)
    for k in range(int(d * 14)):
        f = 300 + r.random() * 900; dd = .05 + r.random() * .05; x = t_(dd)
        w = np.sin(2 * np.pi * f * (1 + 2 * x / dd) * x) * np.exp(-x / (dd * .4)); s = int(r.random() * (d - .1) * SR); out[s:s + len(w)] += w * v * (.4 + .6 * r.random())
    return out
def buzz(v=1.0): d = .5; x = t_(d); return v * np.sign(np.sin(2 * np.pi * 110 * x)) * .3 * env_exp(d, .18) * np.minimum(1, x * 80)
def whale(v=1.0):   # a low groan with a few clicks
    d = 2.6; x = t_(d); f = 70 + 25 * np.sin(np.pi * x / d); ph = 2 * np.pi * np.cumsum(f) / SR
    g = v * (np.sin(ph) + .3 * np.sin(2 * ph)) * np.sin(np.pi * x / d) ** 2 * .6
    for k in range(6): s = int((1.0 + k * .16) * SR); c = bp(noise(.02), 1500, 5000) * env_exp(.02, .004); g[s:s + len(c)] += c * .8 * v
    return lp(g, 2500)
def shimmer(d=2.5, v=1.0):
    out = np.zeros(int((d + .7) * SR)); r = np.random.default_rng(7)
    for k in range(18):
        f = mid(86 + [0, 3, 7, 10, 12][k % 5]); x = t_(.6); w = np.sin(2 * np.pi * f * x) * np.exp(-x / .18); s = int(k * d / 20 * SR); out[s:s + len(w)] += w * v * .25
    return out
def swell(d=1.6, v=1.0): x = t_(d); return v * pad(mid(62), d, 1, 1800) * (x / d) ** 2
for e in ev['ev']:
    k, at = e['type'], e['t']
    if k == 'whoosh': add(fx, sfx.whoosh(.3, .45), at - .15, .5, 0)
    elif k == 'rumble': add(fx, sfx.rumble(3.0, .6), at, .6, 0)
    elif k == 'thud': add(fx, sfx.thump(.9, 45), at, .9, 0); add(fx, bubbles(1.2, .5, 1), at, .5, 0)
    elif k == 'bubbles': add(fx, bubbles(2.4, .6), at, .5, .1)
    elif k == 'ding': add(fx, sfx.ding(.6), at, .45, 0)
    elif k == 'buzz': add(fx, buzz(1), at, .5, 0)
    elif k == 'dive': add(fx, bubbles(2.0, .5, 9), at, .5, -.2); add(fx, sfx.rumble(2.5, .4), at, .5, 0)
    elif k == 'drone': pass
    elif k == 'swell': add(fx, swell(1.4, .8), at - .2, .5, 0)
    elif k == 'whale': add(fx, whale(1), at, .9, -.3)
    elif k == 'shimmer': add(fx, shimmer(2.5, 1), at, .6, .2)

venv = np.abs(vo[:, 0]); k = int(.25 * SR); venv = np.convolve(venv, np.ones(k) / k, 'same')
duck = 1 - .45 * np.clip(venv / (venv.max() * .25 + 1e-9), 0, 1)
mix = vo * 1.0 + music * .55 * duck[:, None] + fx * .6
mix = sfx.limit(mix / (np.abs(mix).max() + 1e-9) * .9, .95)
out = os.path.join(HERE, 'out', 'mix.wav')
import soundfile as sf; sf.write(out, mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('wrote', out)
