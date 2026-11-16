"""Voice the whole script with the local Kitten voice (VoiceStudio, free), then time each word.
Writes voice/narration.mp3 and voice/words.json ([{w, t0, t1}]). Word times come from local faster-whisper,
and the words themselves are taken from script.txt so captions match the script exactly."""
import json, os, re, subprocess, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'expr-voice-2-m'          # Kitten: the owner's pick for every short (fits the low-poly look)
SPEED = 1.05
out = os.path.join(HERE, 'voice'); os.makedirs(out, exist_ok=True)
text = open(os.path.join(HERE, 'script.txt')).read().strip()

body = json.dumps({'model': 'tts-1', 'voice': VOICE, 'input': text, 'speed': SPEED, 'response_format': 'wav'}).encode()
req = urllib.request.Request('http://127.0.0.1:3900/v1/audio/speech', body, {'Content-Type': 'application/json'})
wav = os.path.join(out, 'narration.wav')
open(wav, 'wb').write(urllib.request.urlopen(req, timeout=900).read())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ar', '44100', '-b:a', '192k',
                os.path.join(out, 'narration.mp3')], check=True)

import numpy as np
from faster_whisper import WhisperModel
pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                     capture_output=True, check=True).stdout     # raw audio: skips faster-whisper's PyAV decoder
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel('small.en', device='cpu', compute_type='int8').transcribe(
    audio, word_timestamps=True, language='en', condition_on_previous_text=False)
heard = [w for s in segs for w in s.words]

# Align script words to heard words; unmatched script words share the gap between matched neighbours.
import difflib
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
script = text.split()
times = [None] * len(script)
sm = difflib.SequenceMatcher(None, [norm(w) for w in script], [norm(w.word) for w in heard], autojunk=False)
for a, b, size in sm.get_matching_blocks():
    for k in range(size):
        times[a + k] = (heard[b + k].start, heard[b + k].end)
end = heard[-1].end if heard else 0.0
i = 0
while i < len(script):
    if times[i]: i += 1; continue
    j = i
    while j < len(script) and not times[j]: j += 1
    lo = times[i - 1][1] if i else 0.0
    hi = times[j][0] if j < len(script) else end
    step = max(hi - lo, 0) / (j - i)
    for k in range(i, j): times[k] = (lo + step * (k - i), lo + step * (k - i + 1))
    i = j
words = [{'w': w, 't0': round(t0, 3), 't1': round(t1, 3)} for w, (t0, t1) in zip(script, times)]
m = len(heard)
os.remove(wav)
json.dump(words, open(os.path.join(out, 'words.json'), 'w'), indent=0)
print(len(words), 'words (heard', m, '), ends at', words[-1]['t1'])
