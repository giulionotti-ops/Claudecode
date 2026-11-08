// Short #4: The Titan sub. A dive log: mission clock, signal lost, oxygen countdown, the debris map.
import * as D from '../../lib/draw.js';
import { setup } from '../../lib/kit.js';
const { C, clamp, lerp, ss, seg } = D;
const { g, TL, LN, T0, word, vis, label, bigNum, finish, W, H } = await setup();
const lost = word(3, 'silent');
const pad = n => String(n).padStart(2, '0');

function hud(t, a) {
  label('DIVE LOG · 18 JUNE 2023 · NORTH ATLANTIC', 540, 150, 20, a * .6, 'rgba(233,251,255,.6)', 'center', 3);
  // mission clock races from launch to 1:45 at "went silent", then freezes
  const m = Math.min(105, Math.max(0, (t - .5) / (lost - .5)) * 105), on = t < lost;
  const clk = `T+${Math.floor(m / 60)}:${pad(Math.floor(m % 60))}:${pad(Math.floor((m * 60) % 60))}`;
  if (t < T0(4) - .4 || t > T0(6) - .4) bigNum(clk, 300, a * (on || Math.floor(t * 2.5) % 2 ? 1 : .35), 120);
  const depth = t < T0(2) ? 0 : t < lost ? lerp(0, 3341, ss(seg(t, T0(2) + 1, lost))) : t < T0(8) - 1 ? 3341 : 3800;
  label(t < lost ? `DEPTH −${Math.round(depth).toLocaleString('en-US')} m · 5 ON BOARD` : 'CONTACT LOST · 3,341 m', 540, 410, 26, a, t < lost ? C.glow : C.amber, 'center', 4);
}
function oxygen(t, a) {   // the 96-hour countdown the world watched
  if (a <= 0) return; const k = seg(t, T0(4) + .3, T0(5) + .3), h = 96 * (1 - k);
  const dead = t > T0(5) - .1;
  g.save(); g.globalAlpha = a; g.font = '200 150px "JetBrains Mono"'; g.letterSpacing = '-4px'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = dead ? 'rgba(233,251,255,.25)' : C.white; g.shadowColor = dead ? 'transparent' : C.amber; g.shadowBlur = 30;
  g.fillText(`${pad(Math.floor(h))}:${pad(Math.floor((h * 60) % 60))}:${pad(Math.floor((h * 3600) % 60))}`, 540, 300); g.restore();
  label(dead ? 'THEY WERE ALREADY GONE' : 'OXYGEN LEFT · ESTIMATED', 540, 410, 26, a, dead ? 'rgba(233,251,255,.6)' : C.amber, 'center', 5);
}
function arrows(cx, cy, R, k, a) {
  g.save(); g.globalAlpha = a; g.strokeStyle = C.amber; g.lineWidth = 6; g.shadowColor = C.amber; g.shadowBlur = 18; g.lineCap = 'round';
  for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2, r0 = R * (1.35 - .25 * k), r1 = R * (.95 - .2 * k), x0 = cx + Math.cos(an) * r0 * 1.4, y0 = cy + Math.sin(an) * r0, x1 = cx + Math.cos(an) * r1 * 1.4, y1 = cy + Math.sin(an) * r1;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.moveTo(x1, y1); g.lineTo(x1 + Math.cos(an + 2.6) * 22, y1 + Math.sin(an + 2.6) * 22); g.moveTo(x1, y1); g.lineTo(x1 + Math.cos(an - 2.6) * 22, y1 + Math.sin(an - 2.6) * 22); g.stroke(); }
  g.restore();
}
function debrisMap(t, a) {   // top-down: the Titanic's bow and Titan's debris field 500 m away
  if (a <= 0) return; const k = ss(seg(t, T0(8) + .2, T0(8) + 2.2));
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(111,246,255,.08)'; g.lineWidth = 1; for (let x = 100; x <= 980; x += 80) { g.beginPath(); g.moveTo(x, 560); g.lineTo(x, 1220); g.stroke(); } for (let y = 560; y <= 1220; y += 80) { g.beginPath(); g.moveTo(100, y); g.lineTo(980, y); g.stroke(); } g.restore();
  const bow = new Path2D(); bow.moveTo(250, 1000); bow.lineTo(420, 960); bow.quadraticCurveTo(520, 945, 560, 990); bow.quadraticCurveTo(520, 1035, 420, 1020); bow.lineTo(250, 1030); bow.closePath();
  g.save(); g.globalAlpha = a; g.strokeStyle = C.glow; g.lineWidth = 3; g.shadowColor = C.glow; g.shadowBlur = 14; g.stroke(bow); g.restore();
  label("TITANIC · BOW", 400, 1080, 22, a * .8);
  const r = D.rng(4); for (let i = 0; i < 26; i++) { const x = 800 + (r() - .5) * 150, y = 720 + (r() - .5) * 120; D.orb(g, x, y, 3 + r() * 5, a * clamp(k * 2 - r()), '255,207,107'); }
  label('TITAN · DEBRIS', 800, 640, 22, a * k, C.amber);
  g.save(); g.globalAlpha = a * k; g.strokeStyle = 'rgba(233,251,255,.7)'; g.setLineDash([10, 10]); g.lineWidth = 2; g.beginPath(); g.moveTo(565, 985); g.lineTo(lerp(565, 760, k), lerp(985, 760, k)); g.stroke(); g.restore();
  label('≈ 500 m', 690, 900, 30, a * k, C.white, 'left', 3);
}

window.render = t => {
  const dk = t < T0(2) ? 0 : t < lost ? ss(seg(t, T0(2) + 1, lost)) * .9 : .95;
  D.water(g, W, H, .05 + dk * .9, t, true); D.snow(g, W, H, t * 40 + dk * 1500, 140, 2, .3 + .7 * dk);
  { const a = vis(t, 0); if (a > 0) { g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(220,255,255,.6)'; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, 600 + Math.sin(x * .012 + t * 2) * 10); g.stroke(); g.restore();
    D.sub(g, 540, 900, 300, t, a); for (let i = 0; i < 5; i++) D.orb(g, 400 + i * 70, 1110, 9, a * ss(seg(t, word(0, 'five') - .2 + i * .08, word(0, 'five') + .3 + i * .08)), '255,230,170'); } }
  { const a = vis(t, 1); if (a > 0) { D.sub(g, 540, 900, 380, t, a); const k = ss(seg(t, word(1, 'carbon') - .2, word(1, 'carbon') + .5)); g.save(); g.globalAlpha = a * k; g.strokeStyle = C.amber; g.lineWidth = 2; g.beginPath(); g.moveTo(560, 820); g.lineTo(700, 680); g.lineTo(880, 680); g.stroke(); g.restore(); label('CARBON FIBRE HULL', 790, 650, 22, a * k, C.amber); } }
  { const a = vis(t, 2); if (a > 0) { D.gamepad(g, 540, 900, 260, a); label('OFF-THE-SHELF GAME CONTROLLER', 540, 1110, 22, a * .8); } }
  { const a = vis(t, 3); if (a > 0) { const y = lerp(800, 960, seg(t, T0(3), lost)); D.sub(g, 540, y, 200, t, a * (t < lost ? 1 : .5)); if (t < lost) D.sonar(g, 540, y, 380, t, a * .6, 2); else label('▲ SIGNAL LOST', 540, 1150, 30, a * (Math.floor(t * 3) % 2 ? 1 : .3), C.amber, 'center', 6); } }
  { const a = vis(t, 4, 5); if (a > 0) { for (let i = 0; i < 3; i++) D.sonar(g, 250 + i * 290, 620, 200, t + i * .7, a * .5, 2); label('SEARCH SHIPS · ROVS · AIRCRAFT', 540, 1100, 22, a * .75); D.sub(g, 540, 940, 160, t, a * (t > T0(5) - .1 ? .15 : .35)); } }
  oxygen(t, vis(t, 4, 5));
  { const a = vis(t, 6); if (a > 0) { D.sub(g, 540, 900, 260, t, a); arrows(540, 900, 230, ss(seg(t, T0(6), T1(6))), a); label('≈ 330 × SURFACE PRESSURE', 540, 1180, 24, a * .85, C.amber); } }
  { const a = vis(t, 7), c = word(7, 'collapsed'); if (a > 0) {
      if (t < c) { D.sub(g, 540 + Math.sin(t * 60) * 3 * seg(t, c - 1, c), 900, 260, t, a); arrows(540, 900, 230, 1, a); }
      else { const k = seg(t, c, c + 2.5), r = D.rng(9); for (let i = 0; i < 40; i++) { const an = r() * 7, d = (60 + r() * 380) * ss(k); g.save(); g.globalAlpha = a * (1 - k * .6); g.translate(540 + Math.cos(an) * d, 900 + Math.sin(an) * d * .7 + k * k * 120); g.rotate(r() * 6 + k * 3); g.strokeStyle = C.glow; g.lineWidth = 2; g.strokeRect(-6 - r() * 14, -3, 12 + r() * 28, 6); g.restore(); }
        const fl = Math.max(0, 1 - (t - c) / .35); if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl * .85})`; g.fillRect(0, 0, W, H); }
        label('A FEW MILLISECONDS', 540, 1180, 30, a * ss(seg(t, c + .4, c + 1)), C.white, 'center', 3); } } }
  debrisMap(t, vis(t, 8));
  { const a = vis(t, 9); if (a > 0) { for (let i = 0; i < 5; i++) { const k = seg(t, T0(9) + i * .25, TL.end + 1); D.orb(g, 380 + i * 80, lerp(1050, 650, ss(k)), 10, a * (1 - k * .7), '255,230,170'); } label('1912 · 2023', 540, 1150, 30, a * ss(seg(t, word(9, 'titanic'), word(9, 'titanic') + .6)), 'rgba(233,251,255,.8)', 'center', 8); } }
  if (t < T0(4) - .45 || t > T0(6) - .45) hud(t, ss(seg(t, .1, .7)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3)))); else oxygen(t, 0);
  finish(t);
};
function T1(i) { return LN[i].t1; }
window.DUR = TL.dur; window.READY = true;
