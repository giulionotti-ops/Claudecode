// The Night Haunter: Konrad Curze, Nostramo, the Night Lords, and the assassin he waited for. Six medallions, bottom to top.
import { COL, smooth, circle, brush } from './glass.js';
import { drawRig, POSE } from './figures.js';
import { SON2, SON2_TURNED } from './figures2.js';
import { GUARD, GPOSE } from './cadia.js';
import { CURZE, CURZE_PAL, NIGHTLORD, NIGHTLORD_PAL, ASSASSIN, ASSASSIN_PAL } from './primarchs.js';

function ground(P, r, col, id, y = 82) { P.piece(smooth([[-r - 10, r + 10, 1], [-r - 10, y + 6], [-r * .4, y - 6], [r * .3, y + 4], [r + 10, y - 4], [r + 10, r + 10, 1]]), col, { id, lead: 4.5, matW: 9 }); }
function city(P, r, id, lit = true) {   // the endless night city of Nostramo Quintus
  const T = [[-130, 40, 30], [-96, -10, 26], [-64, 30, 22], [-36, -40, 28], [0, 10, 24], [30, -26, 26], [62, 20, 22], [94, -14, 28], [126, 34, 26]];
  T.forEach(([x, top, w], k) => P.piece(smooth([[x - w / 2, r, 1], [x - w / 2, top, 1], [x, top - 14, 1], [x + w / 2, top, 1], [x + w / 2, r, 1]]), '#1a1e34', { id: id + k, lead: 2.6, matW: 4,
    paint: g => { if (!lit) return; g.fillStyle = 'rgba(255,210,110,.85)'; for (let y = top + 8; y < 80; y += 14) for (const dx of [-w / 4, w / 4]) if ((k + y) % 3) g.fillRect(x + dx - 2, y, 4, 5); } }));
}
function moonless(P, id) { P.piece(circle(70, -80, 18), '#2a2e4a', { id, lead: 2.6, matW: 5 }); }
const curze = (P, L, x, y, s, pose, id, o = {}) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), CURZE, pose, CURZE_PAL, { id, mark: 'curze', face: o.face || 'stern', hide: o.hide });
const lord = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), NIGHTLORD, pose, NIGHTLORD_PAL, { id, mark: 'nightlord' });
const thug = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), GUARD, pose, { kit: '#3a3028', coat: '#4a3a30', fatigue: '#3a3a40', flak: '#3a3a40', flesh: '#b48066', helm: '#3a3028', boot: '#2a2420', gun: '#3a3028' }, { id, face: 'pain', hide: new Set(['helmet', 'vest']) });
const shen = (P, L, x, y, s, pose, id) => drawRig(P, L.translate(x, y).scale(s, Math.abs(s)), ASSASSIN, pose, ASSASSIN_PAL, { id, face: 'stern' });
function bat(P, x, y, s, id) { P.piece(smooth([[x, y], [x - 8 * s, y - 6 * s], [x - 16 * s, y - 2 * s, 1], [x - 10 * s, y + 2 * s], [x, y + 4 * s], [x + 10 * s, y + 2 * s], [x + 16 * s, y - 2 * s, 1], [x + 8 * s, y - 6 * s]]), '#0e0e18', { id, lead: 1.8, mat: false }); }

export const SKY = ['#0e1226', '#141a34', '#1d2a50', '#0e1226', '#2a0e1a', '#1a1024'];
export function medallion(P, L, i, f, r) {
  P.setTransform(L);
  if (i === 0) {   // a child alone on the rooftops of a sunless world, haunted by visions
    moonless(P, 15990); city(P, r, 16000);
    P.piece(smooth([[-r, 60, 1], [r, 56, 1], [r, r, 1], [-r, r, 1]]), '#2a2e40', { id: 16030, lead: 3.4, matW: 6 });   // the rooftop
    curze(P, L, -6, 20, .48, f.pose || POSE.kneelLow, 16100, { face: f.face || 'pain' });
  } else if (i === 1) {   // the hunter in the night
    city(P, r, 16400, false); ground(P, r, '#22263a', 16420, 86);
    thug(P, L, 70, 26, -.38, f.tpose || GPOSE.gAim, 16500); thug(P, L, 112, 34, -.34, f.tpose2 || POSE.stand, 16700);
    curze(P, L, -40, 10, .46, f.pose || POSE.guard, 16900, { face: 'turned' });
    for (let k = 0; k < 3; k++) bat(P, -90 + k * 50, -96 + (k % 2) * 14, 1.4, 16990 + k);
  } else if (i === 2) {   // the Night Lords, ruled by terror
    ground(P, r, '#22263a', 17000, 86);
    if (f.bolt) P.piece(smooth([[40, -130, 1], [16, -70, 1], [34, -68, 1], [6, -10, 1], [24, -60, 1], [6, -62, 1], [26, -130, 1]]), '#e8f0ff', { id: 17005, lead: 2.2, mat: false });
    lord(P, L, -86, 26, .38, POSE.guard, 17100); lord(P, L, 88, 26, -.38, POSE.guard, 17300);
    curze(P, L, 0, 14, .48, f.pose || POSE.stand, 17500, { face: 'stern' });
  } else if (i === 3) {   // Nostramo destroyed from orbit
    P.piece(circle(0, 30, 92), '#141a30', { id: 17700, lead: 4, matW: 10, paint: g => { g.fillStyle = 'rgba(255,200,110,.75)'; for (let k = 0; k < 26; k++) { const a = k * 2.399, rr = 10 + (k * 37) % 76; g.fillRect(Math.cos(a) * rr - 1.5, 30 + Math.sin(a) * rr - 1.5, 3, 3); } } });   // a city-world, lit only by its own lamps
    if (f.lance) for (const [x, y] of [[-110, -110], [0, -128], [110, -110]]) P.piece(smooth([[x - 3, y + 10, 1], [x + 3, y + 10, 1], [x * .2 + 3, 0, 1], [x * .2 - 3, 0, 1]]), '#ffe08a', { id: 17710 + x, lead: 1.6, mat: false });
    for (const [x, y] of [[-110, -110], [0, -128], [110, -110]]) P.piece(smooth([[x - 22, y, 1], [x + 22, y - 2, 1], [x + 28, y + 6, 1], [x - 22, y + 8, 1]]), '#1f2a5a', { id: 17730 + x, lead: 2.2, matW: 3 });   // Night Lords ships
  } else if (i === 4) {   // he joins Horus; then the vision of his own death
    ground(P, r, '#3a1a24', 18000, 88);
    if (f.horus) drawRig(P, L.translate(70, 10).scale(-.44, .44), SON2, POSE.fstand, SON2_TURNED, { id: 18100, face: 'turned' });
    if (f.vision) { P.piece(circle(66, -20, 70), '#4a1a3a', { id: 18050, lead: 3, matW: 10 }); shen(P, L, 66, 20, -.42, f.spose || POSE.stand, 18300); }
    curze(P, L, -56, 12, .46, f.pose || POSE.stand, 18500, { face: f.vision ? 'pain' : 'stern' });
  } else {   // the throne room on Tsagualsa: he waits, and does not run
    P.piece(smooth([[-r, 70, 1], [r, 64, 1], [r, r, 1], [-r, r, 1]]), '#22202c', { id: 18800, lead: 3.4, matW: 6 });
    P.piece(smooth([[-60, 70, 1], [-60, -40, 1], [-80, -90, 1], [-50, -70, 1], [-30, -100, 1], [-20, -60, 1], [10, -60, 1], [20, -100, 1], [30, -70, 1], [60, -90, 1], [40, -40, 1], [40, 70, 1]]), '#2a2238', { id: 18810, lead: 3, matW: 6,
      paint: g => { g.fillStyle = '#ece2c8'; g.beginPath(); g.ellipse(-10, -50, 8, 9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(30,18,10,.9)'; g.fillRect(-15, -53, 4, 4); g.fillRect(-9, -53, 4, 4); } });   // a bat-winged throne with a skull
    curze(P, L, -14, 12, .46, POSE.seated, 18900, { face: 'stern' });
    shen(P, L, f.shenX ?? 150, 26, -.42, f.spose || GPOSE.gStand, 19100);
  }
  P.setTransform(L);
}
