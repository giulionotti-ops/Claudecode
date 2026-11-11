// First and Only: the Tanith Ghosts. The moving forests, the founding under Gaunt, the Chaos fleet, the choice, Tanith burning, the silver knife.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { GUARD, GPOSE } from './cadia.js';

// ---------- the Ghosts: no helmet, dark fatigues, mottled camo cloak and scarf, lasgun or straight-silver knife ----------
const camo = g => { g.fillStyle = 'rgba(30,44,14,.75)'; for (const [x, y, rx, ry] of [[-20, 20, 7, 5], [10, 40, 9, 6], [-28, 80, 8, 6], [22, 96, 7, 5], [-6, 120, 10, 6], [-30, 140, 7, 5], [18, 140, 8, 5], [0, 70, 6, 4]]) { g.beginPath(); g.ellipse(x, y, rx, ry, .3, 0, 7); g.fill(); } };
const HAIR = { n: 'hair', p: 'head', at: [0, 0], sh: smooth([[-14, -16], [-16, -32], [-6, -44], [8, -44], [17, -36], [12, -32], [2, -35], [-8, -30], [-10, -16]]), c: 'hair', z: 6.3, lead: 2.6 };
const CLOAK = { n: 'cloak', p: 'torso', at: [0, -80], sh: smooth([[-20, -4], [16, -4], [32, 60], [40, 140], [30, 166, 1], [-42, 168, 1], [-48, 140], [-34, 60]]), c: 'cloak', z: -1, lead: 3.4, paint: camo };
const SCARF = { n: 'scarf', p: 'torso', at: [0, -80], sh: smooth([[-24, -6], [22, -6], [27, 8], [14, 18], [0, 13], [-14, 18], [-27, 8]]), c: 'cloak', z: 5.6, lead: 2.8, paint: g => { g.fillStyle = 'rgba(30,44,14,.7)'; g.beginPath(); g.ellipse(-10, 6, 5, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(12, 4, 4, 3, 0, 0, 7); g.fill(); } };
const KNIFE = { n: 'knife', p: 'handF', at: [2, 8], sh: smooth([[-3, -4, 1], [3, -4, 1], [3.4, 52], [0, 70, 1], [-3.4, 52]]), c: 'steel', z: 9, lead: 2.2, paint: g => { brush(g, [[0, 6], [0, 60]], 1.1, { color: 'rgba(255,255,255,.75)' }); g.fillStyle = 'rgba(40,30,20,.9)'; g.fillRect(-4, -4, 8, 10); } };
const base = GUARD.filter(q => !['helmet', 'vest', 'coat', 'rifle'].includes(q.n));
const RIFLE = GUARD.find(q => q.n === 'rifle');
export const GHOST = [...base, HAIR, CLOAK, SCARF, RIFLE];
export const GHOST_KNIFE = [...base, HAIR, CLOAK, SCARF, KNIFE];
export const GHOST_PAL = { kit: '#3a2e22', fatigue: '#262c3c', flesh: '#b48066', boot: '#16181c', gun: '#2c2c30', hair: '#1c1612', cloak: '#5c7c2a', steel: '#e4ecee' };

// ---------- Ibram Gaunt: black commissar coat with gold trim, red peaked cap with a gold eagle, red sash, camo cloak, sword ----------
const CAP = { n: 'cap', p: 'head', at: [0, 0], sh: smooth([[-15, -27, 1], [-20, -38], [-26, -47], [-6, -52], [18, -50], [27, -42], [20, -29, 1]]), c: 'cap', z: 6.6, lead: 3,
  paint: g => { brush(g, [[-15, -32], [2, -34], [19, -33]], 3, { w0: .5, w1: .5, color: 'rgba(240,190,70,.95)' }); g.fillStyle = 'rgba(240,190,70,.95)'; g.beginPath(); g.moveTo(6, -48); g.lineTo(13, -43); g.lineTo(6, -38); g.lineTo(-1, -43); g.closePath(); g.fill(); } };
const VISOR = { n: 'visor', p: 'head', at: [0, 0], sh: smooth([[8, -32, 1], [30, -28, 1], [27, -23, 1], [8, -26, 1]]), c: 'visor', z: 6.7, lead: 2.4 };
const SASH = { n: 'sash', p: 'torso', at: [0, 0], sh: smooth([[-22, -78, 1], [-8, -82, 1], [24, -14, 1], [12, -4, 1]]), c: 'sash', z: 5.4, lead: 2.6 };
const SWORD = { n: 'sword', p: 'handF', at: [2, 8], sh: smooth([[-3, -4, 1], [3, -4, 1], [3.6, 90], [0, 110, 1], [-3.6, 90]]), c: 'steel', z: 9, lead: 2.2, paint: g => { brush(g, [[0, 6], [0, 100]], 1.1, { color: 'rgba(255,255,255,.75)' }); g.fillStyle = 'rgba(230,180,60,.95)'; g.fillRect(-10, 0, 20, 5); } };
const gold = g => { brush(g, [[-22, -84], [-30, -20], [-32, 80]], 1.6, { w0: .5, w1: .5, color: 'rgba(240,190,70,.9)' }); brush(g, [[20, -84], [28, -20], [30, 80]], 1.6, { w0: .5, w1: .5, color: 'rgba(240,190,70,.9)' }); };
export const GAUNT = [...GUARD.filter(q => !['helmet', 'vest', 'rifle'].includes(q.n)).map(q => q.n === 'coat' ? { ...q, paint: gold } : q), { ...HAIR, c: 'hair' }, CLOAK, SCARF, CAP, VISOR, SASH, SWORD];
export const GAUNT_PAL = { kit: '#2a2420', coat: '#18181e', fatigue: '#1e1e26', flesh: '#c09070', boot: '#121214', hair: '#c8a060', cloak: '#5c7c2a', cap: '#b0141e', visor: '#121214', sash: '#b0141e', steel: '#e4ecee' };

const ghost = (P, L, x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), o.knife ? GHOST_KNIFE : GHOST, pose, { ...GHOST_PAL, ...(o.pal || {}) }, { id, face: o.face || 'stern' });
const gaunt = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), GAUNT, pose, GAUNT_PAL, { id, face: 'stern' });

// ---------- props ----------
function ground(P, r, col, id, y = 88) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function tree(P, x, top, id, lean = 0, col = '#2a6a30', burnt = false) {
  P.piece(smooth([[x - 7, 92, 1], [x - 6 + lean * .5, top + 40, 1], [x + 6 + lean * .5, top + 40, 1], [x + 7, 92, 1]]), burnt ? '#2a2420' : '#4a3020', { id, lead: 2.4, matW: 3 });
  if (burnt) P.piece(smooth([[x - 9, top + 44, 1], [x - 3, top + 30, 1], [x + 2, top + 40, 1], [x + 8, top + 26, 1], [x + 10, top + 46, 1]]), '#ff7a2a', { id: id + 2, lead: 1.8, mat: false });
  if (!burnt) P.piece(smooth([[x - 34 + lean, top + 56, 1], [x + lean, top - 20, 1], [x + 34 + lean, top + 56, 1]]), col, { id: id + 1, lead: 2.6, matW: 5, paint: g => brush(g, [[x + lean - 14, top + 30], [x + lean, top + 20], [x + lean + 14, top + 30]], 1.4, { color: 'rgba(20,40,14,.6)' }) });
}
function chaosShip(P, x, y, s, id) {
  const q = (a, b, c) => [x + a * s, y + b * s, c];
  P.piece(smooth([q(-40, 0, 1), q(-20, -10, 1), q(-10, -26, 1), q(0, -12, 1), q(16, -22, 1), q(20, -8, 1), q(44, 0, 1), q(20, 10, 1), q(-20, 10, 1)]), '#3a0c14', { id, lead: 2.4, matW: 3 });
  P.piece(smooth([q(-6, -2, 1), q(6, -2, 1), q(6, 4, 1), q(-6, 4, 1)]), '#ff5a2a', { id: id + 1, lead: 1.6, mat: false });
}
function planet(P, x, y, r, id, burn) {
  P.piece(circle(x, y, r), burn ? '#c8401a' : '#2f7f36', { id, lead: 4.5, matW: 10, paint: g => {
    for (let k = 0; k < 5; k++) brush(g, [[x - r * .8, y - r * .6 + k * r * .3], [x, y - r * .5 + k * r * .3 + (k % 2) * 6], [x + r * .8, y - r * .6 + k * r * .3]], 2, { color: burn ? 'rgba(60,10,4,.7)' : 'rgba(14,40,14,.55)' });
    if (burn) for (const [a, b] of [[-.4, -.2], [.3, .1], [-.1, .5], [.5, -.4]]) { g.fillStyle = 'rgba(255,220,120,.9)'; g.beginPath(); g.arc(x + a * r, y + b * r, r * .1, 0, 7); g.fill(); } } });
}
function flames(P, x, y, id, n = 3) { for (let k = 0; k < n; k++) { const cx = x + k * 18 - n * 9; P.piece(smooth([[cx - 10, y], [cx - 6, y - 24], [cx + 2, y - 40 - (k % 2) * 10, 1], [cx + 6, y - 20], [cx + 10, y]]), k % 2 ? '#ff7a2a' : '#ffb040', { id: id + k, lead: 2, mat: false }); } }

export const SKY = ['#1a3a24', '#26301a', '#2a1020', '#3a1a10', '#140e1c', '#1a1a24'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // Tanith: the forests that move; a Ghost walks among them
    const s = f.shift || 0;
    [[-112, -50], [-70, -76], [72, -66], [114, -36], [30, -94]].forEach(([x, top], k) => tree(P, x + (k % 2 ? s : -s), top, 16000 + k * 4, (k % 2 ? 1 : -1) * s * .6, k % 2 ? '#1f5a2a' : '#2a6a30'));
    ground(P, r, '#22381c', 16030, 90);
    ghost(P, L, -8, 30, .56, GPOSE.gStand, 16100);
  } else if (i === 1) {   // the founding: the Tanith regiments, and Colonel-Commissar Gaunt
    ground(P, r, '#2a3420', 16500, 92);
    tree(P, -120, -60, 16510); tree(P, 118, -50, 16515, 0, '#1f5a2a');
    for (let k = 0; k < 3; k++) ghost(P, L, -100 + k * 36, 44 + (k % 2) * 4, .43, GPOSE.gStand, 16600 + k * 300);
    if (f.gaunt) gaunt(P, L, 72, 30, -.56, f.salute ? POSE.raise : POSE.guard, 17600);
  } else if (i === 2) {   // the Chaos fleet breaks through over the forests
    ground(P, r, '#1a2a18', 17800, 96);
    for (let k = 0; k < 6; k++) tree(P, -120 + k * 48, -6 + (k % 2) * 12, 17810 + k * 4, 0, k % 2 ? '#1f5a2a' : '#2a6a30');
    if (f.fleet) [[-70, 0, 1], [10, -24, 1.3], [80, 8, .9], [-20, 40, .8]].forEach(([x, y, s], k) => chaosShip(P, x, (f.shipY ?? -80) + y - 20, s, 17900 + k * 4));
  } else if (i === 3) {   // the choice: Gaunt orders the regiment off-world
    ground(P, r, '#2a1a10', 18300, 92);
    if (f.fire) { flames(P, -100, 92, 18310, 3); flames(P, 104, 92, 18320, 3); }
    tree(P, -110, -40, 18330, 0, '#1f5a2a', f.fire); tree(P, 112, -30, 18335, 0, '#2a6a30', f.fire);
    ghost(P, L, -64, 36, .5, GPOSE.gStand, 18400, { face: 'turned' });
    gaunt(P, L, 34, 28, .58, f.order ? POSE.raise : POSE.fstand, 18700);
  } else if (i === 4) {   // from orbit: Tanith burns; Rawne swears vengeance on Gaunt
    planet(P, 0, f.rawne ? -66 : -14, f.rawne ? 62 : 92, 19000, f.burn);
    if (!f.rawne) { ghost(P, L, -80, 100, .36, POSE.fstand, 19100, { face: 'grief' }); ghost(P, L, 84, 104, -.34, POSE.fstand, 19400, { face: 'grief' }); }
    else { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, 70, 1], [r + 10, 70, 1], [r + 10, r + 10, 1]]), '#2a2c34', { id: 19050, lead: 4.5, matW: 9 });
      gaunt(P, L, 62, 34, -.5, POSE.fstand, 19700);
      ghost(P, L, -58, 36, .5, f.draw ? POSE.strike : POSE.fstand, 20000, { knife: true, face: 'turned' }); }
  } else {   // the straight-silver knife and the camo cloak: all that is left of Tanith
    ground(P, r, '#1e1c1a', 20300, 98);
    tree(P, -120, -20, 20310, 0, 0, true); tree(P, 124, -10, 20315, 0, 0, true);
    if (f.row) for (let k = 0; k < 4; k++) ghost(P, L, [-108, -70, 70, 108][k], 56, (k < 2 ? .38 : -.38), GPOSE.gStand, 20400 + k * 300, { pal: { cloak: '#4c6a24' } });
    ghost(P, L, 0, 28, .64, f.raise ? GPOSE.gRaise : POSE.fstand, 21800, { knife: true });
  }
  P.setTransform(L);
}
