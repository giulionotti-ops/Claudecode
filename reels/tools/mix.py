"""Score + sound effects + voice → final reel.
Usage: python3 tools/mix.py <episode>
Needs build/video.mp4 (render.mjs), build/sfx.json, build/voice.wav (voice.py).
Writes episodes/<ep>/out/<ep>.mp4 at about -14 LUFS (Instagram level). Music is synthesised here, so it is royalty-free.
"""
import sys, os, json, subprocess, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]; E = os.path.join(ROOT, 'episodes', ep); B = os.path.join(E, 'build'); O = os.path.join(E, 'out'); os.makedirs(O, exist_ok=True)
S = json.load(open(os.path.join(E, 'script.json'))); SR = 48000
info = json.load(open(os.path.join(B, 'sfx.json'))); DUR = info['duration']; N = int(DUR * SR) + SR
rng = np.random.default_rng(int(S.get('seed', 5)))
t_all = np.arange(N) / SR

def read_wav(p):
    with wave.open(p) as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return a
def env(n, a=.005, r=.2):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / r)
def place(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * g

# ---------------- music: bouncy 4-chord loop ----------------
bpm = S.get('bpm', 104); beat = 60 / bpm; bar = beat * 4
mtr = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = S.get('chords', [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]])  # C G Am F
music = np.zeros(N, np.float32)
nb = int(DUR / bar) + 2
def tone(f, n, kind='tri'):
    t = np.arange(n) / SR; ph = (t * f) % 1
    if kind == 'tri': return (4 * np.abs(ph - .5) - 1)
    if kind == 'sq': return np.sign(np.sin(2 * np.pi * f * t)) * .6
    return np.sin(2 * np.pi * f * t)
for b in range(nb):
    ch = prog[b % len(prog)]; t0 = b * bar
    for k in range(8):  # plucked chord stabs on 8ths
        n = int(beat / 2 * SR); x = sum(tone(mtr(m), n, 'tri') for m in ch) / 3 * env(n, .003, .12)
        place(music, x, t0 + k * beat / 2, .16 if k % 2 == 0 else .09)
    for k in range(4):  # bass
        n = int(beat * SR); x = tone(mtr(ch[0] - 24), n, 'sin') * env(n, .005, .35) + tone(mtr(ch[0] - 12), n, 'tri') * env(n, .002, .08) * .3
        place(music, x, t0 + k * beat, .45)
    arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
    for k in range(8):  # little lead arpeggio on even bars
        if b % 2: break
        n = int(beat / 2 * SR); place(music, tone(mtr(arp[k % 4]), n, 'sq') * env(n, .002, .09), t0 + k * beat / 2, .035)
    for k in range(4):  # drums
        n = int(.35 * SR); tt = np.arange(n) / SR
        kick = np.sin(2 * np.pi * (50 + 110 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
        place(music, kick, t0 + k * beat, .55)
        if k % 2:
            n2 = int(.2 * SR); clap = rng.standard_normal(n2) * env(n2, .001, .05); place(music, np.convolve(clap, [1, -.9], 'same'), t0 + k * beat, .22)
        for h in range(2):
            n3 = int(.05 * SR); hat = np.diff(rng.standard_normal(n3 + 1)) * env(n3, .001, .015); place(music, hat, t0 + k * beat + h * beat / 2, .07)
music[:int(.02 * SR)] *= 0
# soft intro/outro
music *= np.clip(t_all / .4, 0, 1) * np.clip((DUR - t_all) / 1.0, 0, 1)

# ---------------- sound effects ----------------
fx = np.zeros(N, np.float32)
def sfx(kind, d=1.0):
    if kind == 'pop':
        n = int(.12 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (500 + 900 * tt / .12) * tt) * env(n, .002, .04) * .8
    if kind == 'down':
        n = int(.25 * SR); tt = np.arange(n) / SR; return tone(1, 1) * 0 if n == 0 else np.sign(np.sin(2 * np.pi * (600 - 1200 * tt) * tt)) * env(n, .002, .1) * .25
    if kind == 'whoosh':
        n = int(.3 * SR); x = rng.standard_normal(n); x = np.convolve(x, np.ones(30) / 30, 'same'); tt = np.arange(n) / SR; return x * np.sin(np.pi * tt / .3) ** 2 * .9
    if kind == 'ding':
        n = int(.8 * SR); return (tone(1568, n, 'sin') + .5 * tone(2349, n, 'sin')) * env(n, .002, .25) * .3
    if kind == 'coin':
        n1, n2 = int(.08 * SR), int(.5 * SR); return np.concatenate([tone(988, n1, 'sq') * .2, tone(1319, n2, 'sq') * env(n2, .001, .15) * .2])
    if kind == 'click':
        n = int(.03 * SR); return rng.standard_normal(n) * env(n, .0005, .006) * .6
    if kind == 'flip':
        n = int(.18 * SR); x = rng.standard_normal(n); return np.convolve(x, np.ones(8) / 8, 'same') * env(n, .01, .05) * .7
    if kind == 'rise':
        n = int(1.2 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (200 * tt + 500 * tt ** 2)) * (tt / 1.2) * np.exp(-(tt - 1.2) ** 2 * 0) * .12
    if kind == 'type':
        out = np.zeros(int(d * SR) + 2000)
        for k in range(int(d / .09)): place(out, sfx('click'), k * .09 + rng.uniform(0, .02), .7)
        return out
    return np.zeros(1)
for e in info['sfx']:
    if e.get('t') is None or e['t'] > 1e8: continue
    place(fx, sfx(e['kind'], e.get('dur', 1.0)), e['t'], 1.0)

# ---------------- voice + ducking ----------------
v = read_wav(os.path.join(B, 'voice.wav')); voice = np.zeros(N, np.float32); place(voice, v, S.get('voice_offset', 0))
e_ = np.abs(voice); k = int(.25 * SR); sm = np.convolve(e_, np.ones(k) / k, 'same'); duck = 1 - .6 * np.clip(sm / (sm.max() * .25 + 1e-9), 0, 1)
mv = S.get('music', 1.0)
mixd = voice * 1.0 + music * mv * duck * .55 + fx * .5
mixd = mixd[:int(DUR * SR)]
mixd /= max(1e-9, np.abs(mixd).max()) / .9
wav = os.path.join(B, 'mix.wav')
with wave.open(wav, 'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mixd, -1, 1) * 32767).astype(np.int16).tobytes())
out = os.path.join(O, f'{ep}.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(B, 'video.mp4'), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
print('reel:', out)
