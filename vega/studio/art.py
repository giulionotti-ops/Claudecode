"""Avatar and banner suggestions for a new channel, drawn by code (no image model, no tokens).

One suggestion per style, so the owner can pick the look they like. Styles come from the
claude-drawing-skill library (MIT, cloveric/claude-drawing-skill) when it is installed; a plain
Pillow style is always there as a fallback.

  python3 -m studio.art "Channel Name" OUT_DIR [--banner] [--seed N]

Writes OUT_DIR/avatar-<style>.png (800x800) and, with --banner, OUT_DIR/banner-<style>.jpg (2560x1440,
the YouTube size; everything that matters sits in the 1546x423 middle strip that shows on phones).
Prints a JSON list of what it made.
"""
import argparse
import json
import os
import sys
import traceback
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AV = 800                    # avatar size
BW, BH = 2560, 1440         # YouTube banner
SAFE = (1546, 423)          # YouTube "safe for all devices" box, centred
DRAW_LIBS = [Path(p) for p in os.environ.get("NEESMO_DRAWING_LIB", "").split(":") if p] + [
    Path.home() / ".claude" / "skills" / "claude-drawing-skill" / "lib",
    Path.home() / ".claude" / "skills" / "claude-drawing" / "lib",
    Path.home() / ".agents" / "skills" / "claude-drawing-skill" / "lib",
]


def _drawing_lib() -> bool:
    for p in DRAW_LIBS:
        if (p / "core.py").exists():
            sys.path.insert(0, str(p))
            return True
    return False


def initials(name: str) -> str:
    words = [w for w in name.replace("-", " ").replace("_", " ").split() if w[:1].isalnum()]
    if not words:
        return "N"
    if len(words) == 1:
        return words[0][:2].upper() if len(words[0]) > 3 else words[0].upper()
    return (words[0][0] + words[1][0]).upper()


def _font(size: int, bold=True):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def _fit(text: str, max_w: int, start: int) -> int:
    size = start
    while size > 20 and _font(size).getlength(text) > max_w:
        size -= 4
    return size


def _circle_crop(img: Image.Image) -> Image.Image:
    """Avatars are shown in a circle: keep the art inside it (the corners are cut on every platform)."""
    return img.resize((AV, AV), Image.LANCZOS)


# ------------------------------------------------------------------ styles
# each: fn(name, kind, seed) -> PIL image ; kind is "avatar" or "banner"

def style_bold(name, kind, seed):
    """Plain, always available: one accent colour on dark, big letters (the viral-explainer look)."""
    accents = ["#ff6b35", "#3dff8f", "#5cc8ff", "#ffd166", "#ff7ac6", "#b388ff"]
    acc = accents[seed % len(accents)]
    if kind == "avatar":
        img = Image.new("RGB", (AV, AV), "#101114")
        d = ImageDraw.Draw(img)
        d.ellipse((60, 60, AV - 60, AV - 60), outline=acc, width=26)
        t = initials(name)
        f = _font(_fit(t, 470, 380))
        d.text((AV / 2, AV / 2 + 10), t, font=f, fill="#f4f1ea", anchor="mm")
        return img
    img = Image.new("RGB", (BW, BH), "#101114")
    d = ImageDraw.Draw(img)
    for i in range(0, BW, 64):  # faint dot grid
        for j in range(0, BH, 64):
            d.ellipse((i - 2, j - 2, i + 2, j + 2), fill="#1d1f25")
    f = _font(_fit(name.upper(), SAFE[0] - 120, 220))
    d.text((BW / 2, BH / 2 - 20), name.upper(), font=f, fill="#f4f1ea", anchor="mm")
    w = f.getlength(name.upper())
    d.rectangle((BW / 2 - w / 2, BH / 2 + 95, BW / 2 + w / 2, BH / 2 + 115), fill=acc)
    return img


def style_chalk(name, kind, seed):
    from chalk import Chalkboard
    t = initials(name)
    if kind == "avatar":
        b = Chalkboard(AV, AV, seed=seed)
        b.slate()
        b.text(t, AV / 2, AV / 2 + 20, 330 if len(t) <= 2 else 250, anchor="mm")
        b.loop(AV / 2, AV / 2, 300, 250, turns=1.1)
        b.dust(0.6, specks=900)
        return _as_img(b.composite(vignette=0.3))
    b = Chalkboard(BW // 2, BH // 2, seed=seed)  # drawn at half size, scaled up: chalk grain survives
    b.slate()
    size = 120
    while size > 40 and b.text_width(name, size) > SAFE[0] / 2 - 60:
        size -= 6
    b.text(name, BW / 4, BH / 4 + size * 0.35, size, anchor="ms")
    w = b.text_width(name, size)
    b.underline(BW / 4 - w / 2, BW / 4 + w / 2, BH / 4 + size * 0.55)
    b.arrow([(BW / 4 + w / 2 + 40, BH / 4 - 70), (BW / 4 + w / 2 + 110, BH / 4 - 10)], width=3.5)
    b.dust(0.6, specks=2500)
    return _as_img(b.composite()).resize((BW, BH), Image.LANCZOS)


def _as_img(x):
    if isinstance(x, Image.Image):
        return x.convert("RGB")
    import numpy as np
    a = np.asarray(x)
    if a.dtype != np.uint8:
        a = np.clip(a * (255 if a.max() <= 1.01 else 1), 0, 255).astype(np.uint8)
    return Image.fromarray(a[..., :3])


def style_synthwave(name, kind, seed):
    from synthwave import Synthwave
    W, H = (AV, AV) if kind == "avatar" else (BW // 2, BH // 2)
    s = Synthwave(W, H, seed=seed, horizon=int(H * (0.62 if kind == "avatar" else 0.6)))
    s.sky()
    s.stars(n=500 if kind == "avatar" else 1200)
    s.sun(W / 2, H * 0.42, min(W, H) * (0.26 if kind == "avatar" else 0.2))
    s.floor()
    t = initials(name) if kind == "avatar" else name.upper()
    size = int(H * 0.26) if kind == "avatar" else int(H * 0.13)
    if kind == "banner":
        f = _font(size)
        while size > 30 and f.getlength(t) > SAFE[0] / 2 - 80:
            size -= 4
            f = _font(size)
    s.chrome_text(t, W / 2, H * (0.5 if kind == "avatar" else 0.48), size)
    img = _as_img(s.composite())
    return img if kind == "avatar" else img.resize((BW, BH), Image.LANCZOS)


def style_papercut(name, kind, seed):
    from papercut import Collage
    W, H = (AV, AV) if kind == "avatar" else (BW // 2, BH // 2)
    c = Collage(W, H, seed=seed)
    c.background("#232d66", texture="kraft")
    r = min(W, H) * (0.36 if kind == "avatar" else 0.2)
    cx = W / 2 if kind == "avatar" else W / 2 - SAFE[0] / 4 + r * 0.6
    c.piece(mask=c.circle_mask(cx, H / 2, r), colour="#f6d77a", texture="crayon")
    if kind == "banner":
        c.face(cx, H / 2 + r * 0.05, r * 0.85, mood="smile")
    img = _as_img(c.composite())
    if kind == "avatar":
        t = initials(name)
        d = ImageDraw.Draw(img)
        f = _font(_fit(t, int(r * 1.5), 300))
        d.text((W / 2 + 8, H / 2 + 12), t, font=f, fill="#8a5a2b", anchor="mm")   # cut-paper drop shadow
        d.text((W / 2, H / 2 + 4), t, font=f, fill="#232d66", anchor="mm")
    if kind == "banner":
        d = ImageDraw.Draw(img)
        size = _fit(name, int(SAFE[0] / 2 - r * 2 - 60), 150)
        d.text((cx + r + 40, H / 2), name, font=_font(size), fill="#fbf3e4", anchor="lm")
        img = img.resize((BW, BH), Image.LANCZOS)
    return img


def style_flat(name, kind, seed):
    from flatvector import FlatVector
    W, H = (AV, AV) if kind == "avatar" else (BW // 2, BH // 2)
    f = FlatVector(W, H, seed=seed)
    f.backdrop("#1c2541")
    f.stars(n=60 if kind == "avatar" else 140)
    f.moon(W * (0.8 if kind == "avatar" else 0.86), H * (0.2 if kind == "avatar" else 0.24), min(W, H) * (0.07 if kind == "avatar" else 0.12))
    f.mountain((W * 0.3, H * 0.55), (-W * 0.1, H), (W * 0.75, H), "#3a506b", snow=0.25, seed=seed)
    f.mountain((W * 0.72, H * 0.62), (W * 0.35, H), (W * 1.1, H), "#5bc0be", snow=0.0, seed=seed + 1)
    img = _as_img(getattr(f, "img"))
    d = ImageDraw.Draw(img)
    if kind == "avatar":
        t = initials(name)
        d.text((W * 0.46, H * 0.42), t, font=_font(_fit(t, int(W * 0.5), 260)), fill="#fbf3e4", anchor="mm",
               stroke_width=8, stroke_fill="#1c2541")
        return img
    d.text((W / 2, H / 2), name, font=_font(_fit(name, SAFE[0] // 2 - 80, 130)), fill="#fbf3e4", anchor="mm", stroke_width=3, stroke_fill="#1c2541")
    return img.resize((BW, BH), Image.LANCZOS)


def _txt(img, text, xy, size, fill, anchor="mm", stroke=0, stroke_fill=None, shadow=None):
    """Draw text on a PIL image; optional drop shadow (dx, dy, colour)."""
    d = ImageDraw.Draw(img)
    f = _font(size)
    if shadow:
        d.text((xy[0] + shadow[0], xy[1] + shadow[1]), text, font=f, fill=shadow[2], anchor=anchor,
               stroke_width=stroke, stroke_fill=shadow[2])
    d.text(xy, text, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=stroke_fill)


def _canvas(kind):
    """(W, H) to draw at: avatar full size, banner at half size (scaled up later)."""
    return (AV, AV) if kind == "avatar" else (BW // 2, BH // 2)


def _up(img, kind):
    return img if kind == "avatar" else img.resize((BW, BH), Image.LANCZOS)


def style_watercolor(name, kind, seed):
    from watercolor import Watercolor, hexc
    W, H = _canvas(kind)
    p = Watercolor(W, H, seed=seed)
    p.paper()
    av = kind == "avatar"
    p.gradient_wash(0, int(H * 0.62), top=hexc("#86b4d8"), bottom=hexc("#f7d4ae"), strength=0.8)
    sx, sy, sr = (W * 0.5, H * 0.45, W * 0.27) if av else (W * 0.22, H * 0.38, H * 0.16)
    p.glaze(p.blobs([(sx, sy, sr, sr)], rough=0.04, soft=3), hexc("#f2a65a"), 0.8, bloom=2)
    hy = H * (0.8 if av else 0.84)
    p.glaze(p.blobs([(W * 0.3, hy, W * 0.42, H * 0.16), (W * 0.78, hy + H * 0.02, W * 0.4, H * 0.15)], rough=0.12), hexc("#4f8a73"), 0.85, bloom=1)
    p.glaze(p.blobs([(W * 0.55, hy + H * 0.1, W * 0.6, H * 0.13)], rough=0.1), hexc("#2f5d62"), 0.85)
    p.splatter(hexc("#d9704a"), n=18, box=(0, 0, W, H * 0.7))
    img = _as_img(p.composite())
    ink = "#24324d"
    if av:
        t = initials(name)
        _txt(img, t, (W / 2, H * 0.47), _fit(t, int(W * 0.5), 300), ink, stroke=3, stroke_fill=ink)
        return img
    size = _fit(name, SAFE[0] // 2 - 40, 118)
    _txt(img, name, (W / 2, H * 0.47), size, ink, stroke=2, stroke_fill=ink)
    return _up(img, kind)


def style_ukiyoe(name, kind, seed):
    from ukiyoe import Ukiyoe
    W, H = _canvas(kind)
    u = Ukiyoe(W, H, seed=seed)
    av = kind == "avatar"
    u.bokashi(u.rect(0, 0, W, H * 0.66), "#2b4f8a", 0, H * 0.5)
    u.block(u.circle(W * (0.5 if av else 0.88), H * (0.3 if av else 0.3), min(W, H) * (0.12 if av else 0.1)), "#c8412f")
    # mountain, centred for the avatar and pushed left for the banner
    mx = W * (0.5 if av else 0.14)
    mw = W * (0.34 if av else 0.14)
    top = H * (0.34 if av else 0.4)
    base = H * 0.72
    pts = [(mx - mw, base), (mx - mw * 0.2, top + (base - top) * 0.1), (mx - mw * 0.07, top), (mx + mw * 0.07, top),
           (mx + mw * 0.2, top + (base - top) * 0.1), (mx + mw, base)]
    u.block(u.poly(pts), "#3d5a80")
    u.block(u.poly([(mx - mw * 0.2, top + (base - top) * 0.1), (mx - mw * 0.07, top), (mx + mw * 0.07, top),
                    (mx + mw * 0.2, top + (base - top) * 0.1), (mx + mw * 0.1, top + (base - top) * 0.2),
                    (mx, top + (base - top) * 0.15), (mx - mw * 0.1, top + (base - top) * 0.22)]), "#f4ebd5")
    u.key(pts, 4 if av else 3)
    # sea of waves
    sea = u.rect(0, H * 0.72, W, H)
    u.block(sea, "#1f3f73")
    u.seigaiha(sea, "#8fb3d9", r=34 if av else 26)
    # name plate
    img = _as_img(u.composite())
    d = ImageDraw.Draw(img)
    if av:
        t = initials(name)
        bx0, by0, bx1, by1 = W * 0.27, H * 0.43, W * 0.73, H * 0.73
        d.rectangle((bx0, by0, bx1, by1), fill="#f6e7c3", outline="#2a2320", width=6)
        _txt(img, t, (W / 2, (by0 + by1) / 2 + 6), _fit(t, int((bx1 - bx0) * 0.8), 190), "#2a2320")
        return img
    size = _fit(name, SAFE[0] // 2 - 120, 96)
    w = int(_font(size).getlength(name)) + 60
    bx0, bx1 = W / 2 - w / 2, W / 2 + w / 2
    by0, by1 = H * 0.5 - size * 0.8, H * 0.5 + size * 0.8
    d.rectangle((bx0, by0, bx1, by1), fill="#f6e7c3", outline="#2a2320", width=4)
    _txt(img, name, (W / 2, H * 0.5 + 3), size, "#2a2320")
    return _up(img, kind)


def _pix_text(p, text, cx, cy, size, fill, edge):
    """Chunky 1-bit text on a PixelArt canvas (the library's 3x5 font lacks many letters)."""
    f = _font(size)
    box = Image.new("1", (p.w, p.h), 0)
    d = ImageDraw.Draw(box)
    d.fontmode = "1"
    d.text((cx, cy), text, font=f, fill=1, anchor="mm")
    m = box if hasattr(box, "load") else box
    import numpy as np
    a = np.asarray(m, bool)
    grow = a | np.roll(a, 1, 0) | np.roll(a, -1, 0) | np.roll(a, 1, 1) | np.roll(a, -1, 1)
    sh = np.roll(np.roll(grow, 1, 0), 1, 1)
    p.buf[sh & ~grow] = p_c(edge) * 0.55
    p.buf[grow & ~a] = p_c(edge)
    p.buf[a] = p_c(fill)


def p_c(c):
    from pixelart import hexc
    return hexc(c)


def style_pixel(name, kind, seed):
    from pixelart import PixelArt
    av = kind == "avatar"
    w, h, sc = (100, 100, 8) if av else (320, 180, 8)
    p = PixelArt(w, h, scale=sc, seed=seed)
    p.gradient(0, 0, w, int(h * 0.75), "#1b1446", "#e0507a", steps=7)
    for _ in range(40 if av else 120):
        x, y = int(p.rng.uniform(0, w)), int(p.rng.uniform(0, h * 0.45))
        p.put(x, y, "#fdf3c8")
    mx, my, mr = (w * 0.5, h * 0.52, 22) if av else (w * 0.5, h * 0.5, 30)
    p.glow(mx, my, mr * 1.8, "#ffb35c", 0.7)
    p.circle(mx, my, mr, "#ffd86b")
    p.circle(mx - mr * 0.25, my - mr * 0.25, mr * 0.55, "#fff0a8")
    # city skyline
    x = 0
    ground = int(h * 0.8)
    while x < w:
        bw = int(p.rng.integers(7, 14)); bh = int(p.rng.integers(8, 22) if av else p.rng.integers(10, 30))
        top = ground - bh
        p.rect(x, top, x + bw, ground, "#130d33")
        for wy in range(top + 2, ground - 2, 4):
            for wx in range(x + 2, x + bw - 2, 3):
                if p.rng.random() < 0.4:
                    p.put(wx, wy, "#ffd86b")
        x += bw + 1
    p.rect(0, ground, w, h, "#0b0822")
    p.line(0, ground, w, ground, "#6a3d9a")
    t = initials(name) if av else name.upper()
    size = _fit(t, int(w * 0.62), 60) if av else 0
    if not av:
        size = 34
        while size > 10 and _font(size).getlength(t) > 180:
            size -= 2
    else:
        size = int(size / 1.0)
        while size > 10 and _font(size).getlength(t) > w * 0.62:
            size -= 2
    _pix_text(p, t, w / 2, h * (0.4 if av else 0.46), size, "#fff3d0", "#2a0f45")
    return p.composite().convert("RGB")


def style_comic(name, kind, seed):
    from comic import ComicCover, YELLOW, RED, BLUE, SKY
    W, H = _canvas(kind)
    av = kind == "avatar"
    c = ComicCover(W, H, seed=seed, screen=11.0 if av else 7.0, misreg=4.0 if av else 2.5)
    c.paper()
    c.graded(None, [BLUE, SKY, YELLOW], (0, 0), (0, H))
    cx, cy = W / 2, H / 2
    burst = c.burst_pts(cx, cy, W * (0.42 if av else 0.34), H * (0.42 if av else 0.4), spikes=16, depth=0.28, seed=seed)
    c.part(burst, RED, width=7 if av else 5)
    inner = c.burst_pts(cx, cy, W * (0.34 if av else 0.28), H * (0.34 if av else 0.32), spikes=16, depth=0.2, seed=seed + 1)
    c.part(inner, YELLOW, width=5 if av else 4)
    t = initials(name) if av else name.upper()
    if av:
        c.sfx(t, cx, cy, int(_fit(t, int(W * 0.5), 260) * 0.9), rot=-6)
    else:
        size = 110
        f = _font(size)
        while size > 30 and f.getlength(t) * 0.78 > SAFE[0] // 2 - 120:
            size -= 4
            f = _font(size)
        c.sfx(t, cx, cy, int(size * 0.95), rot=-3, width=5)
    c.brown_edges(width=40, amount=0.6)
    img = _as_img(c.render()) if not hasattr(c, "composite") else _as_img(c.composite())
    return _up(img, kind)


def style_cyberpunk(name, kind, seed):
    from cyberpunk import Cyberpunk, MAGENTA, CYAN, AMBER
    W, H = _canvas(kind)
    av = kind == "avatar"
    c = Cyberpunk(W, H, seed=seed, focal=W * 0.6 if av else 1150.0 / 2, wall=16.0 if av else 26.0)
    c.sky()
    c.street()
    c.building(-1, 12, 40, 45)
    c.building(+1, 12, 36, 60)
    t = initials(name) if av else name.upper()
    if av:
        c.neon_text(t, W / 2, H * 0.42, int(_fit(t, int(W * 0.55), 260)), MAGENTA, 30, level=0.6)
    else:
        from cyberpunk import sign_font
        size = 120
        while size > 30 and sign_font("neon", int(size * 0.9)).getlength(t) > SAFE[0] // 2 - 120:
            size -= 4
        c.neon_text(t, W / 2, H * 0.47, int(size * 0.9), MAGENTA, 30)
    c.rain()
    img = _as_img(c.render()) if not hasattr(c, "composite") else _as_img(c.composite())
    return _up(img, kind)


STYLES = {  # id -> (label, fn, mode); mode "lib" needs the drawing library, "fallback" is used only without it
    "chalk": ("Chalkboard", style_chalk, "lib"),
    "synthwave": ("Retro neon", style_synthwave, "lib"),
    "papercut": ("Paper cut-out", style_papercut, "lib"),
    "flat": ("Flat shapes", style_flat, "lib"),
    "watercolor": ("Watercolour", style_watercolor, "lib"),
    "ukiyoe": ("Japanese woodblock", style_ukiyoe, "lib"),
    "pixel": ("Pixel art", style_pixel, "lib"),
    "comic": ("Old comic", style_comic, "lib"),
    "cyberpunk": ("Neon city", style_cyberpunk, "lib"),
    "bold": ("Plain", style_bold, "fallback"),
}


def make(name: str, out: Path, banner: bool = False, seed: int = 7, only: list[str] | None = None) -> list[dict]:
    out.mkdir(parents=True, exist_ok=True)
    have_lib = _drawing_lib()
    made = []
    for sid, (label, fn, mode) in STYLES.items():
        if only and sid not in only:
            continue
        if (mode == "lib") != have_lib:   # drawing styles when the library exists, plain fallback when not
            continue
        item = {"style": sid, "label": label}
        try:
            img = fn(name, "avatar", seed)
            p = out / f"avatar-{sid}.png"
            _circle_crop(img).save(p)
            item["avatar"] = str(p)
            if banner:
                b = fn(name, "banner", seed).convert("RGB")
                p = out / f"banner-{sid}.jpg"
                b.save(p, quality=90)
                item["banner"] = str(p)
            made.append(item)
        except Exception as e:  # one broken style must not stop the others
            print(f"style {sid} failed: {e}", file=sys.stderr)
            traceback.print_exc(limit=2, file=sys.stderr)
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("out")
    ap.add_argument("--banner", action="store_true")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    print(json.dumps(make(a.name, Path(a.out), a.banner, a.seed, a.only)))


if __name__ == "__main__":
    main()
