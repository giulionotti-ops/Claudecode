// The Mantis Warriors: guardians of the Endymion Cluster, deceived by Huron, forgiven and punished. Six medallions, bottom to top.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { TYRANT_PARTS, TYRANT } from './lamenters.js';
import { MANTIS_M, MANTIS_PAL, FIREHAWK_PAL, PRISONER, PRISONER_PAL, MASTER } from './primarchs.js';

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function dunes(P, r, id) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, 70], [-80, 50], [-30, 66], [30, 46], [90, 62], [r + 10, 52], [r + 10, r + 10, 1]]), '#c89a50', { id, lead: 4, matW: 9, paint: g => { for (let k = 0; k < 5; k++) brush(g, [[-110 + k * 50, 80], [-80 + k * 50, 74]], 1.2, { color: 'rgba(90,60,20,.45)' }); } }); }
function maelstrom(P, x, y, id) { for (let k = 0; k < 3; k++) P.piece(smooth([[x - 40 + k * 10, y], [x - 10, y - 26 + k * 8], [x + 30 - k * 8, y - 8], [x + 10, y + 16 - k * 4]]), k % 2 ? '#7a2a8a' : '#a83a6a', { id: id + k, lead: 2.4, matW: 4 }); }
function star8(P, x, y, R, id) {   // the eight-pointed star of Chaos
  const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? R * .35 : R; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 1]); }
  P.piece(smooth(pts), '#c0202a', { id, lead: 3, matW: 4 });
}
function bars(P, id) { for (let k = 0; k < 7; k++) P.piece(smooth([[-96 + k * 32, -130, 1], [-90 + k * 32, -130, 1], [-90 + k * 32, 130, 1], [-96 + k * 32, 130, 1]]), '#2a2c30', { id: id + k, lead: 2, mat: false }); }
const mw = (P, L, x, y, s, pose, id, hide) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), MANTIS_M, pose, MANTIS_PAL, { id, mark: 'mantis', hide });
const huron = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), TYRANT_PARTS, pose, TYRANT, { id, face: 'stern' });

export const SKY = ['#3a2a50', '#3a3a50', '#3a1a20', '#2a2a40', '#1a1a24', '#2a2238'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // a thousand years of watch over the desert worlds of the Endymion Cluster
    maelstrom(P, 80, -80, 15990); P.piece(circle(-70, -70, 18), '#d8b070', { id: 15995, lead: 2.6, matW: 5 }); P.piece(circle(-30, -96, 9), '#a8b0c0', { id: 15996, lead: 2, matW: 3 });
    dunes(P, r, 16000);
    mw(P, L, -54, 18, .42, POSE.guard, 16100); mw(P, L, 56, 22, -.4, POSE.guard, 16300); mw(P, L, 0, 28, .46, POSE.stand, 16500);
  } else if (i === 1) {   // the Tyrant of Badab calls; the Mantis Warriors answer
    ground(P, r, '#3a3a50', 16700, 86);
    P.piece(smooth([[20, 64, 1], [130, 52, 1], [130, 140, 1], [20, 140, 1]]), '#6e6556', { id: 16710, lead: 3.4, matW: 6 });   // the dais
    huron(P, L, 70, -8, -.46, POSE.reach, 16800);
    mw(P, L, -62, 22, .42, f.pose || POSE.stand, 17000); mw(P, L, -104, 30, .36, f.pose || POSE.stand, 17200);
  } else if (i === 2) {   // what they never knew: Huron already belonged to Chaos
    ground(P, r, '#2a1010', 17400, 88);
    if (f.chaos) star8(P, 30, -50, 70, 17410);
    huron(P, L, 30, 6, -.46, POSE.raise, 17500);
    mw(P, L, -80, 26, .4, POSE.stand, 17700);
  } else if (i === 3) {   // the war lost, they kneel and are forgiven
    ground(P, r, '#3a3a40', 17900, 88);
    if (f.granted) P.piece(smooth([[-30, -150, 1], [30, -150, 1], [70, 80, 1], [-70, 80, 1]]), '#f4e2a0', { id: 17910, lead: 2.6, mat: false });
    P.piece(smooth([[0, -110], [-30, -90], [-60, -98], [-40, -80], [-12, -76], [0, -60, 1], [12, -76], [40, -80], [60, -98], [30, -90]]), COL.gold2, { id: 17920, lead: 3, matW: 4 });   // the aquila
    mw(P, L, -60, 22, .4, POSE.kneel, 18000); mw(P, L, 0, 24, .42, POSE.kneel, 18200); mw(P, L, 60, 22, -.4, POSE.kneel, 18400);
  } else if (i === 4) {   // the Chapter Master stripped of his armour and imprisoned for life
    ground(P, r, '#2a2a30', 18600, 90);
    if (!f.stripped) drawRig(P, L.translate(0, 18).scale(.46), MASTER, POSE.stand, MANTIS_PAL, { id: 18700, face: 'stern', mark: 'plain' });
    else drawRig(P, L.translate(0, 18).scale(.46), PRISONER, f.locked ? POSE.kneelLow : POSE.stand, PRISONER_PAL, { id: 18700, face: 'grief', mark: 'plain', hide: new Set(['pauldF', 'pauldB', 'rimF', 'rimB', 'pack', 'stackB', 'stackF', 'collar', 'kneeF', 'kneeB', 'belt']) });
    if (f.locked) bars(P, 18900);
  } else {   // their home given away; a long crusade; fewer every year
    ground(P, r, '#4a3a30', 19000, 92);
    if (f.firehawk) drawRig(P, L.translate(-96, 20).scale(.36), MANTIS_M, POSE.raise, FIREHAWK_PAL, { id: 19100 });
    const n = f.count ?? 5;
    for (let k = 0; k < 5; k++) if (k < n) mw(P, L, -30 + k * 32, 30 + (k % 2) * 6, .32, POSE.stand, 19300 + k * 200);
  }
  P.setTransform(L);
}
