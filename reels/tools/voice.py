"""Voice an episode with ElevenLabs and save word timings for the captions.
Usage: python3 tools/voice.py <episode> [--force]
Reads episodes/<ep>/script.json (lines[].text, optional lines[].say = how to pronounce it, "voice", "voice_settings").
Writes episodes/<ep>/build/voice.wav and build/timeline.json {duration, words:[{w,s,e,line}], lines:[{s,e}]}.
The API key is injected by the session's network proxy; locally set ELEVENLABS_API_KEY.
"""
import sys, os, json, base64, subprocess, urllib.request, re, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = next(a for a in sys.argv[1:] if not a.startswith('--'))
E = os.path.join(ROOT, 'episodes', ep); B = os.path.join(E, 'build'); os.makedirs(B, exist_ok=True)
S = json.load(open(os.path.join(E, 'script.json')))
brand = json.load(open(os.path.join(ROOT, 'brand.json')))
VOICE = S.get('voice') or brand.get('voice') or 't3hJ92dgZhDVtsff084B'
settings = {'stability': .4, 'similarity_boost': .8, 'style': .35, 'use_speaker_boost': True, 'speed': 1.08, **brand.get('voice_settings', {}), **S.get('voice_settings', {})}
lines = S['lines']
spoken = [l.get('say', l['text']) for l in lines]
text = ' '.join(spoken)
key = hashlib.sha1(json.dumps([VOICE, settings, text]).encode()).hexdigest()[:12]
raw = os.path.join(B, f'tts-{key}.json')
if not os.path.exists(raw) or '--force' in sys.argv:
    body = json.dumps({'text': text, 'model_id': S.get('model', 'eleven_multilingual_v2'), 'language_code': 'it', 'voice_settings': settings}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128', body,
                                 {'Content-Type': 'application/json', 'xi-api-key': os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected')})
    try: data = urllib.request.urlopen(req, timeout=300).read()
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:500]
        if 'language_code' in msg:  # older models reject language_code
            body = json.dumps({'text': text, 'model_id': S.get('model', 'eleven_multilingual_v2'), 'voice_settings': settings}).encode()
            data = urllib.request.urlopen(urllib.request.Request(req.full_url, body, dict(req.header_items())), timeout=300).read()
        else: sys.exit(f'ElevenLabs error {e.code}: {msg}')
    open(raw, 'wb').write(data)
R = json.load(open(raw)); al = R['alignment']
chars, cs, ce = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
assert ''.join(chars) == text, 'alignment text mismatch'
mp3 = os.path.join(B, 'voice.mp3'); open(mp3, 'wb').write(base64.b64decode(R['audio_base64']))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', '48000', '-ac', '1', os.path.join(B, 'voice.wav')], check=True)

words, L, off = [], [], 0
for li, (l, sp) in enumerate(zip(lines, spoken)):
    toks = [(m.start() + off, m.end() + off) for m in re.finditer(r'\S+', sp)]
    sw = [(cs[a], ce[b - 1]) for a, b in toks]
    cap = l['text'].split()
    if len(cap) == len(sw): tw = sw
    else:  # caption differs from what is said: spread caption words over the line's time by length
        s0, s1 = sw[0][0], sw[-1][1]; tot = sum(len(w) + 1 for w in cap); acc = 0; tw = []
        for w in cap: a = s0 + (s1 - s0) * acc / tot; acc += len(w) + 1; tw.append((a, s0 + (s1 - s0) * acc / tot))
    for w, (a, b) in zip(cap, tw): words.append({'w': w, 's': round(a, 3), 'e': round(b, 3), 'line': li})
    L.append({'s': round(tw[0][0], 3), 'e': round(tw[-1][1], 3)})
    off += len(sp) + 1
vdur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(B, 'voice.wav')], capture_output=True, text=True).stdout)
dur = round(max(vdur, L[-1]['e']) + S.get('tail', 2.5), 2)
json.dump({'duration': dur, 'voice_duration': round(vdur, 3), 'words': words, 'lines': L}, open(os.path.join(B, 'timeline.json'), 'w'), indent=1, ensure_ascii=False)
print(f'voice {vdur:.1f}s, film {dur:.1f}s, {len(words)} words → {B}/timeline.json')
