// Detailed figures (proposal): heavy power-armour silhouettes, same skeleton part names as figures.js so every pose still works.
// Evokes the grimdark look (bulk, backpacks, collars, laurels, lensed helms) without tracing any official design.
import { COL, INK, smooth, circle, ellipse, brush } from './glass.js';

const fold = (g, pts, w = 1.6) => brush(g, pts, w, { w0: .2, w1: .15 });
const band = (g, x0, x1, y, hi = true) => { brush(g, [[x0, y], [(x0 + x1) / 2, y + 2.5], [x1, y]], 1.5, { w0: .4, w1: .4 }); if (hi) brush(g, [[x0 + 2, y + 3.2], [x1 - 2, y + 3.2]], 1.2, { w0: .3, w1: .3, color: g.__col }); };
const rivet = (g, x, y, r = 1.6) => { g.fillStyle = 'rgba(44,26,12,.85)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
function laurel(g, pts, s = 1) {   // painted laurel sprig along a curve (grisaille)
  brush(g, pts, 1.2 * s, { w0: .5, w1: .3 });
  for (let i = 0; i < pts.length - 1; i++) { const [x, y] = pts[i], [x2, y2] = pts[i + 1], a = Math.atan2(y2 - y, x2 - x);
    for (const sd of [-1, 1]) { g.save(); g.translate((x + x2) / 2, (y + y2) / 2); g.rotate(a + sd * .7); g.fillStyle = 'rgba(52,30,14,.7)'; g.beginPath(); g.ellipse(4 * s, 0, 4.2 * s, 1.6 * s, 0, 0, 7); g.fill(); g.restore(); } }
}
function sunburst(g, x, y, r, col = 'rgba(52,30,14,.8)') { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, rr = k % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.fillStyle = g.__col; g.beginPath(); g.arc(x, y, r * .28, 0, 7); g.fill(); }
function face(g, e, beardless = true) {
  const gr = g.createLinearGradient(-14, 0, 8, 0); gr.addColorStop(0, 'rgba(80,44,22,.5)'); gr.addColorStop(1, 'rgba(80,44,22,0)'); g.fillStyle = gr; g.fillRect(-18, -52, 26, 54);
  g.fillStyle = 'rgba(80,44,22,.22)'; g.fill(ellipse(14, -6, 9, 4)); g.fill(ellipse(16, -19, 4, 6));   // jaw and cheekbone mat
  const bi = { calm: 0, stern: 3, pain: -2.6, turned: 4, grief: -3 }[e] ?? 0;
  brush(g, [[1, -32], [8, -36], [15, -33.5 + bi]], 3.4, { w0: .4, w1: .55 });                 // heavy brow
  brush(g, [[15, -33 + bi * .6], [19, -29], [21.5, -21], [19.5, -17]], 2.2, { w0: .5, w1: .5 });   // brow into a strong nose
  g.fillStyle = 'rgba(44,26,12,.92)'; g.beginPath(); g.ellipse(9, -27, 4.4, 2.0, 0, 0, 7); g.fill();
  g.fillStyle = e === 'turned' ? '#ff6a3a' : '#f2e8d8'; g.beginPath(); g.ellipse(10.2, -27, 1.5, 1.3, 0, 0, 7); g.fill();
  brush(g, [[3, -29.5], [9, -31.5], [14.5, -29]], 2.4, { w0: .5, w1: .4 });
  brush(g, [[5, -22], [10, -20.5]], 1.1, { w0: .4, w1: .3, color: 'rgba(44,26,12,.5)' });       // lower lid / age line
  const m = { calm: [[9, -10.5], [13, -11], [17, -11.5]], stern: [[9, -10], [13, -11.5], [17, -10]], pain: [[9, -9], [13, -12], [17, -9.5]], turned: [[8, -12.5], [13, -10], [17, -12.5]], grief: [[9, -8.5], [13, -11.5], [17, -9]] }[e];
  brush(g, m, 2, { w0: .4, w1: .4 }); brush(g, [[11, -7], [15, -6.5]], 1, { color: 'rgba(44,26,12,.45)' });
  brush(g, [[-3, -25], [-7, -20], [-4, -14]], 1.6, { w0: .4, w1: .4, color: 'rgba(44,26,12,.6)' });
}

// ---------- shared armour shapes ----------
const A = {
  thigh: smooth([[-14, -4], [14, -4], [13, 30], [10, 58], [-10, 58], [-13, 30]]),
  knee: smooth([[-12, -9], [0, -14], [13, -9], [14, 4], [0, 9], [-12, 4]]),
  shin: smooth([[-11, -2], [11, -2], [12, 24], [10, 54], [-10, 54], [-11, 24]]),
  boot: smooth([[-12, -5], [10, -5], [18, 3], [30, 7], [31, 15, 1], [-13, 15, 1]]),
  upper: smooth([[-11, -4], [11, -4], [10, 24], [9, 42], [-9, 42], [-10, 24]]),
  fore: smooth([[-11, -2], [11, -2], [12, 18], [9, 36], [-9, 36], [-10, 18]]),
  fist: smooth([[-10, -3], [9, -4], [14, 5], [14, 16], [7, 23], [-6, 22], [-11, 10]]),
  pauldron: smooth([[-30, -6], [-24, -22], [-6, -31], [14, -30], [28, -18], [32, -2], [27, 15], [-26, 15]]),
  rim: smooth([[-32, 8, 1], [-28, -10], [-22, -25], [-6, -33], [14, -32], [30, -19], [34, -2], [32, 8, 1], [27, 2], [24, -14], [10, -24], [-4, -26], [-19, -19], [-24, -5], [-26, 4]]),
};
const steel = g => { brush(g, [[0, 30], [0, 140]], 1.2, { w0: .3, w1: .3 }); brush(g, [[2, 32], [2, 136]], 1.2, { w0: .3, w1: .3, color: 'rgba(255,255,255,.55)' }); };

// ---------- the son, in power armour ----------
export const SON2 = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-27, -9, 1], [27, -9, 1], [25, 9, 1], [-25, 9, 1]]), c: 'arm2', z: 4, paint: g => { g.fillStyle = 'rgba(44,26,12,.6)'; g.fillRect(-7, -8, 14, 16); } },
  { n: 'cloak', p: 'pelvis', at: [0, 0], sh: smooth([[-36, -104], [32, -104], [46, -20], [54, 60], [50, 122, 1], [16, 112], [-18, 124], [-54, 116, 1], [-52, 60], [-46, -20]]), c: 'cloak', z: -1,
    paint: g => { fold(g, [[-26, -70], [-32, 20], [-38, 112]]); fold(g, [[-6, -76], [-8, 30], [-10, 118]]); fold(g, [[18, -70], [22, 30], [26, 110]]); fold(g, [[38, -40], [44, 50], [44, 114]]); } },
  { n: 'pack', p: 'pelvis', at: [0, -4], sh: smooth([[-38, -82, 1], [-30, -112, 1], [30, -112, 1], [38, -82, 1], [34, -40, 1], [-34, -40, 1]]), c: 'dark', z: -.5, paint: g => { band(g, -32, 32, -90, false); band(g, -32, 32, -60, false); } },
  { n: 'stackB', p: 'pack', at: [-22, -110], sh: smooth([[-7, 0, 1], [-6, -30, 1], [-9, -34, 1], [9, -34, 1], [6, -30, 1], [7, 0, 1]]), c: 'dark', z: -.4, lead: 2.6, paint: g => { band(g, -6, 6, -12, false); } },
  { n: 'stackF', p: 'pack', at: [22, -110], sh: smooth([[-7, 0, 1], [-6, -30, 1], [-9, -34, 1], [9, -34, 1], [6, -30, 1], [7, 0, 1]]), c: 'dark', z: -.4, lead: 2.6, paint: g => { band(g, -6, 6, -12, false); } },
  { n: 'thighB', p: 'pelvis', at: [-12, 2], sh: A.thigh, c: 'arm', z: 1, paint: g => { band(g, -11, 11, 18); band(g, -10, 10, 40); } },
  { n: 'shinB', p: 'thighB', at: [0, 56], sh: A.shin, c: 'arm', z: 1, paint: g => { band(g, -10, 10, 26); fold(g, [[0, 6], [0, 48]], 1.2); } },
  { n: 'kneeB', p: 'shinB', at: [0, 0], sh: A.knee, c: 'trim', z: 1.1, lead: 2.8, paint: g => rivet(g, 0, -2) },
  { n: 'bootB', p: 'shinB', at: [0, 52], sh: A.boot, c: 'arm2', z: 1, paint: g => band(g, -10, 18, 4, false) },
  { n: 'thighF', p: 'pelvis', at: [12, 2], sh: A.thigh, c: 'arm', z: 3, paint: g => { band(g, -11, 11, 18); band(g, -10, 10, 40); } },
  { n: 'shinF', p: 'thighF', at: [0, 56], sh: A.shin, c: 'arm', z: 3, paint: g => { band(g, -10, 10, 26); fold(g, [[0, 6], [0, 48]], 1.2); } },
  { n: 'kneeF', p: 'shinF', at: [0, 0], sh: A.knee, c: 'trim', z: 3.1, lead: 2.8, paint: g => rivet(g, 0, -2) },
  { n: 'bootF', p: 'shinF', at: [0, 52], sh: A.boot, c: 'arm2', z: 3, paint: g => band(g, -10, 18, 4, false) },
  { n: 'tassetB', p: 'pelvis', at: [-14, 4], sh: smooth([[-16, -6, 1], [14, -6, 1], [16, 26], [6, 34], [-14, 32], [-20, 22]]), c: 'arm', z: 2, paint: g => band(g, -14, 12, 12) },
  { n: 'tassetF', p: 'pelvis', at: [14, 4], sh: smooth([[-14, -6, 1], [16, -6, 1], [22, 22], [14, 32], [-6, 34], [-16, 26]]), c: 'arm', z: 4.6, paint: g => band(g, -12, 14, 12) },
  { n: 'loin', p: 'pelvis', at: [0, 4], sh: smooth([[-10, -4, 1], [10, -4, 1], [9, 44], [0, 52, 1], [-9, 44]]), c: 'cloth', z: 4.5, paint: g => { fold(g, [[-3, 4], [-4, 44]], 1.1); laurel(g, [[0, 10], [0, 40]], .7); } },
  { n: 'torso', p: 'pelvis', at: [0, -6], sh: smooth([[-28, 0], [-36, -40], [-38, -80], [-26, -100], [26, -100], [38, -80], [36, -40], [28, 0]]), c: 'arm', z: 5,
    paint: (g, o) => { brush(g, [[-30, -70], [0, -58], [30, -70]], 2); brush(g, [[-30, -67], [0, -55], [30, -67]], 1.4, { color: g.__col }); band(g, -28, 28, -26); band(g, -26, 26, -12); brush(g, [[0, -96], [0, -62]], 1.4);
      sunburst(g, 0, -80, 12); if (o.turned) { brush(g, [[-6, -92], [2, -82], [-3, -72], [5, -64]], 1.6, { color: 'rgba(30,10,10,.9)' }); } } },
  { n: 'belt', p: 'torso', at: [0, 0], sh: smooth([[-29, -9, 1], [29, -9, 1], [28, 3, 1], [-28, 3, 1]]), c: 'trim', z: 5.3, lead: 2.8, paint: g => { g.fillStyle = 'rgba(44,26,12,.7)'; g.fill(ellipse(0, -3, 7, 5)); rivet(g, -18, -3); rivet(g, 18, -3); } },
  { n: 'collar', p: 'torso', at: [0, -96], sh: smooth([[-34, 4, 1], [-32, -18], [-20, -34], [0, -38], [20, -34], [32, -18], [34, 4, 1], [16, -4], [0, -8], [-16, -4]]), c: 'arm2', z: 5.6, paint: g => { band(g, -24, 24, -24, false); laurel(g, [[-22, -10], [-12, -26], [0, -30]], .8); laurel(g, [[22, -10], [12, -26], [0, -30]], .8); } },
  { n: 'head', p: 'torso', at: [2, -100], sh: smooth([[-15, -4], [-17, -26], [-13, -44], [0, -52], [14, -48], [20, -34], [23, -22, 1], [20, -18], [21, -9], [13, -1], [0, 2]]), c: 'flesh', z: 10.5,
    paint: (g, o) => { face(g, o.face || 'stern'); brush(g, [[-12, -42], [0, -50], [12, -47]], 1.2, { color: 'rgba(44,26,12,.35)' }); } },   // shaved scalp line
  { n: 'hair', p: 'head', at: [0, 0], sh: smooth([[-6, -48], [-2, -64], [4, -70], [8, -62], [6, -50]]), c: 'hair', z: 10.6, mw: 3, lead: 2.6 },   // a warrior's topknot
  { n: 'pelt', p: 'torso', at: [0, -94], sh: smooth([[-44, 4], [-40, -10], [-24, -16], [0, -12], [24, -16], [40, -10], [44, 4], [34, 14, 1], [26, 6], [14, 14, 1], [0, 8], [-14, 14, 1], [-26, 6], [-34, 14, 1]]), c: 'pelt', z: 6.8, mw: 4,
    paint: g => { for (let k = -5; k <= 5; k++) brush(g, [[k * 7, -10], [k * 7.6, 6]], 1, { color: 'rgba(52,30,14,.5)' }); } },   // a beast pelt across the shoulders
  { n: 'upperB', p: 'torso', at: [-46, -82], sh: A.upper, c: 'arm', z: 2, paint: g => band(g, -9, 9, 22) },
  { n: 'foreB', p: 'upperB', at: [0, 40], sh: A.fore, c: 'arm', z: 2, paint: g => { band(g, -10, 10, 8); band(g, -9, 9, 24); } },
  { n: 'handB', p: 'foreB', at: [0, 34], sh: A.fist, c: 'arm2', z: 2, paint: g => { for (const y of [6, 11, 16]) brush(g, [[-4, y], [10, y + 1]], 1.2); } },
  { n: 'upperF', p: 'torso', at: [46, -82], sh: A.upper, c: 'arm', z: 8, paint: g => band(g, -9, 9, 22) },
  { n: 'foreF', p: 'upperF', at: [0, 40], sh: A.fore, c: 'arm', z: 8, paint: g => { band(g, -10, 10, 8); band(g, -9, 9, 24); } },
  { n: 'handF', p: 'foreF', at: [0, 34], sh: A.fist, c: 'arm2', z: 8.5, paint: g => { for (const y of [6, 11, 16]) brush(g, [[-4, y], [10, y + 1]], 1.2); } },
  // weapon: a heavy flanged mace
  { n: 'grip', p: 'handF', at: [2, 2], sh: smooth([[-3.4, -6, 1], [3.4, -6, 1], [3.4, 96, 1], [-3.4, 96, 1]]), c: 'dark', z: 9, lead: 2.6, g: 'sword', paint: g => { for (let y = 4; y < 30; y += 6) brush(g, [[-3, y], [3, y + 3]], 1); } },
  { n: 'guard', p: 'grip', at: [0, 0], sh: circle(0, -10, 6), c: 'trim', z: 9.2, lead: 2.6, g: 'sword' },
  { n: 'blade', p: 'grip', at: [0, 96], sh: smooth([[-6, -6], [-20, 0, 1], [-16, 18], [-22, 34, 1], [-8, 30], [0, 44, 1], [8, 30], [22, 34, 1], [16, 18], [20, 0, 1], [6, -6]]), c: 'steel', z: 9.1, g: 'sword', lead: 3,
    paint: g => { fold(g, [[0, -2], [0, 38]], 1.2); fold(g, [[-12, 6], [-14, 26]], 1); fold(g, [[12, 6], [14, 26]], 1); } },
  { n: 'pauldB', p: 'upperB', at: [0, 2], sh: A.pauldron, c: 'arm', z: 7, mw: 7, paint: g => { band(g, -30, 30, -6); laurel(g, [[-26, 6], [-8, -14], [14, -16], [28, 0]], .9); } },
  { n: 'rimB', p: 'pauldB', at: [0, 0], sh: A.rim, c: 'trim', z: 7.1, lead: 2.6 },
  { n: 'pauldF', p: 'upperF', at: [0, 2], sh: A.pauldron, c: 'arm', z: 10, mw: 7, paint: g => { band(g, -30, 30, -6); laurel(g, [[-26, 6], [-8, -14], [14, -16], [28, 0]], .9); } },
  { n: 'rimF', p: 'pauldF', at: [0, 0], sh: A.rim, c: 'trim', z: 10.1, lead: 2.6 },
];
export const SON2_LOYAL = { arm: COL.white, arm2: '#b8c2b0', trim: COL.gold2, cloak: COL.ruby2, cloth: COL.gold, dark: '#3c3f46', pelt: '#9a8a6c', flesh: '#b07a5e', hair: '#2c2018', steel: COL.steel };
export const SON2_TURNED = { arm: COL.teal, arm2: '#1f5a5e', trim: COL.gold, cloak: '#3a0a10', cloth: '#5a0a12', dark: '#26282c', pelt: '#5e5040', flesh: '#9a6a56', hair: '#1c1410', steel: COL.steel2 };

// ---------- the father: gilded armour, laurel crown, great red cloak, a sword wreathed in fire ----------
export const FATHER2 = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-27, -9, 1], [27, -9, 1], [25, 9, 1], [-25, 9, 1]]), c: 'arm2', z: 4 },
  { n: 'mantle', p: 'pelvis', at: [0, 0], sh: smooth([[-38, -104], [34, -104], [52, -30], [64, 60], [66, 126, 1], [24, 118], [-14, 128], [-60, 120, 1], [-58, 50], [-50, -30]]), c: 'mantle', z: -1,
    paint: g => { fold(g, [[-30, -70], [-40, 30], [-46, 118]]); fold(g, [[-6, -80], [-8, 40], [-8, 122]]); fold(g, [[22, -76], [30, 30], [36, 116]]); fold(g, [[46, -30], [56, 60], [58, 120]]); brush(g, [[-58, 112], [0, 124], [64, 120]], 2.4, { color: 'rgba(230,180,70,.75)' }); } },
  { n: 'thighB', p: 'pelvis', at: [-12, 2], sh: A.thigh, c: 'arm', z: 1, paint: g => { band(g, -11, 11, 18); band(g, -10, 10, 40); } },
  { n: 'shinB', p: 'thighB', at: [0, 56], sh: A.shin, c: 'arm', z: 1, paint: g => { band(g, -10, 10, 26); laurel(g, [[0, 8], [0, 46]], .6); } },
  { n: 'kneeB', p: 'shinB', at: [0, 0], sh: A.knee, c: 'arm2', z: 1.1, lead: 2.8, paint: g => sunburst(g, 0, -2, 5) },
  { n: 'bootB', p: 'shinB', at: [0, 52], sh: A.boot, c: 'arm2', z: 1 },
  { n: 'thighF', p: 'pelvis', at: [12, 2], sh: A.thigh, c: 'arm', z: 3, paint: g => { band(g, -11, 11, 18); band(g, -10, 10, 40); } },
  { n: 'shinF', p: 'thighF', at: [0, 56], sh: A.shin, c: 'arm', z: 3, paint: g => { band(g, -10, 10, 26); laurel(g, [[0, 8], [0, 46]], .6); } },
  { n: 'kneeF', p: 'shinF', at: [0, 0], sh: A.knee, c: 'arm2', z: 3.1, lead: 2.8, paint: g => sunburst(g, 0, -2, 5) },
  { n: 'bootF', p: 'shinF', at: [0, 52], sh: A.boot, c: 'arm2', z: 3 },
  // the robe skirt keeps the old part names so the seated pose still folds it
  { n: 'skirt', p: 'pelvis', at: [0, 2], sh: smooth([[-30, -6, 1], [30, -6, 1], [34, 30], [36, 56, 1], [-36, 56, 1], [-34, 30]]), c: 'arm', z: 4.4, paint: g => { band(g, -30, 30, 10); band(g, -32, 32, 28); band(g, -34, 34, 46); } },
  { n: 'hem', p: 'skirt', at: [0, 54], sh: smooth([[-16, -2, 1], [16, -2, 1], [14, 26], [0, 34, 1], [-14, 26]]), c: 'cloth', z: 4.5, paint: g => laurel(g, [[0, 2], [0, 28]], .6) },
  { n: 'torso', p: 'pelvis', at: [0, -6], sh: smooth([[-28, 0], [-36, -40], [-38, -80], [-26, -100], [26, -100], [38, -80], [36, -40], [28, 0]]), c: 'arm', z: 5,
    paint: g => { sunburst(g, 0, -64, 18); laurel(g, [[-28, -30], [-16, -42], [0, -46]], 1); laurel(g, [[28, -30], [16, -42], [0, -46]], 1); band(g, -28, 28, -22); band(g, -26, 26, -10); brush(g, [[-32, -86], [0, -78], [32, -86]], 1.6); } },
  { n: 'collar', p: 'torso', at: [0, -96], sh: smooth([[-30, 4, 1], [-30, -20], [-20, -38], [0, -42], [20, -38], [30, -20], [30, 4, 1], [16, -4], [0, -8], [-16, -4]]), c: 'arm2', z: 5.6, paint: g => { band(g, -26, 26, -26, false); for (let k = -2; k <= 2; k++) rivet(g, k * 10, -34 + Math.abs(k) * 2.5, 2); } },
  { n: 'head', p: 'torso', at: [2, -100], sh: smooth([[-15, -4], [-17, -26], [-13, -44], [0, -52], [14, -48], [20, -34], [23, -22, 1], [20, -18], [21, -9], [13, -1], [0, 2]]), c: 'flesh', z: 10.5, paint: (g, o) => face(g, o.face || 'stern') },
  { n: 'hair', p: 'head', at: [0, 0], sh: smooth([[-14, -40], [-4, -54], [12, -52], [8, -44], [-6, -40], [-12, -10], [-18, 18], [-26, 30, 1], [-28, 4], [-22, -26]]), c: 'hair', z: 5.9, mw: 3, paint: g => { fold(g, [[-12, -34], [-18, 0], [-22, 24]], 1.1); } },   // long dark hair
  { n: 'crown', p: 'head', at: [0, -44], sh: smooth([[-19, 8, 1], [-21, -8, 1], [-15, -2, 1], [-11, -22, 1], [-5, -4, 1], [1, -28, 1], [7, -4, 1], [13, -22, 1], [17, -2, 1], [23, -8, 1], [21, 8, 1]]), c: 'crown', z: 10.7, lead: 2.6,
    paint: g => { brush(g, [[-19, 2], [1, 4], [21, 2]], 1.4, { w0: .5, w1: .5 }); for (let k = -4; k <= 4; k++) { g.save(); g.translate(k * 4.4, 4.5); g.rotate(k * .2 + .5); g.fillStyle = 'rgba(52,30,14,.55)'; g.beginPath(); g.ellipse(0, 0, 1.4, 3.2, 0, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = 'rgba(150,15,25,.9)'; g.beginPath(); g.arc(1, -6, 3.2, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,220,.6)'; g.beginPath(); g.arc(0, -7, 1, 0, 7); g.fill(); } },   // a gold crown, laurel painted on its band
  { n: 'upperB', p: 'torso', at: [-46, -82], sh: A.upper, c: 'arm', z: 2, paint: g => band(g, -9, 9, 22) },
  { n: 'foreB', p: 'upperB', at: [0, 40], sh: A.fore, c: 'arm', z: 2, paint: g => band(g, -10, 10, 10) },
  { n: 'handB', p: 'foreB', at: [0, 34], sh: A.fist, c: 'arm2', z: 2 },
  { n: 'upperF', p: 'torso', at: [46, -82], sh: A.upper, c: 'arm', z: 8, paint: g => band(g, -9, 9, 22) },
  { n: 'foreF', p: 'upperF', at: [0, 40], sh: A.fore, c: 'arm', z: 8, paint: g => { band(g, -10, 10, 10); laurel(g, [[-6, 16], [6, 30]], .6); } },
  { n: 'handF', p: 'foreF', at: [0, 34], sh: A.fist, c: 'arm2', z: 8.5 },
  { n: 'grip', p: 'handF', at: [2, 2], sh: smooth([[-3.4, 0, 1], [3.4, 0, 1], [3.4, 16, 1], [-3.4, 16, 1]]), c: 'dark', z: 9, lead: 2.6 },
  { n: 'guard', p: 'grip', at: [0, 0], sh: smooth([[-22, 14, 1], [-14, 10], [0, 16], [14, 10], [22, 14, 1], [18, 22, 1], [0, 22], [-18, 22, 1]]), c: 'arm2', z: 9.2, lead: 2.6 },
  { n: 'blade', p: 'grip', at: [0, 0], sh: smooth([[-5, 22, 1], [5, 22, 1], [4.5, 160], [0, 180, 1], [-4.5, 160]]), c: 'steel', z: 9.2, paint: steel },
  { n: 'flame', p: 'grip', at: [0, 0], sh: smooth([[-6, 30], [-20, 54], [-12, 76], [-26, 100], [-14, 126], [-24, 150], [-8, 174], [0, 204, 1], [8, 172], [24, 148], [14, 124], [26, 98], [12, 74], [21, 52], [6, 30]]), c: 'fire', z: 9.15, lead: 2.4, mat: false },
  { n: 'pauldB', p: 'upperB', at: [0, 2], sh: A.pauldron, c: 'arm', z: 7, mw: 7, paint: g => { sunburst(g, 0, -10, 9); laurel(g, [[-28, 8], [-10, -16], [10, -18], [28, 2]], .9); } },
  { n: 'rimB', p: 'pauldB', at: [0, 0], sh: A.rim, c: 'arm2', z: 7.1, lead: 2.6 },
  { n: 'pauldF', p: 'upperF', at: [0, 2], sh: A.pauldron, c: 'arm', z: 10, mw: 7, paint: g => { sunburst(g, 0, -10, 9); laurel(g, [[-28, 8], [-10, -16], [10, -18], [28, 2]], .9); } },
  { n: 'rimF', p: 'pauldF', at: [0, 0], sh: A.rim, c: 'arm2', z: 10.1, lead: 2.6 },
];
export const FATHER2_PAL = { arm: COL.gold2, arm2: COL.gold, mantle: COL.ruby, cloth: COL.ruby2, crown: COL.gold2, flesh: '#b8846a', hair: '#2a1c14', dark: '#3c3f46', steel: COL.white, fire: COL.amber };

// ---------- a legionary helm: rounded dome, two round lenses, a breathing grille ----------
const HELM2 = smooth([[-17, 22, 1], [-20, 4], [-18, -14], [-8, -26], [8, -26], [18, -14], [20, 4], [17, 22, 1], [8, 26], [-8, 26]]);
export function helm2(P, M, x, y, col, id, s = 1, lens = '#7fdc4a') {
  P.setTransform(M.translate(x, y).scale(s));
  P.piece(HELM2, col, { id, lead: 3, matW: 5, paint: g => { band(g, -16, 16, -12, false); brush(g, [[0, -26], [0, -12]], 2.2); for (let k = -2; k <= 2; k++) brush(g, [[k * 3.2, 12], [k * 3.2, 22]], 1.2); brush(g, [[-9, 10], [0, 8], [9, 10]], 1.4); } });
  P.piece(circle(-8, -2, 5.2), lens, { id: id + 1, lead: 2.4, mat: false });
  P.piece(circle(8, -2, 5.2), lens, { id: id + 2, lead: 2.4, mat: false });
  P.setTransform(M);
}
