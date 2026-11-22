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

# ---- score: grim storm. Low D drone, slow heartbeat drum, a cold minor pad every 4 bars
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
def pad(f, d, v=1.0, cut=900):
    x = t_(d); e = np.minimum(1, x / 1.2) * np.minimum(1, (d - x) / 1.2)
    s = sum(np.sin(2 * np.pi * f * k * x * (1 + .0015 * k) + k) / k for k in range(1, 6))
    return v * e * lp(s, cut)
def drone(d, v=1.0):
    x = t_(d); s = np.sin(2 * np.pi * mid(26) * x) + .6 * np.sin(2 * np.pi * mid(26) * 1.003 * x) + .35 * np.sin(2 * np.pi * mid(33) * x)
    return v * lp(s * (1 + .25 * np.sin(2 * np.pi * .13 * x)), 220)
def heart(v=1.0):
    d = .5; x = t_(d); s = np.sin(2 * np.pi * (58 - 20 * x / d) * x) * np.exp(-x / .12) * np.minimum(1, x * 400); return v * s
add(music, drone(DUR, .35), 0, 1, 0)
B = 60 / 62; t = 1.0; bar = 0
while t < DUR - 1.5:
    add(music, heart(.8), t, 1, 0); add(music, heart(.5), t + .28, 1, 0)   # lub-dub
    if bar % 4 == 0:
        for m, pan in ((50, -.3), (53, .3), (57, 0)): add(music, pad(mid(m), B * 8, .06, 700), t, 1, pan)   # D minor, dark
    t += 2 * B; bar += 1
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
def thunder(v=1.0):
    d = 4.0; x = t_(d); crack = hp(noise(d), 1500) * np.exp(-x / .08)
    roll = lp(noise(d), 160) * np.exp(-x / 1.4) * (1 + .6 * np.sin(2 * np.pi * 3.1 * x)) * np.minimum(1, x * 8)
    return v * (crack * .6 + roll * 3.0)
def rainbed(d, v=1.0):
    n = bp(noise(d), 900, 6000) * .5 + lp(noise(d), 500) * .4; return v * n
def clang(v=1.0):
    d = .9; x = t_(d); return v * sum(np.sin(2 * np.pi * f * x) * np.exp(-x / (.25 / k)) for k, f in enumerate((640, 1530, 2470), 1)) * np.minimum(1, x * 900)
def tick(v=1.0):
    out = np.zeros(int(3.5 * SR))
    for k in range(12): x = t_(.05); s = int(k * .3 * SR); out[s:s + len(x)] += v * np.sin(2 * np.pi * 2200 * x) * np.exp(-x / .01)
    return out
add(fx, rainbed(DUR, .35), 0, 1, 0)   # rain the whole way
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
    elif k == 'thunder': add(fx, thunder(1), at + .25, .9, -.2)
    elif k == 'clang': add(fx, clang(1), at, .6, 0)
    elif k == 'tick': add(fx, tick(.8), at, .5, .2)
    elif k == 'blip': add(fx, blip(1), at, .4, .2)

venv = np.abs(vo[:, 0]); k = int(.25 * SR); venv = np.convolve(venv, np.ones(k) / k, 'same')
duck = 1 - .6 * np.clip(venv / (venv.max() * .25 + 1e-9), 0, 1)
mix = vo * 1.0 + music * .3 * duck[:, None] + fx * .6
mix = sfx.limit(mix / (np.abs(mix).max() + 1e-9) * .9, .95)
out = os.path.join(HERE, 'out', 'mix.wav')
import soundfile as sf; sf.write(out, mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('wrote', out)
