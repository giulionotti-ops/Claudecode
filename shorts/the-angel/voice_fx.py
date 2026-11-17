"""Voice 1 treatment: Kokoro bm_lewis (voice/raw) -> rubberband pitch .89, tempo .94 -> bass +4 dB, treble -2 dB -> voice/<id>.wav.
The cathedral reverb is added in mix.py. Run: LIB=<library> $LIB/.venv/bin/python voice_fx.py"""
import os, json, subprocess, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__)); RAW = os.path.join(D, 'voice', 'raw'); OUT = os.path.join(D, 'voice')
dur = {}
for l in json.load(open(os.path.join(D, 'lines.json'))):
    o = os.path.join(OUT, l['id'] + '.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(RAW, l['id'] + '.wav'), '-af',
                    'rubberband=pitch=0.89:tempo=0.94:formant=preserved,bass=g=4:f=120,treble=g=-2', '-ar', '24000', o], check=True)
    a, sr = sf.read(o); dur[l['id']] = round(len(a) / sr, 3)
json.dump(dur, open(os.path.join(OUT, 'dur.json'), 'w'), indent=1); print(dur)
