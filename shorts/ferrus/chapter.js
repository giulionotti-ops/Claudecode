// The Brother Who Killed His Best Friend: Ferrus Manus and Fulgrim. Six medallions, bottom to top.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { helm2 } from './figures2.js';
import { FERRUS, FERRUS_HAMMER, FERRUS_BARE, FERRUS_PAL, fulgrim, FULGRIM_PAL, IRONHAND, IRONHAND_PAL } from './primarchs.js';

const FUL_HAMMER = fulgrim('hammer'), FUL_DAEMON = fulgrim('daemon'), FUL_BARE = fulgrim('none'), FUL_FIRE = fulgrim('fireblade');
function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function anvil(P, x, y, id) { P.piece(smooth([[x - 30, y - 10, 1], [x + 34, y - 10, 1], [x + 22, y, 1], [x + 12, y + 2, 1], [x + 16, y + 24, 1], [x - 16, y + 24, 1], [x - 10, y + 2, 1], [x - 26, y, 1]]), '#3a3c42', { id, lead: 3, matW: 4 }); }
function sparks(P, x, y, id, n = 7) { for (let k = 0; k < n; k++) { const a = -Math.PI * (.15 + .7 * k / (n - 1)), r = 22 + (k % 3) * 10; P.piece(circle(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.6 + (k % 2)), '#ffcc44', { id: id + k, lead: 1.4, mat: false }); } }
function wisps(P, x, y, id) { for (let k = 0; k < 4; k++) P.piece(smooth([[x - 10 + k * 8, y + 30], [x - 20 + k * 10, y], [x - 8 + k * 9, y - 30 - k * 8, 1], [x + 2 + k * 8, y - 4], [x + 4 + k * 7, y + 30]]), k % 2 ? '#a83ad0' : '#d060e8', { id: id + k, lead: 2.2, mat: false }); }
function fallen(P, x, y, id) { P.piece(smooth([[x - 26, y, 1], [x + 26, y - 4, 1], [x + 22, y + 8, 1], [x - 24, y + 10, 1]]), '#2c2e33', { id, lead: 2.6, matW: 3 }); }
const fer = (P, L, x, y, s, rig, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), rig, pose, FERRUS_PAL, { id, mark: 'ferrus', face: o.face || 'stern', hide: o.hide });
const ful = (P, L, x, y, s, rig, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), rig, pose, FULGRIM_PAL, { id, mark: 'fulgrim', pale: true, face: o.face || 'calm' });

export const SKY = ['#3a1a10', '#1d2a50', COL.purple2, '#4a1a10', '#2a0a10', '#1a1a2a'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // the forge: two brothers at one anvil
    ground(P, r, '#4a3a30', 16000, 84);
    P.piece(smooth([[-r, -40, 1], [-60, -60, 1], [60, -60, 1], [r, -40, 1], [r, -r, 1], [-r, -r, 1]]), '#5a2a14', { id: 16005, lead: 3, matW: 8 });   // the forge's glow
    anvil(P, 0, 50, 16010); if (f.spark) sparks(P, 0, 36, 16020);
    ful(P, L, -62, 16, .4, FUL_HAMMER, f.fpose || POSE.guard, 16100, { face: 'calm' });
    fer(P, L, 62, 16, -.4, FERRUS_HAMMER, f.pose || POSE.guard, 16300);
  } else if (i === 1) {   // the gifts: each lifts the weapon the other made
    ground(P, r, '#3a3a50', 16500, 86);
    ful(P, L, -58, 14, .42, f.fire ? FUL_FIRE : FUL_BARE, f.fire ? POSE.raise : POSE.fstand, 16600, { face: 'calm' });
    fer(P, L, 58, 14, -.42, f.hammer ? FERRUS_HAMMER : FERRUS_BARE, f.hammer ? POSE.raise : POSE.fstand, 16800);
  } else if (i === 2) {   // the fall: Fulgrim, whispering daemons at his back, begs; Ferrus turns away
    ground(P, r, '#3a2a40', 17000, 86);
    if (f.wisps) wisps(P, -70, -40, 17010);
    ful(P, L, -56, 14, .42, FUL_FIRE, POSE.reach, 17100, { face: 'turned' });
    fer(P, L, 60, 14, f.refuse ? .42 : -.42, FERRUS_HAMMER, f.refuse ? POSE.guard : POSE.fstand, 17300);
  } else if (i === 3) {   // Isstvan V: the duel
    ground(P, r, '#5a2a1a', 17500, 86); fallen(P, -80, 92, 17510); fallen(P, 90, 96, 17520);
    ful(P, L, 58, 14, -.42, f.daemon ? FUL_DAEMON : FUL_HAMMER, f.fpose || POSE.guard, 17600, { face: 'turned' });
    fer(P, L, -54, 14, .42, FERRUS, f.pose || POSE.guard, 17800);
  } else if (i === 4) {   // the stroke
    ground(P, r, '#3a1010', 18000, 88); fallen(P, 96, 96, 18010);
    if (!f.dead) fer(P, L, -44, 18, .42, FERRUS, f.pose || POSE.kneel, 18100, { face: 'pain' });
    else { fer(P, L, -44, 22, .42, FERRUS, POSE.lie, 18100, { hide: new Set(['head']) }); for (let k = 0; k < 5; k++) P.piece(smooth([[-70 + k * 10, 74], [-66 + k * 10, 64, 1], [-62 + k * 10, 76]]), '#a01018', { id: 18200 + k, lead: 1.6, mat: false }); }
    ful(P, L, 50, 14, -.42, FUL_DAEMON, f.fpose || POSE.guard, 18300, { face: 'turned' });
  } else {   // after: the Fireblade in the ash, Iron Hands helms, Fulgrim on his knees
    ground(P, r, '#2a2a30', 18600, 90);
    P.setTransform(L.translate(-6, -60).rotate(.08)); P.piece(smooth([[-6, 0, 1], [6, 0, 1], [7, 100], [0, 122, 1], [-7, 100]]), COL.gold2, { id: 18610, lead: 2.6, matW: 3, paint: g => { g.fillStyle = 'rgba(255,120,20,.8)'; for (let y = 10; y < 100; y += 18) { g.beginPath(); g.moveTo(-7, y); g.quadraticCurveTo(-14, y + 6, -5, y + 14); g.fill(); } } });
    P.piece(smooth([[-16, -4, 1], [16, -4, 1], [14, 6, 1], [-14, 6, 1]]), COL.gold, { id: 18611, lead: 2, mat: false }); P.setTransform(L);
    helm2(P, L, -96, 76, '#2c2e33', 18620, 1.1, '#5fd84a'); helm2(P, L, 96, 80, '#2c2e33', 18630, 1.0, '#5fd84a');
    if (f.search) drawRig(P, L.translate(-80, 16).scale(.36), IRONHAND, POSE.kneel, IRONHAND_PAL, { id: 18700, mark: 'ironhand' });
    if (f.regret) ful(P, L, 62, 20, -.44, FUL_DAEMON, POSE.kneelLow, 18900, { face: 'grief' });
  }
  P.setTransform(L);
}
