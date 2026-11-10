"""Score, foley and voice -> out/mix.wav. Run with the library's Python: $LIB/.venv/bin/python mix.py"""
import os, sys, json, subprocess
import numpy as np
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx
from sfx import SR, add, t_, env_exp, lp, hp, bp, noise, norm

HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int(DUR * SR) + SR
music = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros((N, 2))

# ---------------------------------------------------------------- voice
wav = os.path.join(HERE, 'out', 'voice48.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'voice', 'narration.mp3'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', wav], check=True)
v = np.fromfile(wav, dtype='<f4').astype(float)
v = hp(v, 90); v = sfx.compress(v, thr=.18, ratio=3.0)
add(vo, v, 0.0, 1.0, 0)

# ---------------------------------------------------------------- score: a curious marimba figure over a soft pulse, 112 bpm
BPM = 112; B = 60 / BPM
def marimba(f, d=.5, v=1.0):
    x = t_(d); e = np.exp(-x / .16) * np.minimum(1, x * 300)
    return v * e * (np.sin(2 * np.pi * f * x) + .35 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x / .03) + .2 * np.sin(2 * np.pi * f * 2 * x))
def bass(f, d, v=1.0):
    x = t_(d); e = np.minimum(1, x * 60) * np.exp(-x / (d * .7))
    return v * e * (np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x) + .2 * np.sin(6 * np.pi * f * x))
def pad(f, d, v=1.0):
    x = t_(d); e = np.minimum(1, x / .8) * np.minimum(1, (d - x) / .8)
    s = sum(np.sin(2 * np.pi * f * k * x + k) / k for k in range(1, 6))
    return v * e * lp(s, 1400)
def shaker(v=1.0): x = noise(.06); return v * hp(x, 6000) * env_exp(.06, .015)
def kick(v=1.0): x = t_(.25); return v * np.sin(2 * np.pi * (50 + 90 * np.exp(-x / .03)) * x) * np.exp(-x / .09)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
# A minor pentatonic-ish figure, changes every 2 bars
prog = [(57, [69, 72, 76, 74, 72, 69, 67, 69]), (53, [69, 72, 77, 76, 72, 69, 72, 74]), (55, [71, 74, 79, 76, 74, 71, 74, 76]), (52, [68, 71, 76, 74, 71, 68, 71, 72])]
jump = [e['t'] for e in ev['ev'] if e['type'] == 'whoosh']
HATCH = 29.88               # the jump: music comes back brighter
QUIET = (28.6, 29.88)       # a breath before the jump
t = 0.0; bar = 0
while t < DUR - 1.0:
    root, fig = prog[(bar // 2) % 4]
    for i in range(8):
        at = t + i * B / 2
        if QUIET[0] - .3 < at < HATCH: continue
        bright = 1.25 if at > HATCH else 1.0
        add(music, marimba(mid(fig[i] + (12 if at > HATCH and i % 2 else 0)), .5, .22 * bright), at, 1, -.3 + .6 * (i % 2))
        add(music, shaker(.05), at + B / 4, 1, .4)
    if not (QUIET[0] - .3 < t < HATCH):
        add(music, bass(mid(root - 12), B * 3.6, .32), t, 1, 0)
        add(music, kick(.35), t, 1, 0); add(music, kick(.25), t + 2 * B, 1, 0)
    if bar % 2 == 0: add(music, pad(mid(root), B * 8, .05), t, 1, 0)
    t += 4 * B; bar += 1
# low drone under the quiet section
add(music, pad(mid(45), QUIET[1] - QUIET[0] + 1.5, .06), QUIET[0] - .2, 1, 0)
# fade out over the last 2 s
fade = np.ones(N); e0 = int((DUR - 2.0) * SR); fade[e0:] = np.linspace(1, 0, N - e0); music *= fade[:, None]

# ---------------------------------------------------------------- foley from the picture's events
def crunch(v=1.0): x = noise(.5); return v * (bp(x, 800, 5000) * env_exp(.5, .06) + .6 * lp(noise(.5), 300) * env_exp(.5, .12))
def sizzle(d=2.0, v=1.0): x = noise(d); e = np.minimum(1, t_(d) / .3) * np.minimum(1, (d - t_(d)) / .5); return v * hp(x, 3000) * e * (.6 + .4 * np.sin(2 * np.pi * 7 * t_(d)))
def sniff(v=1.0): d = .7; x = noise(d); return v * bp(x, 1500, 4000) * np.sin(np.pi * t_(d) / d) ** 2 * .5
def flaps(n=6, v=1.0, gap=.22):
    out = np.zeros(int((n * gap + .4) * SR))
    for k in range(n): w = lp(noise(.18), 900) * env_exp(.18, .05); s = int(k * gap * SR); out[s:s + len(w)] += w * v
    return out
def dig(d=3.0, v=1.0):
    out = np.zeros(int(d * SR)); r = np.random.default_rng(3)
    for k in range(int(d / .14)):
        w = bp(noise(.08), 500, 2500) * env_exp(.08, .02); s = int((k * .14 + r.random() * .04) * SR); out[s:s + len(w)] += w * (.5 + .5 * r.random()) * v
    return out
def tap(v=1.0): x = noise(.05); return v * bp(x, 2000, 6000) * env_exp(.05, .01)
def air(v=1.0, up=True): d = .9; x = noise(d); f = np.linspace(0, 1, len(x)); return v * bp(x, 600, 2500) * np.sin(np.pi * f) ** 2 * .6

for e in ev['ev']:
    k, at = e['type'], e['t']
    if k == 'whoosh': add(fx, sfx.whoosh(.3, .45), at - .15, .5, 0)
    elif k == 'crunch': add(fx, crunch(1), at, .9, 0); add(fx, sfx.thump(.9, 60), at, .8, 0)
    elif k == 'sink': add(fx, sfx.thump(.6, 55), at, .6, 0); add(fx, dig(1.6, .3), at, .6, 0)
    elif k == 'pop': add(fx, sfx.pop(.7), at, .6, 0)
    elif k == 'sizzle': add(fx, sizzle(2.4, .5), at, .5, -.3)
    elif k == 'sniff': add(fx, sniff(.8), at, .6, .2); add(fx, sniff(.8), at + 1.4, .5, .1)
    elif k == 'ding': add(fx, sfx.ding(.6), at, .45, 0)
    elif k == 'tick':
        for i in range(10): add(fx, tap(.6), at + i * .08, .5, 0)
    elif k == 'airin': add(fx, air(.6), at, .5, -.4)
    elif k == 'airout': add(fx, air(.6), at, .5, .4)
    elif k == 'thud': add(fx, sfx.thump(.8, 45), at, .8, 0)
    elif k == 'burst': add(fx, crunch(1), at, 1.0, 0); add(fx, sfx.pop(1), at, .7, 0)
    elif k == 'flaps': add(fx, flaps(24, .7, .14), at, .7, 0)
    elif k == 'rumble': add(fx, sfx.rumble(3.0, .6), at, .6, 0)
    elif k == 'dig': add(fx, dig(3.0, .5), at, .6, 0)

# ---------------------------------------------------------------- balance: duck music under the voice
venv = np.abs(vo[:, 0]); k = int(.25 * SR); venv = np.convolve(venv, np.ones(k) / k, 'same')
duck = 1 - .45 * np.clip(venv / (venv.max() * .25 + 1e-9), 0, 1)
mix = vo * 1.0 + music * .55 * duck[:, None] + fx * .6
mix = sfx.limit(mix / (np.abs(mix).max() + 1e-9) * .9, .95)
out = os.path.join(HERE, 'out', 'mix.wav')
import soundfile as sf; sf.write(out, mix[:int(DUR * SR)], SR, subtype='PCM_24')
print('wrote', out)
