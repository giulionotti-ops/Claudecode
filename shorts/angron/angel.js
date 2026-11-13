// The Angel's Last Stand: Sanguinius (winged power-armour figure) and the medallion scenes.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2, SON2_TURNED, FATHER2, FATHER2_PAL } from './figures2.js';

const fold = (g, pts, w = 1.4) => brush(g, pts, w, { w0: .2, w1: .15 });
// a wing pointing up and out from its root (mirror for the far wing); feathers painted in grisaille
const WING = smooth([[0, 4], [14, -24], [40, -66], [78, -102], [104, -110], [112, -96], [100, -74], [92, -50], [80, -30], [66, -8], [48, 10], [24, 16]]);
const featherPaint = s => g => { for (let k = 0; k < 6; k++) brush(g, [[s * (20 + k * 12), -10 - k * 14], [s * (34 + k * 13), 8 - k * 12]], 1.3, { w0: .3, w1: .2 }); for (let k = 0; k < 4; k++) brush(g, [[s * (40 + k * 16), -50 - k * 12], [s * (60 + k * 14), -40 - k * 10]], 1.1, { color: 'rgba(52,30,14,.45)' }); };
const SWORD = {
  grip: smooth([[-3, 0, 1], [3, 0, 1], [3, 16, 1], [-3, 16, 1]]),
  guard: smooth([[-22, 12, 1], [-12, 14], [0, 18, 1], [12, 14], [22, 12, 1], [18, 22, 1], [0, 22], [-18, 22, 1]]),
  blade: smooth([[-5, 22, 1], [5, 22, 1], [4.5, 150], [0, 168, 1], [-4.5, 150]]),
};
export const ANGEL = [
  { n: 'wingB', p: 'torso', at: [-12, -82], sh: smooth([[0, 4], [-14, -24], [-40, -66], [-78, -102], [-104, -110], [-112, -96], [-100, -74], [-92, -50], [-80, -30], [-66, -8], [-48, 10], [-24, 16]]), c: 'wing', z: -2, mw: 8, paint: featherPaint(-1) },
  { n: 'wingF', p: 'torso', at: [12, -82], sh: WING, c: 'wing', z: -1.9, mw: 8, paint: featherPaint(1) },
  ...SON2.filter(q => !['pelt', 'pack', 'stackB', 'stackF'].includes(q.n)).map(q =>
    q.n === 'hair' ? { ...q, sh: smooth([[-15, -40], [-4, -56], [12, -54], [20, -42], [8, -44], [-6, -40], [-12, -10], [-14, 14], [-22, 22, 1], [-24, -4], [-20, -28]]), z: 10.4 }   // long fair hair
    : SWORD[q.n] ? { ...q, sh: SWORD[q.n], at: q.n === 'blade' ? [0, 0] : q.at, paint: q.n === 'blade' ? g => { brush(g, [[0, 30], [0, 140]], 1.2, { w0: .3, w1: .3 }); brush(g, [[2, 32], [2, 136]], 1.2, { w0: .3, w1: .3, color: 'rgba(255,255,255,.55)' }); } : q.paint }
    : q),
];
// parents must come before children for drawRig: move the wings after the torso
const iT = ANGEL.findIndex(q => q.n === 'torso'); ANGEL.splice(iT + 1, 0, ...ANGEL.splice(0, 2));
export const ANGEL_PAL = { arm: COL.gold2, arm2: COL.gold, trim: COL.white, cloak: COL.ruby, cloth: COL.ruby2, dark: '#3c3f46', flesh: '#c09070', hair: '#e2c070', steel: COL.white, wing: '#e6ece0' };
export const WINGS = { folded: { wingB: .62, wingF: -.62 }, spread: { wingB: .1, wingF: -.1 } };
const withWings = (pose, w) => ({ ...pose, ...WINGS[w] });

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function deck(P, r, id) {   // the flagship's deck: iron plates
  P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, 84, 1], [r + 10, 84, 1], [r + 10, r + 10, 1]]), '#4a4e58', { id, lead: 4.5, matW: 8, paint: g => { g.strokeStyle = 'rgba(30,24,18,.6)'; g.lineWidth = 1.4; g.beginPath(); for (let x = -140; x < 150; x += 36) { g.moveTo(x, 84); g.lineTo(x + 12, 160); } g.stroke(); } });
  for (const x of [-118, 118]) P.piece(smooth([[x - 10, 84, 1], [x - 10, -90, 1], [x, -110, 1], [x + 10, -90, 1], [x + 10, 84, 1]]), '#3a3e48', { id: id + 10 + x, lead: 3.4, matW: 5 });
}
function feathers(P, list) { for (const [x, y, a, id] of list) { P.piece(smooth([[x, y - 8, 1], [x + 3 * Math.cos(a), y], [x, y + 8, 1], [x - 3, y]]), '#e6ece0', { id, lead: 2, mat: false }); } }
function chalice(P, x, y, id, lit) {
  P.piece(smooth([[x - 18, y - 22, 1], [x + 18, y - 22, 1], [x + 14, y - 4], [x + 4, y + 4], [x + 3, y + 16], [x + 12, y + 22, 1], [x - 12, y + 22, 1], [x - 3, y + 16], [x - 4, y + 4], [x - 14, y - 4]]), COL.gold2, { id, lead: 3, matW: 5 });
  P.piece(smooth([[x - 15, y - 19, 1], [x + 15, y - 19, 1], [x + 11, y - 8], [x - 11, y - 8]]), lit ? '#d0202c' : COL.ruby2, { id: id + 1, lead: 2.4, mat: false });   // the blood
}

export const SKY = [COL.cobalt, COL.purple2, '#26222e', '#1f1830', COL.purple2, COL.deepblue];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // the Angel
    ground(P, r, COL.green2, 12000);
    drawRig(P, L.translate(0, 0).scale(.56), ANGEL, withWings(f.pose || POSE.stand, f.wings || 'folded'), ANGEL_PAL, { id: 12100, face: 'calm' });
  } else if (i === 1) {   // the vision of his death
    ground(P, r, COL.olive, 12200);
    P.piece(circle(56, -50, 46), f.vision ? '#5a2a5a' : '#2a2030', { id: 12210, lead: 4, matW: 10 });
    P.save(); P.g.clip(circle(56, -50, 46)); P.s.clip(circle(56, -50, 46));
    drawRig(P, L.translate(72, -24).scale(-.2, .2), SON2, POSE.raise, SON2_TURNED, { id: 12300, face: 'turned' });
    drawRig(P, L.translate(46, -12).scale(.18), ANGEL, withWings(POSE.lie, 'folded'), ANGEL_PAL, { id: 12400, face: 'calm' });
    P.restore(); P.setTransform(L);
    drawRig(P, L.translate(-50, 10).scale(.5), ANGEL, withWings(f.pose || POSE.kneel, 'folded'), ANGEL_PAL, { id: 12500, face: f.face || 'calm' });
  } else if (i === 2 || i === 3) {   // the meeting; the offer refused
    deck(P, r, 12600 + i * 100);
    drawRig(P, L.translate(54, 6).scale(-.5, .5), SON2, f.horus || POSE.guard, SON2_TURNED, { id: 12800 + i * 400, face: 'turned', turned: true });
    const s = f.away ? -.48 : .48;   // the Angel turns his back on the offer
    drawRig(P, L.translate(-52, 8).scale(s, .48), ANGEL, withWings(f.angel || POSE.guard, f.wings || 'spread'), ANGEL_PAL, { id: 13000 + i * 400, face: f.face || 'stern' });
  } else if (i === 4) {   // the fall, and the crack in Horus's armour
    deck(P, r, 13800);
    feathers(P, f.feathers || []);
    drawRig(P, L.translate(48, 8).scale(-.48, .48), SON2, f.horus || POSE.guard, SON2_TURNED, { id: 13900, face: 'turned', turned: true });
    drawRig(P, L.translate(f.ax ?? -48, f.ay ?? 8).scale(.46), ANGEL, withWings(f.angel || POSE.guard, f.wings || 'spread'), ANGEL_PAL, { id: 14300, face: f.face || 'stern' });
  } else {   // the Emperor strikes through the crack; the chalice keeps its light
    deck(P, r, 14800);
    chalice(P, 0, -104, 14900, f.cup);
    drawRig(P, L.translate(-58, 8).scale(.5), FATHER2, f.father || POSE.reach, FATHER2_PAL, { id: 15000, face: 'stern' });
    drawRig(P, L.translate(f.hx ?? 60, f.hy ?? 8).scale(-.5, .5), SON2, f.horus || POSE.guard, SON2_TURNED, { id: 15400, face: 'turned', turned: true });
  }
  P.setTransform(L);
}
