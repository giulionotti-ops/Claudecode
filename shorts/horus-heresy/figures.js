// Glass figures cut into rigid pieces on a 2D skeleton (facing right; mirror with a negative x scale to face left).
// Units: pelvis at origin, feet at y≈+124, top of head ≈ -152.
import { COL, INK, smooth, circle, ellipse, brush } from './glass.js';

const D = 180 / Math.PI;
// parts: { n, p: parent, at: pivot in parent space, sh: Path2D, c: palette key or colour, z, paint, lead }
// pose: { x, y, r, <part>: angle }, angles in radians (positive = clockwise, y down)
// o.off: { part: [dx, dy] } world offsets (re-leading); o.pal overrides palette keys; o.hide: Set of parts
export function drawRig(P, M, parts, pose, pal, o = {}) {
  const W = {}, Minv = M.inverse();
  for (const q of parts) {
    const base = q.p ? W[q.p] : M.translate(pose.x || 0, pose.y || 0).rotate((pose.r || 0) * D);
    W[q.n] = base.translate(q.at[0], q.at[1]).rotate((pose[q.n] || 0) * D);
  }
  const order = parts.map((q, i) => [q, i]).sort((a, b) => a[0].z - b[0].z || a[1] - b[1]);
  for (const [q, i] of order) {
    if (o.hide && o.hide.has(q.n)) continue;
    let m = W[q.n];
    const off = o.off && (o.off[q.n] || o.off[q.g]);
    if (off) m = M.translate(off[0], off[1]).multiply(Minv).multiply(m);
    P.setTransform(m);
    const ov = typeof o.pal === 'function' ? o.pal(q) : o.pal;   // per-part palette (re-leading swaps colour group by group)
    const col = (ov && ov[q.c]) || pal[q.c] || q.c;
    P.piece(q.sh, col, { id: (o.id || 0) + i * 7, lead: q.lead ?? 3.4, matW: q.mw ?? 5, wash: q.wash, paint: q.paint ? g => q.paint(g, o) : undefined });
  }
  P.setTransform(M);
  return W;
}

// ---------- grisaille helpers ----------
const fold = (g, pts, w = 1.6) => brush(g, pts, w, { w0: .2, w1: .15 });
function plateBands(g, x0, x1, ys) { for (const y of ys) { brush(g, [[x0, y], [(x0 + x1) / 2, y + 2.5], [x1, y]], 1.4, { w0: .4, w1: .4 }); brush(g, [[x0 + 2, y + 3], [x1 - 2, y + 3]], 1.2, { w0: .3, w1: .3, color: g.__col }); } }
function face(g, e) {
  // e: 'calm' | 'stern' | 'pain' | 'turned' (corrupted) | 'grief'
  const gr = g.createLinearGradient(-14, 0, 8, 0); gr.addColorStop(0, 'rgba(80,44,22,.45)'); gr.addColorStop(1, 'rgba(80,44,22,0)'); g.fillStyle = gr; g.fillRect(-18, -52, 26, 54);
  const bi = { calm: 0, stern: 2.6, pain: -2.4, turned: 3.4, grief: -2.8 }[e] ?? 0;
  brush(g, [[2, -33], [8, -35.5], [14, -33.5 + bi]], 2.8, { w0: .35, w1: .5 });            // brow
  brush(g, [[14, -33 + bi * .6], [18, -30], [20, -22]], 2.0, { w0: .5, w1: .6 });           // brow flowing into the nose
  g.fillStyle = 'rgba(44,26,12,.9)'; g.beginPath(); g.ellipse(9, -27.5, 4.2, 2.2, 0, 0, 7); g.fill();   // almond eye
  g.fillStyle = e === 'turned' ? '#cfe9a0' : '#f2e8d8'; g.beginPath(); g.ellipse(10, -27.5, 1.6, 1.4, 0, 0, 7); g.fill();
  brush(g, [[4, -30], [9, -31.5], [14, -29.5]], 2.2, { w0: .5, w1: .4 });                    // heavy upper lid
  const m = { calm: [[10, -11], [14, -11.5], [17, -12]], stern: [[10, -10], [14, -11.5], [17, -10.5]], pain: [[10, -9.5], [14, -12], [17, -10]], turned: [[9, -12.5], [14, -10.5], [17, -12.5]], grief: [[10, -9], [14, -11.5], [17, -9.5]] }[e] || [[10, -11], [17, -12]];
  brush(g, m, 1.8, { w0: .4, w1: .4 });
  brush(g, [[-4, -24], [-7, -20], [-5, -15]], 1.6, { w0: .4, w1: .4, color: 'rgba(44,26,12,.6)' });   // ear
}
function star(g, x, y, r, col = 'rgba(44,26,12,.7)') { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? r * .38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

// ---------- shared limb shapes ----------
const S = {
  thigh: smooth([[-11, -4], [11, -4], [10, 30], [8, 58], [-8, 58], [-10, 30]]),
  shin: smooth([[-9, -2], [9, -2], [8, 30], [7, 54], [-7, 54], [-8, 30]]),
  boot: smooth([[-9, -4], [8, -4], [14, 4], [25, 8], [26, 14, 1], [-10, 14, 1]]),
  upper: smooth([[-9, -4], [9, -4], [8, 24], [7, 42], [-7, 42], [-8, 24]]),
  fore: smooth([[-8, -2], [8, -2], [7, 20], [6.5, 36], [-6.5, 36], [-7, 20]]),
  fist: smooth([[-7, -2], [7, -3], [11, 5], [11, 14], [5, 20], [-5, 19], [-8, 9]]),
  blade: smooth([[-4, 22, 1], [4, 22, 1], [3.5, 128], [0, 144, 1], [-3.5, 128]]),
  guard: smooth([[-15, 14, 1], [15, 14, 1], [13, 21, 1], [-13, 21, 1]]),
  grip: smooth([[-3, 0, 1], [3, 0, 1], [3, 14, 1], [-3, 14, 1]]),
};
const steel = g => { brush(g, [[0, 30], [0, 124]], 1.2, { w0: .3, w1: .3 }); brush(g, [[2, 32], [2, 120]], 1.2, { w0: .3, w1: .3, color: 'rgba(255,255,255,.5)' }); };

// ---------- the son: armoured, great pauldrons, short cloak ----------
export const SON = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-24, -8, 1], [24, -8, 1], [22, 8, 1], [-22, 8, 1]]), c: 'arm2', z: 4 },
  { n: 'cloak', p: 'pelvis', at: [0, 0], sh: smooth([[-30, -96], [26, -96], [38, -20], [44, 60], [40, 110, 1], [-2, 104], [-46, 112, 1], [-44, 60], [-40, -20]]), c: 'cloak', z: 0,
    paint: g => { fold(g, [[-20, -60], [-26, 20], [-30, 100]]); fold(g, [[6, -70], [8, 20], [10, 98]]); fold(g, [[28, -40], [34, 40], [36, 100]]); } },
  { n: 'thighB', p: 'pelvis', at: [-10, 2], sh: S.thigh, c: 'arm', z: 1, paint: g => plateBands(g, -9, 9, [16, 36]) },
  { n: 'shinB', p: 'thighB', at: [0, 56], sh: S.shin, c: 'arm', z: 1, paint: g => plateBands(g, -8, 8, [6, 30]) },
  { n: 'bootB', p: 'shinB', at: [0, 52], sh: S.boot, c: 'arm2', z: 1 },
  { n: 'thighF', p: 'pelvis', at: [10, 2], sh: S.thigh, c: 'arm', z: 3, paint: g => plateBands(g, -9, 9, [16, 36]) },
  { n: 'shinF', p: 'thighF', at: [0, 56], sh: S.shin, c: 'arm', z: 3, paint: g => plateBands(g, -8, 8, [6, 30]) },
  { n: 'bootF', p: 'shinF', at: [0, 52], sh: S.boot, c: 'arm2', z: 3 },
  { n: 'faulds', p: 'pelvis', at: [0, 0], sh: smooth([[-26, -4, 1], [26, -4, 1], [32, 34], [16, 40], [0, 34], [-16, 40], [-32, 34]]), c: 'trim', z: 4.5,
    paint: g => { plateBands(g, -28, 28, [8, 20]); brush(g, [[0, 6], [0, 34]], 1.4); } },
  { n: 'torso', p: 'pelvis', at: [0, -4], sh: smooth([[-26, 0], [-32, -40], [-34, -80], [-22, -98], [22, -98], [34, -80], [32, -40], [26, 0]]), c: 'arm', z: 5,
    paint: g => { brush(g, [[-28, -66], [0, -56], [28, -66]], 1.8); brush(g, [[-26, -30], [0, -22], [26, -30]], 1.6); brush(g, [[0, -94], [0, -60]], 1.4); star(g, 0, -42, 9, 'rgba(60,30,10,.75)');
      brush(g, [[-24, -63], [0, -53], [24, -63]], 1.4, { color: g.__col }); } },
  { n: 'head', p: 'torso', at: [2, -98], sh: smooth([[-14, -4], [-16, -26], [-12, -42], [0, -50], [14, -46], [20, -34], [23, -22, 1], [20, -18], [20, -10], [12, -2], [0, 2]]), c: 'flesh', z: 6,
    paint: (g, o) => face(g, o.face || 'calm') },
  { n: 'hair', p: 'head', at: [0, 0], sh: smooth([[-16, -22], [-18, -40], [-8, -54], [8, -56], [20, -46], [16, -40], [4, -44], [-6, -36], [-9, -20]]), c: 'hair', z: 6.5, mw: 4 },
  { n: 'upperB', p: 'torso', at: [-30, -84], sh: S.upper, c: 'arm', z: 2 },
  { n: 'foreB', p: 'upperB', at: [0, 40], sh: S.fore, c: 'arm', z: 2, paint: g => plateBands(g, -7, 7, [8]) },
  { n: 'handB', p: 'foreB', at: [0, 34], sh: S.fist, c: 'arm2', z: 2 },
  { n: 'upperF', p: 'torso', at: [30, -84], sh: S.upper, c: 'arm', z: 8 },
  { n: 'foreF', p: 'upperF', at: [0, 40], sh: S.fore, c: 'arm', z: 8, paint: g => plateBands(g, -7, 7, [8]) },
  { n: 'handF', p: 'foreF', at: [0, 34], sh: S.fist, c: 'arm2', z: 8.5 },
  { n: 'grip', p: 'handF', at: [2, 2], sh: S.grip, c: 'brown', z: 9, g: 'sword' },
  { n: 'guard', p: 'grip', at: [0, 0], sh: S.guard, c: 'trim', z: 9.2, g: 'sword' },
  { n: 'blade', p: 'grip', at: [0, 0], sh: S.blade, c: 'steel', z: 9.1, g: 'sword', paint: steel },
  { n: 'pauldB', p: 'upperB', at: [0, 0], sh: smooth([[-26, -10], [-12, -24], [10, -24], [24, -10], [22, 12], [-24, 12]]), c: 'trim', z: 7, paint: g => plateBands(g, -22, 20, [0]) },
  { n: 'pauldF', p: 'upperF', at: [0, 0], sh: smooth([[-24, -10], [-10, -24], [12, -24], [26, -10], [24, 12], [-22, 12]]), c: 'trim', z: 10, paint: g => plateBands(g, -20, 22, [0]) },
];
export const SON_PAL = { arm: COL.gold2, arm2: COL.gold, trim: COL.white, cloak: COL.green, flesh: '#b98468', hair: COL.brown, steel: COL.steel, brown: COL.brown };
export const SON_TURNED = { arm: '#7a0c16', arm2: '#5a0a12', trim: COL.gold, cloak: COL.purple2, flesh: '#a87460', hair: '#3a2a20', steel: COL.steel2 };

// ---------- the father: crowned king, long robe, mantle ----------
export const FATHER = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-24, -8, 1], [24, -8, 1], [24, 6, 1], [-24, 6, 1]]), c: 'robe', z: 4 },
  { n: 'mantle', p: 'pelvis', at: [0, 0], sh: smooth([[-34, -100], [30, -100], [42, -30], [46, 60], [44, 122, 1], [-48, 122, 1], [-46, 60], [-44, -30]]), c: 'mantle', z: 0,
    paint: g => { fold(g, [[-24, -70], [-30, 30], [-34, 116]]); fold(g, [[10, -80], [12, 30], [14, 116]]); fold(g, [[34, -40], [40, 60], [40, 116]]); } },
  { n: 'skirt', p: 'pelvis', at: [0, 0], sh: smooth([[-26, -6], [26, -6], [30, 30], [32, 62, 1], [-32, 62, 1], [-30, 30]]), c: 'robe', z: 3, paint: g => { fold(g, [[-10, 0], [-14, 58]]); fold(g, [[12, 0], [16, 58]]); } },
  { n: 'hem', p: 'skirt', at: [0, 58], sh: smooth([[-32, -2], [32, -2], [38, 34], [42, 64, 1], [-42, 64, 1], [-38, 34]]), c: 'robe', z: 3,
    paint: g => { fold(g, [[-12, 0], [-18, 60]]); fold(g, [[14, 0], [20, 60]]); brush(g, [[-40, 54], [0, 58], [40, 54]], 2, { w0: .5, w1: .5, color: 'rgba(220,170,60,.7)' }); } },
  { n: 'torso', p: 'pelvis', at: [0, -4], sh: smooth([[-24, 0], [-30, -40], [-32, -82], [-20, -98], [20, -98], [32, -82], [30, -40], [24, 0]]), c: 'robe', z: 5,
    paint: g => { fold(g, [[-12, -80], [-14, -10]]); fold(g, [[10, -80], [12, -10]]); g.fillStyle = 'rgba(230,180,60,.0)'; } },
  { n: 'collar', p: 'torso', at: [0, -92], sh: smooth([[-24, -6], [0, 4], [24, -6], [22, 6], [0, 16], [-22, 6]]), c: 'trim', z: 5.5, paint: g => { for (let k = -2; k <= 2; k++) { g.fillStyle = INK; g.beginPath(); g.arc(k * 9, 6 + Math.abs(k) * -1.5, 2, 0, 7); g.fill(); } } },
  { n: 'head', p: 'torso', at: [2, -98], sh: smooth([[-14, -4], [-16, -26], [-12, -42], [0, -50], [14, -46], [20, -34], [23, -22, 1], [20, -18], [20, -10], [12, -2], [0, 2]]), c: 'flesh', z: 6,
    paint: (g, o) => face(g, o.face || 'stern') },
  { n: 'beard', p: 'head', at: [0, 0], sh: smooth([[-6, -18], [6, -10], [18, -8], [16, 6], [6, 16, 1], [-4, 8], [-12, -6]]), c: 'white', z: 6.4, mw: 3, paint: g => { fold(g, [[2, -8], [4, 10]], 1.2); fold(g, [[10, -6], [8, 10]], 1.2); } },
  { n: 'hair', p: 'head', at: [0, 0], sh: smooth([[-16, -20], [-18, -40], [-6, -50], [10, -50], [6, -44], [-6, -38], [-9, -6], [-16, 2]]), c: 'white', z: 6.5, mw: 3 },
  { n: 'crown', p: 'head', at: [0, -44], sh: smooth([[-16, 4, 1], [-18, -16, 1], [-10, -6, 1], [-4, -22, 1], [2, -6, 1], [8, -22, 1], [14, -6, 1], [20, -16, 1], [18, 4, 1]]), c: 'crown', z: 7, lead: 3,
    paint: g => { g.fillStyle = 'rgba(160,20,30,.75)'; g.beginPath(); g.arc(2, -2, 3, 0, 7); g.fill(); } },
  { n: 'upperB', p: 'torso', at: [-28, -86], sh: S.upper, c: 'robe', z: 2 },
  { n: 'foreB', p: 'upperB', at: [0, 40], sh: S.fore, c: 'robe', z: 2 },
  { n: 'handB', p: 'foreB', at: [0, 34], sh: S.fist, c: 'flesh', z: 2 },
  { n: 'upperF', p: 'torso', at: [28, -86], sh: S.upper, c: 'robe', z: 8, paint: g => fold(g, [[0, 4], [2, 38]]) },
  { n: 'foreF', p: 'upperF', at: [0, 40], sh: S.fore, c: 'robe', z: 8, paint: g => brush(g, [[-7, 30], [7, 30]], 2.2, { color: 'rgba(220,170,60,.8)' }) },
  { n: 'handF', p: 'foreF', at: [0, 34], sh: S.fist, c: 'flesh', z: 8.5 },
  { n: 'grip', p: 'handF', at: [2, 2], sh: S.grip, c: 'brown', z: 9 },
  { n: 'guard', p: 'grip', at: [0, 0], sh: S.guard, c: 'crown', z: 9.2 },
  { n: 'blade', p: 'grip', at: [0, 0], sh: smooth([[-4.5, 22, 1], [4.5, 22, 1], [4, 150], [0, 168, 1], [-4, 150]]), c: 'steel', z: 9.1, paint: steel },
];
export const FATHER_PAL = { robe: COL.white, mantle: COL.ruby, trim: COL.gold2, crown: COL.gold2, flesh: '#c08c70', white: COL.white, steel: COL.white, brown: COL.brown };

// ---------- the hooded assassin with a curved blade ----------
export const SHADE = [
  { n: 'body', p: null, at: [0, 0], sh: smooth([[-6, -128], [10, -138], [26, -126], [30, -96], [22, -80], [34, -20], [46, 60], [50, 124, 1], [-40, 124, 1], [-34, 60], [-30, -40], [-22, -96]]), c: 'robe', z: 1,
    paint: g => { g.fillStyle = 'rgba(20,10,20,.85)'; g.beginPath(); g.ellipse(18, -110, 9, 13, .2, 0, 7); g.fill(); g.fillStyle = '#9fe06a'; g.beginPath(); g.ellipse(21, -112, 2.4, 1.4, 0, 0, 7); g.fill();
      fold(g, [[-10, -60], [-18, 40], [-24, 118]]); fold(g, [[12, -60], [20, 40], [26, 118]]); } },
  { n: 'arm', p: 'body', at: [16, -76], sh: smooth([[-9, -4], [9, -4], [8, 40], [6, 70], [-6, 70], [-8, 40]]), c: 'robe2', z: 2, paint: g => fold(g, [[0, 6], [0, 64]]) },
  { n: 'hand', p: 'arm', at: [0, 66], sh: S.fist, c: 'flesh', z: 2.2 },
  { n: 'knife', p: 'hand', at: [2, 8], sh: smooth([[-3, 0, 1], [3, 0, 1], [6, 40], [18, 80], [36, 106, 1], [10, 88], [-4, 50]]), c: 'blade', z: 2.1, lead: 3,
    paint: g => brush(g, [[0, 10], [6, 48], [22, 88]], 1.2, { color: 'rgba(10,30,10,.7)' }) },
];
export const SHADE_PAL = { robe: COL.purple2, robe2: COL.purple, flesh: '#8a8f7a', blade: '#3f8a2a' };

// ---------- a helm of the legions ----------
const HELM = smooth([[-15, 20, 1], [-17, -4], [-13, -20], [0, -27], [13, -20], [17, -4], [15, 20, 1]]);
export function helm(P, M, x, y, col, id, s = 1) {
  P.setTransform(M.translate(x, y).scale(s));
  P.piece(HELM, col, { id, lead: 3, matW: 4, paint: g => { g.fillStyle = 'rgba(30,18,10,.85)'; g.fillRect(-12, -6, 24, 4.5); g.fillRect(-1.6, -6, 3.2, 18); brush(g, [[-13, -12], [0, -20], [13, -12]], 1.2, { color: g.__col }); } });
  P.setTransform(M);
}

// ---------- poses ----------
// son poses (facing right)
export const POSE = {
  stand: {},
  guard: { upperF: -.55, foreF: -1.1, upperB: .25, foreB: -.3 },
  raise: { upperF: -2.75, foreF: -.15, handF: -.1, upperB: .4, foreB: -.4, head: -.12 },
  kneel: { y: 46, thighF: -1.45, shinF: 1.45, bootF: 0, thighB: .25, shinB: 1.25, bootB: -1.45, upperF: -.3, foreF: -.6, upperB: .3, head: .25 },
  kneelLow: { y: 50, r: .12, thighF: -1.45, shinF: 1.45, thighB: .25, shinB: 1.25, bootB: -1.45, upperF: .2, foreF: .1, upperB: .5, head: .55, torso: .2 },
  hit: { r: -.18, x: -6, upperF: .5, foreF: .4, upperB: .7, head: -.35, thighF: -.2, thighB: .2 },
  strike: { upperF: -1.7, foreF: -.6, handF: -.3, upperB: .5, foreB: -.6, torso: -.1, thighF: -.35, shinF: .2, thighB: .3 },
  lie: { y: 92, r: -1.5, upperF: -.3, foreF: -.3, upperB: .3, head: -.25, thighF: .05, thighB: -.05 },
  // father on the throne (thighs forward, robe folded)
  seated: { y: 30, skirt: -1.4, hem: 1.4, upperF: -.5, foreF: -.9, upperB: .15, foreB: -.5, head: .18 },
  fstand: { upperF: -.4, foreF: -.5, upperB: .2 },
  reach: { upperF: -1.25, foreF: -.25, handF: .2, upperB: .2 },
  // the assassin
  sReady: { arm: .9 },
  sStab: { arm: -1.35, hand: -.4 },
};
export const lerpPose = (a, b, k) => { const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) o[key] = (a[key] || 0) + ((b[key] || 0) - (a[key] || 0)) * k; return o; };
// stepped transition: figures move on 8 fps, in 3 held steps
export function stepPose(t, t0, a, b, dur = .375) { if (t <= t0) return POSE[a] || a; if (t >= t0 + dur) return POSE[b] || b; const k = Math.ceil((t - t0) / dur * 3) / 3; return lerpPose(POSE[a] || a, POSE[b] || b, k); }
