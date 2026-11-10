"""Find panel boxes on a page image by scanning for white gutters. Writes panels.json (pixel boxes)."""
import json, numpy as np
from PIL import Image
def runs(mask, minlen):
    out, s = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and s is None: s = i
        if not v and s is not None:
            if i - s >= minlen: out.append((s, i))
            s = None
    return out
res = {}
for page in json.load(open('script.json'))['layout']:
    a = np.asarray(Image.open(f'{page}-art.jpg').convert('RGB')).min(2) < 230   # not white
    H, W = a.shape
    boxes = []
    for y0, y1 in runs(a.mean(1) > 0.3, 100):          # bands with content
        band = a[y0:y1]
        for x0, x1 in runs(band.mean(0) > 0.3, 100):
            boxes.append([int(x0), int(y0), int(x1), int(y1)])
    res[page] = {'size': [W, H], 'panels': boxes}
    print(page, W, H, boxes)
json.dump(res, open('panels.json', 'w'), indent=1)
