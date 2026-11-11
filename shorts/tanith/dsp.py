"""Small DSP helpers for score.py and mix.py (numpy + scipy only)."""
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
from scipy.ndimage import maximum_filter1d, uniform_filter1d
SR = 48000
_rng = np.random.default_rng(7)
def t_(d): return np.arange(int(round(d * SR))) / SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(d): return _rng.standard_normal(int(round(d * SR)))
def brown(d):
    w = np.cumsum(noise(d)); w -= np.linspace(w[0], w[-1], len(w)); w = hp(w, 20); m = np.abs(w).max(); return w / m if m else w
def compress(x, thr=.25, ratio=3.5, att=.004, rel=.08):
    # one-pole envelope follower (release-time smoothing on the rectified signal, held up by a short peak window)
    pk = maximum_filter1d(np.abs(x), size=max(1, int(att * SR)))
    a = np.exp(-1 / (rel * SR)); env = lfilter([1 - a], [1, -a], pk); env = np.maximum(env, pk * .7)
    g = np.where(env > thr, (thr + (env - thr) / ratio) / np.maximum(env, 1e-9), 1.0); return x * g
def limit(x, ceil=.9, look=.005):
    n = int(look * SR); m = maximum_filter1d(np.abs(x), size=2 * n + 1); g = np.minimum(1, ceil / np.maximum(m, 1e-9)); return x * uniform_filter1d(g, size=n)
def add(buf, x, at, gain=1.0, pan=0.0):
    s = int(at * SR)
    if s >= len(buf) or s + len(x) <= 0: return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[s:e, 0] += x[:e - s] * gain * l * 1.414; buf[s:e, 1] += x[:e - s] * gain * r * 1.414
