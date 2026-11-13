#!/usr/bin/env python3
"""Draw the channel's profile picture and banner (Stream Peaks).

Original art only: a synthwave sunset, neon mountains and an "SP" monogram with
a play arrow, in the channel colours from CHANNEL.md. No game or publisher
logos or key art.

    python3 make_branding.py          # writes avatar.png (800x800) and banner.png (2560x1440)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FONTS = HERE.parents[1] / ".claude/skills/short-editing/engine/fonts"
BLACK = str(FONTS / "ArchivoBlack.ttf")
PINK, CYAN, YELLOW = (255, 79, 163), (77, 225, 255), (255, 225, 77)
NIGHT, PURPLE = (14, 6, 30), (70, 16, 92)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sky(w, h, horizon):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        if y < horizon:
            t = y / horizon
            c = lerp(NIGHT, PURPLE, t * 0.7) if t < 0.7 else lerp(lerp(NIGHT, PURPLE, 0.49), PINK, (t - 0.7) / 0.3 * 0.55)
        else:
            c = lerp((40, 8, 50), NIGHT, min(1, (y - horizon) / (h - horizon) * 1.4))
        for x in range(w):
            px[x, y] = c
    return img


def sun(img, cx, cy, r, horizon=None):
    """Striped synthwave sun, yellow top to pink bottom, cut by the horizon."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(cy - r, min(cy + r, horizon or cy + r)):
        t = (y - (cy - r)) / (2 * r)
        half = int(math.sqrt(max(0, r * r - (y - cy) ** 2)))
        band = int(r * 0.09)
        # stripes widen toward the bottom
        if t > 0.22 and ((y - cy) % band) < band * (t - 0.18) * 1.6:
            continue
        d.line([(cx - half, y), (cx + half, y)], fill=lerp(YELLOW, PINK, t) + (255,))
    glow = layer.filter(ImageFilter.GaussianBlur(r * 0.25))
    img.paste(glow, (0, 0), glow)
    img.paste(layer, (0, 0), layer)


def grid(img, horizon, color=PINK):
    """Perspective floor grid below the horizon."""
    w, h = img.size
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(1, 14):
        y = horizon + int((h - horizon) * (i / 13) ** 2.2)
        d.line([(0, y), (w, y)], fill=color + (int(70 + 120 * i / 13),), width=max(2, w // 900))
    for i in range(-24, 25):
        d.line([(w / 2 + i * w * 0.012, horizon), (w / 2 + i * w * 0.16, h)],
               fill=color + (140,), width=max(2, w // 900))
    img.paste(layer, (0, 0), layer)


def palm(d, base_x, base_y, height, lean, color=(8, 2, 16)):
    """Silhouette palm: curved trunk plus tapered fronds."""
    pts, segs = [], 24
    for i in range(segs + 1):
        t = i / segs
        pts.append((base_x + lean * height * t * t, base_y - height * t))
    for i in range(segs):
        wdt = int(height * (0.045 - 0.025 * i / segs))
        d.line([pts[i], pts[i + 1]], fill=color, width=max(3, wdt))
    tx, ty = pts[-1]
    for ang, ln in [(-170, 1.0), (-140, 0.9), (-105, 0.7), (-75, 0.7), (-40, 0.9), (-10, 1.0),
                    (160, 0.75), (20, 0.75), (-60, 0.55), (-125, 0.55)]:
        L = height * 0.42 * ln
        a = math.radians(ang)
        poly_top, poly_bot = [], []
        for k in range(16):
            s = k / 15
            droop = (s ** 2) * L * 0.35
            x = tx + math.cos(a) * L * s
            y = ty + math.sin(a) * L * s + droop
            wid = height * 0.035 * math.sin(math.pi * min(1, s * 1.15))
            nx, ny = -math.sin(a), math.cos(a)
            poly_top.append((x + nx * wid, y + ny * wid))
            poly_bot.append((x - nx * wid, y - ny * wid))
        d.polygon(poly_top + poly_bot[::-1], fill=color)


def mountains(img, horizon, peaks, color=(48, 14, 74), edge=CYAN):
    """Neon-edged mountain range sitting on the horizon."""
    w, _ = img.size
    pts = [(0, horizon)] + [(int(x * w), int(horizon - h * img.size[1])) for x, h in peaks] + [(w, horizon)]
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon(pts, fill=color + (255,))
    d.line(pts, fill=edge + (255,), width=max(3, w // 500), joint="curve")
    g = layer.filter(ImageFilter.GaussianBlur(w // 260))
    img.paste(g, (0, 0), g)
    img.paste(layer, (0, 0), layer)


def play_icon(img, cx, cy, size, fill=YELLOW):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tri = [(cx - size * 0.4, cy - size * 0.5), (cx - size * 0.4, cy + size * 0.5), (cx + size * 0.5, cy)]
    d.polygon(tri, fill=fill + (255,))
    g = layer.filter(ImageFilter.GaussianBlur(size * 0.15))
    img.paste(g, (0, 0), g)
    img.paste(layer, (0, 0), layer)


def glow_text(img, xy, text, size, fill, outline=None, anchor="mm", blur=18):
    font = ImageFont.truetype(BLACK, size)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, fill=fill + (255,), anchor=anchor,
                               stroke_width=max(2, size // 22), stroke_fill=(outline or fill) + (255,))
    g = layer.filter(ImageFilter.GaussianBlur(blur))
    img.paste(g, (0, 0), g)
    img.paste(g, (0, 0), g)
    ImageDraw.Draw(img).text(xy, text, font=font, fill=fill, anchor=anchor,
                             stroke_width=max(2, size // 22), stroke_fill=outline or fill)


def avatar(path, s=800):
    horizon = int(s * 0.70)
    img = sky(s, s, horizon)
    mountains(img, horizon, [(0.0, 0.14), (0.1, 0.24), (0.2, 0.13), (0.3, 0.05), (0.36, 0.0),
                             (0.64, 0.0), (0.72, 0.07), (0.82, 0.19), (0.92, 0.12), (1.0, 0.22)])
    sun(img, s // 2, horizon + int(s * 0.06), int(s * 0.30), horizon)
    grid(img, horizon)
    glow_text(img, (s // 2, int(s * 0.44)), "SP", int(s * 0.36), (255, 255, 255), PINK, blur=22)
    play_icon(img, int(s * 0.5), int(s * 0.80), int(s * 0.11))
    img.save(path)


def banner(path, w=2560, h=1440):
    horizon = int(h * 0.68)
    img = sky(w, h, horizon)
    mountains(img, horizon, [(0.0, 0.22), (0.07, 0.31), (0.15, 0.17), (0.23, 0.26), (0.31, 0.10),
                             (0.37, 0.0), (0.63, 0.0), (0.69, 0.11), (0.77, 0.27), (0.85, 0.16),
                             (0.93, 0.32), (1.0, 0.21)])
    sun(img, w // 2, horizon + int(h * 0.05), int(h * 0.30), horizon)
    grid(img, horizon)
    # everything readable stays inside YouTube's 1546x423 safe area (centred)
    cy = h // 2
    glow_text(img, (w // 2, cy - 40), "STREAM PEAKS", 160, (255, 255, 255), PINK, blur=26)
    glow_text(img, (w // 2, cy + 110), "THE BEST GAMING STREAM MOMENTS  •  NEW CLIPS DAILY",
              46, CYAN, None, blur=10)
    img.save(path)


if __name__ == "__main__":
    avatar(HERE / "avatar-synthwave.png")
    banner(HERE / "banner-synthwave.png")
    print("wrote avatar-synthwave.png and banner-synthwave.png (old art; the live art comes from fit_banner.py)")
