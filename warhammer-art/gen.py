"""Generate one image with Gemini through the OpenAI-compatible endpoint (the session proxy adds the key).
Usage: python3 gen.py <out.png> <model> "<prompt>" """
import sys, json, base64, urllib.request
out, model, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
U = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
body = {"model": model, "messages": [{"role": "user", "content": prompt}], "modalities": ["image", "text"]}
req = urllib.request.Request(U, json.dumps(body).encode(), {'Content-Type': 'application/json', 'Authorization': 'Bearer proxy-injected'})
try: r = json.loads(urllib.request.urlopen(req, timeout=180).read())
except urllib.error.HTTPError as e: print('HTTP', e.code, e.read().decode()[:600]); sys.exit(1)
msg = r['choices'][0]['message']; imgs = msg.get('images') or []
blob = json.dumps(msg)
import re
m = re.search(r'data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)', blob)
if not m: print('no image; message keys:', list(msg.keys()), blob[:500]); sys.exit(1)
open(out, 'wb').write(base64.b64decode(m.group(1))); print('saved', out)
