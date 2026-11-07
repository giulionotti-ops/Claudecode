// Short #1: Voyager 1 reaches one light-day. Idea: a light-travel-time counter, then a two-day "hello",
// and at the end the light-day shrinks to one tick on the road to the nearest star.
import { setup } from '../../lib/kit.js';
const K = await setup(), { g, TL, LN, T0, word, vis, label, big, D, C, lerp, ss, seg, clamp, W, H } = K;

const CARDS = [
  t => { const h = 24 * ss(seg(t, .6, T0(1) - .6)); return [`${String(Math.floor(h)).padStart(2, '0')}h ${String(Math.floor(h % 1 * 60)).padStart(2, '0')}m`, 'LIGHT-TRAVEL TIME']; },
  () => ['1977', 'LAUNCHED · 5 SEPTEMBER'],
  () => ['17 km/s', 'ABOUT 61,000 KM/H'],
  t => [`${(lerp(25.0, 25.9, ss(seg(t, T0(3), word(3, 'billion'))))).toFixed(1)} bn km`, 'ONE LIGHT-DAY · 18 NOV 2026', 120],
  () => ['2 DAYS', 'HELLO → REPLY'],
  () => ['~22 W', 'TRANSMITTER POWER'],
  () => ['2 / 10', 'INSTRUMENTS STILL ON'],
  () => ['GOLDEN', 'RECORD · SOUNDS OF EARTH', 120],
  () => ['?', 'NEAREST STAR · PROXIMA CENTAURI'],
  t => [D.fmtNum(lerp(1, 1549, ss(seg(t, T0(9), word(9, 'hundred') + .3)))), 'LIGHT-DAYS AWAY'],
];

function earth(x, y, r, a) { D.planet(g, x, y, r, { base: ['#5fa8ff', '#08142e'], light: -.6, atmo: '159,216,255', a }); }

function opening(t, a) {   // light leaves Earth and crawls toward the probe
  if (a <= 0) return; const k = seg(t, .6, T0(1) - .6);
  earth(190, 1130, 105, a); D.probe(g, 830, 720, 150, t, a, -.2);
  g.save(); g.globalAlpha = a * .4; g.strokeStyle = 'rgba(255,196,107,.4)'; g.setLineDash([4, 14]); g.lineWidth = 2; g.beginPath(); g.moveTo(280, 1080); g.lineTo(760, 760); g.stroke(); g.restore();
  D.beam(g, 280, 1080, 760, 760, k, a);
  label('EARTH', 190, 1270, 24, a * .8); label('VOYAGER 1', 800, 900, 24, a * .8);
}
function hero(t, a) { if (a <= 0) return; D.probe(g, 600 + Math.sin(t * .3) * 10, 960, 280, t, a, -.15 + Math.sin(t * .2) * .03); label('VOYAGER 1', 540, 1240, 28, a * ss(seg(t, T0(1) + .3, T0(1) + 1))); }
function cruise(t, a) {   // the Sun shrinking behind as it flies
  if (a <= 0) return; const k = seg(t, T0(2) - .5, T0(3));
  D.sun(g, lerp(320, 140, k), lerp(1000, 1100, k), lerp(70, 8, ss(k)), t, a);
  D.probe(g, 720, 840, 200, t, a, -.2);
  for (let i = 0; i < 14; i++) { const y = 560 + i * 52, x = ((i * 397 - t * 900) % 1300 + 1300) % 1300 - 100; g.save(); g.globalAlpha = a * .25; g.strokeStyle = C.cream; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 70, y); g.stroke(); g.restore(); }
}
function ruler(t, a) {   // Sun → probe, distance filling up to one light-day
  if (a <= 0) return; const x0 = 120, x1 = 900, y = 900, k = ss(seg(t, T0(3), word(3, 'billion') + .2));
  D.sun(g, x0, y, 26, t, a);
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,243,220,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 40, y); g.lineTo(x1, y); g.stroke();
  for (let i = 0; i <= 24; i++) { const x = lerp(x0 + 40, x1, i / 24); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (i % 6 ? 10 : 24)); g.stroke(); } g.restore();
  ['0h', '6h', '12h', '18h', '24h'].forEach((s, i) => label(s, lerp(x0 + 40, x1, i / 4), y + 54, 20, a * .7));
  const px = lerp(x0 + 60, x1, k); D.probe(g, px, y - 90, 70, t, a, -.2);
  const hit = ss(seg(t, word(3, 'light-day') - .2, word(3, 'light-day') + .4));
  label('1 LIGHT-DAY', x1 - 10, y - 200, 26, a * hit, C.gold, 'right', 4);
  D.glow(g, x1, y, 10, a * hit);
}
function hello(t, a) {   // a message out, a reply back, with a day clock
  if (a <= 0) return; const xE = 170, xV = 900, y = 880, t0 = T0(4), mid = word(4, 'answer'), end = LN[4].t1;
  earth(xE, y, 80, a); D.probe(g, xV, y, 110, t, a, -.2);
  const out = ss(seg(t, t0, mid - .2)), back = ss(seg(t, mid, end));
  if (out < 1) D.beam(g, xE + 60, y, xV - 40, y, out, a, '255,196,107', 10);
  if (back > 0) D.beam(g, xV - 40, y + 30, xE + 60, y + 30, back, a, '159,216,255', 10);
  label('"HELLO"', lerp(xE + 60, xV - 40, out), y - 70, 22, a * (1 - back), C.gold);
  if (back > 0) label('REPLY', lerp(xV - 40, xE + 60, back), y + 100, 22, a, C.ice);
  label(`DAY ${back > 0 ? 2 : 1}`, 540, 1150, 30, a, 'rgba(255,243,220,.9)', 'center', 8);
}
function radio(t, a) {   // a fridge bulb vs a giant dish
  if (a <= 0) return; const k = ss(seg(t, word(5, 'dishes') - .3, word(5, 'dishes') + .5));
  // bulb
  g.save(); g.globalAlpha = a; g.translate(300, 820); g.scale(1.5, 1.5); g.strokeStyle = C.gold; g.lineWidth = 3; g.shadowColor = C.gold; g.shadowBlur = 10;
  g.beginPath(); g.arc(0, 0, 55, Math.PI * .8, Math.PI * 2.2); g.lineTo(26, 70); g.lineTo(-26, 70); g.closePath(); g.stroke(); g.strokeRect(-26, 72, 52, 30); g.restore();
  D.glow(g, 300, 812, 44, a * (.6 + .2 * Math.sin(t * 6)), '255,236,190'); label('FRIDGE BULB', 300, 1030, 24, a * .8);
  D.dish(g, 770, 760, 250 * (.8 + .2 * k), a * (.3 + .7 * k), -.5); label('70 m DISH', 770, 1030, 24, a * k);
  for (let i = 0; i < 3; i++) { const r = ((t * 120 + i * 60) % 180); g.save(); g.globalAlpha = a * k * (1 - r / 180) * .6; g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.arc(1000, 520, 40 + r, Math.PI * .6, Math.PI * 1.05); g.stroke(); g.restore(); }
}
function instruments(t, a) {
  if (a <= 0) return; const names = ['CAMERAS', 'INFRARED', 'ULTRAVIOLET', 'PHOTOPOLARIMETER', 'PLANETARY RADIO', 'RADIO SCIENCE', 'COSMIC RAYS', 'LOW-ENERGY PARTICLES', 'PLASMA WAVES', 'MAGNETOMETER'];
  const k = seg(t, T0(6), LN[6].t1);
  names.forEach((n, i) => { const off = i < 8 && k > (i + 1) / 10, y = 590 + i * 66;
    label(n, 250, y, 30, a * (off ? .35 : .95), off ? 'rgba(255,243,220,.6)' : C.cream, 'left', 4);
    if (off) { g.save(); g.globalAlpha = a * .5; g.strokeStyle = 'rgba(255,243,220,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(200, y, 11, 0, 7); g.stroke(); g.restore(); } else D.glow(g, 200, y, 11, a, '255,196,107');
  });
}
function record(t, a) {   // the golden record, spinning
  if (a <= 0) return; const cx = 540, cy = 860, R = 280; g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(cx - 80, cy - 80, 20, cx, cy, R); gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(.6, '#c48a2c'); gr.addColorStop(1, '#6a4410');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(60,30,0,.25)'; g.lineWidth = 1; for (let r = 70; r < R - 6; r += 6) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
  g.save(); g.translate(cx, cy); g.rotate(t * .8); g.globalCompositeOperation = 'lighter'; const sh = g.createConicGradient(0, 0, 0); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(.1, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.18)'); sh.addColorStop(.6, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.25)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.restore();
  g.fillStyle = '#3a2408'; g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
  g.restore(); label('55 LANGUAGES · 90 MIN OF MUSIC', 540, 1190, 22, a * .8);
}
function road(t, a) {   // one light-day vs the nearest star
  if (a <= 0) return; const x0 = 110, x1 = 950, y = 900, k = ss(seg(t, T0(9), word(9, 'hundred') + .3)), zoom = ss(seg(t, T0(8) + 1, T0(9)));
  earth(x0, y, lerp(50, 14, zoom), a);
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,243,220,.4)'; g.lineWidth = 2; g.setLineDash([4, 10]); g.beginPath(); g.moveTo(x0 + 20, y); g.lineTo(x1, y); g.stroke(); g.restore();
  const vx = lerp(x0 + 200, x0 + 21, zoom); D.glow(g, vx, y, 6, a); label('VOYAGER', vx, y - 50, 20, a * .9, C.gold);
  const star = ss(seg(t, word(8, 'nearest') - .2, word(8, 'nearest') + .5)); D.glow(g, x1, y, 22, a * star, '255,170,130'); D.spike(g, x1, y, 60, a * star * .7);
  label('PROXIMA', x1 - 10, y - 70, 22, a * star, C.cream, 'right');
  const yrs = ss(seg(t, word(9, 'seventy') - .3, word(9, 'seventy') + .5)); if (k > 0) big('75,000 YEARS', 540, 1150, 70, a * yrs);
}

K.frame(t => {
  D.sky(g, W, H, t, 1, -.6); D.stars(g, W, H, t * 14 + (t > T0(2) - .5 && t < T0(3) ? (t - T0(2)) * 60 : 0), 240, 5, .9, 1, t);
  opening(t, vis(t, 0)); hero(t, vis(t, 1)); cruise(t, vis(t, 2)); ruler(t, vis(t, 3)); hello(t, vis(t, 4)); radio(t, vis(t, 5));
  instruments(t, vis(t, 6)); record(t, vis(t, 7)); road(t, vis(t, 8, 9));
}, { cards: CARDS, header: 'VOID ATLAS · FILE 001 · VOYAGER 1' });
