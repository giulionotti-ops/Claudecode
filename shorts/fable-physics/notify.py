"""Phone notification through Neesmo's Web Push (Claudecode/vega/push.py). Run with Neesmo's venv:
  /root/Claudecode/vega/.venv/bin/python notify.py "<title>" "<body>"     send one notification
  /root/Claudecode/vega/.venv/bin/python notify.py --pending              notify about shorts newly waiting for approval
"""
import sys, os, json
sys.path.insert(0, '/root/Claudecode/vega')
import push
HERE = os.path.dirname(os.path.abspath(__file__)); SEEN = os.path.join(HERE, '.notified.json')

if sys.argv[1:] == ['--pending']:
    q = json.load(open(os.path.join(HERE, 'uploader', 'queue.json')))
    pending = [e for e in q if e.get('approved') is False]
    seen = set(json.load(open(SEEN))) if os.path.exists(SEEN) else set()
    new = [e for e in pending if e['name'] not in seen]
    if new:
        names = ', '.join(e['title'].split(' #')[0] for e in new)
        n = push.send(f'Fable Physics: {len(new)} new short{"s" if len(new) > 1 else ""} to approve', f'{names}. The review page comes at the next check (12:43 / 22:43).', tag='fable-approve')
        print('notified', n, 'device(s):', names)
    json.dump(sorted(seen | {e['name'] for e in pending}), open(SEEN, 'w'))
else:
    print('sent to', push.send(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '', tag='fable'), 'device(s)')
