"""Render the comic short: camera glides over the Gemini pages, bubbles pop in with each voice line,
SFX lettering slams in, page-turn slide between pages, ending flash. Then mixes voices + SFX + music.
Usage: python3 render.py [--preview] [--sheet]   -> fifteen-hours.mp4 (1080x1920, 30 fps)"""
import json, math, subprocess, sys, os
from PIL import Image, ImageDraw, ImageFont
from shots import SHOTS
FPS, OW, OH, K = 30, 1080, 1920, 2           # K: working scale over page pixels
A = OW / OH
FONT = '../comic/fonts/ComicNeue-Bold.ttf'; BANG = '../comic/fonts/Bangers-Regular.ttf'
INK = (26, 20, 16)
dur = json.load(open('voice/dur.json'))
words = json.load(open('voice/words.json'))
import re
texts = {l['id']: l['text'] for l in json.load(open('script.json'))['lines']}
said = {l['id']: re.sub(r'\[[^]]*\]\s*', '', l['say']) for l in json.load(open('script.json'))['lines']}
pages = {}
def page(p):
    if p not in pages:
        im = Image.open(p).convert('RGB'); pages[p] = im.resize((im.width * K, im.height * K), Image.LANCZOS)
    return pages[p]
PW, PH = Image.open(SHOTS[0]['page']).size

# ---------- timeline ----------
GAP, MOVE, TURN = 0.22, 0.45, 0.7
t, tl = 0.0, []          # tl: per shot dict(arrive, end, view0, view1, lines{id:start}, ...)
events = []              # audio: (time, file, gain)
def union(boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
def fit(box, pad=28):
    x0, y0, x1, y1 = box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad
    w, h = x1 - x0, y1 - y0
    if w / h > A: h = w / A
    else: w = h * A
    if h > PH: h = PH; w = h * A
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cx = min(max(cx, w / 2), PW - w / 2); cy = min(max(cy, h / 2), PH - h / 2)
    return (cx, cy, h)
for i, s in enumerate(SHOTS):
    move = 0 if i == 0 else (TURN if s.get('turn') else MOVE)
    t0 = t; arrive = t + move
    if s.get('turn'): events.append((t0, 'sfx/page.mp3', -2))
    elif s.get('move_sfx'): events.append((t0, 'sfx/whoosh.mp3', -10))
    ls, lt = {}, arrive + s.get('pre', 0.05)
    for lid, *_ in s.get('lines', []):
        ls[lid] = lt; events.append((lt, f'voice/{lid}.wav', 0)); lt += dur[lid] + GAP
    end = (lt - GAP if ls else arrive + 0.9) + s.get('hold', 0.3)
    def when(w, ls=ls, t0=t0):
        if isinstance(w, (int, float)): return t0 + w
        lid, _, off = w.partition('+'); return ls[lid] + float(off or 0)
    for snd, w, g in s.get('sfx', []): events.append((when(w), f'sfx/{snd}.mp3', g))
    v0 = fit(union([s['focus']] + [l[1] for l in s.get('lines', [])]))
    v1 = (v0[0], v0[1], v0[2] * s.get('zoom', 0.965))
    sh = dict(page=s['page'], t0=t0, arrive=arrive, end=end, v0=v0, v1=v1, lines=ls,
              marks=[(m[:6], when(m[6])) for m in s.get('marks', [])], shake=[(when(w), a) for w, a in s.get('shake', [])], spec=s)
    tl.append(sh); t = end
# ending: whistle then boom + flash
last = tl[-1]
w_t = [e[0] for e in events if e[1].endswith('whistle.mp3')][0]
BOOM_T = w_t + 2.0
events.append((BOOM_T, 'sfx/boom.mp3', 3))
last['end'] = BOOM_T; last['v1'] = (last['v0'][0] + 60, last['v0'][1] + 120, last['v0'][2] * 0.62)
last['shake'].append((BOOM_T, 40))
T_END = BOOM_T + 1.0
print(f'length {T_END:.2f}s')
# captions (dialogue is in the bubbles too; the .srt is for YouTube accessibility)
def ts(x): return f"{int(x//3600):02}:{int(x%3600//60):02}:{int(x%60):02},{int(round(x%1*1000)):03}"
with open('fifteen-hours.srt', 'w') as f:
    k = 0
    for sh in tl:
        for lid, st in sh['lines'].items():
            k += 1; f.write(f"{k}\n{ts(st)} --> {ts(st + dur[lid] + 0.15)}\n{said[lid]}\n\n")


# ---------- sprites ----------
def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        nxt = (cur + ' ' + w).strip()
        if d.textlength(nxt, font=font) <= maxw or not cur: cur = nxt
        else: lines.append(cur); cur = w
    return lines + [cur]
def bubble(box, tip, kind, fs, text, nvis=None, chars=False):
    """Returns (sprite RGBA at K scale, (x,y) page-K position, centre)."""
    S = 2 * K                                      # supersample
    x0, y0, x1, y1 = box; tx, ty = tip
    m = 20
    bx0, by0, bx1, by1 = min(x0, tx) - m, min(y0, ty) - m, max(x1, tx) + m, max(y1, ty) + m
    W, H = int((bx1 - bx0) * S), int((by1 - by0) * S)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = lambda x, y: ((x - bx0) * S, (y - by0) * S)
    lw = int(5 * S)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # tail base: two points on the bubble edge facing the tip
    ang = math.atan2(ty - cy, tx - cx)
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
    def edge(a, k=0.9): return (cx + rx * k * math.cos(a), cy + ry * k * math.sin(a))
    spread = 0.22 if kind == 'round' else 0.16
    b1, b2 = edge(ang - spread), edge(ang + spread)
    tail = [P(*b1), P(tx, ty), P(*b2)]
    if kind == 'shout':
        n, pts = 22, []
        for k in range(n * 2):
            a = math.pi * k / n; r = 1.0 if k % 2 == 0 else 0.84
            pts.append(P(cx + rx * r * math.cos(a), cy + ry * r * math.sin(a)))
        d.polygon(pts, fill='white', outline=INK, width=lw)
    elif (x1 - x0) / (y1 - y0) < 2.6 and len(text) < 14:
        d.ellipse([P(x0, y0), P(x1, y1)], fill='white', outline=INK, width=lw)
    else:
        d.rounded_rectangle([P(x0, y0), P(x1, y1)], radius=int(min(rx, ry) * 0.75 * S), fill='white', outline=INK, width=lw)
    d.polygon(tail, fill='white', outline=INK, width=lw)
    i1, i2 = edge(ang - spread * 0.8, 0.8), edge(ang + spread * 0.8, 0.8)
    tip_in = (b1[0] + b2[0]) / 2 + (tx - (b1[0] + b2[0]) / 2) * 0.12, (b1[1] + b2[1]) / 2 + (ty - (b1[1] + b2[1]) / 2) * 0.12
    d.polygon([P(*i1), P(*tip_in), P(*i2), P(cx, cy)], fill='white')
    # text
    if kind == 'shout':
        font = ImageFont.truetype(BANG, int(fs * S)); lh = fs * 1.0; maxw = (x1 - x0) * 0.72
    else:
        font = ImageFont.truetype(FONT, int(fs * S)); lh = fs * 1.22; maxw = (x1 - x0) - 2 * max(26, fs)
    ln = wrap(d, text, font, maxw * S)
    ystart = cy - lh * (len(ln) - 1) / 2
    left = nvis if nvis is not None else 10 ** 9      # words (or characters) still to draw
    for k, l in enumerate(ln):
        units = list(l) if chars else l.split(' ')
        vis = (''.join if chars else ' '.join)(units[:max(0, left)]); left -= len(units)
        if not vis: break
        x = P(cx, 0)[0] - d.textlength(l, font=font) / 2   # layout from the full line: words never shift
        d.text((x, P(0, ystart + k * lh)[1]), vis, font=font, fill=INK if kind != 'shout' else (200, 30, 20), anchor='lm',
               **({'stroke_width': int(2 * S), 'stroke_fill': INK} if kind == 'shout' else {}))
    im = im.resize((W * K // S, H * K // S), Image.LANCZOS)
    return im, (bx0 * K, by0 * K), (cx * K, cy * K)
def mark(text, x, y, size, rot, col):
    S = 2 * K
    font = ImageFont.truetype(BANG, int(size * S))
    d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    l, tp, r, b = d0.textbbox((0, 0), text, font=font, stroke_width=int(7 * S))
    im = Image.new('RGBA', (r - l + 40, b - tp + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((20 - l, 20 - tp), text, font=font, fill=col, stroke_width=int(7 * S), stroke_fill=INK)
    im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    im = im.resize((im.width * K // S, im.height * K // S), Image.LANCZOS)
    return im, (x * K - im.width / 2, y * K - im.height / 2), (x * K, y * K)
empty_bubble = {}
# sprite list per page: (appear_time, kind, sprite, pos, centre)
sprites = {}
for sh in tl:
    L = sprites.setdefault(sh['page'], [])
    for lid, box, tip, kind, fs in sh['spec'].get('lines', []):
        st, txt = sh['lines'][lid], texts[lid]
        wt = words.get(lid, [])
        if len(wt) == len(txt.split()) and wt:            # one word per spoken word
            times, chars = [st + max(0, w - 0.03) for w in wt], False
        else:                                              # no timings (a roar): grow letter by letter
            n = len(txt); times, chars = [st + dur[lid] * 0.75 * k / n for k in range(n)], True
        states = [(tt, bubble(box, tip, kind, fs, txt, k + 1, chars)[0]) for k, tt in enumerate(times)]
        e, pos, ctr = bubble(box, tip, kind, fs, txt, 0)
        empty_bubble[id(states)] = e
        L.append((min(st, times[0]) - 0.08, 'pop', states, pos, ctr))
    for (txt, x, y, size, rot, col), w in sh['marks']:
        spr, pos, ctr = mark(txt, x, y, size, rot, col)
        L.append((w, 'slam', [(w, spr)], pos, ctr))

# ---------- camera ----------
ease = lambda p: p * p * (3 - 2 * p)
def lerpv(a, b, p): return tuple(a[k] + (b[k] - a[k]) * p for k in range(3))
def state(t):
    """-> list of (page, view, xshift) layers"""
    for i, sh in enumerate(tl):
        if t < sh['arrive'] and i > 0:
            prev = tl[i - 1]; p = ease((t - sh['t0']) / (sh['arrive'] - sh['t0']))
            if prev['page'] != sh['page']:
                return [(prev['page'], prev['v1'], -p), (sh['page'], sh['v0'], 1 - p)]
            return [(sh['page'], lerpv(prev['v1'], sh['v0'], p), 0)]
        if t < sh['end'] or i == len(tl) - 1:
            p = min(1, (t - sh['arrive']) / max(1e-3, sh['end'] - sh['arrive']))
            p = p if not sh['spec'].get('end') else ease(p) ** 2
            return [(sh['page'], lerpv(sh['v0'], sh['v1'], p), 0)]
def shake(t):
    a = 0
    for sh in tl:
        for w, amp in sh['shake']:
            if 0 <= t - w < 0.6: a = max(a, amp * (1 - (t - w) / 0.6) ** 2)
    return (a * math.sin(t * 91), a * math.cos(t * 77))
def scale_pop(dt, kind):
    if kind == 'pop':
        if dt >= 0.22: return 1
        p = dt / 0.22; c = 1.9; return 0.4 + 0.6 * (1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2)
    if dt >= 0.14: return 1
    return 1.8 - 0.8 * (dt / 0.14)
def render_view(pg, view, t, dx, dy):
    cx, cy, vh = view; vw = vh * A
    x0, y0 = (cx - vw / 2 + dx) * K, (cy - vh / 2 + dy) * K
    ix0, iy0 = int(math.floor(x0)) - 2, int(math.floor(y0)) - 2
    ix1, iy1 = int(math.ceil(x0 + vw * K)) + 2, int(math.ceil(y0 + vh * K)) + 2
    crop = page(pg).crop((ix0, iy0, ix1, iy1))
    for at, kind, states, pos, ctr in sprites.get(pg, []):
        if t < at: continue
        spr = empty_bubble.get(id(states)) or states[0][1]
        for tt, sp in states:
            if tt <= t: spr = sp
        s = scale_pop(t - at, kind)
        if s != 1:
            spr = spr.resize((max(1, int(spr.width * s)), max(1, int(spr.height * s))), Image.BILINEAR)
            px, py = ctr[0] + (pos[0] - ctr[0]) * s, ctr[1] + (pos[1] - ctr[1]) * s
        else: px, py = pos
        crop.paste(spr, (int(px - ix0), int(py - iy0)), spr)
    sc = vw * K / OW
    return crop.transform((OW, OH), Image.AFFINE, (sc, 0, x0 - ix0, 0, sc, y0 - iy0), resample=Image.BICUBIC)
end_mark = None
def frame(t):
    global end_mark
    dx, dy = shake(t)
    layers = state(t)
    if len(layers) == 1:
        out = render_view(layers[0][0], layers[0][1], t, dx, dy)
    else:
        out = Image.new('RGB', (OW, OH), INK)
        for pg, v, xs in layers:
            out.paste(render_view(pg, v, t, 0, 0), (int(xs * (OW + 40)), 0))
    if t >= BOOM_T:   # flash + giant BOOM
        p = (t - BOOM_T)
        wht = Image.new('RGB', (OW, OH), (255, 248, 225))
        out = Image.blend(out, wht, min(1, p / 0.08) * (0.92 if p > 0.25 else 1))
        if end_mark is None:
            S = 2; f = ImageFont.truetype(BANG, 330 * S)
            im = Image.new('RGBA', (OW * S, 600 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.text((OW * S / 2, 300 * S), 'BOOM!', font=f, fill=(232, 69, 44), stroke_width=16 * S, stroke_fill=INK, anchor='mm')
            end_mark = im.rotate(-6, resample=Image.BICUBIC).resize((OW, 600), Image.LANCZOS)
        s = scale_pop(p, 'slam'); m = end_mark.resize((int(OW * s), int(600 * s)))
        out.paste(m, (int((OW - m.width) / 2 + dx), int(OH / 2 - m.height / 2 + dy)), m)
    return out

# ---------- outputs ----------
if '--sheet' in sys.argv:
    ts = [sh['end'] - 0.05 for sh in tl] + [BOOM_T + 0.3]
    th = [frame(x).resize((270, 480)) for x in ts]
    sheet = Image.new('RGB', (270 * 7, 480 * 2), 'white')
    for k, im in enumerate(th): sheet.paste(im, ((k % 7) * 270, (k // 7) * 480))
    sheet.save('contact-sheet.jpg', quality=88); print('contact-sheet.jpg'); sys.exit()

# audio mix
ins, flt = [], []
music_gain = -21
ins += ['-i', 'sfx/music.mp3']
flt.append(f'[0:a]atrim=0:{T_END - 1.0 + 0.02},afade=t=out:st={BOOM_T - 0.25}:d=0.25,volume={music_gain}dB,aresample=48000,aformat=channel_layouts=stereo[m]')
labels = ['[m]']
for k, (at, f, g) in enumerate(events):
    ins += ['-i', f]; ms = int(at * 1000)
    flt.append(f'[{k + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g}dB,adelay={ms}|{ms}[a{k}]'); labels.append(f'[a{k}]')
flt.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{T_END},loudnorm=I=-14:TP=-1.5:LRA=9[out]')
subprocess.run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(flt), '-map', '[out]', '-ar', '48000', 'mix.wav'], check=True)
print('mix.wav')
step = 3 if '--preview' in sys.argv else 1
enc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS / step), '-i', '-',
                        '-i', 'mix.wav', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'fifteen-hours.mp4'], stdin=subprocess.PIPE)
n = int(T_END * FPS)
for f in range(0, n, step):
    enc.stdin.write(frame(f / FPS).tobytes())
    if f % 150 == 0: print(f'{f}/{n}', flush=True)
enc.stdin.close(); enc.wait(); print('fifteen-hours.mp4')
