"""Grim narrator samples: Kokoro voice -> rubberband pitch/tempo -> EQ/grit -> stone-hall reverb. Writes <name>.mp3."""
import sys, os, subprocess, numpy as np, soundfile as sf
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
from scipy.signal import fftconvolve, butter, sosfilt
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(D, 'raw'); SR = 24000
rng = np.random.default_rng(3)
lp = lambda x, f: sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def ir(d, damp):
    n = int(d * SR); e = np.exp(-np.arange(n) / SR / (d / 6.9)); x = lp(rng.standard_normal(n), damp) * e; x[0] = 1; return x / np.abs(x).sum() * 4
def fx(path, pitch, tempo, flt):
    out = path + '.fx.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-af', f'rubberband=pitch={pitch}:tempo={tempo}:formant=preserved,{flt}', '-ar', str(SR), out], check=True)
    a, _ = sf.read(out); os.remove(out); return a
SAMPLES = {   # name: (voice, pitch ratio, tempo, ffmpeg EQ, reverb seconds, damp, wet, grit)
    '1-lewis-deep-british':   ('bm_lewis', .89, .94, 'bass=g=4:f=120,treble=g=-2', 3.2, 2400, .28, 0),
    '2-onyx-deep-american':   ('am_onyx', .87, .93, 'bass=g=4:f=110,treble=g=-2', 3.2, 2400, .28, 0),
    '3-george-grim-british':  ('bm_george', .84, .92, 'bass=g=5:f=110,treble=g=-3', 3.6, 2000, .32, 0),
    '4-fenrir-harsh-american':('am_fenrir', .86, .93, 'bass=g=4:f=120', 3.0, 2600, .26, 0),
    '5-george-vox-caster':    ('bm_george', .86, .93, 'highpass=f=260,lowpass=f=3600,bass=g=3:f=400', 1.2, 4000, .18, 1),
}
for name, (v, p, tm, eq, rd, damp, wet, grit) in SAMPLES.items():
    parts = [fx(os.path.join(R, f'{v}_{i}.wav'), p, tm, eq) for i in (0, 1)]
    a = np.concatenate([np.zeros(int(.4 * SR)), parts[0], np.zeros(int(1.1 * SR)), parts[1], np.zeros(int(2.2 * SR))])
    if grit: a = np.tanh(a / np.abs(a).max() * 3.2) * .5 + bp(rng.standard_normal(len(a)), 2000, 6000) * .004   # radio saturation + faint hiss
    y = fftconvolve(a, ir(rd, damp))[:len(a)]
    out = a * (1 - wet) + y * wet; out = out / np.abs(out).max() * .89
    w = os.path.join(D, name + '.wav'); sf.write(w, out, SR)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', w, '-b:a', '160k', os.path.join(D, name + '.mp3')], check=True); os.remove(w)
    print(name, round(len(out) / SR, 1), 's')
