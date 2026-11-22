// The Fall of Cadia: figures and medallion scenes (the window, stone, cracks and lighting come from win.js / scene.js).
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2 } from './figures2.js';

const fold = (g, pts, w = 1.5) => brush(g, pts, w, { w0: .2, w1: .15 });
const band = (g, x0, x1, y) => { brush(g, [[x0, y], [(x0 + x1) / 2, y + 2], [x1, y]], 1.4, { w0: .4, w1: .4 }); brush(g, [[x0 + 2, y + 3], [x1 - 2, y + 3]], 1.1, { w0: .3, w1: .3, color: g.__col }); };
function face(g, e = 'stern') {
  const gr = g.createLinearGradient(-12, 0, 8, 0); gr.addColorStop(0, 'rgba(80,44,22,.45)'); gr.addColorStop(1, 'rgba(80,44,22,0)'); g.fillStyle = gr; g.fillRect(-16, -44, 24, 46);
  brush(g, [[1, -27], [7, -30], [13, -28 + (e === 'stern' ? 2 : 0)]], 2.6, { w0: .4, w1: .5 }); brush(g, [[13, -27], [17, -22], [18, -16]], 1.8, { w0: .5, w1: .5 });
  g.fillStyle = 'rgba(44,26,12,.9)'; g.beginPath(); g.ellipse(8, -22, 3.6, 1.8, 0, 0, 7); g.fill(); g.fillStyle = '#f2e8d8'; g.beginPath(); g.ellipse(9, -22, 1.2, 1.1, 0, 0, 7); g.fill();
  brush(g, [[8, -8], [11, -9], [14, -8.5]], 1.6, { w0: .4, w1: .4 });
}

// ---------- a Cadian trooper: helmet, flak vest, greatcoat, rifle ----------
const GS = {
  thigh: smooth([[-10, -3], [10, -3], [9, 28], [8, 52], [-8, 52], [-9, 28]]),
  shin: smooth([[-9, -2], [9, -2], [8, 26], [7, 48], [-7, 48], [-8, 26]]),
  boot: smooth([[-9, -4], [8, -4], [12, 3], [22, 6], [23, 12, 1], [-10, 12, 1]]),
  upper: smooth([[-8, -3], [8, -3], [7, 22], [6.5, 38], [-6.5, 38], [-7, 22]]),
  fore: smooth([[-7, -2], [7, -2], [6.5, 18], [6, 32], [-6, 32], [-6.5, 18]]),
  fist: smooth([[-6, -2], [6, -3], [10, 4], [10, 13], [5, 18], [-4, 17], [-7, 8]]),
};
export const GUARD = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-20, -6, 1], [20, -6, 1], [19, 6, 1], [-19, 6, 1]]), c: 'kit', z: 4 },
  { n: 'coat', p: 'pelvis', at: [0, 0], sh: smooth([[-24, -88], [22, -88], [30, -20], [34, 50], [30, 82, 1], [-30, 84, 1], [-34, 50], [-30, -20]]), c: 'coat', z: 0,
    paint: g => { fold(g, [[-14, -50], [-20, 20], [-22, 78]]); fold(g, [[8, -50], [12, 20], [14, 78]]); } },
  { n: 'thighB', p: 'pelvis', at: [-9, 2], sh: GS.thigh, c: 'fatigue', z: 1, paint: g => fold(g, [[0, 6], [1, 46]], 1.1) },
  { n: 'shinB', p: 'thighB', at: [0, 50], sh: GS.shin, c: 'fatigue', z: 1 },
  { n: 'bootB', p: 'shinB', at: [0, 46], sh: GS.boot, c: 'boot', z: 1 },
  { n: 'thighF', p: 'pelvis', at: [9, 2], sh: GS.thigh, c: 'fatigue', z: 3, paint: g => fold(g, [[0, 6], [1, 46]], 1.1) },
  { n: 'shinF', p: 'thighF', at: [0, 50], sh: GS.shin, c: 'fatigue', z: 3, paint: g => band(g, -8, 8, 10) },   // knee pad strap
  { n: 'bootF', p: 'shinF', at: [0, 46], sh: GS.boot, c: 'boot', z: 3 },
  { n: 'torso', p: 'pelvis', at: [0, -4], sh: smooth([[-20, 0], [-25, -36], [-25, -70], [-16, -84], [16, -84], [25, -70], [25, -36], [20, 0]]), c: 'fatigue', z: 5 },
  { n: 'vest', p: 'torso', at: [0, 0], sh: smooth([[-19, -6, 1], [-22, -40], [-20, -76], [20, -76], [22, -40], [19, -6, 1]]), c: 'flak', z: 5.2,
    paint: g => { band(g, -18, 18, -58); band(g, -18, 18, -36); band(g, -16, 16, -16); } },
  { n: 'head', p: 'torso', at: [2, -84], sh: smooth([[-12, -2], [-14, -20], [-10, -34], [2, -40], [12, -36], [16, -26], [18, -16, 1], [16, -13], [16, -6], [10, 0], [0, 2]]), c: 'flesh', z: 6, paint: (g, o) => face(g, o.face) },
  { n: 'helmet', p: 'head', at: [0, 0], sh: smooth([[-18, -18, 1], [-15, -34], [-4, -44], [10, -42], [19, -32], [22, -20, 1], [14, -22], [0, -24], [-10, -22]]), c: 'helm', z: 6.5, lead: 3,
    paint: g => band(g, -16, 20, -26) },
  { n: 'upperB', p: 'torso', at: [-22, -72], sh: GS.upper, c: 'fatigue', z: 2 },
  { n: 'foreB', p: 'upperB', at: [0, 36], sh: GS.fore, c: 'fatigue', z: 2 },
  { n: 'handB', p: 'foreB', at: [0, 30], sh: GS.fist, c: 'flesh', z: 2 },
  { n: 'upperF', p: 'torso', at: [22, -72], sh: GS.upper, c: 'fatigue', z: 8 },
  { n: 'foreF', p: 'upperF', at: [0, 36], sh: GS.fore, c: 'fatigue', z: 8 },
  { n: 'handF', p: 'foreF', at: [0, 30], sh: GS.fist, c: 'flesh', z: 8.5 },
  // the rifle lies along the forearm's direction, stock at the hand
  { n: 'rifle', p: 'handF', at: [2, 8], sh: smooth([[-5, -18, 1], [5, -16, 1], [4, 8, 1], [3, 76, 1], [-3, 76, 1], [-4, 24, 1], [-9, 20, 1], [-8, 4, 1]]), c: 'gun', z: 9, lead: 2.6,
    paint: g => { band(g, -4, 4, 26); g.fillStyle = 'rgba(44,26,12,.7)'; g.fillRect(-2, 30, 4, 40); } },
];
export const GUARD_PAL = { kit: '#5a4a32', coat: '#4c5a34', fatigue: COL.olive, flak: '#8c8a5a', flesh: '#b48066', helm: '#5f6a3e', boot: '#3a2e22', gun: '#5a4632' };
export const GPOSE = {
  gStand: { upperF: .2, foreF: -2.35, handF: -.35, upperB: -.55, foreB: -1.5 },         // port arms: rifle up across the chest
  gAim: { upperF: -1.35, foreF: -.15, handF: -.05, upperB: -1.0, foreB: -.6, head: .05 },  // rifle levelled
  gRaise: { upperF: -2.5, foreF: -.3, handF: -.1, upperB: .3, foreB: -.6, head: -.15 },  // rifle held high
};

// ---------- Abaddon: the power-armour figure in black and gold, with a long blade ----------
const SWORD = {
  grip: smooth([[-3, 0, 1], [3, 0, 1], [3, 16, 1], [-3, 16, 1]]),
  guard: smooth([[-20, 14, 1], [-10, 12], [0, 18, 1], [10, 12], [20, 14, 1], [16, 22, 1], [0, 24], [-16, 22, 1]]),
  blade: smooth([[-5, 22, 1], [5, 22, 1], [7, 90], [3, 150], [0, 172, 1], [-4, 146], [-6, 90]]),
};
export const ABADDON = SON2.map(q => SWORD[q.n] ? { ...q, sh: SWORD[q.n], at: q.n === 'blade' ? [0, 0] : q.at, paint: q.n === 'blade' ? g => { brush(g, [[0, 30], [1, 150]], 1.2, { w0: .3, w1: .3 }); brush(g, [[-2, 40], [3, 60], [-2, 80], [3, 100]], 1.1, { color: 'rgba(120,20,20,.8)' }); } : q.paint } : q);
export const ABADDON_PAL = { arm: '#3c4049', arm2: '#2c2f36', trim: COL.gold2, cloak: COL.ruby2, cloth: COL.gold, dark: '#24262b', pelt: '#6a5a46', flesh: '#a87a62', hair: '#1c1410', steel: COL.steel2 };

// ---------- props ----------
function planet(P, x, y, r, id, split = 0) {
  const half = s => smooth([[x + s * split, y - r, 1], ...[...Array(9)].map((_, k) => { const a = -Math.PI / 2 + s * (k + 1) / 10 * Math.PI; return [x + s * split + Math.cos(a) * r, y + Math.sin(a) * r]; }), [x + s * split, y + r, 1], [x + s * split + s * 4, y + r * .5, 1], [x + s * split - s * 3, y, 1], [x + s * split + s * 5, y - r * .5, 1]]);
  const paint = g => { for (let k = 0; k < 4; k++) brush(g, [[x - r * .7, y - r * .5 + k * r * .32], [x, y - r * .4 + k * r * .3], [x + r * .7, y - r * .5 + k * r * .33]], 1.5, { color: 'rgba(52,30,14,.45)' }); };
  if (!split) return P.piece(circle(x, y, r), '#828a5e', { id, lead: 4.5, matW: 10, paint });   // whole until it breaks
  P.piece(half(-1), '#7c8a5a', { id, lead: 4.5, matW: 10, paint }); P.piece(half(1), '#8a8a62', { id: id + 1, lead: 4.5, matW: 10, paint });
}
const PYLON = smooth([[-5, 0, 1], [-7, -10, 1], [-3, -34, 1], [0, -40, 1], [3, -34, 1], [7, -10, 1], [5, 0, 1]]);
function pylons(P, L, x, y, r, n, lit, id, off) {   // lit: number of pylons awake (green); off: shatter offsets
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + k / n * Math.PI * 2, o = off ? off[k] : [0, 0, 0];
    P.setTransform(L.translate(x + Math.cos(a) * r + o[0], y + Math.sin(a) * r + o[1]).rotate(a + Math.PI / 2 + o[2]));
    P.piece(PYLON, k < lit ? '#9fe08a' : '#3a3e44', { id: id + k, lead: 2.6, matW: 3, paint: g => { brush(g, [[0, -6], [0, -32]], 1, { color: 'rgba(20,40,20,.6)' }); } });
  }
  P.setTransform(L);
}
function eyeOfTerror(P, x, y, r, id) {
  P.piece(circle(x, y, r), COL.purple, { id, lead: 4, matW: 8, paint: g => { for (let k = 0; k < 3; k++) { const pts = []; for (let j = 0; j < 14; j++) { const a = j * .5 + k * 2.1, rr = r * (.15 + j * .055); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } brush(g, pts, 2, { color: 'rgba(160,20,40,.7)' }); } } });
}
function fortress(P, x, y, s, id, core) {
  const pts = [[0, -40, 1], [14, -18, 1], [46, -8, 1], [18, 6, 1], [10, 40, 1], [0, 22, 1], [-10, 40, 1], [-18, 6, 1], [-46, -8, 1], [-14, -18, 1]].map(([a, b, c]) => [x + a * s, y + b * s, c]);
  P.piece(smooth(pts), '#3a3448', { id, lead: 4, matW: 8, paint: g => { for (const [a, b] of [[-30, -6], [30, -6], [0, -26], [-8, 26], [8, 26]]) { g.fillStyle = 'rgba(230,180,70,.85)'; g.beginPath(); g.arc(x + a * s, y + b * s, 1.8 * s, 0, 7); g.fill(); } } });
  P.piece(circle(x, y - 2 * s, 7 * s), core ? COL.amber : '#4a2a3a', { id: id + 1, lead: 3, mat: false });
}
function rubble(P, r, id) {
  P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, 70, 1], [-100, 58, 1], [-80, 72, 1], [-50, 54, 1], [-20, 68, 1], [10, 50, 1], [40, 66, 1], [70, 52, 1], [100, 70, 1], [r + 10, 60, 1], [r + 10, r + 10, 1]]), '#6a6258', { id, lead: 4.5, matW: 10,
    paint: g => { for (let k = 0; k < 7; k++) brush(g, [[-110 + k * 36, 84], [-100 + k * 36, 96]], 1.4, { color: 'rgba(30,24,18,.6)' }); } });
  P.piece(smooth([[90, 64, 1], [96, -30, 1], [108, -40, 1], [114, 60, 1]]), '#57524c', { id: id + 1, lead: 4, matW: 6 });   // a broken pillar
}
function ragBanner(P, L, x, top, id) {
  P.piece(smooth([[x - 2.5, top - 8, 1], [x + 2.5, top - 8, 1], [x + 2.5, top + 150, 1], [x - 2.5, top + 150, 1]]), '#4a3a2a', { id, lead: 2.4, mat: false });
  P.piece(smooth([[x + 2, top, 1], [x + 58, top + 4], [x + 52, top + 30], [x + 60, top + 50, 1], [x + 40, top + 44], [x + 46, top + 62, 1], [x + 22, top + 52], [x + 2, top + 64, 1]]), COL.ruby, { id: id + 1, lead: 3.4, matW: 5,
    paint: g => { g.fillStyle = 'rgba(44,26,12,.75)'; g.fillRect(x + 22, top + 14, 12, 26); g.fillRect(x + 18, top + 12, 20, 5); for (let k = 0; k < 3; k++) g.fillRect(x + 18 + k * 8, top + 7, 4, 5); } });   // a tower glyph
}
const ground = (P, r, col, id, y = 74) => P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 });
function starPiece(P, x, y, r, col, id) { const pts = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * .42 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1]); } P.piece(smooth(pts), col, { id, lead: 2.4, mat: false }); }

export const SKY = [COL.deepblue, COL.cobalt, COL.purple2, '#1f1830', COL.purple2, COL.deepblue];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // Cadia and its pylons; the Eye of Terror beyond
    eyeOfTerror(P, -86, -78, 30, 10100);
    starPiece(P, 90, -90, 7, COL.white, 10110); starPiece(P, 60, 96, 5, COL.white, 10111);
    planet(P, 0, 8, 62, 10120);
    pylons(P, L, 0, 8, 94, 8, f.lit ?? 0, 10130);
  } else if (i === 1) {   // a trooper and a child handed a rifle
    ground(P, r, COL.green2, 10200, 80);
    for (const [x, h] of [[-120, 60], [-96, 90], [100, 70], [124, 50]]) P.piece(smooth([[x - 12, 82, 1], [x - 12, 82 - h, 1], [x + 12, 82 - h, 1], [x + 12, 82, 1]]), '#4a4e58', { id: 10210 + x, lead: 3, matW: 5 });
    drawRig(P, L.translate(-40, 4).scale(.6), GUARD, f.adult || GPOSE.gStand, GUARD_PAL, { id: 10300, face: 'stern' });
    drawRig(P, L.translate(46, 24).scale(-.42, .42), GUARD, f.child || POSE.stand, { ...GUARD_PAL, helm: '#6a5a46' }, { id: 10400, face: 'calm', hide: f.childArmed ? null : new Set(['rifle']) });
  } else if (i === 2) {   // Abaddon against the walls; twelve marks
    ground(P, r, COL.brown, 10500, 84);
    const wall = [[-r - 10, r + 10, 1], [-r - 10, -10, 1]]; for (let k = 0; k < 3; k++) { const x = -r - 10 + k * 26; wall.push([x, -10, 1], [x, -24, 1], [x + 14, -24, 1], [x + 14, -10, 1]); } wall.push([-60, -10, 1], [-60, r + 10, 1]);
    P.piece(smooth(wall), COL.white, { id: 10510, lead: 4.5, matW: 8, paint: g => { g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 1.4; g.beginPath(); for (let y = 0; y < 140; y += 20) { g.moveTo(-r, y); g.lineTo(-60, y); } g.stroke(); } });
    for (let k = 0; k < 12; k++) { const a = Math.PI * (1.1 + k / 11 * .8), x = Math.cos(a) * 112, y = Math.sin(a) * 112 + 6; P.piece(smooth([[x, y - 7, 1], [x + 4, y, 1], [x, y + 7, 1], [x - 4, y, 1]]), k < (f.marks ?? 0) ? COL.gold2 : '#2a2430', { id: 10520 + k, lead: 2.2, mat: false }); }
    drawRig(P, L.translate(40 + (f.ax ?? 0), 8).scale(-.46, .46), ABADDON, f.abaddon || POSE.guard, ABADDON_PAL, { id: 10600, face: 'turned' });
  } else if (i === 3) {   // the star fortress
    for (const [x, y, s] of [[-90, -60, 6], [80, -84, 5], [100, 60, 6], [-70, 86, 5], [20, 104, 4], [-110, 20, 4]]) starPiece(P, x, y, s, COL.white, 10700 + x);
    fortress(P, f.fx ?? 0, f.fy ?? 0, 2.2, 10720, f.core);
  } else if (i === 4) {   // the impact
    planet(P, 0, 80, 92, 10800, f.split || 0);
    pylons(P, L, 0, 80, 118, 8, 8, 10810, f.shatter);
    if (f.fortress != null) fortress(P, 0, f.fortress, 1.35, 10830, true);
    if (f.burn) for (const [x, step] of [[-40, 0], [10, 3], [44, 6]]) { const h = 26 + ((f.step + step) % 4) * 6; P.piece(smooth([[x - 12, 0, 1], [x - 8, -h * .5], [x, -h, 1], [x + 8, -h * .45], [x + 12, 0, 1]]), step % 2 ? COL.amber : COL.red2, { id: 10840 + x, lead: 2.4, mat: false }); }
  } else {   // the ruins: soldiers under a ragged banner
    rubble(P, r, 10900);
    ragBanner(P, L, -6, -96, 10910);
    drawRig(P, L.translate(-62, 18).scale(-.5, .5), GUARD, f.g1 || GPOSE.gStand, GUARD_PAL, { id: 11000, face: 'stern' });
    drawRig(P, L.translate(-14, 10).scale(.54), GUARD, f.g2 || GPOSE.gStand, GUARD_PAL, { id: 11100, face: 'stern' });
    drawRig(P, L.translate(48, 18).scale(.5), GUARD, f.g3 || GPOSE.gStand, GUARD_PAL, { id: 11200, face: 'stern' });
  }
  P.setTransform(L);
}
