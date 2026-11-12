"""Write the Instagram post text for an episode → episodes/<ep>/out/<ep>.txt
Uses script.json "post" (list of lines; {code} is replaced by the brand code) and brand.json "hashtags"."""
import sys, os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]; E = os.path.join(ROOT, 'episodes', ep)
S = json.load(open(os.path.join(E, 'script.json'))); B = {**json.load(open(os.path.join(ROOT, 'brand.json'))), **S.get('brand', {})}
lines = [l.replace('{code}', B['code']) for l in S.get('post', [])]
tags = ' '.join(S.get('hashtags', []) + B.get('hashtags', []))
os.makedirs(os.path.join(E, 'out'), exist_ok=True)
p = os.path.join(E, 'out', f'{ep}.txt'); open(p, 'w').write('\n\n'.join(lines + ([tags] if tags else [])) + '\n'); print('post text:', p)
