"""Voice a short with ElevenLabs at the voice's natural speed (retime.py then fits the film to the new lengths).
Usage: python3 voice_el.py <project-dir> [voice_id]
Reads <project>/lines.json; writes voice/el/<id>.mp3, voice/<id>.wav (24 kHz) and a new dur.json.
API key: $ELEVENLABS_API_KEY, else ~/.config/glazier/elevenlabs.key (one line), else the cloud proxy adds it.
"""
import sys, os, json, subprocess, urllib.request
P = os.path.abspath(sys.argv[1]); VOICE = sys.argv[2] if len(sys.argv) > 2 else 'jtE6dbPUTt2kchN89Uej'   # James - Deep, Raspy and Grim
lines = json.load(open(os.path.join(P, 'lines.json')))
os.makedirs(os.path.join(P, 'voice', 'el'), exist_ok=True)
probe = lambda f: float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True, check=True).stdout)
KF = os.path.expanduser('~/.config/glazier/elevenlabs.key')
KEY = os.environ.get('ELEVENLABS_API_KEY') or (open(KF).read().strip() if os.path.exists(KF) else 'proxy-injected')
dur = {}
for l in lines:
    mp3 = os.path.join(P, 'voice', 'el', l['id'] + '.mp3')
    if not os.path.exists(mp3):
        body = json.dumps({'text': l['text'], 'model_id': 'eleven_multilingual_v2', 'voice_settings': {'stability': .55, 'similarity_boost': .8, 'style': .25}}).encode()
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}', body, {'Content-Type': 'application/json', 'xi-api-key': KEY})
        open(mp3, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    # trim edge silence
    tmp = mp3[:-4] + '.trim.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '24000', '-ac', '1', tmp], check=True)
    out = os.path.join(P, 'voice', l['id'] + '.wav'); os.replace(tmp, out)
    dur[l['id']] = round(probe(out), 3); print(l['id'], dur[l['id']])
json.dump(dur, open(os.path.join(P, 'voice', 'dur.json'), 'w'), indent=1)
