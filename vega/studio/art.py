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
    r = min(W, H) * (0.34 if kind == "avatar" else 0.2)
    cx = W / 2 if kind == "avatar" else W / 2 - SAFE[0] / 4 + r * 0.6
    c.piece(mask=c.circle_mask(cx, H / 2, r), colour="#f6d77a", texture="crayon")
    c.face(cx, H / 2 + r * 0.05, r * 0.85, mood="smile")
    img = _as_img(c.composite())
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
    f.moon(W * (0.5 if kind == "avatar" else 0.86), H * (0.36 if kind == "avatar" else 0.24), min(W, H) * 0.12)
    f.mountain((W * 0.3, H * 0.55), (-W * 0.1, H), (W * 0.75, H), "#3a506b", snow=0.25, seed=seed)
    f.mountain((W * 0.72, H * 0.62), (W * 0.35, H), (W * 1.1, H), "#5bc0be", snow=0.0, seed=seed + 1)
    img = _as_img(getattr(f, "img"))
    d = ImageDraw.Draw(img)
    if kind == "avatar":
        t = initials(name)
        d.text((W / 2, H * 0.72), t, font=_font(_fit(t, int(W * 0.6), 220)), fill="#fbf3e4", anchor="mm")
        return img
    d.text((W / 2, H / 2), name, font=_font(_fit(name, SAFE[0] // 2 - 80, 130)), fill="#fbf3e4", anchor="mm", stroke_width=3, stroke_fill="#1c2541")
    return img.resize((BW, BH), Image.LANCZOS)


STYLES = {  # id -> (label, fn, needs drawing lib)
    "bold": ("Bold and clean", style_bold, False),
    "chalk": ("Chalkboard", style_chalk, True),
    "synthwave": ("Retro neon", style_synthwave, True),
    "papercut": ("Paper cut-out", style_papercut, True),
    "flat": ("Flat illustration", style_flat, True),
}


def make(name: str, out: Path, banner: bool = False, seed: int = 7, only: list[str] | None = None) -> list[dict]:
    out.mkdir(parents=True, exist_ok=True)
    have_lib = _drawing_lib()
    made = []
    for sid, (label, fn, needs) in STYLES.items():
        if only and sid not in only:
            continue
        if needs and not have_lib:
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
