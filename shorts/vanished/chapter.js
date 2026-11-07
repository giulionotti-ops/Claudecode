// The Chapter That Vanished: the Fire Hawks, the Raptorus Rex, the warp, and the Legion of the Damned.
// Reference art: Fire Hawks (Imperial Armour 9 scheme): red-brown armour, yellow pauldrons, kneepads and helm painted with flames,
// gold skull-aquila, a dark tabard with a gold hawk. Legion of the Damned: black armour wreathed in fire, skull helms, a red eye.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2 } from './figures2.js';
import { GUARD, GUARD_PAL, GPOSE } from './cadia.js';

// ---------- shared marine detail ----------
const HELM = smooth([[-16, 2, 1], [-19, -24], [-13, -46], [2, -55], [16, -49], [23, -35], [25, -22], [30, -14, 1], [28, -4, 1], [20, 0], [10, 5], [-2, 5]]);
const flames = (g, x0, x1, yb, h, col, n = 5) => { g.fillStyle = col; const w = (x1 - x0) / n;
  for (let k = 0; k < n; k++) { const x = x0 + k * w, hh = h * (.7 + .3 * ((k * 37) % 5) / 4); g.beginPath(); g.moveTo(x, yb); g.quadraticCurveTo(x + w * .1, yb - hh * .6, x + w * .55, yb - hh); g.quadraticCurveTo(x + w * .45, yb - hh * .4, x + w, yb); g.closePath(); g.fill(); } };
function helmPaint(g, op) {
  if (op.mark === 'legion') {   // a skull for a face: sockets, nasal hollow, teeth
    g.fillStyle = 'rgba(30,18,10,.9)'; g.beginPath(); g.ellipse(4, -30, 7, 6, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(20, -24); g.lineTo(24, -16); g.lineTo(18, -16); g.fill();
    for (let k = 0; k < 5; k++) { g.fillRect(12 + k * 3.4, -10, 1.4, 8); } brush(g, [[10, -6], [28, -8]], 1.2); brush(g, [[-14, -40], [-4, -50]], 1.2, { color: 'rgba(30,18,10,.5)' }); return; }
  brush(g, [[-12, -46], [2, -54], [16, -48]], 1.4, { color: 'rgba(255,255,255,.4)' }); brush(g, [[-14, -20], [6, -18], [25, -22]], 1.8);
  for (let k = 0; k < 4; k++) brush(g, [[18 + k * 2.6, -12], [17 + k * 2.6, -2]], 1.2);
  if (op.mark === 'firehawk') { g.fillStyle = 'rgba(140,50,20,.9)'; g.beginPath(); g.moveTo(-8, -54); g.lineTo(4, -55); g.lineTo(2, -18); g.lineTo(-10, -20); g.fill();   // a red-brown stripe over the crown
    flames(g, -18, 4, 2, 16, 'rgba(170,60,20,.85)', 4); }
}
const aquila = (g, gold) => { g.fillStyle = gold ? 'rgba(240,190,60,.95)' : 'rgba(30,18,10,.85)'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -78); for (const [x, y] of [[8, -86], [18, -90], [28, -86], [22, -82], [26, -78], [16, -76], [18, -72], [6, -72]]) g.lineTo(sd * x, y); g.closePath(); g.fill(); }
  g.fillStyle = gold ? '#f0e6cc' : 'rgba(30,18,10,.85)'; g.beginPath(); g.ellipse(0, -77, 4.4, 5, 0, 0, 7); g.fill(); if (gold) { g.fillStyle = 'rgba(30,18,10,.9)'; g.fillRect(-2.6, -79, 2, 2); g.fillRect(.8, -79, 2, 2); } };
const HAWK = (g, x, y, s, col) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath();
  for (const [px, py] of [[0, -10], [3, -6], [12, -10], [9, -2], [4, 0], [3, 8], [0, 6], [-3, 8], [-4, 0], [-9, -2], [-12, -10], [-3, -6]]) g.lineTo(px, py); g.closePath(); g.fill(); g.restore(); };
const CS = { grip: smooth([[-3.4, -6, 1], [3.4, -6, 1], [3.4, 22, 1], [-3.4, 22, 1]]), guard: smooth([[-9, 18, 1], [9, 18, 1], [10, 28, 1], [-10, 28, 1]]), blade: smooth([[-7, 0, 1], [7, 0, 1], [8, 92], [2, 104, 1], [-7, 96, 1]]) };
const csPaint = g => { g.fillStyle = 'rgba(30,18,10,.9)'; for (let y = 4; y < 98; y += 7) { g.beginPath(); g.moveTo(7, y); g.lineTo(12, y + 3.5); g.lineTo(7, y + 7); g.fill(); } brush(g, [[-3, 4], [-2, 92]], 1.4, { color: 'rgba(255,255,255,.5)' }); };
const TABARD = smooth([[-13, -4, 1], [13, -4, 1], [14, 50], [0, 60, 1], [-14, 50]]);
const markPaint = (fn) => (g, op) => fn(g, op);
function marine(extra = []) {
  const parts = SON2.filter(q => !['hair', 'pelt', 'cloak'].includes(q.n)).map(q => {
    if (CS[q.n]) return { ...q, sh: CS[q.n], at: q.n === 'blade' ? [0, 26] : q.at, c: q.n === 'blade' ? 'steel' : q.c, paint: q.n === 'blade' ? csPaint : undefined };
    if (q.n === 'torso') return { ...q, paint: (g, op) => { brush(g, [[-28, -26], [0, -22], [28, -26]], 1.6); brush(g, [[-26, -12], [0, -9], [26, -12]], 1.6); aquila(g, op.mark === 'firehawk');
      if (op.mark === 'legion') { flames(g, -30, 30, -2, 30, 'rgba(255,150,40,.75)', 6); } } };
    if (q.n === 'pauldF' || q.n === 'pauldB') return { ...q, c: 'pauld', paint: (g, op) => { brush(g, [[-30, 12], [0, 15], [28, 12]], 1.6);
      if (op.mark === 'firehawk') flames(g, -30, 30, 15, 26, 'rgba(170,60,20,.85)', 5);
      if (op.mark === 'legion') { flames(g, -30, 30, 15, 32, 'rgba(255,140,30,.85)', 5); g.fillStyle = '#e8dcbc'; g.beginPath(); g.ellipse(0, -12, 7, 8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(30,18,10,.9)'; g.fillRect(-4.5, -14, 3.4, 3.4); g.fillRect(1.2, -14, 3.4, 3.4); g.fillRect(-1, -8, 2, 3); } } };
    if (q.n === 'rimF' || q.n === 'rimB') return { ...q, c: 'rim' };
    if (q.n === 'kneeF' || q.n === 'kneeB') return { ...q, c: 'knee', paint: (g, op) => { if (op.mark === 'firehawk') flames(g, -12, 12, 8, 14, 'rgba(170,60,20,.85)', 3); if (op.mark === 'legion') flames(g, -12, 12, 8, 14, 'rgba(255,140,30,.85)', 3); } };
    if (q.n === 'shinF' || q.n === 'shinB') return { ...q, paint: (g, op) => { q.paint(g, op); if (op.mark === 'legion') flames(g, -10, 10, 54, 30, 'rgba(255,140,30,.8)', 3); if (op.mark === 'firehawk') flames(g, -10, 10, 54, 18, 'rgba(240,180,40,.85)', 3); } };
    if (q.n === 'loin') return { ...q, sh: TABARD, paint: (g, op) => { if (op.mark === 'firehawk') HAWK(g, 0, 24, 1.1, 'rgba(240,190,60,.95)'); if (op.mark === 'legion') { g.fillStyle = '#e8dcbc'; g.beginPath(); g.ellipse(0, 22, 6, 7, 0, 0, 7); g.fill(); } } };
    return q; });
  return [...parts, { n: 'helm', p: 'head', at: [0, 0], sh: HELM, c: 'helm', z: 10.7, lead: 3, paint: helmPaint },
    { n: 'lens', p: 'head', at: [0, 0], sh: smooth([[8, -33, 1], [19, -33], [20, -27, 1], [9, -26]]), c: 'lens', z: 10.8, lead: 2.4 }, ...extra];
}
export const MARINE = marine();
export const FIREHAWK = { arm: '#8e3a1c', arm2: '#6a2a14', helm: '#e8b02c', pauld: '#e8b02c', knee: '#e8b02c', rim: '#c08a1c', trim: '#c08a1c', cloth: '#34363c', dark: '#3c3f46', flesh: '#b07a5e', steel: COL.steel, lens: '#2a2c30' };
export const LEGION = { arm: '#26282e', arm2: '#1a1b20', helm: '#e2d6b4', pauld: '#26282e', knee: '#26282e', rim: '#3a3c42', trim: '#3a3c42', cloth: '#1a1b20', dark: '#1a1b20', flesh: '#b07a5e', steel: '#c8c2b0', lens: '#ff3020' };

// ---------- a Bloodletter: red-skinned, black-horned, a long hellblade ----------
const DH_F = smooth([[-4, -44, 1], [-14, -64], [-10, -88], [6, -108], [18, -114, 1], [6, -96], [0, -74], [10, -48, 1]]);
const DH_B = smooth([[-12, -42, 1], [-24, -60], [-24, -86], [-10, -108], [2, -116, 1], [-10, -94], [-12, -70], [-2, -46, 1]]);
const HELLBLADE = smooth([[-4, 22, 1], [4, 22, 1], [8, 70], [4, 130], [-2, 150, 1], [-6, 120], [-7, 70]]);
const DAEMON_PARTS = [...SON2.filter(q => !['hair', 'pelt', 'cloak', 'pack', 'stackB', 'stackF', 'pauldB', 'pauldF', 'rimB', 'rimF', 'collar'].includes(q.n)).map(q => q.n === 'blade' ? { ...q, sh: HELLBLADE, at: [0, 0], c: 'blade', paint: g => { for (let y = 40; y < 130; y += 14) brush(g, [[-2, y], [2, y + 6]], 1.2, { color: 'rgba(255,220,120,.7)' }); } } : q.n === 'grip' ? { ...q, sh: CS.grip } : q),
  { n: 'hornB2', p: 'head', at: [0, 0], sh: DH_B, c: 'horn', z: 10.4, lead: 2.4 }, { n: 'hornF2', p: 'head', at: [0, 0], sh: DH_F, c: 'horn', z: 10.9, lead: 2.4 }];
const DAEMON = { arm: '#a81c18', arm2: '#801410', trim: '#2a1a14', cloth: '#2a1a14', dark: '#2a1a14', flesh: '#b8201a', steel: '#3a2a20', blade: '#3a2a22', horn: '#1c1a1a' };
const daemon = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), DAEMON_PARTS, pose, DAEMON, { id, face: 'turned' });
const guard = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), GUARD, pose, GUARD_PAL, { id, face: 'stern' });

// ---------- the Raptorus Rex: a gothic star-fortress ----------
function fortress(P, x, y, s, id) {
  const T = ([px, py, c]) => [x + px * s, y + py * s, c];
  P.piece(smooth([[-120, 0, 1], [90, -6, 1], [130, 6, 1], [96, 22, 1], [-110, 24, 1], [-130, 12, 1]].map(T)), '#5a5048', { id, lead: 3, matW: 5, paint: g => { for (let k = 0; k < 12; k++) { g.fillStyle = 'rgba(255,200,90,.85)'; g.fillRect(x + (-100 + k * 16) * s, y + 10 * s, 3 * s, 3 * s); } } });   // the hull, lit windows
  for (const [cx, h, w] of [[-80, 40, 14], [-50, 62, 16], [-20, 84, 18], [10, 60, 14], [40, 44, 12]]) P.piece(smooth([[cx - w / 2, 0, 1], [cx - w / 2, -h * .6, 1], [cx, -h, 1], [cx + w / 2, -h * .6, 1], [cx + w / 2, 0, 1]].map(T)), '#6e645a', { id: id + 10 + cx, lead: 2.6, matW: 4 });   // spires
  P.piece(smooth([[90, -6, 1], [150, 8, 1], [96, 22, 1]].map(T)), '#8e3a1c', { id: id + 60, lead: 2.6, matW: 3 });   // the prow, in the Chapter's red
  P.piece(smooth([[-150, 2, 1], [-120, 4, 1], [-120, 20, 1], [-150, 22, 1]].map(T)), '#ffb040', { id: id + 61, lead: 2, mat: false });   // engine glow
}
function stars(P, r, id, n = 14) { for (let k = 0; k < n; k++) { const a = k * 2.399, rr = 30 + (k * 53) % (r - 30); P.piece(circle(Math.cos(a) * rr, Math.sin(a) * rr - 10, 2.6 + (k % 3)), '#f2ecd0', { id: id + k, lead: 1.6, mat: false }); } }
function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function fireAura(P, L, x, y, s, id, ph) {   // ghostly fire behind a Legionary
  P.setTransform(L.translate(x, y).scale(s));
  for (let k = 0; k < 6; k++) { const bx = -60 + k * 24, h = 120 + ((k * 41 + ph * 13) % 50); P.piece(smooth([[bx - 14, 120, 1], [bx - 8, 60], [bx + 4, 120 - h], [bx + 10, 40], [bx + 16, 120, 1]]), k % 2 ? '#ff9a2a' : '#ffcc44', { id: id + k, lead: 2.4, mat: false }); }
  P.setTransform(L);
}
function hawkOfFire(P, L, id) {   // a great hawk of flame spreading behind the last figure
  P.setTransform(L);
  const W = sd => smooth([[0, -40], [sd * 30, -70], [sd * 70, -96], [sd * 120, -100, 1], [sd * 96, -76], [sd * 128, -70, 1], [sd * 96, -50], [sd * 120, -38, 1], [sd * 80, -30], [sd * 40, -10]]);
  P.piece(W(-1), '#ff9a2a', { id, lead: 3, matW: 6, paint: g => { for (let k = 0; k < 4; k++) brush(g, [[-20, -30], [-60 - k * 15, -90 + k * 14]], 1.4, { color: 'rgba(160,40,10,.6)' }); } });
  P.piece(W(1), '#ff9a2a', { id: id + 1, lead: 3, matW: 6, paint: g => { for (let k = 0; k < 4; k++) brush(g, [[20, -30], [60 + k * 15, -90 + k * 14]], 1.4, { color: 'rgba(160,40,10,.6)' }); } });
  P.piece(smooth([[-10, -40], [0, -62, 1], [10, -40], [6, -20], [-6, -20]]), '#ffcc44', { id: id + 2, lead: 2.6, matW: 3 });
}

export const SKY = ['#1d2a50', COL.purple2, '#0e1430', '#3a1a20', '#2a0e10', '#1f1830'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  const fh = (x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MARINE, pose, FIREHAWK, { id, mark: 'firehawk', ...o });
  const lg = (x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MARINE, pose, o.pal || LEGION, { id, mark: o.mark || 'legion' });
  if (i === 0) {   // the Fire Hawks before their fortress
    stars(P, r, 15000, 10); fortress(P, 10, -100, .62, 15100);
    ground(P, r, '#4a4448', 15200, 86);
    fh(-58, 20, .42, f.pose || POSE.stand, 15300); fh(58, 20, -.42, f.pose2 || POSE.stand, 15500); fh(0, 30, .46, f.pose || POSE.stand, 15700);
  } else if (i === 1) {   // into the warp
    for (let k = 0; k < 5; k++) { const rr = 130 - k * 24; P.piece(smooth([[-rr, 0], [0, -rr * .8], [rr, 0], [0, rr * .8]].map(([x, y]) => [x * Math.cos(k + f.t) - y * Math.sin(k + f.t), x * Math.sin(k + f.t) + y * Math.cos(k + f.t)])), k % 2 ? '#6a2a7a' : '#2f7f5a', { id: 15900 + k, lead: 3, matW: 8 }); }
    if (!f.gone) fortress(P, f.shipX, 0, .7 * f.shipS, 16000);
  } else if (i === 2) {   // nothing left: empty stars, and the Chapter's hawk on a memorial
    stars(P, r, 16200, 22);
    P.piece(smooth([[-40, 40, 1], [40, 40, 1], [36, 120, 1], [-36, 120, 1]]), '#6e6556', { id: 16300, lead: 3.4, matW: 6, paint: g => { HAWK(g, 0, 70, 2.2, 'rgba(240,190,60,.9)'); g.font = '600 9px Cinzel'; g.textAlign = 'center'; g.fillStyle = 'rgba(30,18,10,.9)'; g.fillText('LOST', 0, 104); } });
    P.piece(circle(-60, -40, 22), '#8a8478', { id: 16310, lead: 3, matW: 6 });   // a cold moon
  } else if (i === 3) {   // the last guardsmen cornered by daemons; then the Legion comes
    ground(P, r, '#5a3a2a', 16500, 86);
    daemon(P, L, 70, 14, -.42, f.dpose || POSE.strike, 16600); daemon(P, L, 116, 24, -.38, POSE.guard, 16800);
    guard(P, L, -40, 22, .42, f.gpose || GPOSE.gAim, 17000); guard(P, L, -86, 30, .38, POSE.kneel, 17200);
    if (f.legion) { fireAura(P, L, -6, 0, .5, 17400, f.t || 0); lg(-2, 14, .46, POSE.guard, 17500); }
  } else if (i === 4) {   // the Legion fights, and vanishes
    ground(P, r, '#3a2a2a', 17800, 88);
    if (!f.dead) { daemon(P, L, 70, 14, -.42, POSE.guard, 17900); daemon(P, L, 116, 26, -.38, POSE.hit, 18100); }
    else for (const [x, y] of [[70, 74], [112, 80]]) P.piece(smooth([[x - 30, y, 1], [x + 30, y - 6, 1], [x + 26, y + 8, 1], [x - 28, y + 10, 1]]), '#801410', { id: 18200 + x, lead: 2.6, matW: 3 });
    if (!f.vanish) { fireAura(P, L, -40, 0, .5, 18300, f.t || 0); lg(-40, 14, .46, f.pose || POSE.guard, 18400); fireAura(P, L, -100, 10, .42, 18600, (f.t || 0) + 3); lg(-100, 22, .4, POSE.guard, 18700); }
    else { for (let k = 0; k < 7; k++) P.piece(circle(-70 + k * 12, 30 - (k % 3) * 20, 3 + (k % 2) * 2), '#ffcc44', { id: 18900 + k, lead: 1.6, mat: false }); }   // embers where they stood
  } else {   // the question: a Legionary, and the Fire Hawk beneath the black
    hawkOfFire(P, L, 19000);
    ground(P, r, '#2a2a30', 19100, 92);
    if (f.hawk) fh(0, 20, .5, POSE.raise, 19200); else lg(0, 20, .5, f.pose || POSE.stand, 19200);
  }
  P.setTransform(L);
}
