// The Cursed Chapter: the Lamenters in yellow, the Tyrant of Badab, the loyal brothers in bronze, the Kraken, and the medallion scenes.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2 } from './figures2.js';
import { ANGEL, ANGEL_PAL, WINGS } from './angel.js';

// ---------- Space Marine detail: war-helm, chainsword, aquila, purity seal ----------
const HELM = smooth([[-16, 2, 1], [-19, -24], [-13, -46], [2, -55], [16, -49], [23, -35], [25, -22], [30, -14, 1], [28, -4, 1], [20, 0], [10, 5], [-2, 5]]);
const helmPaint = g => { brush(g, [[-12, -46], [2, -54], [16, -48]], 1.4, { color: 'rgba(255,255,255,.4)' });
  brush(g, [[-4, -55], [-6, -30], [-12, -8]], 2.2);                                   // the ridge over the crown
  brush(g, [[-14, -20], [6, -18], [25, -22]], 1.8);                                   // brow line
  for (let k = 0; k < 4; k++) brush(g, [[18 + k * 2.6, -12], [17 + k * 2.6, -2]], 1.2); // breathing grille
  g.fillStyle = 'rgba(30,18,10,.8)'; g.beginPath(); g.arc(-6, -14, 4.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-6, -14, 1.6, 0, 7); g.fill(); };   // side vent
const HEART = smooth([[0, 7, 1], [-10, -3], [-9, -11], [-3, -12], [0, -8, 1], [3, -12], [9, -11], [10, -3]]);   // the Chapter's sign on the pauldron
// the Chapter sign: a heart over a black-and-yellow checkered shield
const SHIELD = smooth([[-12, -14, 1], [12, -14, 1], [12, 0], [6, 10], [0, 15, 1], [-6, 10], [-12, 0]]);
function sign(g, x, y, s = 1, n = 4) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.save(); g.clip(SHIELD); g.fillStyle = '#f0c838'; g.fill(SHIELD); g.fillStyle = 'rgba(24,16,10,.92)';
  const c = 24 / n; for (let i = 0; i < n; i++) for (let j = 0; j < n + 2; j++) if ((i + j) & 1) g.fillRect(-12 + i * c, -14 + j * c, c, c);
  g.restore();
  g.lineWidth = 1.6; g.strokeStyle = 'rgba(24,16,10,.95)'; g.stroke(SHIELD);
  g.save(); g.translate(0, -1); g.scale(.62, .62); g.fillStyle = '#b0141c'; g.fill(HEART); g.lineWidth = 2.4; g.stroke(HEART);
  g.fillStyle = 'rgba(255,220,200,.5)'; g.beginPath(); g.ellipse(-4, -6, 2.2, 1.4, -.5, 0, 7); g.fill(); g.restore();
  g.restore();
}
const checks = (g, x0, y0, w, h, n) => { const c = w / n; g.fillStyle = 'rgba(24,16,10,.88)'; for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(h / c); j++) if ((i + j) & 1) g.fillRect(x0 + i * c, y0 + j * c, c, c); };
const aquila = g => { g.fillStyle = 'rgba(30,18,10,.85)'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -78); for (const [x, y] of [[8, -86], [18, -90], [28, -86], [22, -82], [26, -78], [16, -76], [18, -72], [6, -72]]) g.lineTo(sd * x, y); g.closePath(); g.fill(); }
  g.beginPath(); g.ellipse(0, -76, 3.4, 6, 0, 0, 7); g.fill(); };
const CS = {   // a chainsword in place of the mace
  grip: smooth([[-3.4, -6, 1], [3.4, -6, 1], [3.4, 22, 1], [-3.4, 22, 1]]),
  guard: smooth([[-9, 18, 1], [9, 18, 1], [10, 28, 1], [-10, 28, 1]]),
  blade: smooth([[-7, 0, 1], [7, 0, 1], [8, 92], [2, 104, 1], [-7, 96, 1]]),
};
const csPaint = g => { g.fillStyle = 'rgba(30,18,10,.9)'; for (let y = 4; y < 98; y += 7) { g.beginPath(); g.moveTo(7, y); g.lineTo(12, y + 3.5); g.lineTo(7, y + 7); g.fill(); }
  brush(g, [[-3, 4], [-2, 92]], 1.4, { color: 'rgba(255,255,255,.5)' }); brush(g, [[2, 6], [3, 90]], 1.2); };
const sealParts = (p, x, y, z, id) => [{ n: id + 'w', p, at: [x, y], sh: circle(0, 0, 5.6), c: '#a8101c', z: z + .2, lead: 2,
    paint: g => { g.fillStyle = 'rgba(40,10,10,.7)'; g.beginPath(); g.arc(0, 0, 2.4, 0, 7); g.fill(); } },
  { n: id + 'p', p, at: [x, y + 3], sh: smooth([[-4.5, 0, 1], [4.5, 0, 1], [4, 26, 1], [0, 22, 1], [-4, 26, 1]]), c: '#ece0b8', z: z + .1, lead: 2,
    paint: g => { for (let k = 0; k < 4; k++) brush(g, [[-2.6, 5 + k * 4.4], [2.6, 5 + k * 4.4]], .8, { color: 'rgba(52,30,14,.6)' }); } }];
const KEEP = q => !['hair', 'pelt', 'cloak'].includes(q.n);
function marine(extra = [], o = {}) {
  const parts = SON2.filter(o.keep || KEEP).map(q => {
    if (CS[q.n] && !o.mace) return { ...q, sh: CS[q.n], at: q.n === 'blade' ? [0, 26] : q.at, c: q.n === 'blade' ? 'steel' : q.c, paint: q.n === 'blade' ? csPaint : undefined };
    if (q.n === 'torso') return { ...q, paint: (g, op) => { brush(g, [[-28, -26], [0, -22], [28, -26]], 1.6); brush(g, [[-26, -12], [0, -9], [26, -12]], 1.6); brush(g, [[0, -64], [0, -30]], 1.4); aquila(g); } };
    if (q.n === 'pauldF') return { ...q, c: 'pauld', paint: (g, op) => { if (!op.heart) return q.paint(g, op);   // the Chapter pauldron: chequered all over, a white roundel with a red heart
      g.save(); g.clip(q.sh); checks(g, -34, -34, 68, 52, 9); g.restore(); brush(g, [[-30, 12], [0, 15], [28, 12]], 1.6);
      g.save(); g.translate(0, -7); g.scale(.95, .95); g.fillStyle = '#c0141c'; g.fill(HEART); g.lineWidth = 2; g.strokeStyle = 'rgba(24,16,10,.95)'; g.stroke(HEART); g.restore(); } };
    if (q.n === 'rimF' || q.n === 'rimB') return { ...q, c: 'rim', paint: g => { g.fillStyle = 'rgba(230,220,200,.75)'; for (const [x, y] of [[-26, -8], [-16, -24], [0, -30], [16, -27], [28, -12]]) { g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill(); } } };
    if (q.n === 'kneeF') return { ...q, c: 'kneeR' };
    if (q.n === 'kneeB') return { ...q, c: 'knee' };
    if (q.n === 'pack') return { ...q, paint: g => { for (const y of [-96, -74, -54]) brush(g, [[-30, y], [0, y + 2], [30, y]], 1.6); for (const x of [-20, -8, 4, 16]) brush(g, [[x, -50], [x, -44]], 2); } };
    return q; });
  return [...parts, { n: 'helm', p: 'head', at: [0, 0], sh: HELM, c: 'helm', z: 10.7, lead: 3, paint: helmPaint }, { n: 'lens', p: 'head', at: [0, 0], sh: smooth([[8, -33, 1], [19, -33], [20, -27, 1], [9, -26]]), c: 'lens', z: 10.8, lead: 2.4 },
    ...sealParts('tassetF', 6, 4, 4.6, 'sealA'), ...sealParts('pauldB', -10, 10, 7, 'sealB'), ...extra];
}
// the Minotaurs' bull horns, swept forward from the helm
const HORN_F = smooth([[-4, -46, 1], [6, -52], [12, -68], [28, -88], [44, -94, 1], [32, -80], [20, -60], [12, -42, 1]]);
const HORN_B = smooth([[-10, -44, 1], [-16, -58], [-12, -78], [4, -94], [18, -100, 1], [6, -84], [-2, -64], [-2, -46, 1]]);
const hornPaint = g => { for (let k = 0; k < 4; k++) brush(g, [[6 + k * 6, -50 - k * 6], [12 + k * 6, -48 - k * 7]], 1, { color: 'rgba(52,30,14,.55)' }); };
export const MARINE = marine();
export const MINOTAUR = marine([{ n: 'hornB', p: 'head', at: [0, 0], sh: HORN_B, c: 'horn', z: 10.65, lead: 2.6, paint: hornPaint }, { n: 'hornF', p: 'head', at: [0, 0], sh: HORN_F, c: 'horn', z: 10.9, lead: 2.6, paint: hornPaint }], { mace: true });
export const LAMENTER = { pauld: '#eee8dc', kneeR: '#b8141c', knee: '#e2b628', arm: '#e2b628', arm2: '#c0921c', helm: '#e2b628', rim: '#c0921c', trim: '#2a2c30', cloth: COL.ruby2, dark: '#3c3f46', flesh: '#b07a5e', steel: COL.steel, lens: '#5fd84a' };
export const BRONZE = { pauld: '#8a4e18', kneeR: '#e0b040', knee: '#e0b040', arm: '#8a4e18', arm2: '#5a2c0e', helm: '#8a4e18', rim: '#e0b040', trim: '#e0b040', cloth: '#1c1a18', dark: '#2e2a26', flesh: '#b07a5e', steel: COL.steel2, lens: '#7fdc4a', horn: '#e8dcbc' };
// the Tyrant of Badab: bare-headed, half his skull iron with a red bionic eye, the great power claw, a cloak of deep blue
const CLAW = smooth([[-12, -4], [12, -6], [20, 10], [44, 30, 1], [24, 24], [30, 50, 1], [14, 30], [12, 58, 1], [2, 30], [-6, 52, 1], [-8, 26], [-14, 10]].map(([x, y, c]) => [x * 1.6, y * 1.6, c]));
const IRON = smooth([[-15, -6], [-17, -28], [-13, -44], [0, -52], [10, -50], [8, -36], [16, -30, 1], [14, -20, 1], [2, -16], [-4, -6]]);
export const TYRANT_PARTS = [...SON2.filter(q => !['hair', 'pelt', 'grip', 'guard', 'blade'].includes(q.n)).map(q => q.n === 'handF' ? { ...q, sh: CLAW, c: 'claw', lead: 3, paint: g => { for (const [x, y] of [[58, 45], [38, 70], [16, 80], [-6, 70]]) brush(g, [[x * .4, y * .4], [x, y]], 1.4, { color: 'rgba(255,255,255,.5)' }); } } : q),
  { n: 'iron', p: 'head', at: [0, 0], sh: IRON, c: 'steel', z: 10.6, lead: 2.6, paint: g => { for (const [x, y] of [[-10, -30], [-6, -42], [2, -46], [-12, -16]]) { g.fillStyle = 'rgba(30,18,10,.8)'; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); } } },
  { n: 'eyeR', p: 'head', at: [0, 0], sh: circle(10, -27, 4.6), c: '#ff3a1a', z: 10.8, lead: 2.2 }];
export const TYRANT = { arm: '#9aa8a6', arm2: '#6e7c7a', trim: COL.gold2, cloak: COL.deepblue, cloth: COL.blue2, dark: '#26282c', flesh: '#a87a62', steel: '#7c8a88', claw: '#c8d2d0', rim: COL.gold2 };

// a Tyranid of Hive Fleet Kraken: bone carapace over red flesh, ribbed belly, dorsal spines, fanged jaws, scything talons (facing left)
const BONE = '#e6d8b4', FLESH = '#b8302a', FLESH2 = '#8a1e22';
function gaunt(P, L, x, y, s, id, ph = 0) {
  const M = L.translate(x, y).scale(s); P.setTransform(M);
  P.piece(smooth([[28, -22], [52, -20], [76, -4], [88, 10, 1], [70, 4], [44, 2], [24, -4]]), FLESH2, { id, lead: 2.8, matW: 4, paint: g => { for (let k = 0; k < 5; k++) brush(g, [[34 + k * 10, -18 + k * 3], [32 + k * 10, -2 + k * 2]], 1.2, { color: 'rgba(30,8,8,.6)' }); } });   // tail
  for (const [lx, d] of [[-6, -1], [20, 1]]) P.piece(smooth([[lx - 4, 6, 1], [lx - 14 + d * 4, 26], [lx - 6, 46, 1], [lx + 2, 46, 1], [lx - 2, 28], [lx + 8, 8, 1]]), FLESH, { id: id + 1 + (d > 0), lead: 2.6, matW: 3,
    paint: g => { brush(g, [[lx - 10, 44], [lx - 16, 50]], 1.4); brush(g, [[lx, 44], [lx + 4, 50]], 1.4); } });                 // hoofed legs
  P.piece(smooth([[-24, -18], [-4, -34], [24, -32], [40, -18], [34, 6], [4, 14], [-20, 6]]), FLESH, { id: id + 3, lead: 3, matW: 6,
    paint: g => { for (let k = 0; k < 5; k++) brush(g, [[-14 + k * 10, 2], [-12 + k * 10, 12]], 1.2, { color: 'rgba(40,8,8,.6)' }); } });   // ribbed belly
  for (let k = 0; k < 4; k++) { const cx = -14 + k * 14; P.piece(smooth([[cx - 9, -22, 1], [cx - 4, -36, 1], [cx + 8, -36, 1], [cx + 10, -22, 1]]), BONE, { id: id + 4 + k, lead: 2.4, matW: 3 });   // carapace plates
    P.piece(smooth([[cx - 2, -34, 1], [cx + 2, -50, 1], [cx + 5, -34, 1]]), BONE, { id: id + 8 + k, lead: 2, mat: false }); }                                               // spines
  P.piece(smooth([[-20, -24, 1], [-34, -46], [-52, -46, 1], [-60, -34, 1], [-50, -26], [-56, -16, 1], [-40, -12], [-22, -10]]), BONE, { id: id + 12, lead: 2.8, matW: 3,   // the long skull
    paint: g => { g.fillStyle = 'rgba(30,10,10,.9)'; g.beginPath(); g.moveTo(-58, -28); g.lineTo(-38, -24); g.lineTo(-56, -20); g.fill();   // the gape
      g.fillStyle = '#fff6e0'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-56 + k * 4, -27); g.lineTo(-54 + k * 4, -23); g.lineTo(-52 + k * 4, -27); g.fill(); }   // fangs
      for (const [ex, ey] of [[-44, -38], [-38, -36], [-32, -34]]) { g.fillStyle = 'rgba(240,200,40,.95)'; g.beginPath(); g.ellipse(ex, ey, 2, 1.6, 0, 0, 7); g.fill(); } } });   // a row of eyes
  P.piece(smooth([[-30, -44, 1], [-22, -66, 1], [-12, -60], [-18, -42]]), BONE, { id: id + 13, lead: 2.4, matW: 3 });                                                            // crest
  const a = Math.sin(ph) * .35;
  P.setTransform(M.translate(-10, -20).rotate(-.6 + a));
  P.piece(smooth([[0, 0, 1], [-30, -18], [-62, -14, 1], [-36, -6], [-6, 8, 1]]), BONE, { id: id + 14, lead: 2.4, matW: 3, paint: g => brush(g, [[-6, 0], [-58, -13]], 1.2, { color: 'rgba(255,255,255,.55)' }) });   // scything talons
  P.setTransform(M.translate(8, -18).rotate(-.2 - a));
  P.piece(smooth([[0, 0, 1], [-28, -24], [-60, -26, 1], [-34, -12], [-4, 8, 1]]), '#d4c6a0', { id: id + 15, lead: 2.4, matW: 3 });
  P.setTransform(L);
}
function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function clouds(P, r, col, id) { for (let k = 0; k < 4; k++) { const x = -110 + k * 74, y = -96 + (k % 2) * 16; P.piece(smooth([[x - 46, y + 16], [x - 30, y - 10], [x, y - 20], [x + 30, y - 12], [x + 46, y + 14], [x, y + 22]]), col, { id: id + k, lead: 3, matW: 8 }); } }
function chalice(P, x, y, s, id) { P.piece(smooth([[x - 12 * s, y - 20 * s, 1], [x + 12 * s, y - 20 * s, 1], [x + 9 * s, y - 6 * s], [x + 3 * s, y], [x + 3 * s, y + 12 * s], [x + 10 * s, y + 16 * s, 1], [x - 10 * s, y + 16 * s, 1], [x - 3 * s, y + 12 * s], [x - 3 * s, y], [x - 9 * s, y - 6 * s]]), COL.gold2, { id, lead: 2.4, matW: 3 });
  P.piece(circle(x, y - 13 * s, 4 * s), COL.ruby, { id: id + 1, lead: 2, mat: false }); }
function banner(P, x, y, id, torn) {
  P.piece(smooth([[x - 2, y - 120, 1], [x + 2, y - 120, 1], [x + 2, y + 60, 1], [x - 2, y + 60, 1]]), '#3c3f46', { id, lead: 2.4, mat: false });
  P.piece(smooth([[x + 2, y - 116, 1], [x + 56, y - 112, 1], [x + 52, y - 80], [x + 58, y - 60, 1], [x + 40, y - 66], torn ? [x + 30, y - 52, 1] : [x + 30, y - 58, 1], [x + 16, y - 64], [x + 2, y - 56, 1]]), '#eee8dc', { id: id + 1, lead: 3, matW: 5,
    paint: g => { checks(g, x + 2, y - 118, 60, 66, 7); g.save(); g.translate(x + 29, y - 87); g.scale(1.3, 1.3); g.fillStyle = '#c0141c'; g.fill(HEART); g.lineWidth = 2; g.strokeStyle = 'rgba(24,16,10,.95)'; g.stroke(HEART); g.restore(); } });
}

export const SKY = ['#1f1830', COL.purple2, '#3a1a20', COL.deepblue, '#3a1a20', '#1d2a50'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  const lam = (x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MARINE, pose, LAMENTER, { id, heart: true, ...o });
  if (i === 0) {   // a lone Lamenter under a storm
    clouds(P, r, '#3a3448', 16000);
    drawRig(P, L.translate(74, -36).scale(.3), ANGEL, { ...POSE.raise, ...WINGS.spread }, ANGEL_PAL, { id: 15800, face: 'calm' });   // Sanguinius, the father, in the storm-light
    P.setTransform(L);
    if (f.bolt) P.piece(smooth([[30, -110, 1], [6, -50, 1], [24, -48, 1], [-4, 10, 1], [14, -40, 1], [-4, -42, 1], [16, -110, 1]]), '#f4ecc0', { id: 16010, lead: 2.4, mat: false });
    ground(P, r, '#4a3e30', 16020, 84);
    lam(-10, 6, .52, f.pose || POSE.stand, 16100);
  } else if (i === 1) {   // the Tyrant of Badab calls; the Lamenter believes
    ground(P, r, '#3a3a50', 16400, 86);
    P.piece(smooth([[20, 64, 1], [130, 52, 1], [130, 140, 1], [20, 140, 1]]), '#6e6556', { id: 16410, lead: 3.4, matW: 6 });   // the dais
    drawRig(P, L.translate(70, -8).scale(-.46, .46), TYRANT_PARTS, POSE.reach, TYRANT, { id: 16500, face: 'stern' });
    lam(-62, 22, .44, f.pose || POSE.stand, 16700);
  } else if (i === 2) {   // brother against brother, and the Lamenters lose
    ground(P, r, '#5a4a3a', 16900, 86);
    drawRig(P, L.translate(54, 14).scale(-.44, .44), MINOTAUR, f.foe || POSE.guard, BRONZE, { id: 17000 });
    lam(-50, 14, .44, f.pose || POSE.guard, 17200);
  } else if (i === 3) {   // the relics taken, the penance begun
    ground(P, r, '#3a3a40', 17400, 88);
    drawRig(P, L.translate(62, 10).scale(-.42, .42), MINOTAUR, f.taken ? POSE.reach : POSE.fstand, BRONZE, { id: 17500 });
    P.setTransform(L); if (f.taken) chalice(P, 6, -24, 1.1, 17700); else chalice(P, -2, 62, 1, 17700);
    lam(-56, 14, .42, f.pose || POSE.kneel, 17800, f.away ? {} : {});
  } else if (i === 4) {   // the Kraken
    ground(P, r, '#4a2a3a', 18000, 90);
    for (let k = 0; k < 6; k++) P.piece(circle(-120 + k * 48, -96 + (k % 3) * 18, 7 + (k % 2) * 3), '#8a3a6a', { id: 18010 + k, lead: 2, mat: false });   // spores in the sky
    if (f.swarm) { const n = f.swarm; const pos = [[70, 20, .8], [74, -54, .58], [128, -10, .6], [36, 66, .66], [120, 76, .62], [10, -84, .5]];
      for (let k = 0; k < Math.min(n, pos.length); k++) gaunt(P, L, pos[k][0], pos[k][1], pos[k][2], 18100 + k * 20, (f.t || 0) * 8 + k); }
    lam(-60, 14, .44, f.pose || POSE.guard, 18300);
  } else {   // the few who remain, at dawn
    ground(P, r, '#3a4a3a', 18600, 92);
    banner(P, 0, 30, 18610, true);
    lam(-74, 26, .4, POSE.guard, 18700); lam(78, 26, -.4, POSE.guard, 18900);
    lam(10, 18, .46, f.pose || POSE.stand, 19100);
  }
  P.setTransform(L);
}
