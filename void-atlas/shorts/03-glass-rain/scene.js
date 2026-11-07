// Short #3: HD 189733 b, the blue planet where it may rain glass sideways. Idea: it starts as a "second Earth",
// then each fact peels the illusion away: tight orbit, heat, wind, glass, and finally the rain turns sideways.
import { setup } from '../../lib/kit.js';
const K = await setup(), { g, TL, LN, T0, word, vis, label, big, D, C, lerp, ss, seg, clamp, W, H } = K;
const BLUE = { base: ['#4f8dff', '#05102e'], bands: 7, bandCol: 'rgba(170,210,255,.06)', atmo: '120,170,255' };

const CARDS = [
  () => ['WARNING', 'HOSTILE WORLD', 120],
  () => ['HD 189733 b', 'GAS GIANT · ~64 LIGHT-YEARS', 96],
  () => ['AZURE', 'COLOUR MEASURED BY HUBBLE', 130],
  () => ['NO OCEANS', 'NOT WATER', 110],
  () => ['2.2 DAYS', 'ONE YEAR THERE'],
  t => [`${D.fmtNum(lerp(20, 1000, ss(seg(t, T0(5), word(5, 'thousand') + .3))))} °C`, 'DAY SIDE', 120],
  t => [`${D.fmtNum(lerp(0, 7000, ss(seg(t, T0(6), word(6, 'thousand') + .3))))} km/h`, 'WINDS · ~6× SPEED OF SOUND', 110],
  () => ['GLASS', 'SILICATE DROPLETS', 130],
  () => ['RAIN', 'FALLING GLASS', 130],
  () => ['SIDEWAYS', 'IN 7,000 KM/H WINDS', 110],
  () => null,
];

function blue(x, y, R, a, t, light = -2.3) { D.planet(g, x, y, R, { ...BLUE, light, spin: t * .3, a }); }
function streaks(t, a, cx, cy, R, speed = 1, n = 40, col = '200,225,255', len = 90, angle = 0) {   // wind / rain lines across a disc area
  const r = D.rng(17); g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, cy); g.rotate(angle);
  for (let i = 0; i < n; i++) { const y = (r() - .5) * 2 * R, w = Math.sqrt(Math.max(0, R * R - y * y)), x = ((r() * 2 * w + t * 900 * speed * (.6 + r() * .8)) % (2 * w + len)) - w - len / 2;
    g.strokeStyle = `rgba(${col},${a * (.25 + .5 * r())})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * (.5 + r()), y); g.stroke(); }
  g.restore();
}
function intro(t, a) {
  if (a <= 0) return; const z = ss(seg(t, 0, T0(1) + .5)); blue(540, 880, lerp(240, 300, z), a, t);
  D.glow(g, 980, 520, 26, a * .9, '255,200,150');
  label('HD 189733 b', 540, 1240, 26, a * ss(seg(t, T0(1), T0(1) + .6)));
}
function twins(t, a) {   // Earth next to it: same blue, very different world
  if (a <= 0) return; const k = ss(seg(t, T0(2) - .3, T0(2) + .6));
  blue(lerp(540, 680, k), 880, lerp(300, 260, k), a, t);
  D.planet(g, 230, 880, 60 * k + .01, { base: ['#5fa8ff', '#08142e'], light: -.6, atmo: '159,216,255', a: a * k });
  label('EARTH', 230, 980, 22, a * k); label('~13 × WIDER', 680, 1200, 22, a * k);
}
function noOcean(t, a) {
  if (a <= 0) return; blue(540, 880, 300, a * .6, t);
  const k = ss(seg(t, word(3, 'oceans') - .3, word(3, 'oceans') + .3));
  g.save(); g.globalAlpha = a; g.strokeStyle = C.ice; g.lineWidth = 6; g.lineCap = 'round'; g.shadowColor = C.ice; g.shadowBlur = 12;
  for (let r = 0; r < 3; r++) { g.beginPath(); for (let x = -150; x <= 150; x += 5) g.lineTo(540 + x, 820 + r * 60 + Math.sin(x / 30 + t * 3) * 14); g.stroke(); }
  g.strokeStyle = C.red; g.shadowColor = C.red; g.lineWidth = 10; g.globalAlpha = a * k; g.beginPath(); g.moveTo(380, 720); g.lineTo(380 + 320 * k, 720 + 320 * k); g.moveTo(700, 720); g.lineTo(700 - 320 * k, 720 + 320 * k); g.stroke(); g.restore();
}
function orbit(t, a) {   // tight orbit; Earth's faint for scale
  if (a <= 0) return; const cx = 540, cy = 880;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(120,170,255,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 150, 150, 0, 0, 7); g.stroke(); g.restore();
  D.sun(g, cx, cy, 55, t, a);
  const th = (t - T0(4)) * 2.8; blue(cx + Math.cos(th) * 150, cy + Math.sin(th) * 150, 22, a, t, th + Math.PI);
  label('ONE LAP · 2.2 DAYS', cx, cy + 230, 26, a, C.ice); label('(EARTH: 365 DAYS)', cx, cy + 280, 22, a * .6, 'rgba(255,243,220,.7)');
}
function heat(t, a) {   // day side glowing hot, a gauge filling up
  if (a <= 0) return; const k = ss(seg(t, T0(5), word(5, 'thousand') + .3));
  D.sun(g, 80, 880, 120, t, a); blue(640, 880, 280, a, t, Math.PI);
  g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.arc(640, 880, 280, 0, 7); g.clip();
  const gr = g.createRadialGradient(360, 880, 0, 360, 880, 420); gr.addColorStop(0, `rgba(255,110,60,${.55 * k * a})`); gr.addColorStop(1, 'rgba(255,110,60,0)'); g.fillStyle = gr; g.fillRect(340, 580, 600, 600); g.restore();
  label('DAY', 470, 880, 24, a * k, C.cream); label('NIGHT', 800, 880, 24, a * .6, 'rgba(255,243,220,.6)');
}
function wind(t, a) { if (a <= 0) return; blue(540, 880, 300, a, t); streaks(t, a, 540, 880, 300, 1.6, 50); D.glow(g, 990, 520, 20, a * .8, '255,200,150'); }
function glass(t, a, mode) {   // close-up: glass droplets in blue haze. mode 0 = floating, 1 = falling, 2 = sideways
  if (a <= 0) return; const r = D.rng(29);
  g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(0, 420, 0, 1400); gr.addColorStop(0, 'rgba(40,80,190,0)'); gr.addColorStop(.2, 'rgba(40,80,190,.5)'); gr.addColorStop(.8, 'rgba(20,40,120,.45)'); gr.addColorStop(1, 'rgba(10,20,70,0)'); g.fillStyle = gr; g.fillRect(0, 420, W, 980); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter';
  const tt = t - T0(7 + mode);
  for (let i = 0; i < 110; i++) {
    const z = r(), bx = r() * W, by = 500 + r() * 800, sp = 300 + z * 600;
    let x = bx, y = by, dx = 0, dy = 0;
    if (mode === 0) { x += Math.sin(t + i) * 12; y += Math.cos(t * .8 + i) * 10; }
    if (mode === 1) { y = 500 + ((by - 500 + tt * sp) % 800); dy = 18 + z * 30; }
    if (mode === 2) { x = ((bx + tt * sp * 3) % (W + 200)) - 100; dx = 60 + z * 140; y = by + tt * 40; y = 500 + ((y - 500) % 800); }
    const s = 1.5 + z * 4, al = a * (.4 + .6 * z);
    if (dx || dy) { g.strokeStyle = `rgba(200,230,255,${al * .7})`; g.lineWidth = s * .8; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x, y); g.stroke(); }
    g.fillStyle = `rgba(220,240,255,${al})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    if (z > .85) D.spike(g, x, y, s * 5, al * .6, '200,230,255');
  }
  g.restore();
  if (mode === 0) label('TINY DROPS OF SILICATE GLASS', 540, 1240, 22, a * .8);
}
function finale(t, a) { if (a <= 0) return; blue(540, 880, 300, a, t); streaks(t, a * .9, 540, 880, 300, 2.2, 70, '220,240,255', 60, 0); D.glow(g, 990, 520, 20, a * .8, '255,200,150'); label('IT MAY BE RAINING GLASS RIGHT NOW', 540, 1240, 22, a * ss(seg(t, T0(10) + .5, T0(10) + 1.2))); }

K.frame(t => {
  D.sky(g, W, H, t, .9, -.3); D.stars(g, W, H, t * 8, 220, 33, .8, 1, t);
  intro(t, vis(t, 0, 1)); twins(t, vis(t, 2)); noOcean(t, vis(t, 3)); orbit(t, vis(t, 4)); heat(t, vis(t, 5)); wind(t, vis(t, 6));
  glass(t, vis(t, 7), 0); glass(t, vis(t, 8), 1); glass(t, vis(t, 9), 2); finale(t, vis(t, 10));
}, { cards: CARDS, header: 'VOID ATLAS · FILE 003 · HD 189733 b' });
