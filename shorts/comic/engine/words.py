"""Word timings for every voice line (ElevenLabs speech-to-text) -> voice/words.json {id: [word start times, s]}."""
import os, json, subprocess
out = {}
for l in json.load(open('script.json'))['lines']:
    r = subprocess.run(['curl', '-sS', 'https://api.elevenlabs.io/v1/speech-to-text', '-H', 'xi-api-key: ' + os.environ.get('ELEVENLABS_API_KEY', 'x'), '-F', 'model_id=scribe_v1',
                        '-F', 'timestamps_granularity=word', '-F', f"file=@voice/{l['id']}.wav"], capture_output=True, text=True, check=True)
    ws = [w for w in json.loads(r.stdout).get('words', []) if w.get('type') == 'word']
    lead = ws[0]['start'] - 0.06 if ws and ws[0]['start'] > 0.35 else 0   # cut a long silent/breathy lead-in
    if lead:
        f = f"voice/{l['id']}.wav"
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(lead), '-i', f, '-c:a', 'pcm_s16le', f + '.tmp.wav'], check=True)
        import os; os.replace(f + '.tmp.wav', f)
        d = json.load(open('voice/dur.json')); d[l['id']] = round(d[l['id']] - lead, 3); json.dump(d, open('voice/dur.json', 'w'), indent=1)
    out[l['id']] = [round(w['start'] - lead, 3) for w in ws]
    print(l['id'], [(w['text'], round(w['start'], 2)) for w in ws])
json.dump(out, open('voice/words.json', 'w'), indent=1)
