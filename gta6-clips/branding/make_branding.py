#!/usr/bin/env python3
"""Draw the channel's profile picture and banner (Vice City Clips).

Original art only: a synthwave sunset, palm silhouettes and a "VC" monogram in
the channel colours from CHANNEL.md. No GTA or Rockstar logos or key art.

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
    horizon = int(s * 0.66)
    img = sky(s, s, horizon)
    sun(img, s // 2, horizon + int(s * 0.06), int(s * 0.30), horizon)
    grid(img, horizon)
    d = ImageDraw.Draw(img)
    palm(d, int(s * 0.16), s + 10, int(s * 0.80), 0.18)
    palm(d, int(s * 0.86), s + 10, int(s * 0.62), -0.22)
    glow_text(img, (s // 2, int(s * 0.47)), "VC", int(s * 0.36), (255, 255, 255), PINK, blur=22)
    # circular-crop safe: YouTube shows a circle, keep the monogram central
    img.save(path)


def banner(path, w=2560, h=1440):
    horizon = int(h * 0.66)
    img = sky(w, h, horizon)
    sun(img, w // 2, horizon + int(h * 0.05), int(h * 0.30), horizon)
    grid(img, horizon)
    d = ImageDraw.Draw(img)
    for x, ht, lean in [(250, 1250, 0.2), (520, 980, 0.12), (2330, 1250, -0.2), (2060, 960, -0.12)]:
        palm(d, x, h + 20, ht, lean)
    # everything readable stays inside YouTube's 1546x423 safe area (centred)
    cy = h // 2
    glow_text(img, (w // 2, cy - 40), "VICE CITY CLIPS", 150, (255, 255, 255), PINK, blur=26)
    glow_text(img, (w // 2, cy + 105), "DAILY GAMING CLIPS  •  BEST STREAM MOMENTS  •  GTA 6",
              46, CYAN, None, blur=10)
    img.save(path)


if __name__ == "__main__":
    avatar(HERE / "avatar.png")
    banner(HERE / "banner.png")
    print("wrote avatar.png and banner.png")
