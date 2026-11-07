// Short #2: The Wow! signal. Idea: the paper printout is the hero. A column of characters, one circled in red,
// then the 72-second beam pass, the hydrogen-line spike, decades of silence, and a possible natural answer.
import { setup } from '../../lib/kit.js';
const K = await setup(), { g, TL, LN, T0, word, vis, label, big, D, C, lerp, ss, seg, clamp, W, H } = K;
const RED = '#ff5a4a';

const CARDS = [
  () => ['1977', '15 AUGUST · OHIO, USA'],
  () => ['6EQUJ5', 'THE CIRCLED CODE'],
  () => ['72 s', 'SIGNAL DURATION'],
  () => ['72 s', 'ONE PASS OF THE BEAM'],
  () => ['1420 MHz', 'THE HYDROGEN LINE', 120],
  t => [String(Math.round(lerp(1977, 2024, ss(seg(t, T0(5), LN[5].t1))))), 'STILL SEARCHING'],
  () => ['0', 'REPEATS DETECTED'],
  () => ['2024', 'ARECIBO ARCHIVE STUDY'],
  () => ['MAGNETAR', 'DEAD STAR · MONSTER MAGNETIC FIELD', 110],
  () => ['?', 'NOT CONFIRMED YET'],
  () => null,
];

// the printout: rows of mostly 1s and spaces; one column spells 6EQUJ5 going down
const R = D.rng(4), COLS = 6, ROWS = 16, GRID = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => { const v = R(); return v < .55 ? '1' : v < .75 ? ' ' : v < .9 ? '2' : String(Math.floor(R() * 4) + 1); }));
'6EQUJ5'.split('').forEach((c, i) => GRID[5 + i][2] = c);
function printout(t, a, wow = 0, circle = 0, cx = 540, cy = 860, sc = 1) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(cx, cy); g.scale(sc, sc); g.rotate(-.04);
  g.fillStyle = '#efe6cf'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.fillRect(-300, -440, 600, 880); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(80,120,90,.25)'; g.lineWidth = 26; for (let y = -420; y < 440; y += 104) { g.beginPath(); g.moveTo(-300, y); g.lineTo(300, y); g.stroke(); }   // green-bar paper
  g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = -420; y < 440; y += 34) { g.beginPath(); g.arc(-280, y, 6, 0, 7); g.fill(); g.beginPath(); g.arc(280, y, 6, 0, 7); g.fill(); }
  g.font = '400 40px "JetBrains Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a2a33';
  GRID.forEach((row, r) => row.forEach((c, k) => g.fillText(c, -175 + k * 70, -390 + r * 52)));
  if (circle > 0) { g.strokeStyle = RED; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.ellipse(-35, -390 + 7.5 * 52, 40, 175, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * circle); g.stroke(); }
  if (wow > 0) { g.save(); g.globalAlpha = a * wow; g.translate(-160, -390 + 7 * 52); g.rotate(-.18); g.transform(1, 0, -.25, 1, 0, 0); g.font = '700 92px "Space Grotesk"'; g.fillStyle = RED; g.fillText('Wow!', 0, 0); g.restore(); }
  g.restore();
}
function telescope(t, a) {
  if (a <= 0) return; D.dish(g, 540, 820, 330, a, -.5);
  g.save(); g.globalAlpha = a * .6; g.strokeStyle = 'rgba(255,196,107,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 1150); g.lineTo(1020, 1150); g.stroke(); g.restore();
  label('BIG EAR RADIO TELESCOPE', 540, 1230, 24, a * .85);
}
const SGR = [[300, 760, 1.4], [400, 700, 1], [520, 730, 1.2], [610, 660, 1], [700, 720, 1.3], [640, 820, 1], [500, 850, 1.1], [380, 830, 1], [300, 760]];
function skyMap(t, a) {
  if (a <= 0) return; const k = ss(seg(t, T0(2), word(2, 'sagittarius') + .6));
  D.constellation(g, SGR, k, a); label('SAGITTARIUS', 500, 950, 26, a * k);
  const p = ss(seg(t, word(2, 'seventy') - .3, LN[2].t1)); D.glow(g, 820, 620, 14, a * p, '255,90,74'); label('SIGNAL', 820, 560, 22, a * p, RED);
}
function beamPass(t, a) {   // the sky drifts through the beam; intensity curve draws as it goes
  if (a <= 0) return; const k = seg(t, T0(3) - .2, LN[3].t1 + .3), x0 = 120, x1 = 960, y0 = 1100;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,243,220,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.strokeStyle = RED; g.lineWidth = 4; g.shadowColor = RED; g.shadowBlur = 16; g.beginPath();
  for (let i = 0; i <= 200 * k; i++) { const f = i / 200, v = Math.exp(-(((f - .5) / .16) ** 2)) + .03 * Math.sin(i * 2.7); g.lineTo(lerp(x0, x1, f), y0 - v * 420); } g.stroke(); g.restore();
  label('0 s', x0, y0 + 40, 20, a * .7); label('36 s', 540, y0 + 40, 20, a * .7); label('72 s', x1, y0 + 40, 20, a * .7);
  label('SIGNAL STRENGTH', 540, 600, 22, a * .7);
}
function spectrum(t, a) {   // flat noise with a spike right at 1420 MHz
  if (a <= 0) return; const x0 = 100, x1 = 980, y0 = 1080, spike = ss(seg(t, word(4, 'hydrogen') - .4, word(4, 'hydrogen') + .3)), tt = Math.floor(t * 12);
  const r = D.rng(tt + 9);
  g.save(); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = 2.5; g.shadowColor = C.gold; g.shadowBlur = 8; g.beginPath();
  for (let i = 0; i <= 220; i++) { const f = i / 220, v = r() * 30 + 20 + spike * 440 * Math.exp(-(((f - .52) / .008) ** 2)); g.lineTo(lerp(x0, x1, f), y0 - v); } g.stroke(); g.restore();
  label('1419', x0 + 60, y0 + 40, 20, a * .7); label('1420 MHz', lerp(x0, x1, .52), y0 + 40, 22, a, C.gold); label('1421', x1 - 60, y0 + 40, 20, a * .7);
  D.glow(g, lerp(x0, x1, .52), y0 - 480, 12, a * spike, '255,90,74'); label('H', lerp(x0, x1, .52) + 60, y0 - 470, 30, a * spike, C.cream);
}
function searching(t, a, silent = false) {
  if (a <= 0) return; D.dish(g, 330, 900, 230, a, -.5 + Math.sin(t * 1.5) * .15); D.dish(g, 760, 960, 170, a * .8, -.7 + Math.sin(t * 1.2 + 1) * .12);
  for (let i = 0; i < 3; i++) { const r = ((t * 140 + i * 70) % 210); g.save(); g.globalAlpha = a * (1 - r / 210) * .5; g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.arc(540, 520, 30 + r, Math.PI * .15, Math.PI * .85); g.stroke(); g.restore(); }
  if (silent) { const x0 = 160, x1 = 920, y = 1180, r = D.rng(Math.floor(t * 12)); g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,243,220,.6)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 120; i++) g.lineTo(lerp(x0, x1, i / 120), y - r() * 14); g.stroke(); g.restore(); label('NO SIGNAL', 540, 1240, 24, a, 'rgba(255,243,220,.7)'); }
}
function clouds(t, a, flash = 0) {   // cold hydrogen clouds; a magnetar behind lights one up
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  [[340, 760, 220, '90,70,170'], [700, 900, 260, flash > 0 ? '255,120,100' : '90,70,170'], [520, 1100, 180, '70,90,170']].forEach(([x, y, r, col], i) => {
    const b = i === 1 ? .18 + .5 * flash : .18; for (let k = 0; k < 6; k++) { const xx = x + Math.cos(k * 2.1 + t * .1) * r * .4, yy = y + Math.sin(k * 1.7) * r * .25, gr = g.createRadialGradient(xx, yy, 0, xx, yy, r * .8); gr.addColorStop(0, `rgba(${col},${b * a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(xx, yy, r * .8, 0, 7); g.fill(); }
  }); g.restore();
  label('COLD HYDROGEN', 340, 600, 22, a * .7);
  if (flash > 0) { D.glow(g, 880, 700, 18, a, '200,220,255'); D.spike(g, 880, 700, 90 * flash, a); label('MAGNETAR', 880, 620, 22, a * flash, C.ice);
    for (let i = 0; i < 3; i++) { const r = ((t * 200 + i * 80) % 240); g.save(); g.globalAlpha = a * flash * (1 - r / 240) * .6; g.strokeStyle = C.ice; g.lineWidth = 2; g.beginPath(); g.arc(880, 700, 20 + r, 0, 7); g.stroke(); g.restore(); } }
}

K.frame(t => {
  D.sky(g, W, H, t, 1, .4); D.stars(g, W, H, t * 10, 220, 12, .8, 1, t);
  telescope(t, vis(t, 0));
  { const a = vis(t, 1); printout(t, a, ss(seg(t, word(1, 'wow') - .2, word(1, 'wow') + .3)), ss(seg(t, word(1, 'circled') - .1, word(1, 'circled') + .7)), 540, 880, .95); }
  skyMap(t, vis(t, 2)); beamPass(t, vis(t, 3)); spectrum(t, vis(t, 4)); searching(t, vis(t, 5)); searching(t, vis(t, 6), true);
  clouds(t, vis(t, 7, 8), ss(seg(t, word(8, 'blast') - .2, word(8, 'blast') + .5)));
  { const a = vis(t, 9, 10); printout(t, a * (1 - .6 * ss(seg(t, T0(10) - .3, T0(10) + .3))), 1, 1, 540, 880, .95);
    const w = ss(seg(t, T0(10) - .2, T0(10) + .4)); if (w > 0) { g.save(); g.globalAlpha = a * w; g.translate(540, 860); g.rotate(-.12); g.transform(1, 0, -.25, 1, 0, 0); g.scale(.8 + .2 * w, .8 + .2 * w); g.font = '700 260px "Space Grotesk"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = RED; g.shadowColor = RED; g.shadowBlur = 40; g.fillText('Wow!', 0, 0); g.restore(); } }
}, { cards: CARDS, header: 'VOID ATLAS · FILE 002 · THE WOW! SIGNAL' });
