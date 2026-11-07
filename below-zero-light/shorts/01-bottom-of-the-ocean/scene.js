// Short #1: Sinking to the bottom of the ocean. window.render(t) draws one 1080x1920 frame.
import * as D from '../../lib/draw.js';
const { C, clamp, lerp, ss, seg } = D;
const W = 1080, H = 1920, cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['900 70px Montserrat', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"', '300 40px "Space Grotesk"', '500 40px "Space Grotesk"'].map(f => document.fonts.load(f)));
const TL = await fetch('timeline.json').then(r => r.json()), LN = TL.lines;
const STEP = 1500;                                   // screen px between two milestones
const mPx = LN.map((l, i) => i * STEP - (i === LN.length - 1 ? STEP - 520 : 0));   // last beat: just settle onto the floor

const CREEP = t => Math.min(t, TL.end) * 22 + ss(seg(t, 0, 1.6)) * 120;
const AN = mPx.map((p, i) => p + CREEP(LN[i].t0));   // where each milestone sits once the creep is counted
// camera: glide to each milestone in the 1.5 s before its line starts, creep slowly in between
function cam(t) {
  let px = mPx[0], dep = 0, k = 0;
  for (let i = 1; i < LN.length; i++) {
    const a = LN[i].t0 - 1.5, b = LN[i].t0 + .1, e = ss(seg(t, a, b));
    if (t >= a) { px = lerp(mPx[i - 1], mPx[i], e); dep = lerp(LN[i - 1].depth, LN[i].depth, e); k = i - 1 + e; }
  }
  const creep = CREEP(t);
  return { px: px + creep, depth: dep, k };
}
const sy = (px, c) => 960 + (px - c.px);             // world px -> screen y
const zone = d => d < 200 ? 'SUNLIGHT ZONE' : d < 1000 ? 'TWILIGHT ZONE' : d < 4000 ? 'MIDNIGHT ZONE' : d < 6000 ? 'ABYSSAL ZONE' : 'HADAL ZONE';
const temp = d => d < 200 ? lerp(22, 15, d / 200) : d < 1000 ? lerp(15, 4.5, (d - 200) / 800) : d < 4000 ? lerp(4.5, 2, (d - 1000) / 3000) : lerp(2, 1.5, Math.min(1, (d - 4000) / 4000)) + (d > 8000 ? (d - 8000) / 3000 : 0);
const dark = d => clamp(Math.log(1 + d / 40) / Math.log(1 + 11000 / 40));

function hud(c, t, a) {
  const d = c.depth + (c.depth > 0 ? Math.sin(t * 7) * .4 : 0);
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '200 132px "JetBrains Mono"'; g.letterSpacing = '-4px'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 30;
  g.fillText(D.fmtDepth(Math.max(0, d)).replace(' m', ''), 520, 300); g.shadowBlur = 0;
  g.font = '400 44px "JetBrains Mono"'; g.letterSpacing = '0px'; g.fillStyle = C.glow; g.textAlign = 'left';
  const wNum = (() => { g.save(); g.font = '200 132px "JetBrains Mono"'; g.letterSpacing = '-4px'; const w = g.measureText(D.fmtDepth(Math.max(0, d)).replace(' m', '')).width; g.restore(); return w; })();
  g.fillText('m', 520 + wNum / 2 + 12, 318);
  g.textAlign = 'center'; g.font = '500 30px "Space Grotesk"'; g.letterSpacing = '9px'; g.fillStyle = 'rgba(111,246,255,.85)';
  g.fillText(zone(c.depth), 540, 410);
  const light = 100 * Math.exp(-c.depth / 43), atm = 1 + c.depth / 10.06;
  g.font = '400 25px "JetBrains Mono"'; g.letterSpacing = '2px'; g.fillStyle = 'rgba(233,251,255,.6)';
  g.fillText(`${Math.round(atm).toLocaleString('en-US')} atm   ·   ${temp(c.depth).toFixed(1)} °C   ·   light ${light >= 1 ? Math.round(light) : light.toFixed(light > .01 ? 2 : 0)}%`, 540, 462);
  // left gauge: the whole ocean, with a marker
  const x = 58, y0 = 560, y1 = 1440, yy = lerp(y0, y1, dark(c.depth) ** 1.15);
  g.strokeStyle = 'rgba(111,246,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  for (let i = 0; i <= 40; i++) { const y = lerp(y0, y1, i / 40), big = i % 10 === 0; g.globalAlpha = a * (big ? .6 : .25); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (big ? 22 : 10), y); g.stroke(); }
  g.globalAlpha = a; D.orb(g, x, yy, 9, a); g.strokeStyle = C.glow; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, yy); g.lineTo(x + 44, yy); g.stroke();
  g.restore();
}

// captions: 1-3 words at a time, active word lit
const CHUNKS = []; for (const l of LN) { let cur = []; for (const w of l.words) { cur.push(w); const end = /[.,?!…]$/.test(w[0]) || w[0].endsWith('...'); if (cur.length >= 3 || end) { CHUNKS.push(cur); cur = []; } } if (cur.length) CHUNKS.push(cur); }
function captions(t) {
  const i = CHUNKS.findIndex((ch, k) => t >= ch[0][1] - .05 && t < (CHUNKS[k + 1] ? Math.min(CHUNKS[k + 1][0][1] - .05, ch[ch.length - 1][2] + .6) : ch[ch.length - 1][2] + .6)); if (i < 0) return;
  const ch = CHUNKS[i], pop = ss(seg(t, ch[0][1] - .05, ch[0][1] + .12));
  g.save(); g.font = '900 78px Montserrat'; g.textBaseline = 'middle'; g.letterSpacing = '1px';
  const words = ch.map(w => w[0].toUpperCase().replace(/\.\.\.$/, '…').replace(/[.,]$/, '')), sp = 22;
  const ws = words.map(w => g.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const sc = Math.min(1, 900 / tot) * (.86 + .14 * pop); g.translate(540, 1300); g.scale(sc, sc);
  let x = -tot / 2;
  words.forEach((w, k) => {
    const on = t >= ch[k][1] - .03;
    g.lineWidth = 14; g.strokeStyle = 'rgba(0,8,14,.85)'; g.lineJoin = 'round'; g.strokeText(w, x, 0);
    g.fillStyle = on ? (k === ch.findLastIndex(q => t >= q[1] - .03) ? C.glow : '#ffffff') : 'rgba(255,255,255,.55)';
    if (on && g.fillStyle !== '#ffffff') { g.shadowColor = C.glow; g.shadowBlur = 24; }
    g.fillText(w, x, 0); g.shadowBlur = 0; x += ws[k] + sp;
  });
  g.restore();
}

function trench(c, a) {   // rock walls closing in on both sides
  const base = sy(AN[8], c);
  for (const sd of [-1, 1]) {
    const p = new Path2D(); const xe = sd < 0 ? 0 : W; p.moveTo(xe, base - 2200);
    for (let k = 0; k <= 30; k++) { const y = base - 2200 + k * 110, n = Math.sin(k * 1.7 + sd) * 30 + Math.sin(k * .6) * 50, w = 120 + k * 7 + n; p.lineTo(sd < 0 ? w : W - w, y); }
    p.lineTo(xe, base + 1300); p.closePath();
    g.save(); g.globalAlpha = a; g.fillStyle = '#01070b'; g.fill(p); g.strokeStyle = 'rgba(111,246,255,.25)'; g.lineWidth = 2; g.shadowColor = C.glow; g.shadowBlur = 10; g.stroke(p); g.restore();
  }
}
function floor(c, a) {
  const y = sy(AN[9], c) + 330; if (y > H + 50) return;
  const gr = g.createLinearGradient(0, y - 60, 0, y + 300); gr.addColorStop(0, 'rgba(20,50,58,0)'); gr.addColorStop(.25, `rgba(24,60,68,${.55 * a})`); gr.addColorStop(1, `rgba(4,14,18,${a})`);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * .01) * 14 + Math.sin(x * .031) * 6); g.lineTo(W, H); g.lineTo(0, H); g.fill();
}
const FLASH = D.rng(5), FL = Array.from({ length: 40 }, () => [FLASH() * W, FLASH() * 1400 + 300, FLASH() * 10, 1 + FLASH() * 3, FLASH() > .8 ? '255,179,193' : '111,246,255']);

window.render = t => {
  const c = cam(t), d01 = dark(c.depth);
  D.water(g, W, H, d01, t, true);
  // surface shimmer above us at the start
  const sY = sy(-560, c); if (sY > -80) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(220,255,255,${.35 - k * .1})`; g.lineWidth = 6 - k * 2; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, sY + k * 18 + Math.sin(x * .012 + t * 2 + k) * 12); g.stroke(); } g.restore(); }
  // camera lamp: a soft pool of light once the sun is gone
  if (d01 > .5) { const la = ss((d01 - .5) * 3); const gr = g.createRadialGradient(540, 980, 0, 540, 980, 760); gr.addColorStop(0, `rgba(40,140,160,${.14 * la})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  D.snow(g, W, H, c.px * .9, 170, 7, .4 + .6 * d01);
  // bioluminescent flashes after 1,000 m
  if (c.depth > 900) for (const [x, y, ph, sp, col] of FL) { const v = Math.max(0, Math.sin(t * sp + ph)) ** 8; if (v > .02) D.orb(g, x, (y - c.px * .15) % 1500 + 300, 4 + 4 * v, v * clamp((c.depth - 900) / 300), col); }

  // ---- milestone objects (each anchored in the water column) ----
  const at = (i, dy = 0) => sy(AN[i] + dy, c), L = i => LN[i];
  if (t < 2.4) { for (let i = 0; i < 26; i++) { const r = (i * 73) % 100 / 100, ph = (t * (.5 + r) + r) % 1; D.orb(g, 120 + r * 840 + Math.sin(i + t * 3) * 20, 1900 - ph * 1900 - t * 200, 3 + r * 7, (1 - seg(t, 1.2, 2.4)) * .8, '220,255,255'); } }   // entry bubbles
  { const y = at(1, -80); if (y > -400 && y < 2300) { D.jelly(g, 780, y, 120, t, .7); D.jelly(g, 260, y + 420, 70, t + 2, .45); } }
  { const y = at(2, 0); if (y > -400 && y < 2300) D.diver(g, 560, y, 210, t, 1); }
  { const y = at(3, 40); if (y > -500 && y < 2300) { const a0 = ss(seg(t, L(3).t0 + .2, L(3).t0 + 3.5)); D.angler(g, 590, y, 260, t, .15 + .85 * a0, true); } }
  { const y = at(4, 0), tt = seg(t, L(4).t0 - 1.5, L(4).t1 + 1); if (y > -400 && y < 2300) D.whale(g, lerp(1500, -500, tt), y + Math.sin(tt * 3) * 30, 340, 1); }
  { const y = at(5, -40); if (y > -500 && y < 2400) D.titanicBow(g, 560, y, 440, ss(seg(t, L(5).t0 - 1.2, L(5).t0 + .8)) * .95 + .05); }
  { const y = at(6, 0); if (y > -900 && y < 2600) { D.sonar(g, 540, y, 620, t, .9); D.jelly(g, 760, y - 260, 90, t, .6, '255,179,193'); } }
  { const y = at(7, 0), tt = seg(t, L(7).t0 - 1.5, L(7).t1 + 1.5); if (y > -400 && y < 2300) D.snailfish(g, lerp(-250, 1300, tt), y + Math.sin(t) * 20, 200, t, 1); }
  if (c.k > 6.5) trench(c, ss(seg(c.k, 6.6, 7.6)));
  if (c.k > 7.5) floor(c, 1);
  { const y = at(9, 40), a0 = ss(seg(t, L(9).words.find(w => /bag/.test(w[0]))[1] - 1.6, L(9).words.find(w => /bag/.test(w[0]))[1] - .1)); if (a0 > 0) { const gr = g.createRadialGradient(540, y, 0, 540, y, 420); gr.addColorStop(0, `rgba(160,230,255,${.18 * a0})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); D.bag(g, 540, y + Math.sin(t * .8) * 18, 230, t, a0); } }

  D.vignette(g, W, H, .7);
  const endK = ss(seg(t, TL.end - .4, TL.end + .5));
  hud(c, t, ss(seg(t, .2, .9)) * (1 - endK));
  captions(t);
  if (endK > 0) {   // end card
    g.fillStyle = `rgba(1,3,8,${endK})`; g.fillRect(0, 0, W, H);
    const a = ss(seg(t, TL.end + .1, TL.end + .9)); D.mark(g, 540, 820, 300, t, a);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = '300 52px "Space Grotesk"'; g.letterSpacing = '16px'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 20;
    g.fillText('BELOW ZERO LIGHT', 548, 1120); g.shadowBlur = 0; g.font = '400 30px "JetBrains Mono"'; g.letterSpacing = '6px'; g.fillStyle = C.glow; g.fillText('FOLLOW FOR THE NEXT DIVE', 543, 1200); g.restore();
  }
  // open: fade up from a white splash
  if (t < .8) { g.fillStyle = `rgba(235,255,255,${(1 - t / .8) ** 2})`; g.fillRect(0, 0, W, H); }
  D.grain(g, W, H, .05, Math.floor(t * 30));
};
window.DUR = TL.dur; window.READY = true;
