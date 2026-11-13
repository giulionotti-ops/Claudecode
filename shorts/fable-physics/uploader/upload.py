"""Fable Physics uploader: posts the channel's shorts to YouTube, two a day (13:30 and 21:30 Rome time).

  python3 upload.py auth-url               step 1 of signing in: prints a Google link (sign in with the Fable Physics channel)
  python3 upload.py auth-finish '<url>'    step 2: paste the address the browser lands on (http://localhost:8765/?...)
  python3 upload.py check                  show the signed-in channel
  python3 upload.py auto [--dry-run]       upload every short in queue.json not yet uploaded, each into the next free slot
  python3 upload.py list                   show the queue and what is uploaded or scheduled
  python3 upload.py mark <name> <id>       record a short as already posted (by hand: use id "manual")
  python3 upload.py approve <name>...      allow queued shorts to be posted (entries with "approved": false wait for this)
  python3 upload.py reject <name>          take a short out of the queue (kept in rejected.json)
  python3 upload.py pending                list shorts waiting for approval

queue.json lists the shorts in posting order; video and caption paths are relative to the shorts/ folder.
Videos go up private with publishAt, so YouTube publishes them at the slot. Until Google audits the API project,
YouTube keeps API uploads private even after that time.
client_secret.json, token.json, auth-state.json and uploaded.json stay on this server (git-ignored).
"""
import sys, os, json, time, datetime
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__)); SHORTS = os.path.abspath(os.path.join(HERE, '..', '..'))
SECRET, TOKEN, STATE, QUEUE, LOG = (os.path.join(HERE, f) for f in ('client_secret.json', 'token.json', 'auth-state.json', 'queue.json', 'uploaded.json'))
SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly']
TZ = ZoneInfo('Europe/Rome'); SLOTS = ['13:30', '21:30']; LEAD = datetime.timedelta(minutes=90)   # never schedule sooner than this
REDIRECT = 'http://localhost:8765/'


def load(p, default): return json.load(open(p)) if os.path.exists(p) else default
def save(p, data): json.dump(data, open(p, 'w'), indent=1)


# ---------------------------------------------------------------- sign-in (two steps, so it works from a chat on a headless server)
def flow():
    from google_auth_oauthlib.flow import Flow
    if not os.path.exists(SECRET): sys.exit(f'Missing {SECRET}: the Desktop OAuth client JSON from Google Cloud.')
    return Flow.from_client_secrets_file(SECRET, SCOPES, redirect_uri=REDIRECT)


def auth_url():
    f = flow(); url, state = f.authorization_url(prompt='consent', access_type='offline')
    save(STATE, {'state': state, 'code_verifier': getattr(f, 'code_verifier', None)}); os.chmod(STATE, 0o600)
    print('Open this link, sign in with the Fable Physics channel account and allow access:\n\n' + url)


def auth_finish(resp):
    st = load(STATE, None)
    if not st: sys.exit('Run  auth-url  first.')
    f = flow(); f.code_verifier = st.get('code_verifier')
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'   # the localhost redirect is http; the code itself goes to Google over https
    f.fetch_token(authorization_response=resp.strip(), state=st['state'])
    open(TOKEN, 'w').write(f.credentials.to_json()); os.chmod(TOKEN, 0o600); os.remove(STATE)
    print('Signed in. Token saved.'); check()


def credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    if not os.path.exists(TOKEN): sys.exit('Not signed in: run  auth-url  then  auth-finish.')
    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds.valid:
        creds.refresh(Request()); open(TOKEN, 'w').write(creds.to_json())
    return creds


def youtube():
    from googleapiclient.discovery import build
    return build('youtube', 'v3', credentials=credentials(), cache_discovery=False)


def check():
    me = youtube().channels().list(part='snippet,statistics', mine=True).execute()['items'][0]
    print(f"Signed in as channel: {me['snippet']['title']}  ({me['statistics'].get('subscriberCount', '?')} subscribers)")


# ---------------------------------------------------------------- slots
def next_slot(done, now=None):
    """The first 13:30 / 21:30 Rome slot after both now + LEAD and the latest slot already used (keeps posting order)."""
    now = now or datetime.datetime.now(TZ)
    used = [datetime.datetime.strptime(d['publish'], '%Y-%m-%d %H:%M').replace(tzinfo=TZ) for d in done.values() if d.get('publish')]
    after = max([now + LEAD] + used)
    day = after.date()
    while True:
        for s in SLOTS:
            t = datetime.datetime.combine(day, datetime.time(*map(int, s.split(':'))), TZ)
            if t > after: return t
        day += datetime.timedelta(days=1)


def body(entry, when):
    return {
        'snippet': {'title': entry['title'][:100], 'description': entry['description'][:5000], 'tags': entry.get('tags', []), 'categoryId': entry.get('category', '28'),
                    'defaultLanguage': 'en', 'defaultAudioLanguage': 'en'},
        'status': {'privacyStatus': 'private', 'publishAt': when.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                   'selfDeclaredMadeForKids': False, 'containsSyntheticMedia': True},   # AI voice: declare altered/synthetic content
    }


def upload(entry, when, dry=False):
    from googleapiclient.http import MediaFileUpload
    video = os.path.join(SHORTS, entry['video']); srt = os.path.join(SHORTS, entry['captions']) if entry.get('captions') else None
    assert os.path.exists(video), f'video not found: {video}'
    if srt: assert os.path.exists(srt), f'captions not found: {srt}'
    b = body(entry, when)
    if dry: print(f"  would upload {entry['name']} for {when:%a %d %b %H:%M} Rome:", b['snippet']['title']); return None
    yt = youtube()
    req = yt.videos().insert(part='snippet,status', body=b, media_body=MediaFileUpload(video, mimetype='video/mp4', chunksize=8 * 1024 * 1024, resumable=True))
    resp, tries = None, 0
    while resp is None:
        try:
            status, resp = req.next_chunk()
            if status: print(f'  uploading {entry["name"]}: {int(status.progress() * 100)}%')
        except Exception as e:   # transient network / 5xx: back off and resume the same upload
            tries += 1
            if tries > 5 or 400 <= getattr(getattr(e, 'resp', None), 'status', 500) < 500: raise   # 4xx (quota, upload limit) won't fix itself
            print(f'  retry {tries} after error: {e}'); time.sleep(2 ** tries)
    vid = resp['id']
    if srt:
        try:   # a caption failure must not lose the uploaded video's id
            yt.captions().insert(part='snippet', body={'snippet': {'videoId': vid, 'language': 'en', 'name': 'English', 'isDraft': False}},
                                 media_body=MediaFileUpload(srt, mimetype='application/octet-stream')).execute()
        except Exception as e:
            print(f'  captions failed ({e}); add {os.path.basename(srt)} by hand in YouTube Studio')
    print(f"  done: https://youtube.com/shorts/{vid}  publishes {when:%a %d %b %H:%M} Rome")
    return vid


def auto(dry=False):
    queue, done = load(QUEUE, []), load(LOG, {})
    todo = [e for e in queue if e['name'] not in done]
    held = [e['name'] for e in todo if e.get('approved') is False]
    if os.path.exists(os.path.join(HERE, '..', 'AUTO_APPROVE')): held = []   # owner switched to fully automatic
    if held: print('Waiting for approval:', ', '.join(held))
    else: todo = [e for e in todo if e.get('approved') is not False]   # in order: an unapproved short does not block later approved ones
    if not todo: print('Nothing new to upload.'); return
    sim = dict(done)
    for e in todo:
        when = next_slot(sim)
        vid = upload(e, when, dry)
        sim[e['name']] = {'id': vid or 'dry-run', 'publish': f'{when:%Y-%m-%d %H:%M}'}
        if vid: done[e['name']] = sim[e['name']]; save(LOG, done)


def show():
    done = load(LOG, {})
    for e in load(QUEUE, []):
        d = done.get(e['name'])
        print(f"  {e['name']:<16} " + (f"{d['id']:<12} {d.get('publish') or ''}" if d else 'waiting'))


def main():
    a = sys.argv[1:]; dry = '--dry-run' in a; a = [x for x in a if x != '--dry-run']
    cmd = a[0] if a else ''
    if cmd == 'auth-url': return auth_url()
    if cmd == 'auth-finish' and len(a) == 2: return auth_finish(a[1])
    if cmd == 'check': return check()
    if cmd == 'auto': return auto(dry)
    if cmd == 'list': return show()
    if cmd == 'pending': return print('\n'.join(e['name'] for e in load(QUEUE, []) if e.get('approved') is False) or 'none')
    if cmd == 'approve' and len(a) >= 2:
        q = load(QUEUE, []); hit = [e for e in q if e['name'] in a[1:]]
        for e in hit: e['approved'] = True
        save(QUEUE, q); return print('approved:', ', '.join(e['name'] for e in hit) or 'nothing matched')
    if cmd == 'reject' and len(a) == 2:
        q = load(QUEUE, []); out = [e for e in q if e['name'] == a[1]]
        if not out: sys.exit('not in queue: ' + a[1])
        rej = load(os.path.join(HERE, 'rejected.json'), []); rej += out; save(os.path.join(HERE, 'rejected.json'), rej)
        save(QUEUE, [e for e in q if e['name'] != a[1]]); return print('rejected:', a[1])
    if cmd == 'mark' and len(a) == 3:
        done = load(LOG, {}); done[a[1]] = {'id': a[2], 'publish': None}; save(LOG, done); return print(f'{a[1]} marked as posted ({a[2]})')
    sys.exit(__doc__)


if __name__ == '__main__':
    main()
