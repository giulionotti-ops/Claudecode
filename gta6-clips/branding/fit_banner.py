#!/usr/bin/env python3
"""Fit the owner's Stream Peaks art (source-art.jpg: banner strip on top, avatar
circle below) to YouTube sizes: banner.png 2560x1440, avatar.png 800x800.

The strip is scaled to the full 2560 width (desktop shows a 2560x423 band, phones
the centre 1546x423) and centred; the rest of the 1440 height (shown on TVs) is a
blurred, darkened extension of the same art, feathered into the strip.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

HERE = Path(__file__).resolve().parent
W, H = 2560, 1440
STRIP_END = 390                      # source rows 0-389 are the banner strip
RING = (808, 396, 1174, 758)         # avatar circle bounds in the source

src = Image.open(HERE / "source-art.jpg").convert("RGB")
strip = src.crop((0, 0, src.width, STRIP_END))
sh = round(strip.height * W / strip.width)
strip = strip.resize((W, sh), Image.LANCZOS)

top = (H - sh) // 2
# extend the strip's own top and bottom edge rows outward, fading to the night
# colour, so TVs see a calm continuation instead of a stretched copy of the logo
NIGHT = (14, 8, 30)
bg = Image.new("RGB", (W, H), NIGHT)
edge_top = strip.crop((0, 0, W, 8)).resize((W, 1), Image.BOX).filter(ImageFilter.BoxBlur(160))
edge_bot = strip.crop((0, sh - 8, W, sh)).resize((W, 1), Image.BOX).filter(ImageFilter.BoxBlur(160))
for y in range(top):
    t = (top - y) / top                      # 0 at the strip, 1 at the canvas edge
    bg.paste(Image.blend(edge_top, Image.new("RGB", (W, 1), NIGHT), min(1, t * 3.5)), (0, y))
for y in range(top + sh, H):
    t = (y - top - sh) / (H - top - sh)
    bg.paste(Image.blend(edge_bot, Image.new("RGB", (W, 1), NIGHT), min(1, t * 3.5)), (0, y))
mask = Image.new("L", (W, sh), 255)
d = ImageDraw.Draw(mask)
feather = 90
for i in range(feather):
    a = int(255 * i / feather)
    d.line([(0, i), (W, i)], fill=a)
    d.line([(0, sh - 1 - i), (W, sh - 1 - i)], fill=a)
bg.paste(strip, (0, top), mask)
bg.save(HERE / "banner.png")

cx, cy = (RING[0] + RING[2]) // 2, (RING[1] + RING[3]) // 2
half = max(RING[2] - RING[0], RING[3] - RING[1]) // 2 + 12
av = src.crop((cx - half, cy - half, cx + half, cy + half)).resize((800, 800), Image.LANCZOS)
av.filter(ImageFilter.UnsharpMask(2, 60, 2)).save(HERE / "avatar.png")
print(f"banner.png {W}x{H} (strip {W}x{sh} at y={top}), avatar.png 800x800")
