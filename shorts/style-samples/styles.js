// Style sampler: one Angron frame (the daemon breaking his chains) drawn with the same figure in different looks.
// ?s=woodcut | engraving | shadow | pixel | comic | ink | gothic   (stained glass is taken from the real film)
import { smooth, circle } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { ANGRON, DAEMON } from './angron.js';

const S = new URLSearchParams(location.search).get('s') || 'woodcut';
const W = 1080, H = 1920, LINE = ['He broke his chains,', 'only to become a slave once more.'];
const cv = document.getElementById('gl'); cv.replaceWith(Object.assign(document.createElement('canvas'), { id: 'c', width: W, height: H }));
const out = document.getElementById('c'), X = out.getContext('2d');
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('40px "IM Fell English"');

// ---------- colour helpers ----------
const rgb = c => { if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
const tone = c => { const [r, g, b] = rgb(c); return (.3 * r + .55 * g + .15 * b) / 255; };
const reddish = c => { const [r, g, b] = rgb(c); return r > 110 && r > g * 1.6 && r > b * 1.6; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- a Pass that paints each glass piece with a style painter ----------
class StylePass {
  constructor(ctx, paint, base = new DOMMatrix()) { this.g = this.s = ctx; this.ctx = ctx; this.paint = paint; this.base = base; this.mode = 'style'; this.leadScale = 1; }
  setTransform(m) { this.ctx.setTransform(this.base.multiply(m)); } save() { this.ctx.save(); } restore() { this.ctx.restore(); }
  translate(x, y) { this.ctx.translate(x, y); } rotate(a) { this.ctx.rotate(a); } scale(x, y = x) { this.ctx.scale(x, y); }
  piece(path, col, o = {}) { this.paint(this.ctx, path, col, o); } lead() {} surf(p, f) { this.ctx.fillStyle = f; this.ctx.fill(p); }
}
function hatch(g, path, spacing, angle, color, width) {
  g.save(); g.clip(path); const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = color; g.lineWidth = width; g.beginPath();
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let d = -2400; d < 2400; d += spacing) { g.moveTo(540 + c * d - s * 2400, 960 + s * d + c * 2400); g.lineTo(540 + c * d + s * 2400, 960 + s * d - c * 2400); }
  g.stroke(); g.setTransform(m); g.restore();
}
const painters = {
  woodcut: (g, p, col, o) => {   // carved black blocks, gouged highlights, one red
    const t = tone(col), red = reddish(col) && t < .45;
    g.fillStyle = red ? '#a8161a' : t < .42 ? '#14110e' : '#e9dfc6'; g.fill(p);
    if (t >= .42) hatch(g, p, 9 + t * 14, ((o.id || 1) % 5) * .6, '#14110e', 2.4);
    else if (!red) hatch(g, p, 13, .9 + ((o.id || 1) % 3) * .3, '#3a332a', 1.6);
    g.lineWidth = 4 / g.getTransform().a; g.strokeStyle = '#14110e'; g.lineJoin = 'round'; g.stroke(p);
  },
  engraving: (g, p, col, o) => {   // copperplate: tone made of hatching; cross-hatched shadows
    const t = tone(col);
    g.fillStyle = '#efe4cc'; g.fill(p);
    hatch(g, p, 3 + t * 9, .75, 'rgba(70,40,20,.85)', 1.1);
    if (t < .4) hatch(g, p, 4 + t * 8, -.8, 'rgba(70,40,20,.75)', 1);
    if (t < .2) hatch(g, p, 4, .1, 'rgba(70,40,20,.7)', 1);
    g.lineWidth = 1.8 / g.getTransform().a; g.strokeStyle = 'rgba(60,32,14,.95)'; g.stroke(p);
    if (o.paint) { g.save(); g.clip(p); g.__col = '#efe4cc'; o.paint(g); g.restore(); }
  },
  shadow: (g, p, col) => {   // shadow puppetry against a burning sky
    g.fillStyle = reddish(col) ? '#2a0606' : '#0c0a0a'; g.fill(p);
    g.lineWidth = 2.2 / g.getTransform().a; g.strokeStyle = 'rgba(255,120,50,.45)'; g.stroke(p);
  },
  comic: (g, p, col) => {   // flat inks, halftone shadow, heavy outline
    const [r, gg, b] = rgb(col), boost = v => Math.min(255, v * 1.35 + 10);
    g.fillStyle = `rgb(${boost(r)},${boost(gg)},${boost(b)})`; g.fill(p);
    g.save(); g.clip(p); const m = g.getTransform(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < H; y += 9) for (let x = (y / 9 % 2) * 4.5; x < W; x += 9) { const k = Math.max(0, (x - 380) / 700); if (k > .05) { g.beginPath(); g.arc(x, y, 3.4 * Math.min(1, k), 0, 7); g.fill(); } }
    g.setTransform(m); g.restore();
    g.lineWidth = (S === 'pixel' ? 1.2 : 5) / g.getTransform().a; g.strokeStyle = '#0a0a0a'; g.lineJoin = 'round'; g.stroke(p);
  },
  ink: (g, p, col) => {   // sumi-e: grey washes, brushy edges, one vermilion
    const t = tone(col), red = reddish(col);
    g.save(); g.filter = 'blur(1.5px)'; g.fillStyle = red ? 'rgba(190,40,30,.82)' : `rgba(20,18,24,${.85 - t * .75})`; g.fill(p); g.restore();
    g.lineWidth = (2.5 + rnd() * 3) / g.getTransform().a; g.strokeStyle = 'rgba(10,10,14,.85)'; g.stroke(p);
  },
  gothic: (g, p, col) => {   // grimdark gothic: near-black shapes, glowing edges
    const red = reddish(col);
    g.fillStyle = red ? '#2a0808' : '#121016'; g.fill(p);
    g.save(); g.shadowColor = red ? '#ff3a2a' : '#ffb04a'; g.shadowBlur = 14; g.lineWidth = 2.4 / g.getTransform().a; g.strokeStyle = red ? '#ff5a3a' : '#e0a050'; g.stroke(p); g.restore();
  },
};
painters.pixel = painters.comic;   // drawn at low resolution, then upscaled (below)

// ---------- backgrounds ----------
const BG = {
  woodcut: g => { g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, W, H); g.fillStyle = '#14110e'; for (let k = 0; k < 40; k++) { g.save(); g.translate(540, 760); g.rotate(k / 40 * 6.283); g.fillRect(320, -6, 900, 12); g.restore(); } g.fillStyle = '#a8161a'; g.beginPath(); g.arc(540, 760, 300, 0, 7); g.fill(); hatch(g, circle(540, 760, 300), 16, .4, '#14110e', 2); },
  engraving: g => { g.fillStyle = '#efe4cc'; g.fillRect(0, 0, W, H); hatch(g, new Path2D('M0 0H1080V1500H0Z'), 7, 0, 'rgba(70,40,20,.35)', 1); },
  shadow: g => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a0510'); gr.addColorStop(.45, '#c2361a'); gr.addColorStop(.7, '#ff8a2a'); gr.addColorStop(1, '#3a0a08'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,220,150,.85)'; g.beginPath(); g.arc(540, 900, 220, 0, 7); g.fill(); },
  comic: g => { g.fillStyle = '#d23a2a'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,220,120,.6)'; g.lineWidth = 6; for (let k = 0; k < 60; k++) { const a = k / 60 * 6.283; g.beginPath(); g.moveTo(540 + Math.cos(a) * 200, 820 + Math.sin(a) * 200); g.lineTo(540 + Math.cos(a) * 1600, 820 + Math.sin(a) * 1600); g.stroke(); } },
  ink: g => { g.fillStyle = '#f2ede2'; g.fillRect(0, 0, W, H); g.save(); g.filter = 'blur(30px)'; g.fillStyle = 'rgba(30,30,40,.18)'; g.beginPath(); g.ellipse(540, 1500, 700, 260, 0, 0, 7); g.fill(); g.restore(); g.fillStyle = 'rgba(190,40,30,.9)'; g.fillRect(860, 220, 110, 110); g.fillStyle = '#f2ede2'; g.font = '600 54px Cinzel'; g.textAlign = 'center'; g.fillText('奴', 915, 296); },
  gothic: g => { const gr = g.createRadialGradient(540, 820, 50, 540, 820, 1200); gr.addColorStop(0, '#3a0a10'); gr.addColorStop(1, '#050306'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(224,160,80,.35)'; g.lineWidth = 3; for (const x of [130, 950]) { g.beginPath(); g.moveTo(x, 1700); g.lineTo(x, 400); g.quadraticCurveTo(x, 180, 540, 120); g.stroke(); } },
};
BG.pixel = g => { g.fillStyle = '#1a0a1a'; g.fillRect(0, 0, W, H); for (let k = 0; k < 8; k++) { g.fillStyle = ['#2a0a1a', '#3a0a14', '#5a1010', '#7a1a10', '#9a2a10', '#c24a10', '#e07a20', '#f0a040'][k]; g.fillRect(0, 300 + k * 120, W, 120); } };

// ---------- the scene ----------
function scene(g, paint, base) {
  const P = new StylePass(g, paint, base), I = new DOMMatrix();
  P.setTransform(I);
  P.piece(smooth([[-20, 1500, 1], [-20, 1380, 1], [200, 1330, 1], [380, 1400, 1], [560, 1320, 1], [760, 1390, 1], [1100, 1340, 1], [1100, 1500, 1]]), '#4a4038', { id: 3 });   // rubble
  P.piece(new Path2D('M0 1480H1080V1920H0Z'), '#2a2420', { id: 4 });
  const link = (x, y, id, col) => P.piece(circle(x, y, 17), col, { id });
  for (let k = 0; k < 9; k++) { link(40 + k * 34, 860 + k * 4, 100 + k, '#7a7c80'); link(1040 - k * 34, 860 + k * 4, 120 + k, '#7a7c80'); }   // broken chains
  for (let k = 0; k < 6; k++) { link(290 + k * 18, 1040 + k * 22, 140 + k, '#c02020'); link(790 - k * 18, 1040 + k * 22, 160 + k, '#c02020'); }   // the new, burning chains
  drawRig(P, I.translate(540, 1080).scale(3.1), ANGRON, { ...POSE.raise, wingB: .1, wingF: -.1 }, DAEMON, { id: 500, face: 'turned' });
  P.setTransform(I);
}
function caption(g) {
  const styles = {
    woodcut: ['#e9dfc6', '#14110e', '#14110e', '600 50px Cinzel'], engraving: ['#efe4cc', '#3c2414', '#3c2414', '44px "IM Fell English"'],
    shadow: ['rgba(0,0,0,0)', '#ffd9a0', 'rgba(0,0,0,0)', 'italic 50px "IM Fell English"'], comic: ['#fff6c8', '#0a0a0a', '#0a0a0a', '700 46px Helvetica'],
    ink: ['rgba(242,237,226,.94)', '#141218', 'rgba(190,40,30,.9)', '48px "IM Fell English"'], gothic: ['rgba(10,6,10,.85)', '#e0a050', '#e0a050', '600 44px Cinzel'], pixel: ['#000', '#fff', '#fff', '700 40px monospace'],
  }[S];
  g.setTransform(1, 0, 0, 1, 0, 0); g.font = styles[3]; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.max(...LINE.map(l => g.measureText(l).width)) + 80;
  g.fillStyle = styles[0]; g.fillRect(540 - w / 2, 1600, w, 150); g.strokeStyle = styles[2]; g.lineWidth = 4; g.strokeRect(540 - w / 2, 1600, w, 150);
  g.fillStyle = styles[1]; LINE.forEach((l, i) => g.fillText(S === 'woodcut' || S === 'gothic' ? l.toUpperCase() : l, 540, 1648 + i * 56));
}

if (S === 'pixel') {   // 16-bit look: draw at quarter size, upscale with hard pixels
  const lo = Object.assign(document.createElement('canvas'), { width: W / 4, height: H / 4 }), L = lo.getContext('2d');
  L.scale(.25, .25); BG.pixel(L); scene(L, painters.pixel, new DOMMatrix().scale(.25));
  X.imageSmoothingEnabled = false; X.drawImage(lo, 0, 0, W, H);
} else { BG[S](X); scene(X, painters[S]); }
caption(X);
window.DUR = 1; window.render = () => {}; window.READY = true;
