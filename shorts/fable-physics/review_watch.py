"""Acts on the owner's Neesmo reviews of Fable Physics shorts (cron, every 5 minutes; cheap, no Claude unless asked for changes).
  Approve           -> upload.py approve + auto (scheduled at the next free slot), queue committed, phone told the time.
  Ask for changes   -> the note goes to shorts/<slug>/CHANGES.md, a headless Claude run applies it and rebuilds,
                       then a fresh review is sent. Never approves anything by itself.
"""
import os, sys, json, fcntl, subprocess, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import notify

HERE = notify.HERE; SHORTS = notify.SHORTS; REPO = os.path.dirname(SHORTS)
UP = os.path.join(HERE, 'uploader')
LOG = os.path.join(HERE, 'logs', 'reviews.log')


def log(*a):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a') as f: print(datetime.datetime.now().strftime('%F %T'), *a, file=f)


def sh(*cmd, cwd=None, **kw):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, **kw)
    log('$', ' '.join(cmd[:4]), '->', r.returncode, (r.stdout + r.stderr).strip()[-400:])
    return r


def commit(msg, *paths):
    sh('git', 'add', *paths, cwd=REPO)
    sh('git', 'commit', '-q', '-m', msg + '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', cwd=REPO)
    sh('git', 'push', '-q', 'origin', 'HEAD', cwd=REPO)


def save(st): json.dump(st, open(notify.STATE, 'w'), indent=1)


def approved(slug):
    sh(sys.executable, 'upload.py', 'approve', slug, cwd=UP)
    sh(sys.executable, 'upload.py', 'auto', cwd=UP)
    done = notify.load(os.path.join(UP, 'uploaded.json'), {})
    when = (done.get(slug) or {}).get('publish') or 'the next free slot'
    commit(f'Fable Physics: approve {slug} (Neesmo review)', 'shorts/fable-physics/uploader/queue.json')
    notify_text = f'Scheduled for {when} (Rome).'
    sh(sys.executable, notify.__file__, f'Fable Physics: {slug} approved', notify_text)


def fix(slug, note, st, retry=False):
    st[slug]['fixing'] = True; save(st)
    path = os.path.join(SHORTS, slug, 'CHANGES.md')
    if not retry:   # a retry's note is already in CHANGES.md
        with open(path, 'a') as f:
            f.write(f"\n## {datetime.datetime.now():%d %b %Y %H:%M}\n{note}\n")
    prompt = (f"The owner watched the Fable Physics short shorts/{slug} on their phone and asked for these changes:\n\n{note}\n\n"
              f"Working folder: /root/physics-channel/shorts. Read fable-physics/AUTO.md for the rules (style, quality gate, music level, voice), "
              f"then apply exactly what was asked in shorts/{slug} (scene, script, voice, mix, or its entry in fable-physics/uploader/queue.json), "
              f"re-run its build.sh in one Bash call, check stills of what you changed, keep \"approved\": false, "
              f"then commit shorts/{slug} and the queue file and git push. Do not approve or schedule anything.")
    env = dict(os.environ, BASH_DEFAULT_TIMEOUT_MS='1200000', BASH_MAX_TIMEOUT_MS='1800000')
    r = sh('timeout', '3h', 'claude', '-p', prompt, '--model', 'sonnet', '--permission-mode', 'acceptEdits',
           '--allowedTools', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent',
           '--output-format', 'text', cwd=SHORTS, env=env, stdin=subprocess.DEVNULL)
    st = notify.load(notify.STATE, {})
    if r.returncode != 0:   # e.g. usage limit: keep the note and try again on the next run, don't send the old version back
        if not retry:
            sh(sys.executable, notify.__file__, f'Fable Physics: fixing {slug} failed', 'I will try again soon.')
        st[slug] = {'fixing': True, 'retry': note}
    else:
        st.pop(slug, None)   # a fresh review goes out below
    save(st)


def main():
    lock = open(os.path.join(HERE, '.review_watch.lock'), 'w')
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError: return   # a fix is still running
    st = notify.load(notify.STATE, {})
    for slug, s in list(st.items()):
        s = notify.load(notify.STATE, {}).get(slug)   # re-read: a slug may have been dropped (rejected) while a fix ran
        if s and s.get('retry'):
            log('retry', slug); fix(slug, s['retry'], st, retry=True); st = notify.load(notify.STATE, {}); continue
        if not s or s.get('fixing') or not s.get('nid'): continue
        try: r = notify.api(f"/api/reviews/{s['nid']}")
        except Exception as e:
            log('status failed', slug, e)
            if getattr(e, 'code', None) == 404:   # Neesmo lost the review: forget it so notify.pending() sends a new one
                st.pop(slug, None); save(st)
            continue
        if r['status'] == 'approved':
            st.pop(slug); save(st); log('approved', slug); approved(slug)
        elif r['status'] == 'changes asked':
            log('changes', slug, r['note']); fix(slug, r['note'], st); st = notify.load(notify.STATE, {})
    notify.pending()   # new shorts, and fixed ones, get their review
    if any(e.get('replaces') for e in notify.load(os.path.join(UP, 'queue.json'), [])):
        sh(sys.executable, 'upload.py', 'retire', cwd=UP)   # a remake went live: delete the old video


if __name__ == '__main__':
    os.environ['PATH'] = os.path.expanduser('~/.local/bin') + ':/usr/local/bin:/usr/bin:/bin'
    if os.path.exists('/root/.api-keys.env'):
        for line in open('/root/.api-keys.env'):
            k, _, v = line.strip().partition('=')
            if k and not k.startswith('#') and v: os.environ.setdefault(k.removeprefix('export '), v.strip('"\''))
    main()
