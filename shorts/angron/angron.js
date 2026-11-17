// The Saddest Primarch: Angron (gladiator, then daemon), the slaves, and the medallion scenes.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2, FATHER2, FATHER2_PAL } from './figures2.js';
import { GUARD, GPOSE } from './cadia.js';

// the Butcher's Nails: iron spikes driven into the back of the skull
const NAILS = smooth([[-14, -30, 1], [-34, -46, 1], [-16, -36, 1], [-30, -58, 1], [-12, -42, 1], [-18, -66, 1], [-6, -46, 1], [-2, -70, 1], [2, -48, 1], [8, -64, 1], [6, -46, 1], [-4, -40, 1]]);
const AXE = smooth([[-4, 76, 1], [-4, 108, 1], [16, 126], [42, 120], [52, 96], [44, 72], [22, 64], [4, 72, 1]]);   // a single great blade
const BATWING = smooth([[0, 4], [20, -30], [52, -74], [96, -100], [110, -70], [90, -56], [100, -30], [76, -24], [80, 0], [52, -4], [40, 16], [18, 14]]);
const batPaint = s => g => { for (const [a, b] of [[[0, 0], [96, -100]], [[20, -20], [100, -30]], [[20, -10], [80, 0]]]) brush(g, [[s * a[0], a[1]], [s * b[0], b[1]]], 2, { w0: .5, w1: .2 }); };
export const ANGRON = [
  { n: 'wingB', p: 'torso', at: [-14, -82], sh: smooth([[0, 4], [-20, -30], [-52, -74], [-96, -100], [-110, -70], [-90, -56], [-100, -30], [-76, -24], [-80, 0], [-52, -4], [-40, 16], [-18, 14]]), c: 'wing', z: -2, mw: 6, paint: batPaint(-1) },
  { n: 'wingF', p: 'torso', at: [14, -82], sh: BATWING, c: 'wing', z: -1.9, mw: 6, paint: batPaint(1) },
  ...SON2.filter(q => !['pack', 'stackB', 'stackF', 'hair'].includes(q.n)).map(q => q.n === 'blade' ? { ...q, sh: AXE, at: [0, 0], paint: g => { brush(g, [[2, 80], [40, 90], [44, 112]], 1.4); brush(g, [[46, 76], [52, 96], [44, 118]], 1.6, { color: 'rgba(255,255,255,.45)' }); } } : q),
  { n: 'nails', p: 'head', at: [0, 0], sh: NAILS, c: 'nails', z: 10.3, lead: 2.4 },
];
const iT = ANGRON.findIndex(q => q.n === 'torso'); ANGRON.splice(iT + 1, 0, ...ANGRON.splice(0, 2));   // parents before children
export const GLADIATOR = { arm: '#9a7a5a', arm2: '#7a5a3a', trim: COL.steel, cloak: '#5a2a2a', cloth: '#6a5a46', dark: '#3c3f46', pelt: '#8a7a5c', flesh: '#b07a5e', steel: '#6e7a7c', nails: '#4a4e58', wing: '#4a1a1a' };
export const DAEMON = { arm: '#4a1410', arm2: '#5a1a10', trim: COL.gold, cloak: '#2a0808', cloth: '#5a0a12', dark: '#26282c', pelt: '#3a2a20', flesh: '#a02020', steel: COL.steel2, nails: '#e02a2a', wing: '#5a1a1a' };
const SLAVE = { kit: '#5a4a32', coat: '#6a5a46', fatigue: '#8a7a5c', flak: '#8a7a5c', flesh: '#b48066', helm: '#5f6a3e', boot: '#3a2e22', gun: '#5a4632' };
const NOWING = new Set(['wingB', 'wingF']);
const slave = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), GUARD, pose, SLAVE, { id, face: 'stern', hide: new Set(['helmet', 'rifle', 'vest']) });

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function mountain(P, r, id) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, 60, 1], [-70, 20, 1], [-30, 40, 1], [10, -10, 1], [60, 30, 1], [100, 10, 1], [r + 10, 50, 1], [r + 10, r + 10, 1]]), '#6a6258', { id, lead: 4.5, matW: 10, paint: g => { for (let k = 0; k < 6; k++) brush(g, [[-110 + k * 40, 70], [-96 + k * 40, 96]], 1.4, { color: 'rgba(30,24,18,.5)' }); } }); }
function chain(P, x0, y0, x1, y1, n, col, id, broken = 0) {
  for (let k = 0; k < n; k++) { const u = (k + .5) / n, gap = broken && Math.abs(u - .5) < .12 ? (u < .5 ? -broken : broken) : 0;
    P.piece(circle(x0 + (x1 - x0) * u + gap, y0 + (y1 - y0) * u, 5), col, { id: id + k, lead: 2.2, mat: false }); }
}

export const SKY = ['#3a1a20', COL.purple2, '#26222e', COL.deepblue, '#3a1a20', '#1a1a3a'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // the arena
    ground(P, r, '#9a7a4a', 16000, 70);
    for (let k = 0; k < 14; k++) { const a = Math.PI * (1.08 + k / 13 * .84), x = Math.cos(a) * 118, y = Math.sin(a) * 118 + 20; P.piece(circle(x, y, 8), '#7a5a46', { id: 16010 + k, lead: 2.2, mat: false }); }   // the crowd
    drawRig(P, L.translate(46, 12).scale(-.42, .42), GUARD, GPOSE.gAim, { ...SLAVE, coat: '#4a4e58', helm: '#4a4e58' }, { id: 16100, face: 'stern' });   // an arena guard
    drawRig(P, L.translate(-36, 6).scale(.48), ANGRON, f.angron || POSE.guard, GLADIATOR, { id: 16200, face: 'stern', hide: new Set([...NOWING, 'nails']) });
  } else if (i === 1) {   // the Nails
    ground(P, r, '#3a2e3a', 16400, 84);
    drawRig(P, L.translate(0, 4).scale(.56), ANGRON, f.angron || POSE.kneelLow, f.rage ? { ...GLADIATOR, nails: '#e02a2a' } : GLADIATOR, { id: 16500, face: f.rage ? 'turned' : 'pain', hide: f.nails ? NOWING : new Set([...NOWING, 'nails']) });
  } else if (i === 2) {   // the revolt
    ground(P, r, '#5a4a3a', 16800, 86);
    slave(P, L, -86, 30, .36, f.up ? GPOSE.gRaise : POSE.stand, 16900); slave(P, L, 88, 30, -.36, f.up ? GPOSE.gRaise : POSE.stand, 17000); slave(P, L, -52, 46, .32, f.up ? GPOSE.gRaise : POSE.stand, 17100);
    drawRig(P, L.translate(10, 8).scale(.5), ANGRON, f.angron || POSE.guard, { ...GLADIATOR, nails: '#c02a2a' }, { id: 17200, face: 'turned', hide: NOWING });
  } else if (i === 3) {   // the mountains: the Emperor takes him away
    mountain(P, r, 17400);
    for (let k = 0; k < 9; k++) P.piece(smooth([[-120 + k * 30, 120, 1], [-118 + k * 30, 96, 1], [-116 + k * 30, 120, 1]]), COL.steel2, { id: 17410 + k, lead: 2, mat: false });   // the army below
    slave(P, L, -70, 18, .34, GPOSE.gRaise, 17500); slave(P, L, 64, 28, -.34, GPOSE.gRaise, 17600);
    if (f.beam) P.piece(smooth([[-22, -150, 1], [22, -150, 1], [30, 60, 1], [-30, 60, 1]]), '#f4e2a0', { id: 17700, lead: 3, mat: false });   // the light that takes him
    if (!f.gone) drawRig(P, L.translate(0, 0).scale(.46), ANGRON, f.angron || GPOSE.gRaise, { ...GLADIATOR, nails: '#c02a2a' }, { id: 17800, face: 'turned', hide: NOWING });
    if (f.beam) drawRig(P, L.translate(70, -40).scale(.26), FATHER2, POSE.reach, FATHER2_PAL, { id: 17900, face: 'stern' });
  } else if (i === 4) {   // his brothers, dead without him
    mountain(P, r, 18100);
    slave(P, L, -60, 40, .34, POSE.lie, 18200); slave(P, L, 30, 20, -.34, POSE.lie, 18300); slave(P, L, 80, 60, .3, POSE.lie, 18400);
    for (let k = 0; k < 5; k++) P.piece(smooth([[-90 + k * 44, -20, 1], [-86 + k * 44, -60, 1], [-82 + k * 44, -20, 1]]), '#5a4632', { id: 18500 + k, lead: 2, mat: false });   // spears in the ground
  } else {   // the slave becomes a daemon; chains break, and bind him again
    ground(P, r, '#3a3a40', 18700, 92);
    chain(P, -130, -40, -40, -30, 8, f.newChains ? '#e02a2a' : COL.steel2, 18710, f.broken); chain(P, 130, -40, 40, -30, 8, f.newChains ? '#e02a2a' : COL.steel2, 18730, f.broken);
    drawRig(P, L.translate(0, 8).scale(.5), ANGRON, f.angron || POSE.guard, f.daemon ? DAEMON : { ...GLADIATOR, nails: '#c02a2a' }, { id: 18800, face: 'turned', off: f.off, pal: f.pal, hide: f.daemon ? null : NOWING });
  }
  P.setTransform(L);
}
