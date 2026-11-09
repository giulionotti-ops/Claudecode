// The First Betrayal: Luther and the Lion. The forest child, the Emperor's coming, the shadow, the whisper, the fall of Caliban, the prisoner.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { FATHER2, FATHER2_PAL } from './figures2.js';
import { GUARD } from './cadia.js';
import { LION, LION_PAL, LUTHER, LUTHER_BARE, LUTHER_PAL, DANGEL, DANGEL_PAL } from './primarchs.js';

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function forest(P, id) { [[-120, -40], [-80, -70], [90, -60], [126, -30], [40, -90]].forEach(([x, top], k) => { P.piece(smooth([[x - 6, 90, 1], [x - 6, top + 30, 1], [x + 6, top + 30, 1], [x + 6, 90, 1]]), '#4a3020', { id: id + k, lead: 2.4, matW: 3 });
  P.piece(smooth([[x - 30, top + 40, 1], [x, top - 20, 1], [x + 30, top + 40, 1]]), k % 2 ? '#1f5a2a' : '#2a6a30', { id: id + 10 + k, lead: 2.6, matW: 5 }); }); }
function ships(P, id, y0) { for (let k = 0; k < 3; k++) { const x = -70 + k * 70, y = y0 - (k % 2) * 20; P.piece(smooth([[x - 26, y, 1], [x + 20, y - 4, 1], [x + 30, y + 4, 1], [x + 20, y + 10, 1], [x - 26, y + 10, 1]]), '#22242a', { id: id + k, lead: 2.2, matW: 3 }); P.piece(smooth([[x - 34, y + 2, 1], [x - 26, y + 2, 1], [x - 26, y + 8, 1], [x - 34, y + 8, 1]]), '#ffb040', { id: id + 5 + k, lead: 1.6, mat: false }); } }
function wisps(P, x, y, id) { for (let k = 0; k < 4; k++) P.piece(smooth([[x - 10 + k * 8, y + 30], [x - 20 + k * 10, y], [x - 8 + k * 9, y - 30 - k * 8, 1], [x + 2 + k * 8, y - 4], [x + 4 + k * 7, y + 30]]), k % 2 ? '#a83ad0' : '#d060e8', { id: id + k, lead: 2.2, mat: false }); }
function bars(P, id) { for (let k = 0; k < 7; k++) P.piece(smooth([[-96 + k * 32, -130, 1], [-90 + k * 32, -130, 1], [-90 + k * 32, 130, 1], [-96 + k * 32, 130, 1]]), '#2a2c30', { id: id + k, lead: 2, mat: false }); }
const lion = (P, L, x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), LION, pose, LION_PAL, { id, mark: 'plain', face: o.face || 'stern' });
const luther = (P, L, x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), o.bare ? LUTHER_BARE : LUTHER, pose, LUTHER_PAL, { id, mark: 'plain', face: o.face || 'stern' });
const child = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), GUARD, pose, { kit: '#6a5a40', coat: '#8a7a5c', fatigue: '#c09070', flak: '#8a7a5c', flesh: '#c09070', helm: '#e0c070', boot: '#c09070', gun: '#6a5a40' }, { id, face: 'turned', hide: new Set(['helmet', 'rifle', 'vest']) });

export const SKY = ['#1a3a24', '#3a3018', '#1a2040', '#2a1030', '#3a1a10', '#141420'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // the forests of Caliban: Luther finds the wild child
    forest(P, 16000); ground(P, r, '#2a3a20', 16030, 88);
    child(P, L, 60, 40, -.3, POSE.kneelLow, 16100);
    luther(P, L, -46, 16, .46, f.pose || POSE.fstand, 16300, { bare: true, face: 'calm' });
  } else if (i === 1) {   // brothers; then the Emperor comes for the Lion
    ground(P, r, '#3a3a30', 16500, 88);
    if (f.emperor) { P.piece(smooth([[50, -150, 1], [110, -150, 1], [130, 80, 1], [30, 80, 1]]), '#f4e2a0', { id: 16505, lead: 2.6, mat: false }); drawRig(P, L.translate(84, 0).scale(-.4, .4), FATHER2, POSE.reach, FATHER2_PAL, { id: 16600, face: 'calm' }); }
    luther(P, L, -86, 22, .4, POSE.fstand, 16800, { face: 'calm' });
    lion(P, L, -20, 16, .44, f.emperor ? POSE.fstand : POSE.guard, 17000, { face: 'calm' });
  } else if (i === 2) {   // the Lion leaves for the stars; Luther left behind, in his shadow
    ground(P, r, '#2a2a3a', 17200, 88);
    if (f.ships) ships(P, 17210, f.shipY ?? -60);
    luther(P, L, 0, 18, .46, f.jealous ? POSE.guard : POSE.fstand, 17300, { face: f.jealous ? 'turned' : 'grief' });
  } else if (i === 3) {   // the whisper
    ground(P, r, '#2a1a30', 17500, 88);
    if (f.wisps) wisps(P, -60, -40, 17510);
    luther(P, L, 10, 18, .46, f.listen ? POSE.raise : POSE.fstand, 17600, { face: f.listen ? 'turned' : 'stern' });
  } else if (i === 4) {   // Caliban's guns turn on the Lion; the duel breaks the world
    ground(P, r, '#3a2010', 17800, 88);
    if (f.guns) for (const x of [-110, 110]) { P.piece(smooth([[x - 14, 90, 1], [x + 14, 90, 1], [x + 8, 30, 1], [x - 8, 30, 1]]), '#3a3c42', { id: 17810 + x, lead: 2.4, matW: 3 }); P.piece(smooth([[x - 2, 30, 1], [x + 2, 30, 1], [x * .2 + 2, -150, 1], [x * .2 - 2, -150, 1]]), '#ffe08a', { id: 17830 + x, lead: 1.6, mat: false }); }
    luther(P, L, 54, 16, -.44, f.duel ? POSE.strike : POSE.raise, 17900, { face: 'turned' });
    lion(P, L, -54, 16, .44, f.duel ? POSE.strike : POSE.guard, 18100, { face: 'turned' });
  } else {   // the Lion gone; Luther chained in the Rock; the Dark Angels hunt the Fallen
    ground(P, r, '#1a1a24', 18300, 92);
    luther(P, L, f.hunt ? -60 : 0, 22, .44, POSE.kneelLow, 18400, { bare: true, face: 'grief' });
    if (f.locked) bars(P, 18600);
    if (f.hunt) drawRig(P, L.translate(70, 18).scale(-.44, .44), DANGEL, POSE.guard, DANGEL_PAL, { id: 18700 });
  }
  P.setTransform(L);
}
