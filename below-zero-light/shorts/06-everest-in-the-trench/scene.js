// Short #6: Everest in the Mariana Trench. A true-scale cross-section: Everest slides into the trench.
import * as D from '../../lib/draw.js';
import { setup } from '../../lib/kit.js';
const { C, clamp, lerp, ss, seg } = D;
const { g, TL, LN, T0, word, vis, label, bigNum, finish, W, H } = await setup();
const SEA = 520, PX = (1250 - SEA) / 10935, Y = m => SEA + m * PX;   // metres below sea level -> screen y (same scale for Everest)
const EV = 8849 * PX, TX = 660;
const CARDS = [['8,849 m', 'MOUNT EVEREST'], ['10,935 m', 'MARIANA TRENCH · W. PACIFIC'], ['8,849 m', 'EVEREST · HEIGHT'], ['10,935 m', 'CHALLENGER DEEP · DEPTH'], ['2,086 m', 'OF WATER ABOVE THE SUMMIT'], ['2,550 km', 'TRENCH LENGTH'], ['8 t / in²', 'PRESSURE AT THE BOTTOM'], ['LIFE', 'AMPHIPODS'], ['1960', 'TRIESTE · PICCARD & WALSH'], ['SPACE > DEEP', 'PEOPLE WHO HAVE BEEN THERE']];
const lineAt = t => { let k = 0; for (let i = 0; i < LN.length; i++) if (t >= T0(i) - .45) k = i; return k; };
function card(t, a) { const i = lineAt(t), k = ss(seg(t, T0(i) - .45, T0(i) + .1)); bigNum(CARDS[i][0], 300 + (1 - k) * 30, a * k, CARDS[i][0].length > 9 ? 110 : 140); label(CARDS[i][1], 545, 410, 26, a * k * .9, 'rgba(111,246,255,.85)', 'center', 6); }
function everest(x, a) { if (a <= 0) return; g.save(); g.translate(x, 1250); g.scale(.32, 1); D.mountain(g, 0, 0, EV, a); g.restore(); }
function section(a) {   // sea surface, water, sea floor and the trench, all to scale
  if (a <= 0) return; g.save(); g.globalAlpha = a;
  const fl = new Path2D(); fl.moveTo(0, Y(5800)); fl.lineTo(380, Y(6000)); fl.lineTo(560, Y(9500)); fl.lineTo(TX - 30, Y(10935)); fl.lineTo(TX + 30, Y(10935)); fl.lineTo(780, Y(9000)); fl.lineTo(920, Y(6200)); fl.lineTo(W, Y(6000)); fl.lineTo(W, H); fl.lineTo(0, H); fl.closePath();
  const wg = g.createLinearGradient(0, SEA, 0, 1250); wg.addColorStop(0, 'rgba(30,120,140,.35)'); wg.addColorStop(1, 'rgba(3,12,20,.2)'); g.fillStyle = wg; g.fillRect(0, SEA, W, 1250 - SEA);
  g.fillStyle = '#02080c'; g.fill(fl); g.strokeStyle = 'rgba(111,246,255,.6)'; g.lineWidth = 2.5; g.shadowColor = C.glow; g.shadowBlur = 12; g.stroke(fl); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(220,255,255,.8)'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, SEA + Math.sin(x * .02) * 4); g.stroke();
  g.restore(); label('SEA LEVEL', 60, SEA - 22, 18, a * .7, 'rgba(233,251,255,.7)', 'left', 3);
}
function ruler(x, m0, m1, text, a, side = 1) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = C.amber; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, Y(m0)); g.lineTo(x, Y(m1)); g.moveTo(x - 12, Y(m0)); g.lineTo(x + 12, Y(m0)); g.moveTo(x - 12, Y(m1)); g.lineTo(x + 12, Y(m1)); g.stroke(); g.restore(); label(text, x + side * 22, (Y(m0) + Y(m1)) / 2, 24, a, C.amber, side > 0 ? 'left' : 'right', 3); }

window.render = t => {
  D.water(g, W, H, .75, t, false); D.snow(g, W, H, t * 20, 90, 3, .4);
  const secA = vis(t, 1, 4) * 1, slide = ss(seg(t, T0(4) - .3, T0(4) + 1.6));
  section(secA);
  { const a = vis(t, 0); everest(540, a); label('▲ 8,849 m', 540, 1250 - EV - 30, 22, a * .8, C.white); }
  { const a = vis(t, 2, 4); everest(lerp(220, TX, slide), a * .95); if (t < T0(4)) ruler(70, -8849 + 10935, 10935, '8,849 m', vis(t, 2) * ss(seg(t, T0(2), T0(2) + .8)), 1); }
  ruler(1010, 0, 10935, '10,935 m', vis(t, 3) * ss(seg(t, T0(3), T0(3) + 1)), -1);
  { const a = vis(t, 3, 4); if (a > 0) { D.orb(g, TX, Y(10935) - 6, 9, a, '255,207,107'); label('CHALLENGER DEEP', TX, Y(10935) + 34, 20, a * .9, C.amber); } }
  { const a = vis(t, 4) * ss(seg(t, T0(4) + 1.2, T0(4) + 2)); ruler(TX + 150, 0, 10935 - 8849, '2,086 m', a, 1); }
  { const a = vis(t, 5); if (a > 0) { const k = ss(seg(t, T0(5) + .2, T0(5) + 1.6)), k2 = ss(seg(t, word(5, 'london') - .3, word(5, 'london') + .8));
      const bar = (y, f, col, txt) => { g.save(); g.globalAlpha = a; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 20; g.fillRect(120, y - 14, 840 * f, 28); g.restore(); label(txt, 120, y - 44, 22, a, col, 'left', 3); };
      bar(820, k, C.glow, 'MARIANA TRENCH · 2,550 km'); bar(1000, k2 * 2500 / 2550, C.amber, 'LONDON → MOSCOW · ~2,500 km'); } }
  { const a = vis(t, 6); if (a > 0) { const k = ss(seg(t, T0(6), T0(6) + 1)); g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(233,251,255,.8)'; g.lineWidth = 3; g.strokeRect(440, 1000, 200, 200); g.fillStyle = 'rgba(255,207,107,.15)'; g.strokeStyle = C.amber; g.shadowColor = C.amber; g.shadowBlur = 20;
      const by = lerp(560, 800, k); g.fillRect(380, by, 320, 200); g.strokeRect(380, by, 320, 200); g.restore(); label('8 TONNES', 540, by + 100, 36, a, C.amber, 'center', 4); label('1 SQUARE INCH', 540, 1240, 20, a * .8, 'rgba(233,251,255,.8)'); } }
  { const a = vis(t, 7); if (a > 0) { D.amphipod(g, 560, 900, 180, t, a); label('AMPHIPOD · A FEW CM LONG', 540, 1180, 22, a * .8, C.pink); } }
  { const a = vis(t, 8); if (a > 0) { const k = ss(seg(t, T0(8) - .3, LN[8].t1 + .5)); D.trieste(g, 540, lerp(640, 1000, k), 230, a); label('BATHYSCAPHE TRIESTE', 540, 1200, 22, a * .8); } }
  { const a = vis(t, 9); if (a > 0) { const k = ss(seg(t, T0(9), T0(9) + 2));
      label('SPACE', 120, 640, 24, a, C.white, 'left', 6); const r = D.rng(6); for (let i = 0; i < 230; i++) D.orb(g, 130 + (i % 25) * 33, 690 + Math.floor(i / 25) * 33, 5, a * clamp(k * 1.6 - r() * .6), '233,251,255');
      label('BOTTOM OF THE TRENCH', 120, 1040, 24, a, C.amber, 'left', 6); for (let i = 0; i < 10; i++) D.orb(g, 130 + i * 33, 1090, 5, a * clamp(k * 3 - i * .1), '255,207,107');
      label('EACH DOT ≈ 3 PEOPLE', 540, 1180, 18, a * .6, 'rgba(233,251,255,.6)'); } }
  card(t, ss(seg(t, .1, .7)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3))));
  finish(t);
};
window.DUR = TL.dur; window.READY = true;
