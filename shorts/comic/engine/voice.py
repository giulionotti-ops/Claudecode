"""Voice every line with ElevenLabs (one voice per character). Writes voice/<id>.wav (48 kHz mono, edges trimmed) + voice/dur.json.
The key is injected by the cloud proxy (xi-api-key)."""
import json, os, subprocess, urllib.request, sys
S = json.load(open('script.json')); os.makedirs('voice/raw', exist_ok=True)
MODEL = os.environ.get('EL_MODEL', 'eleven_v3')
probe = lambda f: float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True,check=True).stdout)
dur = {}
for l in S['lines']:
    if len(sys.argv) > 1 and l['id'] not in sys.argv[1:]: 
        if os.path.exists(f"voice/{l['id']}.wav"): dur[l['id']] = round(probe(f"voice/{l['id']}.wav"), 3)
        continue
    mp3 = f"voice/raw/{l['id']}.mp3"
    body = {'text': l['say'] if l.get('model', MODEL) == 'eleven_v3' else __import__('re').sub(r'\[[^]]*\]\s*', '', l['say']), 'model_id': l.get('model', MODEL), 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{S['voices'][l['who']]}", json.dumps(body).encode(),
                                 {'Content-Type': 'application/json', 'xi-api-key': 'proxy-injected'})
    open(mp3, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    fx = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
    pre = S.get('voice_fx', {}).get(l['who'])        # e.g. Orks: pitched down + grit
    if pre: fx = pre + ',' + fx
    subprocess.run(['ffmpeg','-y','-v','error','-i',mp3,'-af',fx,'-ar','48000','-ac','1',f"voice/{l['id']}.wav"], check=True)
    dur[l['id']] = round(probe(f"voice/{l['id']}.wav"), 3); print(l['id'], l['who'], dur[l['id']])
json.dump(dur, open('voice/dur.json','w'), indent=1)
