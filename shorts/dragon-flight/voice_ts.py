"""Voice the whole script in one ElevenLabs take, with character timings.
Writes voice/narration.mp3 and voice/words.json ([{w, t0, t1}]). The key is added by the session's proxy."""
import json, base64, os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'TX3LPaxmHKxFdv7VOQHJ'   # Liam - Energetic, Social Media Creator
text = open(os.path.join(HERE, 'script.txt')).read().strip()
body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2',
                   'voice_settings': {'stability': .5, 'similarity_boost': .8, 'style': .3, 'speed': 1.05}}).encode()
req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps', body,
                             {'Content-Type': 'application/json', 'xi-api-key': 'proxy-injected'})
r = json.load(urllib.request.urlopen(req, timeout=300))
open(os.path.join(HERE, 'voice', 'narration.mp3'), 'wb').write(base64.b64decode(r['audio_base64']))
a = r['alignment']; ch, s, e = a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']
words, cur, t0 = [], '', None
for c, cs, ce in zip(ch, s, e):
    if c.isspace():
        if cur: words.append({'w': cur, 't0': round(t0, 3), 't1': round(last, 3)}); cur = ''
        continue
    if not cur: t0 = cs
    cur += c; last = ce
if cur: words.append({'w': cur, 't0': round(t0, 3), 't1': round(last, 3)})
json.dump(words, open(os.path.join(HERE, 'voice', 'words.json'), 'w'), indent=0)
print(len(words), 'words, ends at', words[-1]['t1'])
