"""Sound effects + music bed with ElevenLabs (sound-generation and music). Writes sfx/<name>.mp3."""
import json, os, sys, urllib.request
SFX = {
 'boom':     ('Huge cartoon artillery explosion, deep boom with debris falling, punchy', 2.5),
 'tick':     ('Old mechanical wristwatch ticking loudly, four ticks', 2.0),
 'puff':     ('Man exhales a long puff of cigar smoke, slow breath', 1.5),
 'stomp':    ('Heavy monster footsteps charging fast on dirt, ground shaking thuds', 2.0),
 'click':    ('Heavy pistol hammer being cocked, sharp metallic click', 1.0),
 'page':     ('Comic book page turning quickly, paper whoosh', 1.0),
 'lasers':   ('Rapid retro sci-fi laser rifle shots, many pew pew blasts fired wildly', 2.5),
 'thud':     ('Giant body falling flat onto dirt, heavy thud with a cartoon bonk', 1.5),
 'clink':    ('Shiny metal medal pinned on a coat, bright clink and sparkle', 1.0),
 'whistle':  ('Falling artillery shell whistling down, descending cartoon whistle', 2.5),
 'whoosh':   ('Quick soft camera whoosh swipe transition', 0.6),
 'gulp':     ('Cartoon nervous gulp swallow sound', 0.8),
}
os.makedirs('sfx', exist_ok=True)
def post(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json', 'xi-api-key': os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')})
    return urllib.request.urlopen(req, timeout=300).read()
for name, (text, d) in SFX.items():
    p = f'sfx/{name}.mp3'
    if os.path.exists(p): continue
    open(p, 'wb').write(post('https://api.elevenlabs.io/v1/sound-generation', {'text': text, 'duration_seconds': d, 'prompt_influence': 0.5})); print(p)
if not os.path.exists('sfx/music.mp3'):
    try:
        open('sfx/music.mp3', 'wb').write(post('https://api.elevenlabs.io/v1/music', {
            'prompt': 'Comedic military march, snare drum rolls, pompous tuba and brass, playful pizzicato, cartoon war comedy, instrumental, no vocals, steady 110 bpm',
            'music_length_ms': 45000})); print('sfx/music.mp3')
    except urllib.error.HTTPError as e:
        print('music failed', e.code, e.read()[:300])
