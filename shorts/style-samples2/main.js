// Five art directions for the Angron short, each its own composition. ?s=cogitator | silent | rpg | oil | anime
import { drawRig, POSE } from './figures.js';
import { ANGRON, GLADIATOR, DAEMON } from './angron.js';

const S = new URLSearchParams(location.search).get('s') || 'cogitator';
const W = 1080, H = 1920, cv = document.getElementById('c'), X = cv.getContext('2d');
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('40px "IM Fell English"');
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

// Draw the figure rig as flat shapes with a colour function (layout for the painterly styles)
class FlatPass {
  constructor(ctx, fill, stroke, lw = 0, base = new DOMMatrix(), paint = false) { this.g = this.s = this.ctx = ctx; this.fill = fill; this.stroke = stroke; this.lw = lw; this.base = base; this.paint = paint; this.leadScale = 1; }
  setTransform(m) { this.ctx.setTransform(this.base.multiply(m)); } save() { this.ctx.save(); } restore() { this.ctx.restore(); }
  piece(p, col, o = {}) { const g = this.ctx, f = this.fill(col, o); if (f) { g.fillStyle = f; g.fill(p); } if (this.paint && o.paint) { g.save(); g.clip(p); g.__col = f || col; o.paint(g); g.restore(); } if (this.stroke) { { const m = g.getTransform(); g.lineWidth = this.lw / Math.hypot(m.a, m.b); } g.strokeStyle = this.stroke(col, o); g.lineJoin = 'round'; g.stroke(p); } }
  lead() {} surf(p, f) { this.ctx.fillStyle = f; this.ctx.fill(p); }
}
const rgb = c => { if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } return (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); };
const tone = c => { const [r, g, b] = rgb(c); return (.3 * r + .55 * g + .15 * b) / 255; };
const rig = (g, m, pal, pose, fill, stroke, lw, face = 'turned', hide) => drawRig(new FlatPass(g, fill, stroke, lw), m, ANGRON, pose, pal, { id: 1, face, hide });
const NOWING = new Set(['wingB', 'wingF']);

// 1. IMPERIAL COGITATOR: a data-slate scan of the subject, monochrome phosphor, target boxes
function cogitator() {
  const G = '#7dff8a', D = 'rgba(125,255,138,'; X.fillStyle = '#020804'; X.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4) { X.fillStyle = 'rgba(0,0,0,.35)'; X.fillRect(0, y, W, 2); }
  X.strokeStyle = D + '.12)'; X.lineWidth = 1; for (let x = 0; x < W; x += 60) { X.beginPath(); X.moveTo(x, 0); X.lineTo(x, H); X.stroke(); } for (let y = 0; y < H; y += 60) { X.beginPath(); X.moveTo(0, y); X.lineTo(W, y); X.stroke(); }
  X.save(); X.shadowColor = G; X.shadowBlur = 12;   // the wireframe subject
  rig(X, new DOMMatrix().translate(540, 1150).scale(3.6), GLADIATOR, POSE.guard, () => null, () => G, 2.2, 'turned', NOWING);
  X.restore();
  const box = (x, y, w, h, label, val) => { X.strokeStyle = G; X.lineWidth = 3; const c = 26;
    for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { X.beginPath(); X.moveTo(px + dx * c, py); X.lineTo(px, py); X.lineTo(px, py + dy * c); X.stroke(); }
    X.font = '600 26px monospace'; X.fillStyle = G; X.textAlign = 'left'; X.fillText(label, x, y - 16); if (val) { X.fillStyle = '#e8ffe8'; X.fillText(val, x, y + h + 36); } };
  box(430, 690, 220, 230, '◈ CRANIUM', 'IMPLANT: BUTCHER\'S NAILS'); box(300, 960, 480, 420, '◈ TORSO', 'GENE-SIRE: THE EMPEROR');
  X.strokeStyle = G; X.setLineDash([8, 8]); X.beginPath(); X.moveTo(650, 740); X.lineTo(900, 600); X.lineTo(1040, 600); X.stroke(); X.setLineDash([]);
  X.font = '600 30px monospace'; X.fillStyle = G; X.textAlign = 'left';
  ['+++ COGITATOR RECORD 012-XII +++', 'SUBJECT ........ ANGRON', 'DESIGNATION .... PRIMARCH XII', 'STATUS ......... ALLEGIANCE LOST', 'THREAT ......... EXTREMIS'].forEach((l, i) => X.fillText(l, 60, 150 + i * 46));
  X.fillStyle = '#ff5a4a'; X.fillText('!! NEURAL DAMAGE: RAGE ONLY', 600, 590);
  X.fillStyle = G; X.font = '600 34px monospace'; X.textAlign = 'center'; X.fillText('> THEY HAMMERED THE NAILS', 540, 1640); X.fillText('  INTO HIS SKULL_', 540, 1690);
  X.font = '24px monospace'; X.fillStyle = D + '.6)'; X.fillText('+++ IN THE EMPEROR\'S NAME +++', 540, 1830);
}

// 2. SILENT FILM: ink line and silver wash in a 4:3 print, curtains, intertitle, grain
function silent() {
  X.fillStyle = '#1a0606'; X.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 36) { const gr = X.createLinearGradient(x, 0, x + 36, 0); gr.addColorStop(0, '#3a0a0c'); gr.addColorStop(.5, '#7a1418'); gr.addColorStop(1, '#2a0608'); X.fillStyle = gr; X.fillRect(x, 0, 36, H); }   // velvet
  const fx = 60, fy = 300, fw = 960, fh = 720;   // the 4:3 frame
  const [c, g] = mk(fw, fh); g.fillStyle = '#c9c4b6'; g.fillRect(0, 0, fw, fh);
  g.fillStyle = '#8a857a'; g.beginPath(); g.ellipse(fw / 2, fh * .95, fw * .7, fh * .45, 0, 0, 7); g.fill();   // arena sand
  for (let k = 0; k < 3; k++) { g.fillStyle = ['#3a3834', '#55524c', '#6e6a62'][k]; g.fillRect(0, 60 + k * 70, fw, 66); for (let x = 0; x < fw; x += 22) { g.fillStyle = '#1a1916'; g.beginPath(); g.arc(x + (k % 2) * 11, 80 + k * 70, 8, 0, 7); g.fill(); } }   // the crowd
  const ink = (p, col) => { g.fillStyle = `rgba(20,18,16,${.15 + (1 - tone(col)) * .75})`; g.fill(p); };
  drawRig(new FlatPass(g, (col) => `rgb(${Math.round(60 + tone(col) * 150)},${Math.round(56 + tone(col) * 148)},${Math.round(50 + tone(col) * 140)})`, () => '#141210', 3.2, new DOMMatrix(), true), new DOMMatrix().translate(fw * .42, fh * .62).scale(1.5), ANGRON, POSE.strike, GLADIATOR, { id: 1, face: 'turned', hide: NOWING });
  const gd = drawRig(new FlatPass(g, (col) => `rgb(${Math.round(70 + tone(col) * 120)},${Math.round(66 + tone(col) * 118)},${Math.round(60 + tone(col) * 112)})`, () => '#141210', 3, new DOMMatrix(), true), new DOMMatrix().translate(fw * .72, fh * .7).scale(-1.15, 1.15), ANGRON, POSE.hit, GLADIATOR, { id: 2, face: 'pain', hide: NOWING }); g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createRadialGradient(fw / 2, fh / 2, fh * .3, fw / 2, fh / 2, fw * .7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = gr; g.fillRect(0, 0, fw, fh);   // iris vignette
  for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '0,0,0'},${rnd() * .18})`; g.fillRect(rnd() * fw, rnd() * fh, 2, 2); }   // grain
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; for (const x of [220, 610]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, fh); g.stroke(); }   // scratches
  X.drawImage(c, fx, fy); X.strokeStyle = '#0a0a0a'; X.lineWidth = 10; X.strokeRect(fx, fy, fw, fh);
  // intertitle card
  X.fillStyle = '#0c0b0a'; X.fillRect(140, 1150, 800, 440); X.strokeStyle = '#d8d2c2'; X.lineWidth = 4; X.strokeRect(170, 1180, 740, 380); X.strokeRect(184, 1194, 712, 352);
  X.fillStyle = '#e8e2d2'; X.textAlign = 'center'; X.font = 'italic 52px "IM Fell English"';
  ['Sold to the slavers,', 'he was made to fight', 'in the arena.'].forEach((l, i) => X.fillText(l, 540, 1300 + i * 72));
  X.font = '30px "IM Fell English"'; X.fillText('❦', 540, 1530);
}

// 3. 16-BIT RPG BATTLE: drawn at 270x480, upscaled with hard pixels
function rpg() {
  const [c, g] = mk(270, 480);
  const sky = ['#2a1030', '#4a1830', '#7a2030', '#a83a2a', '#d06a2a']; sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 34, 270, 34); });
  g.fillStyle = '#5a4030'; g.fillRect(0, 170, 270, 120); g.fillStyle = '#3a2820'; for (let x = 0; x < 270; x += 18) g.fillRect(x, 150 + (x % 36 ? 6 : 0), 14, 20);   // arena wall
  g.fillStyle = '#c8a060'; g.fillRect(0, 240, 270, 70); g.fillStyle = '#a88040'; for (let k = 0; k < 40; k++) g.fillRect((k * 37) % 270, 245 + (k * 13) % 60, 3, 1);
  const pal = (col) => { const [r, gg, b] = rgb(col), q = v => Math.round(v / 64) * 64 + 20; return `rgb(${q(r)},${q(gg)},${q(b)})`; };
  drawRig(new FlatPass(g, pal, () => '#100808', .9), new DOMMatrix().translate(80, 262).scale(.42), ANGRON, POSE.guard, GLADIATOR, { id: 1, face: 'turned', hide: NOWING });
  drawRig(new FlatPass(g, pal, () => '#100808', .9), new DOMMatrix().translate(195, 258).scale(-.36, .36), ANGRON, POSE.guard, { ...GLADIATOR, arm: '#6a6e7a', arm2: '#4a4e58', cloak: '#3a3e48' }, { id: 2, face: 'stern', hide: NOWING }); g.setTransform(1, 0, 0, 1, 0, 0);
  const win = (x, y, w, h) => { g.fillStyle = '#101848'; g.fillRect(x, y, w, h); g.strokeStyle = '#e8e8f0'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.strokeStyle = '#6870b0'; g.lineWidth = 1; g.strokeRect(x + 4, y + 4, w - 8, h - 8); };
  win(6, 318, 258, 70); win(6, 394, 150, 80); win(160, 394, 104, 80);
  g.font = '9px monospace'; g.fillStyle = '#fff'; g.textAlign = 'left';
  g.fillText('ANGRON uses RAGE!', 16, 338); g.fillText('The Nails burn white-hot.', 16, 354); g.fillText('ARENA CHAMPION takes 9999!', 16, 370);
  g.fillText('ANGRON', 16, 412); g.fillText('HP 666/666', 16, 428); g.fillStyle = '#e04040'; g.fillRect(16, 434, 120, 4); g.fillStyle = '#fff'; g.fillText('RAGE  MAX', 16, 452); g.fillStyle = '#ff9a2a'; g.fillRect(16, 458, 120, 4);
  g.fillStyle = '#fff'; ['▶ FIGHT', '  REVOLT', '  FLEE'].forEach((t, i) => g.fillText(t, 170, 414 + i * 18));
  g.fillStyle = '#fff'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('9999', 195, 190);
  X.imageSmoothingEnabled = false; X.drawImage(c, 0, 0, W, H);
}

// 4. OIL PAINTING: a hidden colour layout re-painted with thick palette-knife strokes
function oil() {
  const [c, g] = mk(); const sky = g.createLinearGradient(0, 0, 0, 1300); sky.addColorStop(0, '#2a1a3a'); sky.addColorStop(.5, '#8a2a20'); sky.addColorStop(1, '#e88a3a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f4c070'; g.beginPath(); g.arc(860, 520, 120, 0, 7); g.fill();
  g.fillStyle = '#3a2a2a'; g.beginPath(); g.moveTo(0, 1400); g.lineTo(220, 1050); g.lineTo(420, 1250); g.lineTo(640, 980); g.lineTo(860, 1200); g.lineTo(1080, 1100); g.lineTo(1080, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#5a3a2a'; g.fillRect(0, 1500, W, 420);
  const pal = col => col;
  for (const [x, y, s] of [[180, 1500, .9], [330, 1530, .8], [800, 1520, .85], [930, 1500, .8]]) drawRig(new FlatPass(g, () => '#2a1a18', null), new DOMMatrix().translate(x, y).scale(s), ANGRON, POSE.raise, GLADIATOR, { id: 3, face: 'stern', hide: new Set([...NOWING, 'nails', 'blade', 'grip', 'guard']) });
  drawRig(new FlatPass(g, pal, null), new DOMMatrix().translate(540, 1380).scale(2.3), ANGRON, POSE.raise, { ...GLADIATOR, nails: '#e03a2a' }, { id: 1, face: 'turned', hide: NOWING }); g.setTransform(1, 0, 0, 1, 0, 0);
  const L = g.getImageData(0, 0, W, H).data;
  X.fillStyle = '#2a1a1a'; X.fillRect(0, 0, W, H);
  for (let pass = 0; pass < 3; pass++) for (let k = 0; k < [9000, 16000, 26000][pass]; k++) {   // knife strokes: colour sampled from the layout, raked highlight edge
    const x = rnd() * W, y = rnd() * H, i = ((y | 0) * W + (x | 0)) * 4, r = L[i], gg = L[i + 1], b = L[i + 2];
    const len = [40 + rnd() * 60, 18 + rnd() * 26, 7 + rnd() * 9][pass], wid = [16 + rnd() * 18, 8 + rnd() * 8, 3 + rnd() * 4][pass];
    if (pass === 2 && (x < 280 || x > 800 || y < 700 || y > 1700)) continue;   // fine knife work only on the figure
    const _ = 0, a = (rnd() - .5) * .9 + (y > 1450 ? 0 : -.2);
    const j = .88 + rnd() * .24; X.save(); X.translate(x, y); X.rotate(a);
    X.fillStyle = `rgb(${Math.min(255, r * j)},${Math.min(255, gg * j)},${Math.min(255, b * j)})`; X.fillRect(-len / 2, -wid / 2, len, wid);
    X.fillStyle = 'rgba(255,240,220,.18)'; X.fillRect(-len / 2, -wid / 2, len, 2); X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(-len / 2, wid / 2 - 2, len, 2); X.restore();
  }
  X.textAlign = 'center'; X.font = 'italic 54px "IM Fell English"'; X.fillStyle = '#f4e4c8'; X.shadowColor = '#000'; X.shadowBlur = 12;
  X.fillText('They swore to die together.', 540, 1760); X.shadowBlur = 0;
}

// 5. 80s ANIME: extreme close-up, two-tone cels, airbrushed glow, speed lines, CRT
function anime() {
  const gr = X.createRadialGradient(540, 760, 80, 540, 760, 1100); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(.35, '#e0402a'); gr.addColorStop(1, '#2a0a2a'); X.fillStyle = gr; X.fillRect(0, 0, W, H);
  X.strokeStyle = 'rgba(255,240,210,.55)'; for (let k = 0; k < 90; k++) { const a = rnd() * 6.283, r0 = 320 + rnd() * 120; X.lineWidth = 1 + rnd() * 5; X.beginPath(); X.moveTo(540 + Math.cos(a) * r0, 760 + Math.sin(a) * r0); X.lineTo(540 + Math.cos(a) * 1500, 760 + Math.sin(a) * 1500); X.stroke(); }
  const cel = (col) => { const t = tone(col), [r, g, b] = rgb(col); return t > .35 ? `rgb(${Math.min(255, r * 1.25)},${Math.min(255, g * 1.15)},${Math.min(255, b * 1.1)})` : `rgb(${r * .6},${g * .55},${b * .6})`; };
  X.save(); X.shadowColor = '#ff3a2a'; X.shadowBlur = 40;
  drawRig(new FlatPass(X, cel, () => '#1a0808', 3.4, new DOMMatrix(), true), new DOMMatrix().translate(520, 1820).scale(6.2), ANGRON, { ...POSE.raise, head: -.15 }, { ...GLADIATOR, nails: '#ffe080' }, { id: 1, face: 'turned', hide: NOWING });
  X.restore(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.fillStyle = 'rgba(255,255,200,.9)'; for (const [x, y] of []) { X.beginPath(); X.arc(x, y, 14, 0, 7); X.fill(); }   // the Nails ignite
  X.font = '900 120px Helvetica'; X.textAlign = 'center'; X.fillStyle = '#fff'; X.strokeStyle = '#1a0808'; X.lineWidth = 10; X.strokeText('RAAAGH!', 540, 1420); X.fillText('RAAAGH!', 540, 1420);
  X.fillStyle = 'rgba(0,0,0,.75)'; X.fillRect(0, 1640, W, 160); X.font = '700 42px Helvetica'; X.fillStyle = '#fff'; X.fillText('They took every feeling but rage.', 540, 1735);
  for (let y = 0; y < H; y += 4) { X.fillStyle = 'rgba(0,0,0,.18)'; X.fillRect(0, y, W, 2); }   // scanlines
  const img = X.getImageData(0, 0, W, H); const d = img.data, o = new Uint8ClampedArray(d);   // chroma bleed
  for (let i = 0; i < d.length; i += 4) { const j = i + 12; if (j < d.length) d[i] = o[j]; }
  X.putImageData(img, 0, 0);
}

const draw = ({ cogitator, silent, rpg, oil, anime })[S];
// every drawRig leaves its last transform behind: reset before any UI drawing
const _drawRig = drawRig; draw();
window.DUR = 1; window.render = () => {}; window.READY = true;
