"""Upload a short to YouTube as a scheduled video (private until the publish time, then public).
Needs ~/.config/glazier/youtube_token.json from yt_auth.py.

  python3 shorts/yt_upload.py --check
  python3 shorts/yt_upload.py <file.mp4> --title "..." --desc "..." --at "2026-11-11 15:30" [--srt file.srt] [--tags a,b]

--at is Italy time (Europe/Rome). Marks the video as altered/synthetic content (AI voice) and not made for kids.
Prints the video id and URL. The pinned comment still has to be added by hand (the API can't pin).
"""
import argparse, json, os, sys, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

TOKEN = os.path.expanduser('~/.config/glazier/youtube_token.json')
API = 'https://www.googleapis.com'

def access_token():
    if not os.path.exists(TOKEN):
        sys.exit(f'Missing {TOKEN}: the owner must run python3 shorts/yt_auth.py once.')
    t = json.load(open(TOKEN))
    body = urllib.parse.urlencode({'refresh_token': t['refresh_token'], 'client_id': t['client_id'],
                                   'client_secret': t['client_secret'], 'grant_type': 'refresh_token'}).encode()
    try:
        return json.load(urllib.request.urlopen(f'https://oauth2.googleapis.com/token', body))['access_token']
    except urllib.error.HTTPError as e:
        sys.exit(f'Token refresh failed ({e.code}): {e.read().decode()[:300]}\nThe owner must run yt_auth.py again.')

def call(req):
    try:
        return urllib.request.urlopen(req, timeout=600)
    except urllib.error.HTTPError as e:
        sys.exit(f'YouTube API error {e.code}: {e.read().decode()[:800]}')

p = argparse.ArgumentParser()
p.add_argument('mp4', nargs='?'); p.add_argument('--title'); p.add_argument('--desc', default='')
p.add_argument('--at', help='publish time, Italy time: "YYYY-MM-DD HH:MM"'); p.add_argument('--srt')
p.add_argument('--tags', default='warhammer40k,warhammer,40k lore,shorts'); p.add_argument('--category', default='20')
p.add_argument('--check', action='store_true')
a = p.parse_args()
H = {'Authorization': 'Bearer ' + access_token()}

if a.check:
    r = json.load(call(urllib.request.Request(f'{API}/youtube/v3/channels?part=snippet&mine=true', headers=H)))
    print('OK, channel:', ', '.join(i['snippet']['title'] for i in r.get('items', [])) or '(none found)'); sys.exit()

if not (a.mp4 and a.title and a.at):
    p.error('mp4, --title and --at are required')
when = datetime.strptime(a.at, '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo('Europe/Rome'))
if when <= datetime.now(timezone.utc):
    sys.exit(f'{a.at} Rome is already past; pick a later slot.')
meta = {'snippet': {'title': a.title[:100], 'description': a.desc[:5000], 'categoryId': a.category,
                    'tags': [t.strip() for t in a.tags.split(',') if t.strip()], 'defaultLanguage': 'en', 'defaultAudioLanguage': 'en'},
        'status': {'privacyStatus': 'private', 'publishAt': when.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                   'selfDeclaredMadeForKids': False, 'containsSyntheticMedia': True, 'embeddable': True}}

size = os.path.getsize(a.mp4)
init = urllib.request.Request(f'{API}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
                              json.dumps(meta).encode(), {**H, 'Content-Type': 'application/json; charset=UTF-8',
                              'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': str(size)})
loc = call(init).headers['Location']
with open(a.mp4, 'rb') as f:
    put = urllib.request.Request(loc, f.read(), {**H, 'Content-Type': 'video/mp4'}, method='PUT')
v = json.load(call(put))
vid = v['id']
print(f'uploaded {vid}  https://youtube.com/shorts/{vid}  publishes {a.at} Rome  (status: {v["status"].get("privacyStatus")}, publishAt {v["status"].get("publishAt")})')

if a.srt:
    boundary = 'glazierBoundary7'
    cap = json.dumps({'snippet': {'videoId': vid, 'language': 'en', 'name': 'English'}})
    body = (f'--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{cap}\r\n'
            f'--{boundary}\r\nContent-Type: application/octet-stream\r\n\r\n').encode() + open(a.srt, 'rb').read() + f'\r\n--{boundary}--\r\n'.encode()
    call(urllib.request.Request(f'{API}/upload/youtube/v3/captions?uploadType=multipart&part=snippet', body,
                                {**H, 'Content-Type': f'multipart/related; boundary={boundary}'}))
    print('captions added')
