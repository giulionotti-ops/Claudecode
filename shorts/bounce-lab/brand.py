"""Bounce Lab brand art: profile picture and banner, drawn with the same look as the shorts.
  python brand.py        writes brand/pfp.jpg (800x800) and brand/banner.jpg (2560x1440, text inside the 1546x423 safe area)
"""
import math, os, subprocess
import cairo
from engine import PALETTE, FONT

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'brand'); os.makedirs(OUT, exist_ok=True)


def bg(ctx, w, h):
    g = cairo.LinearGradient(0, 0, 0, h)
    g.add_color_stop_rgb(0, 0.05, 0.055, 0.10); g.add_color_stop_rgb(1, 0.08, 0.07, 0.15)
    ctx.set_source(g); ctx.paint()


def ring(ctx, x, y, r, width):
    ctx.set_source_rgb(0.075, 0.08, 0.14); ctx.arc(x, y, r, 0, 2 * math.pi); ctx.fill()
    for wdt, a in ((width * 2.8, 0.06), (width * 1.8, 0.12), (width, 1.0)):
        ctx.set_line_width(wdt); ctx.set_source_rgba(0.62, 0.66, 0.95, a)
        ctx.arc(x, y, r, 0, 2 * math.pi); ctx.stroke()


def ball_arc(ctx, x, y, r, br, n=7):
    """A ball bouncing along an arc, with a fading trail of copies in the palette colours."""
    for k in range(n):
        f = (k + 1) / n
        a = math.radians(200 + k * 22)
        bx, by = x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55 + r * 0.32
        ctx.set_source_rgba(*PALETTE[k % len(PALETTE)], 0.25 + 0.75 * f)
        ctx.arc(bx, by, br * (0.55 + 0.45 * f), 0, 2 * math.pi); ctx.fill()


def save(surf, name):
    png = os.path.join(OUT, name + '.png'); surf.write_to_png(png)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', png, '-q:v', '2', os.path.join(OUT, name + '.jpg')], check=True)
    os.remove(png)


def text(ctx, s, x, y, size, rgb, weight=cairo.FONT_WEIGHT_BOLD):
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL, weight); ctx.set_font_size(size)
    e = ctx.text_extents(s); ctx.move_to(x - e.width / 2 - e.x_bearing, y); ctx.set_source_rgb(*rgb); ctx.show_text(s)


# profile picture (YouTube crops it to a circle)
s = cairo.ImageSurface(cairo.FORMAT_RGB24, 800, 800); c = cairo.Context(s)
bg(c, 800, 800); ring(c, 400, 400, 300, 22); ball_arc(c, 400, 400, 300, 46)
save(s, 'pfp')

# banner
s = cairo.ImageSurface(cairo.FORMAT_RGB24, 2560, 1440); c = cairo.Context(s)
bg(c, 2560, 1440)
for k, (x, y, r) in enumerate(((330, 380, 260), (2230, 1060, 300), (2300, 300, 150), (260, 1130, 170))):
    c.set_source_rgba(*PALETTE[(k * 3) % 8], 0.10); c.arc(x, y, r, 0, 2 * math.pi); c.fill()
ring(c, 700, 720, 165, 12); ball_arc(c, 700, 720, 165, 24)
text(c, "Bounce Lab", 1460, 745, 150, (1, 1, 1))
text(c, 'satisfying physics, every day', 1460, 815, 52, (1, 0.9, 0.35), cairo.FONT_WEIGHT_NORMAL)
save(s, 'banner')
print('wrote brand/pfp.jpg and brand/banner.jpg')
