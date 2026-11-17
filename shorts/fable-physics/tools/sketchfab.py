"""Find and fetch free Sketchfab models (CC0 / CC BY only). Token: ~/.config/sketchfab/token (never commit it).
  sketchfab.py search "<query>" [--animated]     list candidates (uid, likes, faces, anims, license, name, author)
  sketchfab.py get <uid> <out_dir>               download the glTF zip, unzip, write CREDIT.txt"""
import sys, os, json, zipfile, io, urllib.request, urllib.parse
TOKEN = open(os.path.expanduser('~/.config/sketchfab/token')).read().strip()
API = 'https://api.sketchfab.com/v3'
def get(url, auth=False):
    h = {'Authorization': f'Token {TOKEN}'} if auth else {}
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60))
if sys.argv[1] == 'search':
    q = {'type': 'models', 'q': sys.argv[2], 'downloadable': 'true', 'sort_by': '-likeCount',
         'count': 24, 'max_face_count': 150000}
    if '--animated' in sys.argv: q['animated'] = 'true'
    for m in get(API + '/search?' + urllib.parse.urlencode(q))['results']:
        if (m.get('license') or {}).get('label') not in ('CC Attribution', 'CC0 Public Domain'): continue   # free for a monetized channel (no NonCommercial)
        print(m['uid'], m['likeCount'], m['faceCount'], m.get('animationCount', 0), m['license']['label'] if m.get('license') else '?',
              '|', m['name'][:50], '|', m['user']['username'])
elif sys.argv[1] == 'get':
    uid, out = sys.argv[2], sys.argv[3]; os.makedirs(out, exist_ok=True)
    m = get(f'{API}/models/{uid}')
    url = get(f'{API}/models/{uid}/download', auth=True)['gltf']['url']
    zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url, timeout=600).read())).extractall(out)
    open(os.path.join(out, 'CREDIT.txt'), 'w').write(
        f"\"{m['name']}\" by {m['user']['displayName']} ({m['user']['profileUrl']}), {m['license']['label']}, {m['viewerUrl']}\n")
    print('ok', out, open(os.path.join(out, 'CREDIT.txt')).read().strip())
