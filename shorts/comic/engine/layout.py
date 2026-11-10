"""Panel layouts (fractions of the page) and blank template images used as Gemini layout references."""
import json, sys
from PIL import Image, ImageDraw
G = 0.018  # gutter
def rows(spec):
    """spec: list of (height_frac, [width_fracs]) -> list of panel boxes (x0,y0,x1,y1) in fractions."""
    out, y = [], G
    tot = sum(h for h, _ in spec); avail = 1 - G * (len(spec) + 1)
    for h, ws in spec:
        hh = avail * h / tot; x = G; wa = 1 - G * (len(ws) + 1)
        for w in ws:
            ww = wa * w; out.append((x, y, x + ww, y + hh)); x += ww + G
        y += hh + G
    return out
# per-project layout in script.json: "layout": {"page1": [[0.33, [1]], [0.31, [0.5, 0.5]], ...], ...}
PAGES = {k: rows(v) for k, v in json.load(open('script.json'))['layout'].items()}
if __name__ == '__main__':
    W, H = 1600, 2400
    for name, boxes in PAGES.items():
        im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im)
        for i, (a, b, c, e) in enumerate(boxes):
            d.rectangle([a * W, b * H, c * W, e * H], outline='black', width=10)
            d.text(((a + c) / 2 * W, (b + e) / 2 * H), str(i + 1), fill='black', font_size=120, anchor='mm')
        im.save(f'{name}-layout.png')
    json.dump(PAGES, open('layout.json', 'w'), indent=1)
