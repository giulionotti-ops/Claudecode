"""Neesmo phone review for Fable Physics shorts. One review per short: the owner watches it in the
notification, then taps Approve (it gets scheduled) or Ask for changes (review_watch.py fixes it and sends it again).

  notify.py --pending        send a review for every unapproved short that has none open
  notify.py "title" ["body"] plain notification
"""
import sys, os, re, json, subprocess, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SHORTS = os.path.dirname(HERE)
QUEUE = os.path.join(HERE, 'uploader', 'queue.json')
STATE = os.path.join(HERE, '.reviews.json')        # slug -> {"nid": id, "video_mtime": t}
PREVIEWS = os.path.join(HERE, '.reviews')          # small phone copies of each short
NEESMO = 'http://127.0.0.1:8080'
TOKEN = open(os.path.expanduser('~/.config/neesmo/hook_token')).read().strip()


def load(p, d):
    try: return json.load(open(p))
    except (OSError, ValueError): return d      # missing or half-written file: start fresh, don't crash the cron


def save(p, data):
    tmp = p + '.tmp'
    json.dump(data, open(tmp, 'w'), indent=1); os.replace(tmp, p)   # atomic: a crash never leaves an empty file


def api(path, body=None):
    req = urllib.request.Request(NEESMO + path, method='POST' if body is not None else 'GET',
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'X-Neesmo-Hook': TOKEN, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=20))


def preview(e):
    """540x960 copy (a few MB) so it plays quickly over Tailscale on the phone."""
    src = os.path.join(SHORTS, e['video']); os.makedirs(PREVIEWS, exist_ok=True)
    out = os.path.join(PREVIEWS, e['name'] + '.mp4')
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-vf', 'scale=540:-2', '-c:v', 'libx264',
                        '-crf', '27', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], check=True)
    return out


def send_review(e):
    desc = e.get('description', '').split('\n\n#')[0].split('\n\n')[0]   # plain words only: no hashtags, question or pinned comment
    details = re.split(r'(?<=[.!?])\s', re.sub(r'\s*#\w+', '', desc).strip())[0]   # one plain sentence
    r = api('/api/reviews', {'title': 'Fable Physics: approve this short?', 'name': e['title'].split(' #')[0],
                             'details': details, 'media': [preview(e)], 'agent': '/root/physics-channel'})
    return r['id']


def rendered(slug, src):
    """True only for a finished render: no build running for this short, file untouched for 10 min, and ffprobe reads it whole."""
    import time
    if time.time() - os.path.getmtime(src) < 600:
        return False
    folder = os.path.dirname(src)
    for pid in os.listdir('/proc'):   # a build.sh / ffmpeg / blender working in this short's folder = still rendering
        try:
            args = open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='ignore')
            cwd = os.readlink(f'/proc/{pid}/cwd')
        except (OSError, ValueError):
            continue
        if any(k in args for k in ('build.sh', 'ffmpeg', 'blender')) and (cwd == folder or cwd.startswith(folder + '/') or folder in args):
            return False
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                       capture_output=True, text=True)
    try: return r.returncode == 0 and float(r.stdout.strip()) > 1
    except ValueError: return False


def pending():
    q = load(QUEUE, []); st = load(STATE, {})
    for e in q:
        if e.get('approved') is not False or not os.path.exists(os.path.join(SHORTS, e['video'])):
            continue
        s = st.get(e['name'])
        mtime = os.path.getmtime(os.path.join(SHORTS, e['video']))
        if s and (s.get('fixing') or (s.get('nid') and s.get('video_mtime') == mtime)):
            continue   # its review is still open (or being fixed)
        if not rendered(e['name'], os.path.join(SHORTS, e['video'])):
            continue   # still rendering (or just written): send the review once it is finished
        if s and s.get('nid'):
            try: api(f"/api/approvals/{s['nid']}/expire", {})   # the short changed: the old review is closed
            except Exception: pass
        st[e['name']] = {'nid': send_review(e), 'video_mtime': mtime}
        print('review sent:', e['name'], st[e['name']]['nid'])
    save(STATE, st)


if __name__ == '__main__':
    if sys.argv[1:] == ['--pending']:
        pending()
    else:
        sys.path.insert(0, '/root/Claudecode/vega')
        try: import push
        except ImportError:   # push needs Neesmo's venv (py_vapid)
            py = '/root/Claudecode/vega/.venv/bin/python'
            os.execv(py, [py, os.path.abspath(__file__), *sys.argv[1:]])
        print('sent to', push.send(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '', tag='fable'), 'device(s)')
