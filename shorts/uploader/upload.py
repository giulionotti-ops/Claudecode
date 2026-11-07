"""Glazier of Terra uploader: upload, caption and schedule the channel's own shorts with the YouTube Data API.

  python upload.py auth                  sign in once (opens Google's consent screen); saves token.json
  python upload.py upload <name>         upload one entry from schedule.json (e.g. angron)
  python upload.py upload --all          upload every entry not yet uploaded
  python upload.py check                 show the signed-in channel (proves the login works)
  add --dry-run to upload to print what would be sent without calling YouTube

Needs client_secret.json (the OAuth "Desktop app" key from Google Cloud) next to this file. Keep it and token.json private.
On a server without a browser: run `auth`, open the printed link on any device, sign in; the page it lands on
(http://localhost:8765/...) will not load there, so copy that whole address and paste it back into the terminal.
"""
import sys, os, json, time, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
SECRET, TOKEN, SCHEDULE, LOG = (os.path.join(HERE, f) for f in ('client_secret.json', 'token.json', 'schedule.json', 'uploaded.json'))
SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly']


def credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    if not os.path.exists(TOKEN): sys.exit('Not signed in: run  python upload.py auth  first.')
    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds.valid:
        creds.refresh(Request()); open(TOKEN, 'w').write(creds.to_json())
    return creds


def auth():
    from google_auth_oauthlib.flow import InstalledAppFlow
    if not os.path.exists(SECRET): sys.exit(f'Missing {SECRET}: download the Desktop OAuth client JSON from Google Cloud and save it with that name.')
    flow = InstalledAppFlow.from_client_secrets_file(SECRET, SCOPES)
    if os.environ.get('DISPLAY') or sys.platform in ('darwin', 'win32'):
        creds = flow.run_local_server(port=8765, prompt='consent')
    else:   # headless server: sign in on another device, paste the redirect address back
        flow.redirect_uri = 'http://localhost:8765/'
        url, _ = flow.authorization_url(prompt='consent', access_type='offline')
        print('Open this link, sign in with the channel account and allow access:\n\n' + url + '\n')
        flow.fetch_token(authorization_response=input('Paste the full address of the page you land on: ').strip().replace('http://', 'https://', 1))
        creds = flow.credentials
    open(TOKEN, 'w').write(creds.to_json()); os.chmod(TOKEN, 0o600)
    print('Signed in. Token saved to token.json.')


def youtube():
    from googleapiclient.discovery import build
    return build('youtube', 'v3', credentials=credentials(), cache_discovery=False)


def check():
    me = youtube().channels().list(part='snippet,statistics', mine=True).execute()['items'][0]
    print(f"Signed in as channel: {me['snippet']['title']}  ({me['statistics'].get('subscriberCount', '?')} subscribers)")


def publish_at(entry):
    """schedule.json times are local Italian time ('2026-11-09 19:00'); YouTube wants UTC RFC 3339."""
    from zoneinfo import ZoneInfo
    t = datetime.datetime.strptime(entry['publish'], '%Y-%m-%d %H:%M').replace(tzinfo=ZoneInfo(entry.get('tz', 'Europe/Rome')))
    assert t > datetime.datetime.now(datetime.timezone.utc), f"{entry['name']}: publish time {entry['publish']} is in the past"
    return t.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def body(entry):
    return {
        'snippet': {'title': entry['title'][:100], 'description': entry['description'][:5000], 'tags': entry.get('tags', []), 'categoryId': entry.get('category', '24'),
                    'defaultLanguage': 'en', 'defaultAudioLanguage': 'en'},
        'status': {'privacyStatus': 'private', 'publishAt': publish_at(entry), 'selfDeclaredMadeForKids': False, 'containsSyntheticMedia': False},
    }


def upload(entry, dry=False):
    from googleapiclient.http import MediaFileUpload
    video = os.path.join(HERE, entry['video']); srt = os.path.join(HERE, entry['captions']) if entry.get('captions') else None
    assert os.path.exists(video), f'video not found: {video}'
    if srt: assert os.path.exists(srt), f'captions not found: {srt}'
    b = body(entry)
    if dry: print(json.dumps(b, indent=1)); print('video:', video, '| captions:', srt); return None
    yt = youtube()
    req = yt.videos().insert(part='snippet,status', body=b, media_body=MediaFileUpload(video, mimetype='video/mp4', chunksize=8 * 1024 * 1024, resumable=True))
    resp, tries = None, 0
    while resp is None:
        try:
            status, resp = req.next_chunk()
            if status: print(f'  uploading {entry["name"]}: {int(status.progress() * 100)}%')
        except Exception as e:   # transient network / 5xx: back off and resume the same upload
            tries += 1
            if tries > 5: raise
            print(f'  retry {tries} after error: {e}'); time.sleep(2 ** tries)
    vid = resp['id']
    if srt:
        try:   # captions need the youtube.force-ssl scope; a failure here must not lose the uploaded video's id
            yt.captions().insert(part='snippet', body={'snippet': {'videoId': vid, 'language': 'en', 'name': 'English', 'isDraft': False}},
                                 media_body=MediaFileUpload(srt, mimetype='application/octet-stream')).execute()
        except Exception as e:
            print(f'  captions failed ({e}); add {os.path.basename(srt)} by hand in YouTube Studio')
    print(f"  done: https://youtube.com/shorts/{vid}  scheduled for {entry['publish']} ({b['status']['publishAt']} UTC)")
    return vid


def main():
    args = sys.argv[1:]; dry = '--dry-run' in args; args = [a for a in args if a != '--dry-run']
    if not args or args[0] not in ('auth', 'check', 'upload'): sys.exit(__doc__)
    if args[0] == 'auth': return auth()
    if args[0] == 'check': return check()
    plan = json.load(open(SCHEDULE)); done = json.load(open(LOG)) if os.path.exists(LOG) else {}
    todo = [e for e in plan if e['name'] not in done] if args[1:] == ['--all'] else [e for e in plan if e['name'] in args[1:]]
    if not todo: sys.exit('Nothing to upload (check the name, or everything in schedule.json is already uploaded).')
    for e in todo:
        vid = upload(e, dry)
        if vid: done[e['name']] = vid; json.dump(done, open(LOG, 'w'), indent=1)


if __name__ == '__main__':
    main()
