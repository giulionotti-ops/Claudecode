// Five Lemo-Opuscar styles on one 40k scene (the Golden Throne). index.html?style=impasto|engraving|ascii|dossier|hd2d
const W = 1080, H = 1920, S = new URLSearchParams(location.search).get('style') || 'impasto';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const words = (await fetch('voice/words.json').then(r => r.json())).L1, V0 = .6, VOICE = words.map(([w, a, b]) => [w, a + V0, b + V0]);
const DUR = 10.2; window.DUR = DUR;
await Promise.all(['40px VT323', '500 40px "Bodoni Moda"', '40px "Alfa Slab One"', '600 40px Cinzel', 'italic 500 40px "Cormorant Garamond"', '40px "Pinyon Script"'].map(f => document.fonts.load(f)));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, ss = x => { x = clamp(x); return x * x * (3 - 2 * x); }, seg = (t, a, b) => clamp((t - a) / (b - a));
const rng = s => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const spoken = t => VOICE.filter(w => t >= w[1] - .02);

// ---------- the scene, value-planned: dark nave, rose window halo, the throne, the seated Emperor, candles ----------
function scene(x, t = 0, opt = {}) {
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d131c'); gr.addColorStop(1, '#040507'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  // rose window
  const cx = 540, cy = 640, R = 300;
  let rg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6); rg.addColorStop(0, 'rgba(255,214,140,.55)'); rg.addColorStop(.5, 'rgba(160,70,40,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.clip();
  for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 16; x.fillStyle = ['#6b1f1a', '#1d3a6b', '#7a5a1a', '#2a5a4a'][i % 4]; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a1); x.fill(); }
  rg = x.createRadialGradient(cx, cy, 0, cx, cy, R); rg.addColorStop(0, 'rgba(255,240,200,.95)'); rg.addColorStop(.35, 'rgba(255,200,120,.5)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = rg; x.fillRect(cx - R, cy - R, R * 2, R * 2);
  x.strokeStyle = '#0a0806'; x.lineWidth = 14; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.stroke(); }
  x.beginPath(); x.arc(cx, cy, R * .5, 0, 7); x.stroke(); x.restore();
  x.strokeStyle = '#0a0806'; x.lineWidth = 26; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
  // pillars and pointed arch
  for (const px of [40, 900]) { const pg = x.createLinearGradient(px, 0, px + 140, 0); pg.addColorStop(0, '#07090c'); pg.addColorStop(.7, '#1b222b'); pg.addColorStop(1, '#0b0e12'); x.fillStyle = pg; x.fillRect(px, 250, 140, 1500); }
  x.strokeStyle = '#1b222b'; x.lineWidth = 60; x.beginPath(); x.moveTo(110, 300); x.quadraticCurveTo(110, 80, 540, 20); x.quadraticCurveTo(970, 80, 970, 300); x.stroke();
  // throne back with spires
  x.fillStyle = '#3a2a12'; x.beginPath(); x.moveTo(250, 1460); x.lineTo(250, 760); x.lineTo(300, 600); x.lineTo(350, 760); x.lineTo(390, 540); x.lineTo(440, 700); x.lineTo(540, 380); x.lineTo(640, 700); x.lineTo(690, 540); x.lineTo(730, 760); x.lineTo(780, 600); x.lineTo(830, 760); x.lineTo(830, 1460); x.closePath(); x.fill();
  const tg = x.createLinearGradient(250, 0, 830, 0); tg.addColorStop(0, 'rgba(0,0,0,.6)'); tg.addColorStop(.5, 'rgba(255,200,90,.25)'); tg.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = tg; x.fill();
  // cables from the throne
  x.strokeStyle = '#120d07'; x.lineWidth = 9; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(270 + i * 90, 1460); x.bezierCurveTo(260 + i * 95, 1280, 380 + i * 50, 1250, 420 + i * 40, 1120); x.stroke(); }
  // the Emperor: halo, head, pauldrons, torso, knees, arms on the armrests
  const hx = 540, hy = 840;
  rg = x.createRadialGradient(hx, hy, 0, hx, hy, 170); rg.addColorStop(0, 'rgba(255,240,190,.9)'); rg.addColorStop(1, 'rgba(255,220,140,0)'); x.fillStyle = rg; x.beginPath(); x.arc(hx, hy, 170, 0, 7); x.fill();
  const gold = (a, b) => { const q = x.createLinearGradient(a, 0, b, 0); q.addColorStop(0, '#5a4012'); q.addColorStop(.45, '#e8b84a'); q.addColorStop(.6, '#ffe6a0'); q.addColorStop(1, '#4a3410'); return q; };
  x.fillStyle = gold(380, 700); x.beginPath(); x.moveTo(420, 950); x.lineTo(660, 950); x.lineTo(630, 1180); x.lineTo(450, 1180); x.closePath(); x.fill();
  for (const sd of [-1, 1]) { x.fillStyle = gold(hx + sd * 60 - 90, hx + sd * 60 + 90); x.beginPath(); x.ellipse(hx + sd * 120, 950, 105, 62, sd * .2, 0, 7); x.fill(); }
  x.fillStyle = gold(400, 680); x.beginPath(); x.moveTo(430, 1170); x.lineTo(650, 1170); x.lineTo(700, 1320); x.lineTo(380, 1320); x.closePath(); x.fill();
  for (const sd of [-1, 1]) { x.fillStyle = gold(hx + sd * 130 - 50, hx + sd * 130 + 50); x.fillRect(hx + sd * 130 - 40, 1300, 80, 160); x.fillRect(hx + sd * 200 - 40, 1000, 70, 170); }
  x.fillStyle = '#c9a06a'; x.beginPath(); x.ellipse(hx, hy + 20, 48, 60, 0, 0, 7); x.fill();
  x.fillStyle = '#2a1d0c'; x.beginPath(); x.ellipse(hx - 16, hy + 14, 9, 6, 0, 0, 7); x.ellipse(hx + 16, hy + 14, 9, 6, 0, 0, 7); x.fill();
  x.fillStyle = gold(470, 610); x.beginPath(); x.moveTo(hx - 70, hy - 30); x.lineTo(hx - 40, hy - 95); x.lineTo(hx - 15, hy - 50); x.lineTo(hx, hy - 110); x.lineTo(hx + 15, hy - 50); x.lineTo(hx + 40, hy - 95); x.lineTo(hx + 70, hy - 30); x.closePath(); x.fill();
  // steps
  for (let i = 0; i < 4; i++) { x.fillStyle = ['#151a20', '#11151a', '#0d1014', '#090b0e'][i]; x.fillRect(140 - i * 50, 1460 + i * 70, 800 + i * 100, 70); x.fillStyle = 'rgba(255,190,110,.12)'; x.fillRect(140 - i * 50, 1460 + i * 70, 800 + i * 100, 4); }
  // candles
  const r = rng(5); for (let i = 0; i < 18; i++) { const px = 120 + r() * 840, py = 1500 + r() * 300, f = .8 + .2 * Math.sin(t * 9 + i * 2.3) * Math.sin(t * 5.3 + i);
    x.fillStyle = '#d8cbb0'; x.fillRect(px - 5, py, 10, 40 + r() * 30); const cg = x.createRadialGradient(px, py - 8, 0, px, py - 8, 60 * f); cg.addColorStop(0, 'rgba(255,230,160,.9)'); cg.addColorStop(.25, 'rgba(255,160,60,.3)'); cg.addColorStop(1, 'rgba(255,140,40,0)'); x.fillStyle = cg; x.beginPath(); x.arc(px, py - 8, 60 * f, 0, 7); x.fill(); }
}
const base = mk(), bx = base.getContext('2d', { willReadFrequently: true }); scene(bx, 0); const BD = bx.getImageData(0, 0, W, H).data;
const px = (x, y) => { x = clamp(Math.round(x), 0, W - 1); y = clamp(Math.round(y), 0, H - 1); const i = (y * W + x) * 4; return [BD[i], BD[i + 1], BD[i + 2]]; };
const lum = (x, y) => { const [r, gg, b] = px(x, y); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255; };
const audioOut = () => {};

// ---------- 1. IMPASTO: palette-knife strokes built once from the scene, static; push-in; candles re-laid ----------
function buildImpasto() {
  const P = mk(W * 1.15 | 0, H * 1.15 | 0), x = P.getContext('2d'), k = 1.15; x.scale(k, k);
  x.filter = 'blur(2px)'; x.drawImage(base, 0, 0); x.filter = 'none';
  const r = rng(11), knife = (cx, cy, rad, ang, c, c2) => {
    const L = rad * (1.7 + r() * 1.4), Wd = rad * (.95 + r() * .5), sl = (r() - .5) * .5;
    x.save(); x.translate(cx, cy); x.rotate(ang);
    const gq = x.createLinearGradient(-L / 2, 0, L / 2, 0); gq.addColorStop(0, c); gq.addColorStop(.7, c); gq.addColorStop(1, c2);
    x.fillStyle = gq; x.beginPath(); x.moveTo(-L / 2 + sl * Wd, -Wd / 2); x.lineTo(L / 2, -Wd / 2); x.lineTo(L / 2 - sl * Wd, Wd / 2); x.lineTo(-L / 2, Wd / 2); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,245,220,.22)'; x.lineWidth = Math.max(1, rad * .12); x.beginPath(); x.moveTo(-L / 2 + sl * Wd, -Wd / 2 + 1); x.lineTo(L / 2, -Wd / 2 + 1); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.moveTo(-L / 2, Wd / 2 - 1); x.lineTo(L / 2 - sl * Wd, Wd / 2 - 1); x.stroke(); x.restore();
  };
  const col = (c, j) => `rgb(${c.map(v => clamp(Math.round(v * (1 + j)), 0, 255)).join(',')})`;
  for (const pass of [22, 12, 6]) {
    for (let y = 0; y < H; y += pass * .8) for (let xx = 0; xx < W; xx += pass * .8) {
      const fx = xx + (r() - .5) * pass, fy = y + (r() - .5) * pass, d = Math.hypot(fx - 540, (fy - 1000) * .7);
      if (pass === 12 && d > 520 && r() < .55) continue; if (pass === 6 && d > 330) continue;
      const gx = lum(fx + 3, fy) - lum(fx - 3, fy), gy = lum(fx, fy + 3) - lum(fx, fy - 3), ang = (Math.abs(gx) + Math.abs(gy) > .04 ? Math.atan2(gy, gx) + Math.PI / 2 : -1.2) + (r() - .5) * .45;
      const c = px(fx, fy), c2 = px(fx + Math.cos(ang) * pass * 2, fy + Math.sin(ang) * pass * 2);
      knife(fx, fy, pass * .55, ang, col(c, (r() - .5) * .12), col(c2, 0));
    }
  }
  return P;
}
function impasto(t) {
  const P = IMP || (IMP = buildImpasto()), z = 1 + .06 * ss(t / DUR);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.save(); g.translate(540, 900); g.scale(z / 1.15, z / 1.15); g.translate(-540 * 1.15, -900 * 1.15); g.drawImage(P, 0, 0); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; const r = rng(5); for (let i = 0; i < 18; i++) { const cx = 120 + r() * 840, cy = 1500 + r() * 300; r(); const f = .5 + .5 * Math.sin(t * 9 + i * 2.3); g.fillStyle = `rgba(255,190,90,${.12 * f})`; g.beginPath(); g.ellipse(540 + (cx - 540) * z, 900 + (cy - 8 - 900) * z, 26, 34, 0, 0, 7); g.fill(); } g.restore();
  // knife-laid title, then serif subtitles in a calm band
  const k = ss(seg(t, .2, 1.3)); g.save(); g.globalAlpha = k; g.font = '600 64px Cinzel'; g.letterSpacing = '10px'; g.textAlign = 'center'; g.fillStyle = '#f3dfae'; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 16; g.fillText('THE GOLDEN THRONE', 545, 200); g.restore();
  serifSub(t, 1680, '#f3e9d2', 'rgba(10,8,6,.55)');
}
let IMP = null;
function serifSub(t, y, col, band) {
  const sp = spoken(t); if (!sp.length || t > VOICE.at(-1)[2] + .8) return; let line = []; for (const w of sp) { line.push(w[0]); if (/[.,]$/.test(w[0]) && w !== sp.at(-1)) line = []; }
  const txt = line.join(' '); g.save(); g.font = 'italic 500 58px "Cormorant Garamond"'; g.textAlign = 'center'; g.fillStyle = band; const w = g.measureText(txt).width; g.fillRect(540 - w / 2 - 40, y - 52, w + 80, 80); g.fillStyle = col; g.fillText(txt, 540, y); g.restore();
}

// ---------- 2. COPPERPLATE ENGRAVING: tone made only of swelling hatch lines, cut family by family; gold wash at the end ----------
function hatchFamily(angle, sp, th, wMax, seed) {
  const C = mk(), x = C.getContext('2d'), r = rng(seed); x.fillStyle = '#1c1510';
  const ca = Math.cos(angle), sa = Math.sin(angle), D = Math.hypot(W, H);
  for (let o = -D; o < D; o += sp) {
    let run = [];
    const flush = () => { if (run.length > 2) { const n = run.length; x.beginPath(); for (let i = 0; i < n; i++) { const u = i / (n - 1), sw = .2 + .8 * Math.pow(Math.sin(Math.PI * u), .7); const [qx, qy, w] = run[i]; x.moveTo(qx + 0, qy); x.arc(qx, qy, Math.max(.25, w * sw / 2), 0, 7); } x.fill(); } run = []; };
    for (let s = -D; s < D; s += 2.2) {
      const qx = 540 + ca * s - sa * o, qy = 960 + sa * s + ca * o; if (qx < 60 || qx > W - 60 || qy < 130 || qy > H - 300) { flush(); continue; }
      const tone = 1 - Math.pow(lum(qx, qy), 1.6); if (tone > th) run.push([qx, qy, wMax * clamp((tone - th) / (1 - th) * 1.3 + .15)]); else flush();
    }
    flush();
  }
  return C;
}
let ENG = null;
function contours() {   // outlines: burin runs along strong tone edges, heavier away from the upper-left light
  const C = mk(), x = C.getContext('2d'); x.fillStyle = '#1c1510';
  for (let y = 130; y < H - 300; y += 2) for (let xx = 60; xx < W - 60; xx += 2) { const gx = lum(xx + 2, y) - lum(xx - 2, y), gy = lum(xx, y + 2) - lum(xx, y - 2), m = Math.hypot(gx, gy); if (m > .09) { x.beginPath(); x.arc(xx, y, Math.min(2.4, .6 + m * 6) * (gx + gy > 0 ? 1.2 : .8), 0, 7); x.fill(); } }
  return C;
}
function engraving(t) {
  if (!ENG) ENG = [contours(), hatchFamily(-.55, 9, .12, 3.2, 1), hatchFamily(.75, 10, .5, 2.6, 2), hatchFamily(1.57, 12, .74, 2.2, 3)];
  g.fillStyle = '#f1e8d2'; g.fillRect(0, 0, W, H); const r = rng(4); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,50,${r() * .06})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1); }
  g.strokeStyle = 'rgba(80,60,40,.5)'; g.lineWidth = 3; g.strokeRect(46, 110, W - 92, H - 380); g.lineWidth = 1; g.strokeRect(58, 122, W - 116, H - 404);
  const z = 1 + .04 * ss(t / DUR); g.save(); g.translate(540, 900); g.scale(z, z); g.translate(-540, -900);
  ENG.forEach((F, i) => { const a = i ? .9 + (i - 1) * 2.1 : .2, k = seg(t, a, a + (i ? 2.4 : 1.4)); if (k <= 0) return; g.save(); g.beginPath(); g.rect(0, 0, W * k * 1.05, H); g.clip(); g.drawImage(F, 0, 0); g.restore(); });
  const wa = ss(seg(t, 7.2, 8.6)); if (wa > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = wa * .55; g.fillStyle = '#d9a441'; g.beginPath(); g.moveTo(250, 1460); g.lineTo(250, 760); g.lineTo(540, 380); g.lineTo(830, 760); g.lineTo(830, 1460); g.closePath(); g.fill(); g.restore(); }
  g.restore();
  const lt = 'PLATE XL · THE GOLDEN THRONE', n = Math.floor(seg(t, .5, 2.5) * lt.length);
  g.save(); g.font = '500 40px "Bodoni Moda"'; g.letterSpacing = '8px'; g.textAlign = 'center'; g.fillStyle = '#1c1510'; g.fillText(lt.slice(0, n), 545, 1590);
  g.font = 'italic 500 34px "Cormorant Garamond"'; g.letterSpacing = '1px'; g.globalAlpha = ss(seg(t, 2.5, 3.2)); g.fillText('Imperator, enthroned. Del. & sculp.', 540, 1640); g.restore();
  const sp = spoken(t); if (sp.length && t < VOICE.at(-1)[2] + .8) { let line = []; for (const w of sp) { line.push(w[0]); if (/[.,]$/.test(w[0]) && w !== sp.at(-1)) line = []; }
    g.save(); g.font = '52px "Pinyon Script"'; g.textAlign = 'center'; const txt = line.join(' '), w = g.measureText(txt).width; g.fillStyle = '#ece0c4'; g.fillRect(540 - w / 2 - 36, 1720, w + 72, 84); g.strokeStyle = 'rgba(80,60,40,.4)'; g.strokeRect(540 - w / 2 - 36, 1720, w + 72, 84); g.fillStyle = '#1c1510'; g.fillText(txt, 540, 1776); g.restore(); }
}

// ---------- 3. ASCII / CRT: the scene as real glyphs on a grid, amber phosphor; push-in by font size; typed LOG strip ----------
const RAMP = ' .\'`:,-~;=+*!?%#$@';
const small = mk(240, 240), sx = small.getContext('2d', { willReadFrequently: true });
function ascii(t) {
  const cols = Math.round(lerp(78, 62, ss(t / DUR))), cw = W / cols, ch = cw * 2, rows = Math.ceil(1500 / ch);
  small.width = cols; small.height = rows; sx.drawImage(base, 0, (H - rows * ch * 1) / 2 - 40, W, rows * ch, 0, 0, cols, rows); const d = sx.getImageData(0, 0, cols, rows).data;
  g.fillStyle = '#0d0703'; g.fillRect(0, 0, W, H);
  const T = mk(), x = T.getContext('2d'); x.font = `${ch * .95}px VT323`; x.textBaseline = 'top';
  const r = rng(7);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = (j * cols + i) * 4, l = (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11) / 255, v = clamp(Math.pow(clamp(l * 1.9 - .02), .8) + (r() - .5) * .04); if (v < .07) continue;
    const gi = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)); x.fillStyle = `rgb(${Math.round(255 * Math.min(1, .45 + v))},${Math.round(176 * v + 40 * v * v)},${Math.round(40 * v * v)})`; x.fillText(RAMP[gi], i * cw, 180 + j * ch); }
  g.save(); g.filter = 'blur(7px)'; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .9; g.drawImage(T, 0, 0); g.restore(); g.drawImage(T, 0, 0); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35; g.drawImage(T, 0, 0); g.restore();
  const head = '> OPEN ARCHIVE //TERRA/THRONEWORLD/IMPERATOR.PIC', n = Math.floor(seg(t, .1, 1.6) * head.length);
  crtText(head.slice(0, n) + (Math.floor(t * 2) % 2 ? '█' : ''), 50, 90, 44, 1);
  // LOG strip: typed word by word with the voice
  g.fillStyle = 'rgba(255,176,60,.35)'; g.fillRect(40, 1690, W - 80, 2);
  const sp = spoken(t); let line = []; for (const w of sp) { line.push(w[0].toUpperCase()); if (/[.,]$/.test(w[0]) && w !== sp.at(-1)) line = []; }
  g.fillStyle = '#ffb03c'; g.fillRect(50, 1720, 110, 52); g.font = '46px VT323'; g.fillStyle = '#0d0703'; g.fillText('LOG', 72, 1762);
  crtText((line.join(' ') + (Math.floor(t * 3) % 2 ? '_' : '')).slice(0, 34), 180, 1762, 50, 1);
  if (line.join(' ').length > 34) crtText(line.join(' ').slice(34), 180, 1820, 50, 1);
  for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, W, 2); }
  const vg = g.createRadialGradient(540, 960, 500, 540, 960, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.fillStyle = `rgba(255,190,90,${.012 + .01 * Math.sin(t * 60)})`; g.fillRect(0, 0, W, H);
}
function crtText(s, x, y, px, a) { g.save(); g.font = `${px}px VT323`; g.fillStyle = '#ffb03c'; g.shadowColor = '#ff9a20'; g.shadowBlur = 18; g.globalAlpha = a; g.fillText(s, x, y); g.restore(); }

// ---------- 4. HALFTONE DOSSIER: cream paper, overprinted dots, headline, chips, a stamp that slams ----------
let PAPER = null;
function dossier(t) {
  if (!PAPER) { PAPER = mk(); const x = PAPER.getContext('2d'), r = rng(2); x.fillStyle = '#efe4c8'; x.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r() < .5 ? '120,90,40' : '255,255,240'},${r() * .08})`; x.fillRect(r() * W, r() * H, 2 + r() * 6, 2 + r() * 6); } const v = x.createRadialGradient(540, 960, 600, 540, 960, 1200); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,60,20,.25)'); x.fillStyle = v; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(538, 0, 4, H); }
  g.drawImage(PAPER, 0, 0);
  const z = 1 + .05 * ss(t / DUR), dots = (ang, step, ink, dens, k = .7) => { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = ink; g.beginPath(); const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let a = -1300; a < 1300; a += step) for (let b = -1300; b < 1300; b += step) { const X = 540 + a * ca - b * sa, Y = 1000 + a * sa + b * ca; if (X < 70 || X > W - 70 || Y < 460 || Y > 1560) continue; const sxp = 540 + (X - 540) / z, syp = 1000 + (Y - 1000) / z, rr = dens(sxp, syp) * step * k; if (rr > .8) { g.moveTo(X + rr, Y); g.arc(X, Y, rr, 0, 7); } }
    g.fill(); g.restore(); };
  dots(.26, 17, '#e0a32e', (X, Y) => { const [r, gg, b] = px(X, Y); return clamp((r - b) / 160) * .95; }, .66);
  dots(.79, 15, '#1f2a4a', (X, Y) => clamp((1 - lum(X, Y)) * 1.05 - .12), .64);
  g.save(); g.strokeStyle = '#1f2a4a'; g.lineWidth = 6; g.strokeRect(70, 460, W - 140, 1100); g.restore();
  // headline with misregistered shadow, case chips
  const hk = ss(seg(t, .15, .5)); g.save(); g.globalAlpha = hk; g.font = '150px "Alfa Slab One"'; g.fillStyle = '#e8577a'; g.globalCompositeOperation = 'multiply'; g.fillText('10,000', 78, 300); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#1f2a4a'; g.fillText('10,000', 70, 292);
  g.font = '64px "Alfa Slab One"'; g.fillText('YEARS. NO MOVEMENT.', 72, 390); g.restore();
  const chip = (txt, x, y, bg, fg) => { g.save(); g.font = '30px "Alfa Slab One"'; const w = g.measureText(txt).width; g.fillStyle = bg; g.fillRect(x, y - 34, w + 30, 46); g.fillStyle = fg; g.fillText(txt, x + 15, y); g.restore(); };
  if (t > .6) chip('CASE FILE Nº 001', 70, 110, '#1f2a4a', '#efe4c8'); if (t > .9) chip('SUBJECT: THE EMPEROR', 420, 110, '#e0a32e', '#1f2a4a');
  const st = word('throne'); if (t > st) { const k = seg(t, st, st + .18), sc = lerp(1.6, 1, ss(k)); g.save(); g.translate(720, 1380); g.rotate(-.18); g.scale(sc, sc); g.globalAlpha = .92 * Math.min(1, k * 3);
    g.strokeStyle = '#d23a2a'; g.lineWidth = 9; g.strokeRect(-250, -70, 500, 140); g.lineWidth = 3; g.strokeRect(-236, -56, 472, 112); g.font = '58px "Alfa Slab One"'; g.fillStyle = '#d23a2a'; g.textAlign = 'center'; g.fillText('STILL ALIVE?', 0, 22);
    const r = rng(9); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * .9})`; g.fillRect(-250 + r() * 500, -70 + r() * 140, 2 + r() * 5, 2 + r() * 4); } g.restore(); }
  // caption bar, keyword in the highlight ink
  const sp = spoken(t); if (sp.length && t < VOICE.at(-1)[2] + .8) { let line = []; for (const w of sp) { line.push(w[0]); if (/[.,]$/.test(w[0]) && w !== sp.at(-1)) line = []; }
    g.fillStyle = '#1f2a4a'; g.fillRect(0, 1640, W, 130); g.font = '50px "Alfa Slab One"'; g.textAlign = 'center'; let x = 540 - g.measureText(line.join(' ')).width / 2; g.textAlign = 'left';
    for (const w of line) { g.fillStyle = /thousand|throne|god|golden/i.test(w) ? '#e0a32e' : '#efe4c8'; g.fillText(w + ' ', x, 1722); x += g.measureText(w + ' ').width; } }
}
const word = w => VOICE.find(q => q[0].toLowerCase().includes(w))[1];

// ---------- 5. HD-2D-style diorama: a pixel set (stepped, low-res) with smooth light, bloom, tilt-shift and dust ----------
const LOW = mk(135, 240), lx = LOW.getContext('2d', { willReadFrequently: true }), BIG = mk(), BX = BIG.getContext('2d');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function hd2d(t) {
  const step = Math.floor(t * 8) / 8; lx.drawImage((scene(bx, step), base), 0, 0, 135, 240); const im = lx.getImageData(0, 0, 135, 240), d = im.data;
  for (let y = 0; y < 240; y++) for (let x = 0; x < 135; x++) { const i = (y * 135 + x) * 4, b = (BAYER[(y % 4) * 4 + x % 4] / 16 - .5) * 22; for (let c = 0; c < 3; c++) d[i + c] = clamp(Math.round((d[i + c] + b) / 28) * 28, 0, 255); }
  lx.putImageData(im, 0, 0);
  const z = 1.08 + .07 * ss(t / DUR), ox = Math.sin(t * .3) * 12;
  BX.imageSmoothingEnabled = false; BX.fillStyle = '#05070a'; BX.fillRect(0, 0, W, H); BX.save(); BX.translate(540 + ox, 960); BX.scale(z, z); BX.translate(-540, -960); BX.drawImage(LOW, 0, 0, W, H); BX.restore();
  g.drawImage(BIG, 0, 0);
  // tilt-shift: blur far (top) and near (bottom) bands
  for (const [y0, y1, dir] of [[0, 560, -1], [1380, H, 1]]) { g.save(); g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); g.filter = 'blur(9px)'; g.drawImage(BIG, 0, 0); g.restore(); }
  // practical lights bloom: halo and candles, smooth every frame
  g.save(); g.globalCompositeOperation = 'lighter';
  const bloom = (x, y, r, a, c) => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  bloom(540 + ox, 650, 520, .28, '255,200,120'); bloom(540 + ox, 840, 260, .35, '255,230,170');
  const r = rng(5); for (let i = 0; i < 18; i++) { const cx = 120 + r() * 840, cy = 1500 + r() * 300; r(); bloom(540 + ox + (cx - 540) * z, 960 + (cy - 8 - 960) * z, 120, .25 + .1 * Math.sin(t * 9 + i), '255,170,80'); }
  // light shafts and dust
  g.globalAlpha = .1; g.fillStyle = '#ffe2a8'; g.beginPath(); g.moveTo(400, 300); g.lineTo(680, 300); g.lineTo(900, 1500); g.lineTo(200, 1500); g.fill(); g.globalAlpha = 1;
  const rd = rng(3); for (let i = 0; i < 90; i++) { const x0 = 220 + rd() * 640, y0 = (rd() * 1300 + 300 - t * (10 + rd() * 25)) % 1300 + 300; bloom(x0 + Math.sin(t + i) * 10, y0, 5 + rd() * 6, .5, '255,225,170'); }
  g.restore();
  const vg = g.createRadialGradient(540, 960, 450, 540, 960, 1150); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,3,2,.8)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // chapter card, then italic subtitles on a soft band
  const ck = ss(seg(t, .2, .9)) * (1 - ss(seg(t, 2.6, 3.2))); if (ck > 0) { g.save(); g.globalAlpha = ck; g.fillStyle = 'rgba(8,6,4,.7)'; g.fillRect(140, 820, 800, 220); g.strokeStyle = '#c9a65a'; g.lineWidth = 3; g.strokeRect(156, 836, 768, 188);
    g.textAlign = 'center'; g.fillStyle = '#e8cf8e'; g.font = '600 34px Cinzel'; g.letterSpacing = '8px'; g.fillText('CHAPTER I', 545, 905); g.font = '600 58px Cinzel'; g.letterSpacing = '6px'; g.fillText('THE GOLDEN THRONE', 545, 985); g.restore(); }
  const gb = g.createLinearGradient(0, 1600, 0, 1800); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(.5, 'rgba(0,0,0,.6)'); gb.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gb; g.fillRect(0, 1600, W, 200);
  serifSub(t, 1720, '#f6ead0', 'rgba(0,0,0,0)');
}

const STY = { impasto, engraving, ascii, dossier, hd2d };
window.render = t => { STY[S](t); if (t > DUR - .6) { g.fillStyle = `rgba(0,0,0,${seg(t, DUR - .6, DUR)})`; g.fillRect(0, 0, W, H); } if (t < .3) { g.fillStyle = `rgba(0,0,0,${1 - t / .3})`; g.fillRect(0, 0, W, H); } };
window.READY = true;
