// Short #3: The Greenland shark. Arctic water under sea ice; a stat card up top for each fact.
import * as D from '../../lib/draw.js';
import { makeCaptions } from '../../lib/captions.js';
const { C, clamp, lerp, ss, seg } = D;
const W = 1080, H = 1920, cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['900 70px Montserrat', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"', '300 40px "Space Grotesk"', '500 40px "Space Grotesk"'].map(f => document.fonts.load(f)));
const TL = await fetch('timeline.json').then(r => r.json()), LN = TL.lines, caps = makeCaptions(LN);
const T0 = i => LN[i].t0;
const word = (i, w) => LN[i].words.find(q => q[0].toLowerCase().includes(w))[1];
const vis = (t, a, b = a) => ss(seg(t, T0(a) - .5, T0(a) + .1)) * (b + 1 < LN.length ? 1 - ss(seg(t, T0(b + 1) - .45, T0(b + 1) + .05)) : 1 - ss(seg(t, TL.end - .4, TL.end + .3)));
const lineAt = t => { let k = 0; for (let i = 0; i < LN.length; i++) if (t >= T0(i) - .45) k = i; return k; };

function label(text, x, y, px = 24, a = 1, col = 'rgba(111,246,255,.8)', align = 'center', ls = 5) {
  g.save(); g.globalAlpha = a; g.font = `400 ${px}px "JetBrains Mono"`; g.letterSpacing = `${ls}px`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y); g.restore();
}
// stat card: a big thin number and a small label, swapped per line
const CARDS = [
  t => [String(Math.round(lerp(2026, 1776, ss(seg(t, word(0, 'older') - .6, word(0, 'states') + .4))))), 'USA FOUNDED · 1776'],
  () => ['~400', 'YEARS · LIFESPAN'],
  () => ['14C', 'RADIOCARBON · EYE LENS'],
  () => ['392±120', 'YEARS · OLDEST MEASURED'],
  () => ['1 cm', 'GROWTH PER YEAR'],
  () => ['~150', 'YEARS · ADULTHOOD'],
  () => ['1.2', 'KM/H · CRUISING SPEED'],
  () => ['½', 'BLIND · EYE PARASITE'],
  () => ['?!', 'STOMACH CONTENTS'],
  () => ['TMAO', 'TOXIN IN THE MEAT'],
  () => ['1912', 'TITANIC SINKS'],
];
function card(t, a) {
  const i = lineAt(t), k = ss(seg(t, T0(i) - .45, T0(i) + .1)), [num, lab] = CARDS[i](t);
  g.save(); g.globalAlpha = a * k; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '200 150px "JetBrains Mono"'; g.letterSpacing = '-6px'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 34;
  g.fillText(num, 540, 300 + (1 - k) * 30); g.shadowBlur = 0;
  g.font = '500 30px "Space Grotesk"'; g.letterSpacing = '8px'; g.fillStyle = 'rgba(111,246,255,.85)'; g.fillText(lab, 545, 410); g.restore();
  label('SPECIMEN FILE · SOMNIOSUS MICROCEPHALUS', 540, 150, 20, a * .55, 'rgba(233,251,255,.6)', 'center', 3);
}
function seaIce(t) {   // sea ice overhead, light leaking through the cracks
  g.save(); const y0 = 70; g.fillStyle = 'rgba(200,240,250,.10)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, y0);
  for (let x = W; x >= 0; x -= 30) g.lineTo(x, y0 + Math.sin(x * .02) * 18 + Math.sin(x * .053) * 10); g.closePath(); g.fill();
  g.globalCompositeOperation = 'lighter'; for (const cx of [220, 610, 900]) { const gr = g.createLinearGradient(0, 0, 0, 1100); gr.addColorStop(0, 'rgba(190,250,255,.09)'); gr.addColorStop(1, 'rgba(190,250,255,0)'); g.fillStyle = gr; const sw = 40 + 15 * Math.sin(t * .5 + cx); g.beginPath(); g.moveTo(cx - sw / 2, 0); g.lineTo(cx + sw / 2, 0); g.lineTo(cx + sw * 3, 1100); g.lineTo(cx - sw, 1100); g.fill(); }
  g.restore();
}
function lensRings(t, a) {   // the eye lens: rings laid down for life around a nucleus formed before birth
  if (a <= 0) return; const cx = 540, cy = 880; const pr = ss(seg(t, T0(2) + .3, T0(2) + 3.5));
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 16; i++) { const r = i * 22; g.strokeStyle = C.glow; g.globalAlpha = a * (.15 + .35 * (i / 16)) * (i / 16 <= pr + .05 ? 1 : 0); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r + Math.sin(i * 3 + t) * 2, 0, 7); g.stroke(); }
  g.restore(); D.orb(g, cx, cy, 30, a * ss(seg(t, word(2, 'forms') - .3, word(2, 'forms') + .3)), '255,207,107');
  label('NUCLEUS · FORMED BEFORE BIRTH', cx, cy + 420, 22, a * ss(seg(t, word(2, 'forms') - .3, word(2, 'forms') + .4)), C.amber);
}
function ruler(t, a) {
  if (a <= 0) return; const y = 1080, x0 = 140, x1 = 940;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(233,251,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  for (let i = 0; i <= 40; i++) { const x = lerp(x0, x1, i / 40); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (i % 10 ? 12 : 26)); g.stroke(); }
  g.restore(); ['0', '1 m', '2 m', '3 m', '4 m'].forEach((s, i) => label(s, lerp(x0, x1, i / 4), y + 54, 20, a * .7));
  const grow = ss(seg(t, T0(4) - .3, T0(4) + 3)); D.shark(g, x0 + lerp(100, 330, grow), 900, lerp(100, 330, grow), t, a);
  label('+1 cm', x0 + lerp(200, 660, grow) + 30, 830, 26, a * grow, C.amber, 'left', 3);
}
function lifeBar(t, a) {
  if (a <= 0) return; const y = 900, x0 = 150, x1 = 930, f = ss(seg(t, T0(5), word(5, 'fifty') + .3)) * 150 / 400;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(111,246,255,.5)'; g.lineWidth = 2; g.strokeRect(x0, y - 30, x1 - x0, 60);
  const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(111,246,255,.2)'); gr.addColorStop(1, 'rgba(111,246,255,.9)'); g.fillStyle = gr; g.shadowColor = C.glow; g.shadowBlur = 20; g.fillRect(x0, y - 30, (x1 - x0) * f, 60); g.restore();
  label('0', x0, y + 70, 22, a * .7); label('150', lerp(x0, x1, 150 / 400), y + 70, 26, a * clamp(f * 3), C.amber); label('400 YRS', x1, y + 70, 22, a * .7);
  label('NOT AN ADULT YET', lerp(x0, x1, f * .5 + .001), y - 70, 22, a * clamp(f * 3), 'rgba(233,251,255,.8)');
}
function race(t, a) {
  if (a <= 0) return; const tt = t - T0(6) + .5;
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(111,246,255,.25)'; g.setLineDash([10, 12]); g.lineWidth = 2; g.beginPath(); g.moveTo(80, 760); g.lineTo(1000, 760); g.moveTo(80, 1060); g.lineTo(1000, 1060); g.stroke(); g.restore();
  D.walker(g, 140 + tt * 150, 720, 120, t, a); label('YOU · 5 km/h', 140 + tt * 150, 560, 22, a, 'rgba(233,251,255,.85)');
  D.shark(g, 260 + tt * 36, 990, 170, t, a, { flip: true }); label('SHARK · 1.2 km/h', 260 + tt * 36, 870, 22, a);
}

window.render = t => {
  D.water(g, W, H, .55, t, false); seaIce(t);
  D.snow(g, W, H, t * 25, 130, 4, .6);
  { const a = vis(t, 0, 1), x = lerp(1300, -260, seg(t, 0, T0(2) + .5)); D.shark(g, x, 900 + Math.sin(t * .6) * 20, 330, t, a); if (t > T0(1) - .2) label('GREENLAND SHARK', 540, 1140, 26, a * ss(seg(t, T0(1) - .2, T0(1) + .6))); }
  lensRings(t, vis(t, 2));
  { const a = vis(t, 3); if (a > 0) { D.shark(g, 560, 900, 360, t, a); label('THE OLDEST VERTEBRATE KNOWN', 540, 1130, 22, a * .8); } }
  ruler(t, vis(t, 4)); lifeBar(t, vis(t, 5)); race(t, vis(t, 6));
  { const a = vis(t, 7); if (a > 0) D.shark(g, 1040, 900, 640, t, a, { parasite: ss(seg(t, word(7, 'parasite') - .3, word(7, 'parasite') + .4)) }); }
  { const a = vis(t, 8); if (a > 0) { D.shark(g, 540, 900, 440, t, a, { xray: true }); const b = ss(seg(t, word(8, 'polar') - .2, word(8, 'polar') + .6)); D.bear(g, 540, 905, 130, a * b, C.amber); } }
  { const a = vis(t, 9); if (a > 0) { D.shark(g, 560, 1000, 300, t, a * .5); const k = ss(seg(t, T0(9), T0(9) + .5)); g.save(); g.globalAlpha = a * k; g.strokeStyle = C.amber; g.lineWidth = 8; g.lineJoin = 'round'; g.shadowColor = C.amber; g.shadowBlur = 30; g.beginPath(); g.moveTo(540, 600); g.lineTo(680, 840); g.lineTo(400, 840); g.closePath(); g.stroke(); g.fillStyle = C.amber; g.font = '900 120px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 540, 760); g.restore(); } }
  { const a = vis(t, 10); if (a > 0) { const k = seg(t, T0(10) - .5, TL.end); g.save(); g.translate(560, 820); g.rotate(-.12 - k * .1); D.titanicBow(g, 0, k * 60, 380, a * .9); g.restore(); D.shark(g, lerp(-200, 900, k), 1120, 220, t, a, { flip: true }); } }

  D.vignette(g, W, H, .7);
  card(t, ss(seg(t, .1, .7)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3))));
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
