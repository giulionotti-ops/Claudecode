// Character proposal sheet: new detailed figures (top) vs the film's current ones (bottom), lit on a lightbox.
import { makeComp } from './comp.js';
import { Pass, COL, circle } from './glass.js';
import { drawRig, SON, SON_PAL, SON_TURNED, FATHER, FATHER_PAL, POSE, helm } from './figures.js';
import { SON2, SON2_LOYAL, SON2_TURNED, FATHER2, FATHER2_PAL, helm2 } from './figures2.js';
const W = 1920, H = 1500, cv = document.getElementById('gl'); cv.width = W; cv.height = H; const comp = makeComp(cv);
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const L = { G: mk(), S: mk(), R: mk(), O: mk(), P: mk() }, C = {}; for (const k in L) C[k] = L[k].getContext('2d');
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('40px "IM Fell English"');
const P = new Pass(C.G, C.S), I = new DOMMatrix();
C.S.fillStyle = '#2b2622'; C.S.fillRect(0, 0, W, H);
const rows = [{ y: 450, r: 215, s: 1.28 }, { y: 1150, r: 175, s: .9 }];
const X = [240, 720, 1200, 1680];
function roundel(x, y, r, sky, id) { P.setTransform(I); P.piece(circle(x, y, r + 14), COL.gold, { id, lead: 5, mat: false }); P.piece(circle(x, y, r), sky, { id: id + 1, lead: 5, matW: 16 }); }
function inside(x, y, r, fn) { P.save(); P.g.clip(circle(x, y, r)); P.s.clip(circle(x, y, r)); fn(); P.restore(); P.setTransform(I); }
const ground = (x, y, r, col, id) => { P.setTransform(I); P.piece(new Path2D(`M${x - r - 10} ${y + r + 10} L${x - r - 10} ${y + r * .55} Q${x} ${y + r * .45} ${x + r + 10} ${y + r * .58} L${x + r + 10} ${y + r + 10} Z`), col, { id, lead: 4.5, matW: 9 }); };
const sets = [
  [ // proposal
    (x, y, r, s) => drawRig(P, I.translate(x - 40, y + r * .22).scale(s), FATHER2, POSE.reach, FATHER2_PAL, { id: 100, face: 'stern' }),
    (x, y, r, s) => drawRig(P, I.translate(x - 22, y + r * .22).scale(s), SON2, POSE.guard, SON2_LOYAL, { id: 300, face: 'stern' }),
    (x, y, r, s) => drawRig(P, I.translate(x + 10, y + r * .3).scale(-s, s), SON2, POSE.raise, SON2_TURNED, { id: 500, face: 'turned', turned: true }),
    (x, y, r, s) => { for (let k = 0; k < 3; k++) { helm2(P, I, x - 120 + k * 52, y - 30 + (k % 2) * 8, COL.white, 700 + k * 5, 1.9, '#7fdc4a'); helm2(P, I, x + 18 + k * 52, y - 30 + (k % 2) * 8, COL.teal, 760 + k * 5, 1.9, '#ff5a2a'); }
      for (let k = 0; k < 3; k++) { helm2(P, I, x - 96 + k * 52, y + 50, COL.white, 720 + k * 5, 1.9); helm2(P, I, x + 42 + k * 52, y + 50, COL.teal, 780 + k * 5, 1.9, '#ff5a2a'); } },
  ],
  [ // current film
    (x, y, r, s) => drawRig(P, I.translate(x - 10, y + r * .3).scale(s), FATHER, POSE.reach, FATHER_PAL, { id: 900, face: 'stern' }),
    (x, y, r, s) => drawRig(P, I.translate(x, y + r * .3).scale(s), SON, POSE.guard, SON_PAL, { id: 1100, face: 'stern' }),
    (x, y, r, s) => drawRig(P, I.translate(x, y + r * .3).scale(-s, s), SON, POSE.raise, SON_TURNED, { id: 1300, face: 'turned' }),
    (x, y, r, s) => { for (let k = 0; k < 6; k++) helm(P, I, x - 110 + k * 44, y + (k % 2) * 10, k < 3 ? COL.steel : COL.ruby, 1500 + k * 5, 1.6); },
  ],
];
const skies = [COL.deepblue, COL.cobalt, COL.purple2, COL.deepblue], grounds = [COL.olive, COL.green2, COL.brown, COL.brown];
rows.forEach((row, ri) => X.forEach((x, i) => { roundel(x, row.y, row.r, skies[i], 2000 + ri * 100 + i * 10); inside(x, row.y, row.r, () => { ground(x, row.y, row.r, grounds[i], 2005 + ri * 100 + i * 10); sets[ri][i](x, row.y, row.r, row.s); }); }));
// labels (overlay)
const O = C.O; O.textAlign = 'center'; O.fillStyle = '#e9dcc0';
O.font = '600 40px Cinzel'; O.fillText('PROPOSAL: DETAILED FIGURES', W / 2, 70); O.fillText('CURRENT FILM', W / 2, 860);
O.font = '30px "IM Fell English"';
['The Emperor: gilded armour, laurel, red cloak, sword of fire', 'Horus, loyal: white power armour, pelt, mace', 'Horus, fallen: sea-green and gold, burning eye', 'Legion helms: lensed, grilled; loyal and traitor']
  .forEach((t, i) => { const words = t.split(': '); O.fillText(words[0], X[i], rows[0].y + rows[0].r + 60); O.font = '24px "IM Fell English"'; O.fillText(words[1] || '', X[i], rows[0].y + rows[0].r + 92); O.font = '30px "IM Fell English"'; });
['The Emperor', 'Horus, loyal', 'Horus, fallen', 'Legion helms'].forEach((t, i) => O.fillText(t, X[i], rows[1].y + rows[1].r + 56));
comp.render(L, { cam: [W / 2, H / 2, 1], lb: true, haze: .25, amb: .5, raysK: 0, expo: 1.0, bloom: .45, vign: .2, lancets: [], pts: [] });
window.DUR = 1; window.render = () => {}; window.READY = true;
