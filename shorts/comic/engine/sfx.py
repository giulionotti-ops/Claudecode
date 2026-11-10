"""Sound effects + music bed with ElevenLabs (sound-generation and music). Writes sfx/<name>.mp3."""
import json, os, sys, urllib.request
S = json.load(open('script.json')); SFX = S['sfx']; MUSIC = S['music']
os.makedirs('sfx', exist_ok=True)
def post(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json', 'xi-api-key': 'proxy-injected'})
    return urllib.request.urlopen(req, timeout=300).read()
for name, (text, d) in SFX.items():
    p = f'sfx/{name}.mp3'
    if os.path.exists(p): continue
    open(p, 'wb').write(post('https://api.elevenlabs.io/v1/sound-generation', {'text': text, 'duration_seconds': d, 'prompt_influence': 0.5})); print(p)
if not os.path.exists('sfx/music.mp3'):
    try:
        open('sfx/music.mp3', 'wb').write(post('https://api.elevenlabs.io/v1/music', {
            'prompt': MUSIC, 'music_length_ms': 50000})); print('sfx/music.mp3')
    except urllib.error.HTTPError as e:
        print('music failed', e.code, e.read()[:300])
