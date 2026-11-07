// Short #2: The Bloop. A sonar-room look: oscilloscope strip, globe, spectrogram, the eye, the iceberg.
import * as D from '../../lib/draw.js';
import { makeCaptions } from '../../lib/captions.js';
const { C, clamp, lerp, ss, seg } = D;
const W = 1080, H = 1920, cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['900 70px Montserrat', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"', '300 40px "Space Grotesk"', '500 40px "Space Grotesk"'].map(f => document.fonts.load(f)));
const TL = await fetch('timeline.json').then(r => r.json()), LN = TL.lines, caps = makeCaptions(LN);
const T0 = i => LN[i].t0, T1 = i => LN[i].t1;
const word = (i, w) => LN[i].words.find(q => q[0].toLowerCase().includes(w))[1];
// visibility of a scene that spans lines a..b (fades in just before a, out just before b+1)
const vis = (t, a, b = a) => ss(seg(t, T0(a) - .5, T0(a) + .1)) * (b + 1 < LN.length ? 1 - ss(seg(t, T0(b + 1) - .45, T0(b + 1) + .05)) : 1 - ss(seg(t, TL.end - .4, TL.end + .3)));
const BLOOPS = [word(0, 'sound'), word(4, 'bloop')];

function label(text, x, y, px = 24, a = 1, col = 'rgba(111,246,255,.8)', align = 'center', ls = 5) {
  g.save(); g.globalAlpha = a; g.font = `400 ${px}px "JetBrains Mono"`; g.letterSpacing = `${ls}px`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y); g.restore();
}
function bigNum(text, y, a) {
  g.save(); g.globalAlpha = a; g.font = '200 260px "JetBrains Mono"'; g.letterSpacing = '-8px'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 50; g.fillText(text, 540, y); g.restore();
}
// oscilloscope strip at the top: hiss, with a burst at each Bloop
function scope(t, a) {
  const y0 = 300, A = BLOOPS.reduce((m, b) => m + Math.exp(-((t - b - .4) ** 2) / .35) * (t > b - .3 ? 1 : 0), 0);
  g.save(); g.globalAlpha = a;
  g.strokeStyle = 'rgba(111,246,255,.18)'; g.lineWidth = 1; g.strokeRect(70, y0 - 110, 940, 220);
  for (let x = 70; x <= 1010; x += 94) { g.beginPath(); g.moveTo(x, y0 - 110); g.lineTo(x, y0 + 110); g.stroke(); }
  g.beginPath(); g.moveTo(70, y0); g.lineTo(1010, y0); g.stroke();
  g.strokeStyle = C.glow; g.lineWidth = 2.5; g.shadowColor = C.glow; g.shadowBlur = 14; g.beginPath();
  for (let x = 70; x <= 1010; x += 3) {
    const u = (x - 70) / 940, ph = t * 9 + u * 40, env = Math.sin(Math.PI * u) ** 1.5;
    const v = (Math.sin(ph) * .3 + Math.sin(ph * 2.7 + 1) * .25 + Math.sin(ph * 6.1 + t) * .15) * 10 + env * A * 95 * Math.sin(u * 60 - t * 20) * (.6 + .4 * Math.sin(u * 7));
    x === 70 ? g.moveTo(x, y0 + v) : g.lineTo(x, y0 + v);
  }
  g.stroke(); g.shadowBlur = 0;
  label('HYDROPHONE · S. PACIFIC', 72, y0 - 140, 22, .75, 'rgba(111,246,255,.75)', 'left', 4);
  const yr = t < T0(8) + .3 ? '1997' : '2005';
  label(`${yr} · ${(14 + t * .37).toFixed(2)} Hz`, 1008, y0 - 140, 22, .75, 'rgba(233,251,255,.6)', 'right', 3);
  if (A > .3) label('▲ SIGNAL', 540, y0 + 145, 24, clamp(A), C.amber, 'center', 6);
  g.restore();
}
function hydrophone(t, a) {
  if (a <= 0) return; const y = 930 + Math.sin(t) * 8;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(200,250,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(540, 470); g.bezierCurveTo(530, 650, 552, 800, 540, y - 60); g.stroke();
  g.fillStyle = '#04141c'; g.strokeStyle = C.glow; g.shadowColor = C.glow; g.shadowBlur = 16; g.lineWidth = 3;
  g.beginPath(); g.roundRect(500, y - 60, 80, 120, 30); g.fill(); g.stroke(); g.shadowBlur = 0;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(510, y - 30 + k * 20); g.lineTo(570, y - 30 + k * 20); g.globalAlpha = a * .4; g.stroke(); } g.restore();
  D.orb(g, 540, y - 72, 7, a);
  // sound arriving from far away: wavefronts rolling in from the left
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = C.glow;
  for (let k = 0; k < 4; k++) { const p = (t * .35 + k / 4) % 1, R = 200 + p * 1100; g.globalAlpha = a * (1 - p) * .5; g.lineWidth = 3; g.beginPath(); g.arc(-500, y, R + 400, -.5, .5); g.stroke(); }
  g.restore();
  label('NAVY HYDROPHONE ARRAY', 540, y + 130, 24, a * .8);
}
function globeScene(t, a, i) {
  if (a <= 0) return;
  const k = ss(seg(t, T0(3) - .8, T0(3) + 1.5)), lon0 = lerp(-112, -102, k) + t * .6, lat0 = lerp(-12, -38, k), R = lerp(360, 470, k);
  const P = D.globe(g, 540, 900, R, lon0, lat0, a);
  // two sensors and the distance between them (only for line 3)
  const s1 = P(-120, 2), s2 = P(-88, -30), ka = a * (1 - k);
  if (ka > .01) {
    D.orb(g, s1[0], s1[1], 10, ka); D.orb(g, s2[0], s2[1], 10, ka);
    const dr = ss(seg(t, T0(2) + .6, T0(2) + 2.4)); g.save(); g.globalAlpha = ka; g.strokeStyle = C.amber; g.lineWidth = 3; g.setLineDash([12, 10]); g.beginPath();
    for (let u = 0; u <= dr; u += .02) { const p = P(lerp(-120, -88, u), lerp(2, -30, u)); u ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.restore();
    const m = P(-104, -14); label('≈ 5,000 km', m[0] + 30, m[1] - 50, 30, ka * dr, C.amber, 'left', 3);
    label('SENSOR', s1[0], s1[1] - 34, 20, ka * .8); label('SENSOR', s2[0], s2[1] + 36, 20, ka * .8);
  }
  if (k > .01) {   // where it came from
    const o = P(-100, -50); D.sonar(g, o[0], o[1], 160, t, k * a, 3); D.orb(g, o[0], o[1], 12, k * a, '255,207,107');
    label('50°S · 100°W', o[0], o[1] + 70, 28, k * a, C.amber);
  }
}
function spectrogram(t, a) {
  if (a <= 0) return; const x0 = 120, x1 = 960, y0 = 640, y1 = 1150;
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(2,14,20,.85)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.strokeStyle = 'rgba(111,246,255,.35)'; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  const r = D.rng(Math.floor(t * 12)); for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(111,246,255,${r() * .12})`; g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 6, 3); }
  // the call: a slow rising sweep, drawn as it plays
  const pr = ss(seg(t, word(4, 'shape') - .1, word(4, 'call') + .6)), path = new Path2D();
  for (let u = 0; u <= pr; u += .005) { const x = lerp(x0 + 40, x1 - 40, u), y = y1 - 60 - (u ** 1.8) * 330 - Math.sin(u * 14) * 6; u ? path.lineTo(x, y) : path.moveTo(x, y); }
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = C.glow; g.shadowColor = C.glow; g.shadowBlur = 30; g.lineWidth = 16; g.globalAlpha = a * .35; g.stroke(path); g.lineWidth = 5; g.globalAlpha = a; g.stroke(path);
  g.restore();
  label('FREQUENCY ↑', x0, y0 - 28, 20, a * .7, undefined, 'left', 3); label('TIME →', x1, y1 + 30, 20, a * .7, undefined, 'right', 3);
  const nb = ss(seg(t, word(4, 'bloop') - .1, word(4, 'bloop') + .4));
  if (nb > 0) { g.save(); g.globalAlpha = a * nb; g.font = '300 110px "Space Grotesk"'; g.letterSpacing = '24px'; g.textAlign = 'center'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 40; g.fillText('BLOOP', 552, 560); g.restore(); }
}
function bars(t, a) {
  if (a <= 0) return; const base = 1150, gw = ss(seg(t, T0(5) + .2, T0(5) + 1.2)), gb = ss(seg(t, word(5, 'louder') - .2, word(5, 'louder') + 1.6));
  D.whale(g, 330, base + 60, 170, a * .9);
  g.save(); g.globalAlpha = a;
  const bar = (x, h, col, glow) => { const gr = g.createLinearGradient(0, base - h, 0, base); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(111,246,255,.05)'); g.fillStyle = gr; g.shadowColor = glow; g.shadowBlur = 30; g.fillRect(x - 70, base - h, 140, h); g.shadowBlur = 0; };
  bar(330, 240 * gw, 'rgba(111,246,255,.75)', C.glow); bar(750, 700 * gb, 'rgba(255,207,107,.85)', C.amber);
  g.strokeStyle = 'rgba(233,251,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(140, base); g.lineTo(940, base); g.stroke(); g.restore();
  label('BLUE WHALE', 330, base - 240 * gw - 36, 26, a * gw); label('THE BLOOP', 750, base - 700 * gb - 36, 26, a * gb, C.amber);
  label('LOUDNESS', 540, base + 150, 20, a * .6);
}
function iceScene(t, a) {
  if (a <= 0) return;
  const cr = seg(t, word(9, 'cracking') - .3, word(9, 'cracking') + 1.0), sp = seg(t, word(9, 'breaking') - .1, word(9, 'breaking') + 2.6);
  const shake = cr > 0 && cr < 1 ? Math.sin(t * 90) * 4 : 0;
  // above the waterline: a dim grey sky
  g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(0, 480, 0, 760); gr.addColorStop(0, 'rgba(30,60,72,0)'); gr.addColorStop(1, 'rgba(40,90,105,.35)'); g.fillStyle = gr; g.fillRect(0, 480, W, 280); g.restore();
  D.iceberg(g, 520 + shake, 760, 360, cr, sp, t, a);
  if (sp > 0) for (let k = 0; k < 18; k++) { const r = D.rng(k + 3), p = clamp(sp * 1.3 - r() * .3), x = 600 + (r() - .3) * 300 + p * (r() - .5) * 200, y = 780 + p * (200 + r() * 500); if (p > 0) { g.save(); g.globalAlpha = a * (1 - p * .7); g.translate(x, y); g.rotate(p * 5 * (r() - .5)); g.strokeStyle = 'rgba(210,250,255,.8)'; g.lineWidth = 2; g.strokeRect(-8 - r() * 10, -6, 16 + r() * 20, 12); g.restore(); } }
  label('ANTARCTICA', 540, 1170, 24, a * .7);
}

window.render = t => {
  D.water(g, W, H, .86, t, false);
  g.save(); g.strokeStyle = 'rgba(111,246,255,.04)'; g.lineWidth = 1; for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.restore();
  D.snow(g, W, H, t * 40, 120, 9, .6);

  bigNum('1997', 860, vis(t, 0) * ss(seg(t, .6, 1.6)));
  hydrophone(t, vis(t, 1));
  globeScene(t, vis(t, 2, 3));
  spectrogram(t, vis(t, 4));
  bars(t, vis(t, 5));
  { const a = vis(t, 6, 7), o = ss(seg(t, T0(6), T0(6) + 2.5)); if (a > 0) { const gr = g.createRadialGradient(540, 900, 0, 540, 900, 700); gr.addColorStop(0, `rgba(0,0,0,${.6 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); D.eye(g, 540 + Math.sin(t * 13) * (t > word(7, 'monster') - .1 ? 3 : 0), 900, 400, Math.PI * (.2 + .4 * o), a * (.3 + .7 * o)); } }
  { const a = vis(t, 8); if (a > 0) { bigNum('2005', 860, a * ss(seg(t, T0(8) + .1, T0(8) + .9))); const sy = 520 + ((t - T0(8)) * 500) % 900; g.save(); g.globalAlpha = a * .5; g.fillStyle = C.glow; g.fillRect(80, sy, 920, 2); g.restore(); label('ANALYSIS · NOAA', 540, 1060, 26, a * .8); } }
  iceScene(t, vis(t, 9, 10));

  D.vignette(g, W, H, .75);
  scope(t, ss(seg(t, .1, .8)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3))));
  caps(g, t, 1360);
  const endK = ss(seg(t, TL.end - .4, TL.end + .5));
  if (endK > 0) {
    g.fillStyle = `rgba(1,3,8,${endK})`; g.fillRect(0, 0, W, H);
    const a = ss(seg(t, TL.end + .1, TL.end + .9)); D.mark(g, 540, 820, 300, t, a);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = '300 52px "Space Grotesk"'; g.letterSpacing = '16px'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 20;
    g.fillText('BELOW ZERO LIGHT', 548, 1120); g.shadowBlur = 0; g.font = '400 30px "JetBrains Mono"'; g.letterSpacing = '6px'; g.fillStyle = C.glow; g.fillText('FOLLOW FOR THE NEXT DIVE', 543, 1200); g.restore();
  }
  if (t < .5) { g.fillStyle = `rgba(0,0,0,${1 - t / .5})`; g.fillRect(0, 0, W, H); }
  D.grain(g, W, H, .05, Math.floor(t * 30));
};
window.DUR = TL.dur; window.READY = true;
