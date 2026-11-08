"""Write <name>.srt from events.json (written by tools/film.js). Usage: python3 tools/srt.py <name>"""
import json, sys
e = json.load(open('events.json'))
f = lambda t: '%02d:%02d:%02d,%03d' % (t // 3600, t % 3600 // 60, int(t % 60), int(round(t % 1 * 1000)) % 1000)
open(sys.argv[1] + '.srt', 'w').write(''.join(f"{i + 1}\n{f(s['t0'])} --> {f(s['t1'])}\n{s['text']}\n\n" for i, s in enumerate(e['subs'])))
