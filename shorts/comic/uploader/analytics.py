"""Daily stats for the comic channel -> analytics.json (history) + ../ANALYTICS.md (what the daily run reads).
Usage: python3 analytics.py   (run from comic/uploader; uses token.json, needs the yt-analytics.readonly scope)"""
import datetime, json, os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
c = Credentials.from_authorized_user_file('token.json')
if not c.valid:
    c.refresh(Request()); open('token.json', 'w').write(c.to_json())
yt = build('youtube', 'v3', credentials=c)
ya = build('youtubeAnalytics', 'v2', credentials=c)

ids = json.load(open('uploaded.json'))               # name -> video id
by_id = {v: k for k, v in ids.items()}
today = datetime.date.today().isoformat()

stats = {}
for v in yt.videos().list(part='statistics,status,snippet', id=','.join(ids.values())).execute()['items']:
    s = v['statistics']
    stats[v['id']] = dict(name=by_id[v['id']], title=v['snippet']['title'], status=v['status'].get('privacyStatus'),
                          published=v['snippet'].get('publishedAt', '')[:10], views=int(s.get('viewCount', 0)),
                          likes=int(s.get('likeCount', 0)), comments=int(s.get('commentCount', 0)))

# Analytics API lags 1-2 days; fill retention/shares/subs where available.
cols = 'views,averageViewDuration,averageViewPercentage,shares,subscribersGained'
try:
    rep = ya.reports().query(ids='channel==MINE', startDate='2026-11-01', endDate=today, metrics=cols,
                             dimensions='video', filters='video==' + ','.join(ids.values())).execute()
    for row in rep.get('rows', []):
        if row[0] in stats:
            stats[row[0]].update(avg_view_s=row[2], avg_view_pct=round(row[3], 1), shares=row[4], subs=row[5])
except Exception as e:
    print('analytics API:', e)

hist = json.load(open('analytics.json')) if os.path.exists('analytics.json') else {}
hist[today] = stats
json.dump(hist, open('analytics.json', 'w'), indent=1)

live = sorted((s for s in stats.values() if s['status'] == 'public'), key=lambda s: -s['views'])
lines = [f'# Comic channel analytics ({today})', '',
         'Updated daily by `uploader/analytics.py`. Read before picking a topic: copy what the top short did',
         '(topic type, hook shape, title pattern, length); avoid what the bottom one did.', '',
         '| Short | Title | Views | Likes | Comments | Avg viewed | Shares | Subs |', '|---|---|---|---|---|---|---|---|']
for s in live:
    pct = f"{s['avg_view_pct']}%" if 'avg_view_pct' in s else '–'
    lines.append(f"| {s['name']} | {s['title']} | {s['views']} | {s['likes']} | {s['comments']} | {pct} | {s.get('shares', '–')} | {s.get('subs', '–')} |")
open('../ANALYTICS.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
