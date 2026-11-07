// The Cursed Chapter: the Lamenters in yellow, the Tyrant of Badab, the loyal brothers in bronze, the Kraken, and the medallion scenes.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2 } from './figures2.js';

// a closed war-helm over the head (facing right): domed crown, a jutting grille, one round lens showing
const HELM = smooth([[-16, 2, 1], [-19, -24], [-13, -46], [2, -55], [16, -49], [23, -35], [25, -20], [27, -10, 1], [22, -2], [12, 4], [-2, 5]]);
const helmPaint = g => { brush(g, [[-12, -46], [2, -54], [16, -48]], 1.4, { color: 'rgba(255,255,255,.35)' }); brush(g, [[-14, -18], [4, -16], [24, -20]], 1.6); for (let k = 0; k < 4; k++) brush(g, [[16 + k * 2.4, -10], [16 + k * 2.4, -2]], 1.1); brush(g, [[2, -54], [-2, -30], [-12, -10]], 1.2, { color: 'rgba(44,26,12,.45)' }); };
const HEART = smooth([[0, 6, 1], [-9, -3], [-8, -10], [-3, -11], [0, -7, 1], [3, -11], [8, -10], [9, -3]]);   // the Chapter's sign, painted on the pauldron
const KEEP = q => !['hair', 'pelt', 'cloak'].includes(q.n);
const marine = (extra = []) => {
  const parts = SON2.filter(KEEP).map(q => q.n === 'pauldF' ? { ...q, paint: (g, o) => { q.paint(g, o); if (o.heart) { g.fillStyle = 'rgba(30,18,10,.85)'; g.save(); g.translate(0, -2); g.fill(HEART); g.restore(); } } } : q);
  return [...parts, { n: 'helm', p: 'head', at: [0, 0], sh: HELM, c: 'arm', z: 10.7, lead: 3, paint: helmPaint }, { n: 'lens', p: 'head', at: [0, 0], sh: circle(13, -30, 5.2), c: 'lens', z: 10.8, lead: 2.4 }, ...extra];
};
export const MARINE = marine();
export const LAMENTER = { arm: '#e2b628', arm2: '#c0921c', trim: '#3c3f46', cloth: COL.ruby2, dark: '#3c3f46', flesh: '#b07a5e', steel: COL.steel, lens: '#e0302a' };
export const BRONZE = { arm: '#7a3e12', arm2: '#5a2c0e', trim: '#e0b040', cloth: '#5a2a10', dark: '#2e2a26', flesh: '#b07a5e', steel: COL.steel2, lens: '#7fdc4a' };
// the Tyrant: bare-headed in steel and deep blue, a great cloak
const TYRANT_PARTS = SON2.filter(q => q.n !== 'hair' && q.n !== 'pelt');
export const TYRANT = { arm: '#8d9e9c', arm2: '#6e7c7a', trim: COL.blue2, cloak: COL.deepblue, cloth: COL.blue2, dark: '#26282c', flesh: '#a87a62', steel: COL.steel2 };

// a Tyranid warrior-beast: hunched carapace, a crested skull, scything arms (facing left)
function gaunt(P, L, x, y, s, id, ph = 0, col = '#6a2a7a') {
  const M = L.translate(x, y).scale(s); P.setTransform(M);
  P.piece(smooth([[30, -30], [52, -24], [70, -6], [60, 4], [40, 0], [20, -6]]), col, { id: id, lead: 2.8, matW: 4 });   // tail
  P.piece(smooth([[-6, 10, 1], [-14, 40, 1], [-4, 44, 1], [4, 14]]), '#d9c8a0', { id: id + 1, lead: 2.6, matW: 3 });    // legs, bone
  P.piece(smooth([[18, 6, 1], [26, 40, 1], [36, 42, 1], [28, 6]]), '#d9c8a0', { id: id + 2, lead: 2.6, matW: 3 });
  P.piece(smooth([[-24, -24], [0, -40], [28, -34], [40, -18], [30, 8], [0, 14], [-20, 4]]), col, { id: id + 3, lead: 3, matW: 6,
    paint: g => { for (let k = 0; k < 4; k++) brush(g, [[-12 + k * 12, -34 + k * 2], [-8 + k * 12, 8]], 1.4, { color: 'rgba(30,10,30,.55)' }); } });
  P.piece(smooth([[-22, -26, 1], [-40, -44, 1], [-54, -34], [-50, -18, 1], [-34, -10], [-22, -12]]), '#d9c8a0', { id: id + 4, lead: 2.8, matW: 3,   // skull
    paint: g => { g.fillStyle = 'rgba(200,40,30,.95)'; g.beginPath(); g.ellipse(-42, -30, 3, 2.2, 0, 0, 7); g.fill(); brush(g, [[-52, -20], [-40, -16]], 1.2); } });
  P.piece(smooth([[-36, -42, 1], [-26, -60, 1], [-16, -52], [-24, -34]]), col, { id: id + 5, lead: 2.4, matW: 3 });     // crest
  const a = Math.sin(ph) * .35;
  P.setTransform(M.translate(-10, -22).rotate(-.6 + a));
  P.piece(smooth([[0, 0, 1], [-30, -18], [-58, -16, 1], [-36, -8], [-6, 8, 1]]), '#d9c8a0', { id: id + 6, lead: 2.4, matW: 3 });   // scything talons
  P.setTransform(M.translate(6, -20).rotate(-.2 - a));
  P.piece(smooth([[0, 0, 1], [-28, -24], [-56, -26, 1], [-34, -12], [-4, 8, 1]]), '#c8b890', { id: id + 7, lead: 2.4, matW: 3 });
  P.setTransform(L);
}
function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function clouds(P, r, col, id) { for (let k = 0; k < 4; k++) { const x = -110 + k * 74, y = -96 + (k % 2) * 16; P.piece(smooth([[x - 46, y + 16], [x - 30, y - 10], [x, y - 20], [x + 30, y - 12], [x + 46, y + 14], [x, y + 22]]), col, { id: id + k, lead: 3, matW: 8 }); } }
function chalice(P, x, y, s, id) { P.piece(smooth([[x - 12 * s, y - 20 * s, 1], [x + 12 * s, y - 20 * s, 1], [x + 9 * s, y - 6 * s], [x + 3 * s, y], [x + 3 * s, y + 12 * s], [x + 10 * s, y + 16 * s, 1], [x - 10 * s, y + 16 * s, 1], [x - 3 * s, y + 12 * s], [x - 3 * s, y], [x - 9 * s, y - 6 * s]]), COL.gold2, { id, lead: 2.4, matW: 3 });
  P.piece(circle(x, y - 13 * s, 4 * s), COL.ruby, { id: id + 1, lead: 2, mat: false }); }
function banner(P, x, y, id, torn) {
  P.piece(smooth([[x - 2, y - 120, 1], [x + 2, y - 120, 1], [x + 2, y + 60, 1], [x - 2, y + 60, 1]]), '#3c3f46', { id, lead: 2.4, mat: false });
  P.piece(smooth([[x + 2, y - 116, 1], [x + 56, y - 112, 1], [x + 52, y - 80], [x + 58, y - 60, 1], [x + 40, y - 66], torn ? [x + 30, y - 52, 1] : [x + 30, y - 58, 1], [x + 16, y - 64], [x + 2, y - 56, 1]]), '#e2b628', { id: id + 1, lead: 3, matW: 5,
    paint: g => { g.fillStyle = 'rgba(30,18,10,.85)'; g.save(); g.translate(x + 28, y - 90); g.scale(1.3, 1.3); g.fill(HEART); g.restore(); } });
}

export const SKY = ['#1f1830', COL.purple2, '#3a1a20', COL.deepblue, '#3a1a20', '#1d2a50'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  const lam = (x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MARINE, pose, LAMENTER, { id, heart: true, ...o });
  if (i === 0) {   // a lone Lamenter under a storm
    clouds(P, r, '#3a3448', 16000);
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
    drawRig(P, L.translate(54, 14).scale(-.44, .44), MARINE, f.foe || POSE.guard, BRONZE, { id: 17000 });
    lam(-50, 14, .44, f.pose || POSE.guard, 17200);
  } else if (i === 3) {   // the relics taken, the penance begun
    ground(P, r, '#3a3a40', 17400, 88);
    drawRig(P, L.translate(62, 10).scale(-.42, .42), MARINE, f.taken ? POSE.raise : POSE.fstand, BRONZE, { id: 17500 });
    P.setTransform(L); if (f.taken) chalice(P, 52, -110, 1, 17700); else chalice(P, -2, 62, 1, 17700);
    lam(-56, 14, .42, f.pose || POSE.kneel, 17800, f.away ? {} : {});
  } else if (i === 4) {   // the Kraken
    ground(P, r, '#4a2a3a', 18000, 90);
    for (let k = 0; k < 6; k++) P.piece(circle(-120 + k * 48, -96 + (k % 3) * 18, 7 + (k % 2) * 3), '#8a3a6a', { id: 18010 + k, lead: 2, mat: false });   // spores in the sky
    if (f.swarm) { const n = f.swarm; const pos = [[70, 20, .8], [74, -54, .58], [128, -10, .6], [36, 66, .66], [120, 76, .62], [10, -84, .5]];
      for (let k = 0; k < Math.min(n, pos.length); k++) gaunt(P, L, pos[k][0], pos[k][1], pos[k][2], 18100 + k * 10, (f.t || 0) * 8 + k); }
    lam(-60, 14, .44, f.pose || POSE.guard, 18300);
  } else {   // the few who remain, at dawn
    ground(P, r, '#3a4a3a', 18600, 92);
    banner(P, 0, 30, 18610, true);
    lam(-74, 26, .4, POSE.guard, 18700); lam(78, 26, -.4, POSE.guard, 18900);
    lam(10, 18, .46, f.pose || POSE.stand, 19100);
  }
  P.setTransform(L);
}
