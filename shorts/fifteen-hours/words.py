"""Word timings for every voice line (ElevenLabs speech-to-text) -> voice/words.json {id: [word start times, s]}."""
import json, subprocess
out = {}
for l in json.load(open('script.json'))['lines']:
    r = subprocess.run(['curl', '-sS', 'https://api.elevenlabs.io/v1/speech-to-text', '-H', 'xi-api-key: x', '-F', 'model_id=scribe_v1',
                        '-F', 'timestamps_granularity=word', '-F', f"file=@voice/{l['id']}.wav"], capture_output=True, text=True, check=True)
    ws = [w for w in json.loads(r.stdout).get('words', []) if w.get('type') == 'word']
    out[l['id']] = [round(w['start'], 3) for w in ws]
    print(l['id'], [(w['text'], round(w['start'], 2)) for w in ws])
json.dump(out, open('voice/words.json', 'w'), indent=1)
