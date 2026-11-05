// One tall lancet read bottom to top: five medallions and a larger one under the arch. World units, y down.
import { mulberry, hash } from '/core/lib.js';
import { COL, Pass, smooth, circle, ellipse, brush, softPoly, INK } from './glass.js';
import { drawRig, SON, SON_PAL, FATHER, FATHER_PAL, SHADE, SHADE_PAL, helm, POSE } from './figures.js';

export const LW = 360, BOT = 1700, SPR = -480, APEX = SPR - LW * Math.sqrt(3) / 2;
export const MED = [1500, 1170, 840, 510, 180, -230];       // medallion centres, bottom to top
export const MR = [138, 138, 138, 138, 138, 150];
export const SCROLL_Y = -22;
const BORDER = 34, RUBY = 18;

export function lancetPath(inset = 0) {
  const x0 = -LW / 2 + inset, x1 = LW / 2 - inset, R = LW - inset, th = Math.acos((LW / 2) / R), p = new Path2D();
  p.moveTo(x0, BOT - inset); p.lineTo(x0, SPR); p.arc(LW / 2, SPR, R, Math.PI, Math.PI + th); p.arc(-LW / 2, SPR, R, -th, 0); p.lineTo(x1, BOT - inset); p.closePath(); return p;
}
function outlineSamples(inset, step) {
  const out = [], x0 = -LW / 2 + inset, x1 = LW / 2 - inset, R = LW - inset, th = Math.acos((LW / 2) / R), n = Math.max(2, Math.round(R * th / step));
  for (let y = BOT - inset - step * .6; y > SPR; y -= step) out.push([x0, y]);
  for (let i = 0; i < n; i++) { const a = Math.PI + (i + .5) / n * th; out.push([LW / 2 + Math.cos(a) * R, SPR + Math.sin(a) * R]); }
  for (let i = 0; i < n; i++) { const a = -th + (i + .5) / n * th; out.push([-LW / 2 + Math.cos(a) * R, SPR + Math.sin(a) * R]); }
  for (let y = SPR + step * .4; y < BOT - inset - step * .3; y += step) out.push([x1, y]);
  return out;
}
// hand-cut lozenge quarries on a jittered shared lattice
function lozenges(box, d, seed) {
  const J = (k, m) => [k * d + (hash(k * 12.9 + m * 78.2 + seed) - .5) * d * .34, m * d + (hash(k * 39.3 + m * 11.1 + seed * 3) - .5) * d * .34], out = [];
  for (let b = Math.floor(box[1] / d) - 1; b <= Math.ceil(box[3] / d) + 1; b++)
    for (let a = Math.floor(box[0] / d) - 1; a <= Math.ceil(box[2] / d) + 1; a++) {
      if ((a + b) & 1) continue;
      const pts = [J(a - 1, b), J(a, b - 1), J(a + 1, b), J(a, b + 1)], h = hash(a * 3.3 + b * 7.9 + seed);
      out.push({ path: softPoly(pts, .12), c: [a * d, b * d], col: h < .1 ? COL.blue2 : h < .2 ? COL.deepblue : COL.cobalt, id: 20000 + (a + 500) * 97 + b, curl: hash(a * 5.1 + b * 2.3 + seed) });
    }
  return out;
}
function vineCurl(g, c, d, h) {
  const [x, y] = c, s = h > .5 ? 1 : -1, r = d * .3;
  brush(g, [[x - r * s, y + r * .6], [x - r * .2 * s, y - r * .4], [x + r * .5 * s, y - r * .2], [x + r * .35 * s, y + r * .35], [x, y + r * .15]], d * .08, { w0: .3, w1: .15, color: 'rgba(30,24,40,.42)' });
}
const MOS = (() => {
  const box = [-LW / 2 + BORDER - 4, APEX - 4, LW / 2 - BORDER + 4, BOT - BORDER + 4];
  return { cells: lozenges(box, 26, 5), pearls: outlineSamples(RUBY / 2, 22), band: outlineSamples((RUBY + BORDER) / 2, 3.4), outer: lancetPath(0), mid: lancetPath(RUBY), inner: lancetPath(BORDER) };
})();
// the whispering eyes hidden in the ground beside the wound medallion
export const EYES = [[-116, 925], [116, 925], [-116, 755], [116, 755]];

// ---------- stone ----------
let stoneTex = null;
function stonePattern(ctx) {
  if (!stoneTex) {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), im = x.createImageData(512, 512), rnd = mulberry(9);
    const N = (u, v, f) => { const X = u * f, Y = v * f, i = Math.floor(X), j = Math.floor(Y), a = X - i, b = Y - j, h = (p, q) => hash((p % f + f) % f * 57.1 + (q % f + f) % f * 131.7), s = t => t * t * (3 - 2 * t);
      return (h(i, j) * (1 - s(a)) + h(i + 1, j) * s(a)) * (1 - s(b)) + (h(i, j + 1) * (1 - s(a)) + h(i + 1, j + 1) * s(a)) * s(b); };
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) { const u = i / 512, v = j / 512, n = N(u, v, 4) * .45 + N(u, v, 16) * .3 + N(u, v, 64) * .17 + rnd() * .08, k = (i + j * 512) * 4, val = 150 + (n - .5) * 120;
      im.data[k] = val; im.data[k + 1] = val * .96; im.data[k + 2] = val * .9; im.data[k + 3] = 255; }
    x.putImageData(im, 0, 0); stoneTex = c;
  }
  return ctx.createPattern(stoneTex, 'repeat');
}
export function drawStone(S, M, view) {
  S.setTransform(M);
  const [vx0, vy0, vx1, vy1] = view, CH = 92;
  S.fillStyle = '#403a33'; S.fillRect(vx0 - 20, vy0 - 20, vx1 - vx0 + 40, vy1 - vy0 + 40);
  for (let row = -40; row < 40; row++) {
    const y0 = BOT + 400 - (row + 1) * CH; if (y0 + CH < vy0 - 10 || y0 > vy1 + 10) continue;
    let x = -1800 + hash(row * 7.3) * 160;
    while (x < 1800) { const w = 150 + hash(row * 13.1 + x * .01) * 130;
      if (x + w > vx0 - 10 && x < vx1 + 10) { const t = .78 + hash(row * 3.7 + x * .13) * .3; S.fillStyle = `rgb(${(128 * t) | 0},${(118 * t) | 0},${(104 * t) | 0})`; S.fillRect(x + 2, y0 + 2, w - 4, CH - 4); }
      x += w; }
  }
  // splayed embrasure, a dressed arch moulding, the sill
  for (const [ins, col] of [[-74, '#7a705f'], [-56, '#9a8f7c'], [-40, '#857b69'], [-16, '#a79c86']]) { S.fillStyle = col; S.fill(lancetPath(ins)); }
  S.fillStyle = '#9d927d'; S.fillRect(-LW / 2 - 110, BOT + 14, LW + 220, 40); S.fillStyle = '#6e6556'; S.fillRect(-LW / 2 - 110, BOT + 54, LW + 220, 9);
  const pat = stonePattern(S); pat.setTransform(new DOMMatrix().scale(.55));
  S.globalCompositeOperation = 'multiply'; S.globalAlpha = .55; S.fillStyle = pat; S.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); S.globalAlpha = 1; S.globalCompositeOperation = 'source-over';
  S.globalCompositeOperation = 'destination-out'; S.fillStyle = '#000'; S.fill(lancetPath(0)); S.globalCompositeOperation = 'source-over';
}

// ---------- medallion scenery ----------
function ground(P, r, col, id, y = 70) {
  P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9, paint: g => { for (let k = 0; k < 5; k++) brush(g, [[-110 + k * 52, y + 22], [-98 + k * 52, y + 30], [-84 + k * 52, y + 34]], 1.4, { color: 'rgba(30,30,14,.45)' }); } });
}
function starPiece(P, x, y, r, col, id) { const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * .42 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1]); } P.piece(smooth(pts), col, { id, lead: 2.6, mat: false }); }
function banner(P, x, top, col, id, flip = 1) {
  P.piece(smooth([[x - 2.5, top - 6, 1], [x + 2.5, top - 6, 1], [x + 2.5, 140, 1], [x - 2.5, 140, 1]]), COL.brown, { id, lead: 2.5, mat: false });
  P.piece(smooth([[x, top, 1], [x + 46 * flip, top + 4], [x + 40 * flip, top + 34], [x + 48 * flip, top + 62, 1], [x + 20 * flip, top + 52], [x, top + 66, 1]]), col, { id: id + 1, lead: 3.4, matW: 5, paint: g => { brush(g, [[x + 8 * flip, top + 14], [x + 22 * flip, top + 30], [x + 12 * flip, top + 48]], 1.4); } });
}
function throne(P, id) {
  P.piece(smooth([[-46, 110, 1], [-46, -30, 1], [-40, -70], [-20, -96], [0, -104, 1], [20, -96], [40, -70], [46, -30, 1], [46, 110, 1]]), COL.gold, { id, lead: 4.5, matW: 8,
    paint: g => { g.strokeStyle = 'rgba(70,40,10,.6)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(0, -40, 18 + k * 14, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); } star(g, 0, -60, 10); } });
  P.piece(smooth([[-58, 40, 1], [58, 40, 1], [58, 56, 1], [-58, 56, 1]]), COL.gold2, { id: id + 1, lead: 4 });
}
function star(g, x, y, r) { g.fillStyle = 'rgba(70,40,10,.7)'; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? r * .38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function flames(P, x, w, step, id) {
  for (let k = 0; k < 3; k++) { const h = 30 + hash(step * 3.1 + k + id) * 26, xx = x + (k - 1) * w * .35;
    P.piece(smooth([[xx - w * .22, 0, 1], [xx - w * .16, -h * .5], [xx + (hash(step + k) - .5) * 10, -h, 1], [xx + w * .16, -h * .45], [xx + w * .22, 0, 1]]), k === 1 ? COL.amber : COL.red2, { id: id + k, lead: 2.6, mat: false }); }
}
const SKY = [COL.sky, COL.cobalt, COL.purple, COL.deepblue, COL.purple2, COL.deepblue];

// ---------- the lancet ----------
// st.med[i]: per-medallion figure state; st.cracks: [{pts, k, lead}]
export function drawWindow(P, M, view, st) {
  const m = MOS;
  P.setTransform(M);
  P.piece(m.outer, COL.ruby, { id: 900, lead: 6, mat: false, edge: 5 });
  P.piece(m.mid, COL.white, { id: 910, lead: 5, mat: false, edge: 4, paint: g => {
    const b = m.band;
    for (let k = 2; k < b.length - 2; k++) { const p = b[k], q = b[k + 1]; if (p[1] < view[1] - 40 || p[1] > view[3] + 40) continue;
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ph = k * .9, o1 = Math.sin(ph) * 3.2, o2 = Math.sin(ph + .9) * 3.2;
      g.strokeStyle = 'rgba(44,26,12,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p[0] + nx * o1, p[1] + ny * o1); g.lineTo(q[0] + nx * o2, q[1] + ny * o2); g.stroke(); }
  } });
  P.save(); P.g.clip(m.inner); P.s.clip(m.inner);
  for (const c of m.cells) { if (c.c[1] < view[1] - 40 || c.c[1] > view[3] + 40) continue; P.piece(c.path, c.col, { id: c.id, lead: 4, mat: false, edge: 6, paint: g => vineCurl(g, c.c, 52, c.curl) }); }
  // the eyes in the ground (dark until the whisper lights them)
  EYES.forEach(([x, y], k) => { if (y < view[1] - 60 || y > view[3] + 60) return;
    P.piece(smooth([[x - 16, y], [x - 4, y - 8], [x + 10, y - 7], [x + 18, y, 1], [x + 8, y + 7], [x - 6, y + 7]]), COL.green, { id: 7000 + k, lead: 3, mat: false, paint: g => { g.fillStyle = 'rgba(10,20,8,.9)'; g.beginPath(); g.ellipse(x + 1, y, 2, 6, 0, 0, 7); g.fill(); } }); });
  // title scroll in white glass between the top two medallions
  if (SCROLL_Y > view[1] - 60 && SCROLL_Y < view[3] + 60) P.piece(smooth([[-132, SCROLL_Y - 26], [-120, SCROLL_Y - 32], [0, SCROLL_Y - 26], [120, SCROLL_Y - 32], [132, SCROLL_Y - 26], [134, SCROLL_Y + 24], [122, SCROLL_Y + 30], [0, SCROLL_Y + 26], [-122, SCROLL_Y + 30], [-134, SCROLL_Y + 24]]), COL.white, { id: 7100, lead: 4.5, matW: 6, paint: g => {
    g.font = '600 22px Cinzel'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(52,30,14,.92)'; g.fillText('THE HORUS HERESY', 0, SCROLL_Y + 1); } });
  for (let i = 0; i < MED.length; i++) {
    const y = MED[i], r = MR[i]; if (y + r + 20 < view[1] || y - r - 20 > view[3]) continue;
    P.setTransform(M);
    P.piece(circle(0, y, r + 12), COL.gold, { id: 8000 + i * 40, lead: 5, mat: false });
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; P.piece(circle(Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), 3.6), COL.white, { id: 8001 + i * 40 + k, lead: 2.4, mat: false }); }
    P.piece(circle(0, y, r), SKY[i], { id: 8020 + i * 40, lead: 5, matW: 14 });
    P.save(); P.g.clip(circle(0, y, r)); P.s.clip(circle(0, y, r));
    medallion(P, M.translate(0, y), i, (st.med || [])[i] || {}, st);
    P.restore();
  }
  P.setTransform(M);
  P.restore();
  P.lead(m.inner, 6);
  for (const [x, y] of m.pearls) if (y > view[1] - 20 && y < view[3] + 20) P.piece(circle(x, y, 5.5), COL.gold, { id: 700 + x * 3 + y, lead: 2.6, mat: false });
  // iron saddle bars between the medallions
  for (let i = 0; i < MED.length - 1; i++) { const y = (MED[i] + MED[i + 1]) / 2; if (y < view[1] - 20 || y > view[3] + 20) continue; if (i === 4) continue;
    P.surf(smooth([[-LW / 2 - 8, y - 3, 1], [LW / 2 + 8, y - 3, 1], [LW / 2 + 8, y + 3, 1], [-LW / 2 - 8, y + 3, 1]]), '#18191c'); }
  // cracks: bright while breaking (white glass lines, lit from behind), then mending leads
  const clipL = lancetPath(BORDER * .5); P.g.save(); P.s.save(); P.g.setTransform(M); P.s.setTransform(M); P.g.clip(clipL); P.s.clip(clipL);
  for (const c of st.cracks || []) {
    const n = Math.max(2, Math.ceil(c.pts.length * c.k)), pts = c.pts.slice(0, n);
    P.setTransform(M);
    if (c.lead) { P.s.save(); P.s.setTransform(M); P.s.strokeStyle = '#1d1f23'; P.s.lineWidth = 4.2; P.s.lineJoin = 'round'; P.s.beginPath(); pts.forEach((q, i) => i ? P.s.lineTo(q[0], q[1]) : P.s.moveTo(q[0], q[1])); P.s.stroke(); P.s.restore(); }
    else { const g = P.g; g.save(); g.setTransform(M); g.strokeStyle = '#ffffff'; g.lineWidth = c.w || 3.2; g.lineJoin = 'round'; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); g.restore(); }
  }
  P.g.restore(); P.s.restore();
  P.setTransform(M);
}

function medallion(P, L, i, f, st) {
  const r = MR[i];
  P.setTransform(L);
  if (i === 0) {   // the finding
    ground(P, r, COL.green, 8100);
    starPiece(P, 70, -80, 12, COL.white, 8110);
    drawRig(P, L.translate(-52, 6).scale(.5), FATHER, f.father || POSE.fstand, FATHER_PAL, { id: 8200, face: 'calm' });
    drawRig(P, L.translate(48, 10).scale(-.44, .44), SON, f.son || POSE.kneel, SON_PAL, { id: 8400, face: 'calm' });
  } else if (i === 1) {   // the warmaster
    ground(P, r, COL.olive, 8500, 80);
    banner(P, -96, -70, COL.ruby, 8510, 1); banner(P, 96, -70, COL.ruby, 8520, -1);
    starPiece(P, -40, -98, 9, COL.gold2, 8530); starPiece(P, 46, -104, 8, COL.white, 8531); starPiece(P, 0, -118, 7, COL.gold2, 8532);
    drawRig(P, L.translate(-6, 0).scale(.54), SON, f.son || POSE.stand, SON_PAL, { id: 8600, face: 'stern' });
  } else if (i === 2) {   // the wound
    ground(P, r, COL.green2, 8700, 76);
    P.piece(circle(-70, -72, 26), COL.white, { id: 8710, lead: 4, matW: 8, paint: g => { g.fillStyle = 'rgba(60,40,30,.25)'; g.beginPath(); g.arc(-62, -66, 7, 0, 7); g.fill(); g.beginPath(); g.arc(-78, -80, 4, 0, 7); g.fill(); } });
    drawRig(P, L.translate(58, 2).scale(-.5, .5), SHADE, f.shade || POSE.sReady, SHADE_PAL, { id: 8800 });
    drawRig(P, L.translate(-38, 4).scale(.5), SON, f.son || POSE.stand, f.turned ? SON_PAL : SON_PAL, { id: 8900, face: f.face || 'stern', off: f.off, pal: f.pal });
  } else if (i === 3) {   // the legions split
    ground(P, r, COL.brown, 9000, 96);
    const pos = [[-96, -24], [-64, -30], [-32, -26], [32, -26], [64, -30], [96, -24], [-104, 34], [-70, 28], [-36, 32], [36, 32], [70, 28], [104, 34]];
    pos.forEach(([x, y], k) => { const right = x > 0, off = right && f.helmOff ? f.helmOff[k] || [0, 0] : [0, 0], turned = right && f.helmTurned && f.helmTurned[k];
      helm(P, L, x + off[0], y + off[1], turned ? COL.ruby : COL.steel, 9100 + k * 5, 1.18); });
  } else if (i === 4) {   // the march
    for (const s of f.stars || []) { P.piece(smooth([[s.x - 3, s.y - 2], [s.x + 26, s.y - 34], [s.x + 4, s.y + 2]]), COL.amber, { id: s.id + 1, lead: 2.4, mat: false }); starPiece(P, s.x, s.y, 10, COL.gold2, s.id); }
    const wy = 74;
    const wall = [[-r - 10, r + 10, 1], [-r - 10, wy, 1]]; for (let k = 0; k < 9; k++) { const x = -r - 10 + k * 34; wall.push([x, wy, 1], [x, wy - 16, 1], [x + 18, wy - 16, 1], [x + 18, wy, 1]); } wall.push([r + 10, wy, 1], [r + 10, r + 10, 1]);
    P.piece(smooth(wall), COL.white, { id: 9300, lead: 4.5, matW: 8, paint: g => { g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 1.4; g.beginPath(); for (let rr = 0; rr < 3; rr++) { const yy = wy + 12 + rr * 22; g.moveTo(-r, yy); g.lineTo(r, yy); } g.stroke(); } });
    P.setTransform(L.translate(0, wy - 16)); flames(P, -70, 50, f.step || 0, 9310); flames(P, 40, 60, (f.step || 0) + 7, 9320); P.setTransform(L);
  } else {   // the duel, then the throne
    ground(P, r, COL.olive, 9400, 92);
    P.setTransform(L.translate(0, -6)); throne(P, 9410); P.setTransform(L);
    drawRig(P, L.translate(f.fx ?? -62, f.fy ?? 6).scale(.54), FATHER, f.father || POSE.fstand, FATHER_PAL, { id: 9500, face: f.fface || 'stern' });
    if (!f.noSon) drawRig(P, L.translate(f.sx ?? 66, f.sy ?? 6).scale(-.54, .54), SON, f.son || POSE.guard, f.sonPal || SON_PAL, { id: 9700, face: f.sface || 'turned' });
  }
  P.setTransform(L);
}
