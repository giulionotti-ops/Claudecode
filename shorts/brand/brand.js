// Channel art in the series' glass style. ?a=pfp1|pfp2 (800x800) or banner1|banner2 (2560x1440; YouTube's safe area is the centre 1546x423).
import { makeComp } from './comp.js';
import { Pass, COL, circle, smooth, softPoly, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { FATHER2, FATHER2_PAL, SON2, SON2_TURNED, helm2 } from './figures2.js';
import { ANGEL, ANGEL_PAL, WINGS } from './angel.js';
import { GLAZIER, GLAZIER_PAL, GLAZIER_POSE } from './glazier.js';
import { hash } from '/core/lib.js';

const A = new URLSearchParams(location.search).get('a') || 'pfp1';
const NAME = 'GLAZIER OF TERRA', TAG = 'Warhammer 40,000 lore, told in stained glass';
const [W, H] = A.startsWith('pfp') ? [800, 800] : [2560, 1440];
const cv = document.getElementById('gl'); cv.width = W; cv.height = H; const comp = makeComp(cv);
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const L = { G: mk(), S: mk(), R: mk(), O: mk(), P: mk() }, C = {}; for (const k in L) C[k] = L[k].getContext('2d');
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('40px "IM Fell English"');
const P = new Pass(C.G, C.S), I = new DOMMatrix();

// quarry colours: a mixed jewel window, or one hue
const PAL = { jewel: [COL.ruby, COL.green2, COL.cobalt, '#8a5a18', COL.purple2, COL.ruby2], ruby: [COL.ruby, COL.ruby2, '#7a0c16'], green: [COL.green2, '#1f5226', COL.green], amber: ['#a0681c', '#8a5a18', '#6e4612'] };
function lozengeField(x0, y0, x1, y1, d, seed, pal = PAL.jewel) {   // quarries with painted curls
  for (let b = Math.floor(y0 / d) - 1; b <= y1 / d + 1; b++) for (let a = Math.floor(x0 / d) - 1; a <= x1 / d + 1; a++) {
    if ((a + b) & 1) continue;
    const J = (k, m) => [k * d + (hash(k * 12.9 + m * 78.2 + seed) - .5) * d * .3, m * d + (hash(k * 39.3 + m * 11.1 + seed) - .5) * d * .3];
    const h = hash(a * 3.3 + b * 7.9 + seed);
    P.piece(softPoly([J(a - 1, b), J(a, b - 1), J(a + 1, b), J(a, b + 1)], .12), pal[Math.floor(h * pal.length)], { id: 30000 + a * 131 + b, lead: 4, mat: false, edge: 6,
      paint: g => brush(g, [[a * d - d * .2, b * d + d * .15], [a * d, b * d - d * .15], [a * d + d * .2, b * d]], d * .07, { color: 'rgba(30,24,40,.4)' }) });
  }
}
function roundel(x, y, r, sky, id) {
  P.setTransform(I); P.piece(circle(x, y, r + r * .09), COL.gold, { id, lead: 6, mat: false });
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; P.piece(circle(x + Math.cos(a) * (r + r * .045), y + Math.sin(a) * (r + r * .045), r * .022), COL.white, { id: id + 1 + k, lead: 2.6, mat: false }); }
  P.piece(circle(x, y, r), sky, { id: id + 30, lead: 6, matW: 18 });
}
const inside = (x, y, r, fn) => { P.save(); P.g.clip(circle(x, y, r)); P.s.clip(circle(x, y, r)); fn(); P.restore(); P.setTransform(I); };
function scroll(cx, cy, w, h, text, size, id) {   // white-glass scroll lettered in grisaille
  P.setTransform(I);
  P.piece(smooth([[cx - w / 2, cy - h / 2], [cx - w / 2 + 14, cy - h / 2 - 8], [cx, cy - h / 2], [cx + w / 2 - 14, cy - h / 2 - 8], [cx + w / 2, cy - h / 2], [cx + w / 2 + 4, cy + h / 2], [cx + w / 2 - 14, cy + h / 2 + 8], [cx, cy + h / 2], [cx - w / 2 + 14, cy + h / 2 + 8], [cx - w / 2 - 4, cy + h / 2]]), COL.white, { id, lead: 6, matW: 10,
    paint: g => { g.font = `600 ${size}px Cinzel`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(52,30,14,.93)'; g.fillText(text, cx, cy + size * .04); } });
}
function ground(x, y, r, col, id) { P.setTransform(I); P.piece(new Path2D(`M${x - r - 20} ${y + r + 20} L${x - r - 20} ${y + r * .55} Q${x} ${y + r * .42} ${x + r + 20} ${y + r * .58} L${x + r + 20} ${y + r + 20} Z`), col, { id, lead: 5, matW: 12 }); }

C.S.fillStyle = '#2b2622'; C.S.fillRect(0, 0, W, H);
if (A === 'pfp1') {   // a legion helm in a roundel
  lozengeField(0, 0, W, H, 80, 3, PAL.ruby); roundel(400, 400, 330, COL.deepblue, 100);
  inside(400, 400, 330, () => { helm2(P, I, 400, 410, COL.white, 200, 9.5, '#7fdc4a'); });
} else if (A === 'pfp2') {   // the crowned Emperor, head and shoulders
  lozengeField(0, 0, W, H, 80, 5, PAL.green); roundel(400, 400, 330, COL.ruby2, 300);
  inside(400, 400, 330, () => drawRig(P, I.translate(372, 860).scale(4.6), FATHER2, POSE.fstand, FATHER2_PAL, { id: 400, face: 'stern' }));
} else if (A === 'pfp3') {   // the Glazier, head and shoulders, shard to his eye
  lozengeField(0, 0, W, H, 80, 7, PAL.jewel); roundel(400, 400, 330, '#26222e', 1100);
  inside(400, 400, 330, () => drawRig(P, I.translate(300, 900).scale(4.1), GLAZIER, GLAZIER_POSE.hold, GLAZIER_PAL, { id: 1200 }));
} else if (A === 'pfp4') {   // the Glazier full figure, holding up the shard
  lozengeField(0, 0, W, H, 80, 8, PAL.amber); roundel(400, 400, 330, '#1f2a3a', 1300);
  inside(400, 400, 330, () => { ground(400, 400, 330, '#4a3a30', 1310); drawRig(P, I.translate(380, 470).scale(1.75), GLAZIER, GLAZIER_POSE.show, GLAZIER_PAL, { id: 1400 }); });
} else if (A === 'banner3') {   // the Glazier at the centre between the words, a jewel window behind
  const top = 380, bot = 1060, cx = W / 2;
  P.setTransform(I); P.surf(new Path2D(`M0 ${top - 36} H${W} V${bot + 36} H0 Z`), '#6e6556');
  P.save(); const band = new Path2D(`M0 ${top} H${W} V${bot} H0 Z`); P.g.clip(band); P.s.clip(band); lozengeField(0, top, W, bot, 64, 12, PAL.jewel); P.restore(); P.setTransform(I);
  P.lead(new Path2D(`M0 ${top} H${W} V${bot} H0 Z`), 8);
  roundel(cx, 720, 300, '#26222e', 1500); inside(cx, 720, 300, () => { ground(cx, 720, 300, '#4a3a30', 1510); drawRig(P, I.translate(cx - 30, 760).scale(1.55), GLAZIER, GLAZIER_POSE.hold, GLAZIER_PAL, { id: 1600 }); });
  scroll(cx - 640, 680, 600, 136, 'GLAZIER', 92, 1700); scroll(cx + 640, 680, 600, 136, 'OF TERRA', 92, 1710);
  scroll(cx - 640, 800, 520, 56, 'LORE OF THE IMPERIUM', 26, 1720); scroll(cx + 640, 800, 520, 56, 'TOLD IN STAINED GLASS', 26, 1730);
} else if (A === 'banner4') {   // banner3 squeezed into YouTube's mobile safe area (centre 1546x423), so phones show it all
  const top = 380, bot = 1060, cx = W / 2, r = 188, k = r / 300;
  P.setTransform(I); P.surf(new Path2D(`M0 ${top - 36} H${W} V${bot + 36} H0 Z`), '#6e6556');
  P.save(); const band = new Path2D(`M0 ${top} H${W} V${bot} H0 Z`); P.g.clip(band); P.s.clip(band); lozengeField(0, top, W, bot, 64, 12, PAL.jewel); P.restore(); P.setTransform(I);
  P.lead(new Path2D(`M0 ${top} H${W} V${bot} H0 Z`), 8);
  roundel(cx, 720, r, '#26222e', 1500); inside(cx, 720, r, () => { ground(cx, 720, r, '#4a3a30', 1510); drawRig(P, I.translate(cx - 30 * k, 720 + 40 * k).scale(1.55 * k), GLAZIER, GLAZIER_POSE.hold, GLAZIER_PAL, { id: 1600 }); });
  scroll(cx - 490, 672, 440, 100, 'GLAZIER', 68, 1700); scroll(cx + 490, 672, 440, 100, 'OF TERRA', 68, 1710);
  scroll(cx - 490, 778, 390, 46, 'LORE OF THE IMPERIUM', 20, 1720); scroll(cx + 490, 778, 390, 46, 'TOLD IN STAINED GLASS', 20, 1730);
} else {   // banners: a glass band across the stone, three roundels and the name
  const top = 420, bot = 1020;
  P.setTransform(I); P.surf(new Path2D(`M0 ${top - 36} H${W} V${bot + 36} H0 Z`), '#6e6556');
  P.save(); const band = new Path2D(`M0 ${top} H${W} V${bot} H0 Z`); P.g.clip(band); P.s.clip(band); lozengeField(0, top, W, bot, 64, 9, A === 'banner1' ? PAL.jewel : PAL.amber); P.restore(); P.setTransform(I);
  P.lead(new Path2D(`M0 ${top} H${W} V${bot} H0 Z`), 8);
  const cx = W / 2, r = 230;
  if (A === 'banner1') {   // Emperor | name | Horus
    roundel(cx - 760, 720, r, COL.deepblue, 500); inside(cx - 760, 720, r, () => { ground(cx - 760, 720, r, COL.olive, 510); drawRig(P, I.translate(cx - 770, 740).scale(1.25), FATHER2, POSE.reach, FATHER2_PAL, { id: 520, face: 'stern' }); });
    roundel(cx + 760, 720, r, COL.purple2, 600); inside(cx + 760, 720, r, () => { ground(cx + 760, 720, r, COL.brown, 610); drawRig(P, I.translate(cx + 770, 740).scale(-1.25, 1.25), SON2, POSE.raise, SON2_TURNED, { id: 620, face: 'turned', turned: true }); });
    scroll(cx, 690, 1180, 190, NAME, 104, 700); scroll(cx, 850, 900, 70, TAG.toUpperCase(), 30, 710);
  } else {   // the Angel at the centre, helms either side
    roundel(cx, 720, r, COL.cobalt, 800); inside(cx, 720, r, () => { ground(cx, 720, r, COL.green2, 810); drawRig(P, I.translate(cx, 735).scale(1.15), ANGEL, { ...POSE.raise, ...WINGS.spread }, ANGEL_PAL, { id: 820, face: 'calm' }); });
    scroll(cx - 560, 660, 620, 130, 'GLAZIER', 84, 900); scroll(cx + 560, 660, 620, 130, 'OF TERRA', 84, 910);
    scroll(cx, 980, 980, 66, TAG.toUpperCase(), 28, 920);
    for (let k = 0; k < 3; k++) { helm2(P, I, cx - 760 + k * 110, 820, COL.white, 940 + k * 5, 3.0); helm2(P, I, cx + 540 + k * 110, 820, COL.teal, 970 + k * 5, 3.0, '#ff5a2a'); }
  }
}
const GLOW = A === 'pfp3' ? [[470, 270, 120, 1.4, [1, .3, .25]]] : A === 'pfp4' ? [[470, 300, 70, 1.2, [1, .3, .25]]] : A === 'banner3' ? [[W / 2 + 40, 590, 90, 1.3, [1, .3, .25]]] : A === 'banner4' ? [[W / 2 + 25, 639, 56, 1.3, [1, .3, .25]]] : [];   // the shard catches the light
comp.render(L, { cam: [W / 2, H / 2, 1], lb: true, haze: .25, amb: .55, raysK: 0, expo: 1.05, bloom: .45, vign: .25, lancets: [], pts: GLOW });
window.DUR = 1; window.render = () => {}; window.READY = true;
