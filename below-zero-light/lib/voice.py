"""Voice a short with ElevenLabs and keep word timings for the captions.
Usage: python3 lib/voice.py <short-dir> [voice_id]
Writes voice/<id>.wav (48 kHz mono, edge silence trimmed), voice/words.json {id: [[word, start, end], ...]}, voice/dur.json.
The API key is added by the session's network proxy, so none is read here.
"""
import sys, os, json, base64, subprocess, urllib.request
P = os.path.abspath(sys.argv[1]); VOICE = sys.argv[2] if len(sys.argv) > 2 else 'jvcMcno3QtjOzGtfpjoI'   # David - British Documentary
lines = json.load(open(os.path.join(P, 'lines.json'))); V = os.path.join(P, 'voice'); os.makedirs(os.path.join(V, 'el'), exist_ok=True)
words, dur = {}, {}
for i, l in enumerate(lines):
    js = os.path.join(V, 'el', l['id'] + '.json')
    if not os.path.exists(js):
        body = {'text': l['text'], 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': .6, 'similarity_boost': .8, 'style': .15},
                'previous_text': lines[i - 1]['text'] if i else None, 'next_text': lines[i + 1]['text'] if i + 1 < len(lines) else None}
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps', json.dumps(body).encode(), {'Content-Type': 'application/json', 'xi-api-key': 'proxy-injected'})
        open(js, 'w').write(urllib.request.urlopen(req, timeout=180).read().decode())
    r = json.load(open(js)); mp3 = os.path.join(V, 'el', l['id'] + '.mp3'); open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
    al = r['alignment']; ch, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    # leading silence the trim removes, so word times stay in sync
    lead = next((st[k] for k, c in enumerate(ch) if c.strip()), 0)
    lead = max(0, lead - .03)
    wl, cur = [], None
    for c, a, b in zip(ch, st, en):
        if c.isspace():
            if cur: wl.append(cur); cur = None
        elif cur: cur[0] += c; cur[2] = b
        else: cur = [c, a, b]
    if cur: wl.append(cur)
    words[l['id']] = [[w, round(a - lead, 3), round(b - lead, 3)] for w, a, b in wl]
    out = os.path.join(V, l['id'] + '.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(lead), '-i', mp3, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '48000', '-ac', '1', out], check=True)
    dur[l['id']] = round(float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout), 3)
    print(l['id'], dur[l['id']], ' '.join(w for w, *_ in words[l['id']]))
json.dump(words, open(os.path.join(V, 'words.json'), 'w')); json.dump(dur, open(os.path.join(V, 'dur.json'), 'w'), indent=1)
