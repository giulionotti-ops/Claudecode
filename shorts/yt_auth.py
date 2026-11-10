"""One-time YouTube login for yt_upload.py. Run it yourself in a terminal on the server:  python3 shorts/yt_auth.py

Before: in Google Cloud Console create a project, enable "YouTube Data API v3", set up the OAuth consent
screen (External, add your Google account as a test user), create an OAuth client of type "Desktop app",
download its JSON and save it as ~/.config/glazier/client_secret.json.

The script prints a link. Open it, sign in with the channel's account and allow access. The browser then
goes to a localhost page that fails to load; that's expected. Copy the full address from the address bar
and paste it here. The refresh token is saved to ~/.config/glazier/youtube_token.json (only readable by you).
"""
import json, os, sys, urllib.parse, urllib.request

DIR = os.path.expanduser('~/.config/glazier')
SECRET, TOKEN = os.path.join(DIR, 'client_secret.json'), os.path.join(DIR, 'youtube_token.json')
REDIRECT = 'http://localhost:8765/'
SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl'

if not os.path.exists(SECRET):
    sys.exit(f'Missing {SECRET}: download the Desktop-app OAuth client JSON from Google Cloud and save it there.')
c = json.load(open(SECRET)); c = c.get('installed') or c.get('web')
url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode({
    'client_id': c['client_id'], 'redirect_uri': REDIRECT, 'response_type': 'code',
    'scope': SCOPES, 'access_type': 'offline', 'prompt': 'consent'})
print('\nOpen this link, sign in with the channel account and allow access:\n\n' + url + '\n')
back = input('Paste the full localhost address you were sent to: ').strip()
code = urllib.parse.parse_qs(urllib.parse.urlparse(back).query).get('code', [back])[0]
body = urllib.parse.urlencode({'code': code, 'client_id': c['client_id'], 'client_secret': c['client_secret'],
                               'redirect_uri': REDIRECT, 'grant_type': 'authorization_code'}).encode()
tok = json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', body))
if 'refresh_token' not in tok:
    sys.exit('No refresh token came back. Remove the app at myaccount.google.com/permissions and run this again.')
os.makedirs(DIR, exist_ok=True)
fd = os.open(TOKEN, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    json.dump({'refresh_token': tok['refresh_token'], 'client_id': c['client_id'], 'client_secret': c['client_secret']}, f)
print(f'Saved {TOKEN}. Test with: python3 shorts/yt_upload.py --check')
