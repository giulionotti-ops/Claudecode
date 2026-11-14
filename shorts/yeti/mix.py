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
T = {e["type"]: e["t"] for e in ev["ev"]}

# ---------------------------------------------------------------- voice
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
wav = os.path.join(HERE, 'out', 'voice48.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'voice', 'narration.mp3'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', wav], check=True)
v = np.fromfile(wav, dtype='<f4').astype(float)
v = hp(v, 90); v = sfx.compress(v, thr=.18, ratio=3.0)
add(vo, v, 0.0, 1.0, 0)

# ---------------------------------------------------------------- score: a calm, wide mountain figure in A minor pentatonic, 84 bpm
BPM = 84; B = 60 / BPM
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def bell(f, d=1.0, v=1.0):
    x = t_(d); e = np.exp(-x / .45) * np.minimum(1, x * 300)
    return v * e * (np.sin(2 * np.pi * f * x) + .3 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x / .12) + .2 * np.sin(2 * np.pi * f * 2 * x))
def bass(f, d, v=1.0):
    x = t_(d); e = np.minimum(1, x * 30) * np.exp(-x / (d * .9))
    return v * e * (np.sin(2 * np.pi * f * x) + .25 * np.sin(4 * np.pi * f * x))
def pad(f, d, v=1.0, cut=900):
    x = t_(d); e = np.minimum(1, x / 1.2) * np.minimum(1, (d - x) / 1.2)
    s = sum(np.sin(2 * np.pi * f * k * x * (1 + .0015 * k) + k) / k for k in range(1, 6))
    return v * e * lp(s, cut)
prog = [(45, [69, 72, 76, 72, 74, 72, 69, 67]), (41, [65, 69, 72, 69, 71, 69, 65, 64]), (48, [67, 71, 74, 71, 72, 71, 67, 64]), (43, [64, 67, 71, 67, 69, 67, 64, 62])]
QUIET = (T['snore'] - .2, T['swell'] - .3)       # sleeping: just the pad
t = 0.0; bar = 0
while t < DUR - 1.0:
    root, fig = prog[(bar // 2) % 4]
    q = QUIET[0] < t < QUIET[1]
    if not q:
        for i in range(8):
            if i % 2 == 0 or bar % 2: add(music, bell(mid(fig[i]), 1.0, .17), t + i * B / 2, 1, -.4 + .8 * (i % 2))
        add(music, bass(mid(root - 12), B * 3.8, .3), t, 1, 0)
    if bar % 2 == 0: add(music, pad(mid(root), B * 8, .07), t, 1, 0)
    t += 4 * B; bar += 1
fade = np.ones(N); e0 = int((DUR - 2.2) * SR); fade[e0:] = np.linspace(1, 0, N - e0); music *= fade[:, None]

# ---------------------------------------------------------------- foley from the picture's events
def wind(d=3.0, v=1.0):
    x = t_(d); n = bp(noise(d), 300, 1400); return v * n * np.sin(np.pi * x / d) ** 2
def buzz(v=1.0): d = .5; x = t_(d); return v * np.sign(np.sin(2 * np.pi * 110 * x)) * .3 * env_exp(d, .18) * np.minimum(1, x * 80)
def pop(v=1.0): x = t_(.25); return v * np.sin(2 * np.pi * (300 + 500 * x / .25) * x) * np.exp(-x / .06)
def blip(v=1.0): x = t_(.14); return v * np.sin(2 * np.pi * 880 * x) * np.exp(-x / .05)
def snore(d=3.0, v=1.0):
    out = np.zeros(int(d * SR))
    for k in range(2):
        dd = 1.2; x = t_(dd); w = lp(noise(dd), 400) * np.sin(np.pi * x / dd) ** 2 * (1 + .5 * np.sin(2 * np.pi * 28 * x)); s = int(k * 1.5 * SR); out[s:s + len(w)] += w * v
    return out
def swell(d=1.6, v=1.0): x = t_(d); return v * pad(mid(57), d, 1, 1800) * (x / d) ** 2
for e in ev['ev']:
    k, at = e['type'], e['t']
    if k == 'whoosh': add(fx, sfx.whoosh(.3, .45), at - .15, .5, 0)
    elif k == 'wind': add(fx, wind(3.5, .5), at, .5, 0)
    elif k == 'thud': add(fx, sfx.thump(.9, 50), at, .9, 0)
    elif k == 'pop': add(fx, pop(1), at, .5, 0)
    elif k == 'ding': add(fx, sfx.ding(.6), at, .45, 0)
    elif k == 'buzz': add(fx, buzz(1), at, .5, 0)
    elif k == 'snore': add(fx, snore(3.0, .5), at, .5, 0)
    elif k == 'swell': add(fx, swell(1.4, .8), at - .2, .5, 0)
    elif k == 'blip': add(fx, blip(1), at, .4, .2)

venv = np.abs(vo[:, 0]); k = int(.25 * SR); venv = np.convolve(venv, np.ones(k) / k, 'same')
duck = 1 - .45 * np.clip(venv / (venv.max() * .25 + 1e-9), 0, 1)
mix = vo * 1.0 + music * .55 * duck[:, None] + fx * .6
mix = sfx.limit(mix / (np.abs(mix).max() + 1e-9) * .9, .95)
out = os.path.join(HERE, 'out', 'mix.wav')
import soundfile as sf; sf.write(out, mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('wrote', out)
