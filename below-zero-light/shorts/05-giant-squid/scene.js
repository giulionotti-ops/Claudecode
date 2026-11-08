// Short #5: The giant squid. Comparisons: the squid next to a bus, a dinner plate, its hearts and brain, its enemy.
import * as D from '../../lib/draw.js';
import { setup } from '../../lib/kit.js';
const { C, clamp, lerp, ss, seg } = D;
const { g, TL, LN, T0, word, vis, label, bigNum, finish, W, H } = await setup();

const CARDS = ['KRAKEN', '~12 m', '27 cm', '3 ♥', 'BRAIN', '2004', '2012', 'RIVAL', 'SCARS', ''];
const SUB = ['ARCHITEUTHIS DUX', 'LENGTH · AS LONG AS A BUS', 'EYE · BIGGEST IN THE ANIMAL KINGDOM', 'HEARTS · BLUE BLOOD', 'WRAPPED AROUND THE THROAT', 'FIRST PHOTOS ALIVE · JAPAN', 'FIRST VIDEO IN ITS HABITAT', 'SPERM WHALE', 'SUCKER MARKS ON WHALE SKIN', ''];
const lineAt = t => { let k = 0; for (let i = 0; i < LN.length; i++) if (t >= T0(i) - .45) k = i; return k; };
function card(t, a) {
  const i = lineAt(t); if (!CARDS[i]) return; const k = ss(seg(t, T0(i) - .45, T0(i) + .1));
  bigNum(CARDS[i], 300 + (1 - k) * 30, a * k, 140);
  label(SUB[i], 545, 410, 26, a * k * .9, 'rgba(111,246,255,.85)', 'center', 6);
  label('SPECIMEN FILE · DEEP SEA', 540, 150, 20, a * .55, 'rgba(233,251,255,.6)', 'center', 3);
}
function heart(x, y, s, a, beat) {
  const k = 1 + .12 * beat; const p = new Path2D(); p.moveTo(0, s * .35); p.bezierCurveTo(-s * .9, -s * .2, -s * .4, -s * .9, 0, -s * .35); p.bezierCurveTo(s * .4, -s * .9, s * .9, -s * .2, 0, s * .35);
  g.save(); g.translate(x, y); g.scale(k, k); g.globalAlpha = a; g.fillStyle = 'rgba(60,140,255,.25)'; g.fill(p); g.strokeStyle = '#7fb8ff'; g.lineWidth = 4; g.shadowColor = '#7fb8ff'; g.shadowBlur = 24; g.stroke(p); g.restore();
}

window.render = t => {
  D.water(g, W, H, .8, t, false); D.snow(g, W, H, t * 30, 140, 12, .6);
  { const a = vis(t, 0), k = ss(seg(t, .3, T0(1))); if (a > 0) { D.squid(g, lerp(1250, 620, k), 900, 380, t, a * (.2 + .8 * k)); label('HIC SUNT DRACONES', 540, 1150, 22, a * .5 * k, 'rgba(255,207,107,.8)', 'center', 8); } }
  { const a = vis(t, 1); if (a > 0) { const k = ss(seg(t, T0(1) - .2, T0(1) + 1)); D.bus(g, 540, 1060, 380, a); D.squid(g, 560, 860, 360 * (.4 + .6 * k), t, a);
      g.save(); g.globalAlpha = a * .7; g.strokeStyle = 'rgba(233,251,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(160, 1140); g.lineTo(920, 1140); g.stroke(); g.restore(); label('≈ 12 m', 540, 1175, 24, a * .8, C.white); } }
  { const a = vis(t, 2); if (a > 0) { D.eye(g, 540, 880, 300, Math.PI * .6, a); const k = ss(seg(t, word(2, 'plates') - .3, word(2, 'plates') + .4)); g.save(); g.globalAlpha = a * k; g.strokeStyle = 'rgba(233,251,255,.7)'; g.setLineDash([12, 10]); g.lineWidth = 3; g.beginPath(); g.arc(540, 880, 330, 0, 7); g.stroke(); g.restore(); label('DINNER PLATE', 540, 1240, 22, a * k, C.white); } }
  { const a = vis(t, 3); if (a > 0) { for (let i = 0; i < 3; i++) { const b = Math.max(0, Math.sin(t * 7 - i * 1.2)) ** 6; heart(330 + i * 210, 880 - (i === 1 ? 50 : 0), i === 1 ? 110 : 80, a * ss(seg(t, T0(3) + i * .3, T0(3) + i * .3 + .4)), b); }
      const k = ss(seg(t, word(3, 'blue') - .2, word(3, 'blue') + .4)); D.orb(g, 540, 1080, 22, a * k, '110,170,255'); label('HEMOCYANIN · COPPER', 540, 1150, 22, a * k, '#9cc8ff'); } }
  { const a = vis(t, 4); if (a > 0) {   // throat tube passing through a ring-shaped brain; a morsel travels through
      g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(233,251,255,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(180, 860); g.lineTo(900, 860); g.moveTo(180, 940); g.lineTo(900, 940); g.stroke(); g.restore();
      g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'lighter'; g.strokeStyle = C.pink; g.shadowColor = C.pink; g.shadowBlur = 30; g.lineWidth = 34; g.beginPath(); g.ellipse(540, 900, 60, 130, 0, 0, 7); g.stroke(); g.restore();
      const k = seg(t, word(4, 'everything') - .3, LN[4].t1); if (k > 0 && k < 1) D.orb(g, lerp(180, 900, k), 900, 16, a, '255,207,107');
      label('BRAIN', 540, 720, 24, a, C.pink); label('THROAT', 230, 1000, 20, a * .7, 'rgba(233,251,255,.7)', 'left'); } }
  { const a = vis(t, 5); if (a > 0) { const w4 = word(5, '2004'), f = t < w4 ? 0 : Math.max(0, 1 - (t - w4) / .3); g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(233,251,255,.8)'; g.lineWidth = 3; g.strokeRect(220, 640, 640, 520); g.restore(); D.squid(g, 600, 900, 260, t * .3, a); label('900 m DOWN · OGASAWARA', 540, 1200, 22, a * .8); if (f > 0) { g.fillStyle = `rgba(255,255,255,${f * .8 * a})`; g.fillRect(0, 0, W, H); } } }
  { const a = vis(t, 6); if (a > 0) { g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(233,251,255,.6)'; g.lineWidth = 3; for (const [x, y, dx, dy] of [[200, 620, 1, 1], [880, 620, -1, 1], [200, 1180, 1, -1], [880, 1180, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * 60); g.lineTo(x, y); g.lineTo(x + dx * 60, y); g.stroke(); } g.restore();
      D.orb(g, 250, 670, 10, a * (Math.floor(t * 2) % 2 ? 1 : .2), '255,90,90'); label('REC', 280, 670, 22, a, 'rgba(255,140,140,.9)', 'left', 4); D.squid(g, lerp(800, 480, seg(t, T0(6), LN[6].t1 + 1)), 900, 300, t, a); } }
  { const a = vis(t, 7, 8); if (a > 0) { D.spermWhale(g, lerp(560, 500, seg(t, T0(7), LN[8].t1)), 860, 420, a); D.squid(g, 640, 1080, 200, t * 1.5, a * (t < T0(8) - .3 ? 1 : .4));
      const k = ss(seg(t, T0(8), T0(8) + 1.5)); if (k > 0) { const r = D.rng(2); for (let i = 0; i < 14; i++) { const x = 300 + r() * 320, y = 820 + r() * 70, rr = 6 + r() * 12; g.save(); g.globalAlpha = a * clamp(k * 2 - r()); g.strokeStyle = 'rgba(233,251,255,.85)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); g.restore(); } } } }
  { const a = vis(t, 9); if (a > 0) { const k = seg(t, T0(9), TL.end); D.squid(g, lerp(560, 760, k), 900, 380, t, a * (1 - k * .85)); D.orb(g, lerp(560, 760, k) - 380 * .17, 900 - 8, 12, a, '220,250,255'); } }
  card(t, ss(seg(t, .1, .7)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3))));
  finish(t);
};
window.DUR = TL.dur; window.READY = true;
