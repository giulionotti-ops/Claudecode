// The Crimson King: Magnus the Red warns his father, shatters the Palace wards, Prospero burns, Russ breaks him, Tzeentch answers.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2, SON2_TURNED, FATHER2, FATHER2_PAL } from './figures2.js';
import { MAGNUS, MAGNUS_PAL, RUSS, RUSS_PAL, TSONS, TSONS_PAL, WOLF, WOLF_PAL } from './primarchs.js';

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function pyramids(P, r, id, burning = false) {   // Tizca, the City of Light
  [[-90, 30, 46], [-30, 10, 60], [50, 22, 50], [110, 40, 36]].forEach(([x, top, w], k) => {
    P.piece(smooth([[x - w, 84, 1], [x, top - w * .6, 1], [x + w, 84, 1]]), burning ? '#5a3a30' : '#e8d8a8', { id: id + k, lead: 3, matW: 6, paint: g => { brush(g, [[x - w * .5, 60], [x + w * .5, 60]], 1.2, { color: 'rgba(90,60,20,.4)' }); } });
    if (burning) P.piece(smooth([[x - 14, top - w * .4], [x - 8, top - w * .6 - 30], [x, top - w * .6 - 12], [x + 6, top - w * .6 - 40], [x + 14, top - w * .4]]), '#ff9a2a', { id: id + 10 + k, lead: 2.2, mat: false });
  });
}
function orb(P, x, y, R, id, inner) { P.piece(circle(x, y, R), '#2a6ab0', { id, lead: 3, matW: 6 }); if (inner) inner(); }
function star8(P, x, y, R, id, col = '#c0202a') { const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? R * .35 : R; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 1]); } P.piece(smooth(pts), col, { id, lead: 3, matW: 4 }); }
function tzeentch(P, id) {   // the sign of the Changer of Ways: a ring with a curling flame, in blue and pink
  P.piece(circle(0, -50, 64), '#3a6ad0', { id, lead: 3, matW: 6 }); P.piece(circle(0, -50, 40), '#1a1a3a', { id: id + 1, lead: 3, matW: 4 });
  P.piece(smooth([[-20, -30], [-28, -60], [-10, -86, 1], [-6, -62], [8, -80, 1], [12, -50], [24, -64, 1], [20, -30]]), '#e060c0', { id: id + 2, lead: 2.6, matW: 3 });
}
const magnus = (P, L, x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MAGNUS, pose, o.pal || MAGNUS_PAL, { id, mark: 'plain', face: o.face || 'stern', eyeGlow: o.glow });
const russ = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), RUSS, pose, RUSS_PAL, { id, mark: 'plain', face: 'turned' });
const tson = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), TSONS, pose, TSONS_PAL, { id, mark: 'tsons' });
const wolf = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), WOLF, pose, WOLF_PAL, { id });

export const SKY = ['#1d3a9c', '#2a2a5a', '#3a2a10', '#2a3040', '#3a1a10', '#1a1030'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // Prospero: Magnus foresees Horus's betrayal
    pyramids(P, r, 16000);
    orb(P, 66, -66, 40, 16020, () => { if (f.vision) drawRig(P, L.translate(66, -48).scale(.18), SON2, POSE.raise, SON2_TURNED, { id: 16030, face: 'turned' }); P.setTransform(L); });
    magnus(P, L, -40, 18, .5, f.pose || POSE.reach, 16100, { glow: f.vision });
  } else if (i === 1) {   // the forbidden spell, cast with his sorcerers
    ground(P, r, '#3a3050', 16400, 86);
    if (f.cast) P.piece(smooth([[-14, 80, 1], [14, 80, 1], [30, -150, 1], [-30, -150, 1]]), '#7ad0ff', { id: 16410, lead: 2.4, mat: false });
    tson(P, L, -96, 30, .34, f.cast ? POSE.raise : POSE.stand, 16500); tson(P, L, 98, 30, -.34, f.cast ? POSE.raise : POSE.stand, 16700);
    magnus(P, L, 0, 14, .48, f.cast ? POSE.raise : POSE.stand, 16900, { glow: f.cast });
  } else if (i === 2) {   // Terra: the wards around the Emperor's secret shatter
    ground(P, r, '#4a3a20', 17100, 88);
    P.piece(circle(0, -10, 110), f.shatter ? '#3a2a10' : '#e8c060', { id: 17110, lead: 4, matW: 8 });   // the golden wards
    P.piece(circle(0, -10, 88), '#3a2a10', { id: 17111, lead: 3, matW: 6 });
    drawRig(P, L.translate(0, 20).scale(.42), FATHER2, POSE.seated, FATHER2_PAL, { id: 17200, face: f.shatter ? 'pain' : 'stern' });
    if (f.shatter) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; P.piece(smooth([[Math.cos(a) * 92, -10 + Math.sin(a) * 92, 1], [Math.cos(a + .2) * 118, -10 + Math.sin(a + .2) * 118, 1], [Math.cos(a - .1) * 124, -10 + Math.sin(a - .1) * 124, 1]]), '#e8c060', { id: 17300 + k, lead: 2, mat: false }); }
  } else if (i === 3) {   // the Wolves sent; Horus twists the order
    ground(P, r, '#3a3a48', 17500, 88);
    if (f.twist) { star8(P, 80, -70, 34, 17505); drawRig(P, L.translate(80, -28).scale(-.3, .3), SON2, POSE.reach, SON2_TURNED, { id: 17510, face: 'turned' }); }
    wolf(P, L, -100, 30, .34, POSE.guard, 17700); wolf(P, L, 20, 30, .34, POSE.guard, 17900);
    russ(P, L, -40, 16, .46, f.twist ? POSE.raise : POSE.guard, 18100);
  } else if (i === 4) {   // Prospero burns; Russ breaks Magnus
    pyramids(P, r, 18300, true); ground(P, r, '#3a2010', 18330, 92);
    russ(P, L, -54, 18, .44, f.rpose || POSE.guard, 18400);
    magnus(P, L, 54, 18, -.46, f.mpose || POSE.guard, 18600, { face: f.broken ? 'pain' : 'stern' });
  } else {   // the only one who answered: Tzeentch
    tzeentch(P, 18800);
    ground(P, r, '#1a1030', 18850, 92);
    if (f.flames) for (let k = 0; k < 6; k++) P.piece(smooth([[-80 + k * 32, 92], [-74 + k * 32, 40 - (k % 2) * 20, 1], [-66 + k * 32, 92]]), k % 2 ? '#3a8ae0' : '#e060c0', { id: 18860 + k, lead: 2, mat: false });
    magnus(P, L, 0, 18, .5, f.pose || POSE.kneelLow, 18900, { face: f.risen ? 'turned' : 'grief', glow: f.risen });
  }
  P.setTransform(L);
}
