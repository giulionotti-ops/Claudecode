// Below Zero Light: shared drawing kit (brand art + shorts). Plain canvas 2D, no dependencies.
// Look: near-black water, glowing cyan line light, marine snow, sonar rings, thin mono numbers.
export const C = {
  abyss: '#010308', deep: '#03111c', mid: '#06283a', teal: '#0d5a6e', surf: '#2e9fb0',
  glow: '#6ff6ff', glowSoft: 'rgba(111,246,255,', pink: '#ffb3c1', white: '#e9fbff', amber: '#ffcf6b',
};
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mixHex = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };

// Water column. depth01: 0 = surface, 1 = hadal black. Optional rays.
export function water(g, w, h, depth01, t = 0, rays = true) {
  const d = clamp(depth01);
  const top = d < .5 ? mixHex(C.surf, C.mid, d * 2) : mixHex(C.mid, C.abyss, Math.min(1, (d - .5) * 2.4));
  const bot = d < .3 ? mixHex(C.mid, C.deep, d / .3) : mixHex(C.deep, C.abyss, Math.min(1, (d - .3) * 2));
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (rays && d < .45) {
    const a = (1 - d / .45) ** 1.6; g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const x = w * (.1 + i * .14) + Math.sin(t * .35 + i * 1.7) * w * .04, sw = w * (.04 + .03 * Math.sin(i * 2.3 + t * .2) ** 2);
      const gr2 = g.createLinearGradient(0, 0, 0, h * .95); gr2.addColorStop(0, `rgba(190,250,255,${.13 * a})`); gr2.addColorStop(1, 'rgba(190,250,255,0)');
      g.fillStyle = gr2; g.beginPath(); g.moveTo(x - sw * .4, 0); g.lineTo(x + sw * .4, 0); g.lineTo(x + sw * 2.2 + w * .12, h); g.lineTo(x - sw * .6 + w * .12, h); g.fill();
    }
    g.restore();
  }
}
export function vignette(g, w, h, k = .75) {
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.hypot(w, h) * .6);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
// Marine snow drifting up past the camera (rise = how far we've sunk, in px).
export function snow(g, w, h, rise = 0, n = 160, seed = 7, a = 1) {
  const r = rng(seed); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = r(), x = (r() * w + Math.sin(rise * .002 + i) * 14 * z) % w, size = .6 + z * z * 4.5;
    let y = (r() * h * 1.2 - rise * (.25 + z * 1.1)) % (h * 1.2); if (y < 0) y += h * 1.2; y -= h * .1;
    const al = (.12 + .45 * z) * a * (z > .85 ? .35 : 1);
    g.fillStyle = `rgba(210,245,255,${al})`; g.beginPath(); g.arc(x, y, size, 0, 7); g.fill();
    if (z > .85) { g.fillStyle = `rgba(210,245,255,${al * .25})`; g.beginPath(); g.arc(x, y, size * 2.6, 0, 7); g.fill(); }
  }
  g.restore();
}
// Grain keeps the gradients from banding on YouTube's encoder.
let grainTile = null;
export function grain(g, w, h, a = .06, seed = 1) {
  if (!grainTile) { grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 256; const x = grainTile.getContext('2d'), im = x.createImageData(256, 256), r = rng(99); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; const o = (seed * 97) % 256;
  g.translate(-o, -((seed * 53) % 256)); g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w + 256, h + 256); g.restore();
}
export function orb(g, x, y, r, a = 1, col = '111,246,255') {   // bioluminescent point light
  g.save(); g.globalCompositeOperation = 'lighter';
  let gr = g.createRadialGradient(x, y, 0, x, y, r * 9); gr.addColorStop(0, `rgba(${col},${.35 * a})`); gr.addColorStop(.3, `rgba(${col},${.1 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 9, 0, 7); g.fill();
  gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.45, `rgba(${col},${.9 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore();
}
export function sonar(g, x, y, R, t = 0, a = 1, rings = 4) {   // expanding sonar rings + static range rings
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = C.glow;
  for (let i = 1; i <= rings; i++) { g.globalAlpha = .1 * a; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, R * i / rings, 0, 7); g.stroke(); }
  for (let k = 0; k < 2; k++) { const p = ((t * .45 + k * .5) % 1); g.globalAlpha = (1 - p) ** 2 * .7 * a; g.lineWidth = 3 * (1 - p) + 1; g.beginPath(); g.arc(x, y, R * p, 0, 7); g.stroke(); }
  g.restore();
}
function glowStroke(g, path, col, w, a, blur) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = col; g.lineCap = g.lineJoin = 'round';
  g.shadowColor = col; g.shadowBlur = blur; g.globalAlpha = a * .5; g.lineWidth = w * 2.5; g.stroke(path);
  g.shadowBlur = blur * .4; g.globalAlpha = a; g.lineWidth = w; g.stroke(path); g.restore();
}

// ---------- creatures & objects: line light on black. (x, y) centre, s = half-length in px ----------
export function angler(g, x, y, s, t = 0, a = 1, flip = false) {
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  const P = (px, py) => [px * s, py * s];
  const body = new Path2D(); const m = (...p) => body.moveTo(...P(...p)), b = (a1, a2, c1, c2, d1, d2) => body.bezierCurveTo(...P(a1, a2), ...P(c1, c2), ...P(d1, d2)), l = (...p) => body.lineTo(...P(...p));
  m(.86, -.16); b(.7, -.62, .05, -.7, -.55, -.42); b(-.75, -.3, -.88, -.15, -.98, -.05);
  l(-1.32, -.42); b(-1.22, -.1, -1.22, .12, -1.34, .34); l(-.98, .08);
  b(-.6, .5, .2, .72, .82, .4); b(.95, .33, 1.06, .22, 1.08, .1); l(.66, .08); l(.86, -.16);
  const lure = [1.32 * s, -.98 * s + Math.sin(t * 1.3) * .03 * s];
  // body lit by its own lure
  const gr = g.createRadialGradient(lure[0], lure[1], 0, lure[0], lure[1], s * 2.4);
  gr.addColorStop(0, 'rgba(30,110,130,.95)'); gr.addColorStop(.45, 'rgba(6,30,42,.98)'); gr.addColorStop(1, 'rgba(2,6,10,1)');
  g.globalAlpha = a; g.fillStyle = gr; g.fill(body);
  glowStroke(g, body, C.glow, Math.max(1, s * .012), .55 * a, s * .05);
  // fin rays, lateral line
  const fins = new Path2D(); for (let i = 0; i < 5; i++) { fins.moveTo(...P(-.98, -.05 + i * .03)); fins.lineTo(...P(-1.3 + i * .005, -.38 + i * .17)); }
  fins.moveTo(...P(-.2, .25)); fins.quadraticCurveTo(...P(-.35, .45), ...P(-.5, .42)); fins.moveTo(...P(-.2, .25)); fins.quadraticCurveTo(...P(-.3, .55), ...P(-.42, .58));
  fins.moveTo(...P(.5, -.05)); fins.quadraticCurveTo(...P(0, .05), ...P(-.8, -.02));
  glowStroke(g, fins, C.glow, Math.max(.8, s * .006), .3 * a, s * .03);
  // teeth: upper row hangs down, lower row stands up
  const teeth = new Path2D(); const T = (x0, y0, x1, y1) => { teeth.moveTo(...P(x0 - .025, y0)); teeth.lineTo(...P(x1, y1)); teeth.lineTo(...P(x0 + .025, y0)); };
  for (let i = 0; i < 7; i++) { const k = i / 6, x0 = lerp(.86, .68, k), y0 = lerp(-.16, .02, k); T(x0, y0, x0 - .02, y0 + .22 - k * .08); }
  for (let i = 0; i < 7; i++) { const k = i / 6, x0 = lerp(1.06, .7, k), y0 = lerp(.12, .1, k); T(x0, y0, x0 + .01, y0 - .24 + k * .09); }
  g.save(); g.fillStyle = 'rgba(225,250,255,.92)'; g.shadowColor = C.glow; g.shadowBlur = s * .04; g.globalAlpha = a; g.fill(teeth); g.restore();
  // eye
  orb(g, ...P(.5, -.3), s * .035, .6 * a, '180,240,255');
  // illicium (the rod) and the lure
  const rod = new Path2D(); rod.moveTo(...P(.42, -.58)); rod.bezierCurveTo(...P(.55, -1.25), ...P(1.15, -1.3), lure[0], lure[1]);
  glowStroke(g, rod, C.glow, Math.max(1, s * .01), .7 * a, s * .04);
  orb(g, lure[0], lure[1], s * .09 * (1 + .08 * Math.sin(t * 3)), a);
  g.restore();
}
export function jelly(g, x, y, s, t = 0, a = 1, col = '111,246,255') {
  g.save(); g.translate(x, y + Math.sin(t * 1.1) * s * .04); const pulse = 1 + .07 * Math.sin(t * 2.2);
  const bell = new Path2D(); bell.moveTo(-s * .5 * pulse, 0); bell.bezierCurveTo(-s * .55 * pulse, -s * .7, s * .55 * pulse, -s * .7, s * .5 * pulse, 0);
  for (let i = 4; i >= -4; i--) bell.quadraticCurveTo(s * (i + .5) / 8 * pulse, s * .07, s * i / 8 * pulse, 0);
  const gr = g.createRadialGradient(0, -s * .3, 0, 0, -s * .2, s * .6); gr.addColorStop(0, `rgba(${col},${.45 * a})`); gr.addColorStop(1, `rgba(${col},${.05 * a})`);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fill(bell); g.restore();
  glowStroke(g, bell, `rgb(${col})`, Math.max(1, s * .015), .8 * a, s * .1);
  const ten = new Path2D();
  for (let i = -5; i <= 5; i++) { const x0 = i * s * .085 * pulse; ten.moveTo(x0, s * .02); for (let k = 1; k <= 14; k++) ten.lineTo(x0 + Math.sin(t * 1.6 + k * .55 + i) * s * .06 * k / 14 * 2, s * .02 + k * s * (.08 + .03 * Math.abs(i % 3))); }
  glowStroke(g, ten, `rgb(${col})`, Math.max(.7, s * .006), .45 * a, s * .05);
  const arms = new Path2D(); for (let i = -1; i <= 1; i += 2) { arms.moveTo(i * s * .08, 0); arms.bezierCurveTo(i * s * .15, s * .4, -i * s * .1, s * .7, i * s * .05 + Math.sin(t) * s * .05, s * 1.0); }
  glowStroke(g, arms, `rgb(${col})`, Math.max(1, s * .02), .5 * a, s * .06);
  g.restore();
}
export function eye(g, x, y, s, t = 0, a = 1) {   // a giant squid eye opening in the dark
  g.save(); g.translate(x, y); const open = .55 + .45 * ss(Math.sin(t * .4) * .5 + .5);
  const lid = new Path2D(); lid.moveTo(-s, 0); lid.bezierCurveTo(-s * .4, -s * .75 * open, s * .4, -s * .75 * open, s, 0); lid.bezierCurveTo(s * .4, s * .7 * open, -s * .4, s * .7 * open, -s, 0);
  g.save(); g.clip(lid);
  let gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .62); gr.addColorStop(0, '#000'); gr.addColorStop(.28, '#000'); gr.addColorStop(.33, `rgba(111,246,255,${a})`); gr.addColorStop(.7, `rgba(20,120,140,${.8 * a})`); gr.addColorStop(1, 'rgba(3,20,28,1)');
  g.fillStyle = '#02080c'; g.fillRect(-s, -s, s * 2, s * 2); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * .62, 0, 7); g.fill();
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(160,250,255,${.25 * a})`; g.lineWidth = Math.max(1, s * .008);
  for (let i = 0; i < 64; i++) { const an = i / 64 * Math.PI * 2, r0 = s * (.22 + .02 * Math.sin(i * 7)), r1 = s * (.5 + .08 * Math.sin(i * 3.3)); g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); g.stroke(); }
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, s * .2, s * .17 * (.6 + .4 * open), 0, 0, 7); g.fill();
  g.fillStyle = `rgba(255,255,255,${.9 * a})`; g.beginPath(); g.ellipse(-s * .12, -s * .1, s * .05, s * .035, -.5, 0, 7); g.fill();
  g.restore(); glowStroke(g, lid, C.glow, Math.max(1, s * .015), .8 * a, s * .08);
  const fold = new Path2D(); fold.moveTo(-s * 1.15, -s * .05); fold.bezierCurveTo(-s * .5, -s * .95 * open, s * .5, -s * .95 * open, s * 1.15, -s * .05);
  glowStroke(g, fold, C.glow, Math.max(.8, s * .007), .3 * a, s * .04);
  g.restore();
}
export function snailfish(g, x, y, s, t = 0, a = 1) {   // pale, soft, tadpole-shaped hadal fish
  g.save(); g.translate(x, y); const w = Math.sin(t * 2.4) * .08;
  const p = new Path2D(); p.moveTo(s * .62, 0); p.bezierCurveTo(s * .62, -s * .34, s * .05, -s * .4, -s * .25, -s * .16);
  p.bezierCurveTo(-s * .6, -s * (.06 + w), -s * .9, -s * (.05 - w), -s * 1.0, s * w * 1.5); p.bezierCurveTo(-s * .9, s * (.06 + w), -s * .6, s * (.1 + w), -s * .25, s * .17);
  p.bezierCurveTo(s * .05, s * .4, s * .62, s * .34, s * .62, 0);
  const gr = g.createLinearGradient(-s, 0, s * .6, 0); gr.addColorStop(0, `rgba(255,179,193,${.08 * a})`); gr.addColorStop(1, `rgba(255,205,215,${.4 * a})`);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fill(p); g.restore();
  glowStroke(g, p, C.pink, Math.max(1, s * .015), .75 * a, s * .07);
  orb(g, s * .36, -s * .1, s * .04, .7 * a, '255,220,228');
  g.restore();
}
export function whale(g, x, y, s, a = 1) {   // beaked whale side profile, facing left, diving
  g.save(); g.translate(x, y);
  const p = new Path2D(); p.moveTo(-s, s * .02); p.quadraticCurveTo(-s * .9, -s * .06, -s * .78, -s * .07); p.bezierCurveTo(-s * .6, -s * .2, -s * .1, -s * .2, s * .3, -s * .12);
  p.lineTo(s * .36, -s * .2); p.lineTo(s * .42, -s * .1); p.bezierCurveTo(s * .65, -s * .06, s * .82, -s * .02, s * .9, 0);
  p.lineTo(s * 1.08, -s * .14); p.quadraticCurveTo(s * 1.02, 0, s * 1.1, s * .14); p.lineTo(s * .9, s * .03);
  p.bezierCurveTo(s * .5, s * .14, -s * .3, s * .2, -s * .76, s * .06); p.quadraticCurveTo(-s * .9, s * .06, -s, s * .02);
  g.fillStyle = `rgba(2,10,16,${a})`; g.fill(p); glowStroke(g, p, C.glow, Math.max(1, s * .01), .6 * a, s * .04);
  const fin = new Path2D(); fin.moveTo(-s * .42, s * .1); fin.quadraticCurveTo(-s * .38, s * .25, -s * .28, s * .27); glowStroke(g, fin, C.glow, Math.max(1, s * .008), .45 * a, s * .03);
  orb(g, -s * .66, -s * .04, s * .012, .7 * a);
  g.restore();
}
export function diver(g, x, y, s, t = 0, a = 1) {   // silhouette against the light, fins kicking, head down
  g.save(); g.translate(x, y); g.rotate(.25); const k = Math.sin(t * 3) * .12;
  const p = new Path2D();
  p.ellipse(0, -s * .62, s * .1, s * .11, 0, 0, 7);                           // head
  p.moveTo(-s * .14, -s * .48); p.lineTo(s * .14, -s * .48); p.lineTo(s * .12, s * .02); p.lineTo(-s * .12, s * .02); p.closePath();   // torso
  p.rect(s * .12, -s * .46, s * .1, s * .36);                                 // tank
  for (const sd of [-1, 1]) { p.moveTo(sd * s * .07, 0); p.lineTo(sd * s * (.09 + k * sd * .3), s * .45); p.lineTo(sd * s * (.03 + k * sd * .3), s * .45); p.lineTo(sd * s * .0, 0); p.closePath();
    p.moveTo(sd * s * (.06 + k * sd * .3), s * .45); p.lineTo(sd * s * (.16 + k * sd * .8), s * .78); p.lineTo(sd * s * (-.02 + k * sd * .8), s * .78); p.closePath(); }
  for (const sd of [-1, 1]) { p.moveTo(sd * s * .12, -s * .46); p.lineTo(sd * s * .3, -s * .78); p.lineTo(sd * s * .25, -s * .8); p.lineTo(sd * s * .07, -s * .44); p.closePath(); }
  g.fillStyle = `rgba(1,10,16,${.92 * a})`; g.fill(p); glowStroke(g, p, '#bff8ff', Math.max(1, s * .01), .35 * a, s * .04);
  g.restore();
  for (let i = 0; i < 6; i++) { const ph = (t * .6 + i / 6) % 1; orb(g, x + s * .25 + Math.sin(i * 5 + ph * 6) * s * .06, y - s * .6 - ph * s * 1.4, s * (.012 + .01 * (i % 3)), (1 - ph) * .7 * a, '200,250,255'); }
}
export function titanicBow(g, x, y, s, a = 1) {   // generic liner bow wreck on the sea floor (no logos, simple form)
  g.save(); g.translate(x, y);
  const hull = new Path2D(); hull.moveTo(-s, -s * .05); hull.lineTo(s * .75, -s * .22); hull.quadraticCurveTo(s * .95, -s * .25, s * 1.0, -s * .2);
  hull.lineTo(s * .86, s * .28); hull.lineTo(-s, s * .3); hull.closePath();
  g.fillStyle = `rgba(2,9,14,${a})`; g.fill(hull); glowStroke(g, hull, C.glow, Math.max(1, s * .008), .55 * a, s * .03);
  const det = new Path2D();
  det.moveTo(-s * .95, s * .02); det.lineTo(s * .8, -s * .14);                              // deck line
  for (let i = 0; i < 16; i++) { const px = -s * .85 + i * s * .1, py = lerp(s * .1, -s * .05, (px + s) / (s * 1.8)); det.moveTo(px + s * .012, py); det.arc(px, py, s * .012, 0, 7); }   // portholes
  det.moveTo(s * .5, -s * .17); det.lineTo(s * .35, -s * .65); det.moveTo(s * .35, -s * .65); det.lineTo(s * .95, -s * .21);   // fallen mast + stay
  det.moveTo(-s * .45, -s * .02); det.lineTo(-s * .45, -s * .14); det.lineTo(-s * .2, -s * .17); det.lineTo(-s * .2, -s * .05);   // deck house
  glowStroke(g, det, C.glow, Math.max(.8, s * .005), .4 * a, s * .02);
  // rusticles hanging off the rail
  const r = rng(3), rus = new Path2D(); for (let i = 0; i < 30; i++) { const px = lerp(-s * .9, s * .7, r()), py = lerp(s * .0, -s * .2, (px + s) / (s * 1.8)); rus.moveTo(px, py); rus.lineTo(px + r() * 4 - 2, py + s * (.03 + r() * .08)); }
  glowStroke(g, rus, C.amber, Math.max(.8, s * .004), .3 * a, s * .02);
  // sediment floor
  const fl = g.createLinearGradient(0, s * .2, 0, s * .6); fl.addColorStop(0, `rgba(30,70,80,${.0})`); fl.addColorStop(.3, `rgba(30,70,80,${.35 * a})`); fl.addColorStop(1, `rgba(3,12,16,${a})`);
  g.fillStyle = fl; g.fillRect(-s * 2, s * .2, s * 4, s * .6);
  g.restore();
}
export function bag(g, x, y, s, t = 0, a = 1) {   // a plastic bag, ghostly, drifting
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * .7) * .12); const f = Math.sin(t * 1.3) * .06;
  const p = new Path2D(); p.moveTo(-s * .38, -s * .6); p.quadraticCurveTo(-s * .3, -s * .4, -s * .18, -s * .42); p.quadraticCurveTo(-s * .14, -s * .64, -s * .3, -s * .72);
  p.moveTo(-s * .18, -s * .42); p.lineTo(s * .18, -s * .42); p.moveTo(s * .38, -s * .6); p.quadraticCurveTo(s * .3, -s * .4, s * .18, -s * .42); p.quadraticCurveTo(s * .14, -s * .64, s * .3, -s * .72);
  const body = new Path2D(); body.moveTo(-s * .38, -s * .6); body.bezierCurveTo(-s * (.55 + f), -s * .1, -s * (.5 - f), s * .5, -s * .3, s * .62);
  body.quadraticCurveTo(-s * .1, s * (.5 + f), 0, s * .66); body.quadraticCurveTo(s * .15, s * (.52 - f), s * .32, s * .62); body.bezierCurveTo(s * (.5 + f), s * .4, s * (.55 - f), -s * .1, s * .38, -s * .6);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(200,240,255,${.08 * a})`; g.fill(body); g.restore();
  glowStroke(g, body, '#d8f6ff', Math.max(1, s * .012), .55 * a, s * .06); glowStroke(g, p, '#d8f6ff', Math.max(1, s * .012), .55 * a, s * .06);
  const cr = new Path2D(); cr.moveTo(-s * .2, -s * .2); cr.quadraticCurveTo(-s * .05, s * .1, -s * .15, s * .4); cr.moveTo(s * .1, -s * .3); cr.quadraticCurveTo(s * .25, 0, s * .12, s * .35);
  glowStroke(g, cr, '#d8f6ff', Math.max(.7, s * .006), .25 * a, s * .03);
  g.restore();
}
// The channel mark: an angler's rod, abstracted: one line hooking down to a single point of light, with sonar arcs.
export function mark(g, x, y, s, t = 0, a = 1) {
  g.save(); g.translate(x, y);
  const lx = s * .18, ly = s * .2;
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = C.glow;
  for (let i = 1; i <= 3; i++) { g.globalAlpha = (.5 - i * .12) * a; g.lineWidth = Math.max(1, s * .014); g.beginPath(); g.arc(lx, ly, s * .17 * i, Math.PI * .15, Math.PI * .85); g.stroke(); }
  g.globalAlpha = 1;
  const rod = new Path2D(); rod.moveTo(-s * .55, s * .5); rod.bezierCurveTo(-s * .55, -s * .55, s * .45, -s * .75, s * .5, -s * .2); rod.quadraticCurveTo(s * .52, s * .05, lx, ly - s * .07);
  glowStroke(g, rod, C.glow, Math.max(1.5, s * .03), .95 * a, s * .07);
  orb(g, lx, ly, s * .09 * (1 + .06 * Math.sin(t * 2.5)), a);
  g.restore();
}
export function fmtDepth(m) { return '−' + Math.round(m).toLocaleString('en-US') + ' m'; }

// Orthographic globe: graticule + rough coastlines. lon0/lat0 = the point facing us. Returns a projector.
const COAST = {
  samerica: [[-80,10],[-75,11],[-62,10],[-52,5],[-35,-5],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-65,-41],[-68,-50],[-70,-55],[-74,-52],[-73,-45],[-72,-35],[-71,-25],[-70,-18],[-76,-14],[-81,-6],[-80,0],[-78,7],[-80,10]],
  namerica: [[-78,7],[-83,9],[-87,13],[-92,15],[-97,16],[-105,20],[-110,24],[-112,29],[-117,33],[-121,36],[-124,41],[-124,48],[-130,55],[-140,60],[-152,58],[-165,62],[-168,66]],
  australia: [[114,-22],[114,-34],[118,-35],[129,-32],[138,-35],[146,-39],[150,-37],[153,-28],[146,-19],[142,-11],[136,-12],[130,-12],[122,-17],[114,-22]],
  antarctica: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, -71 + 2 * Math.sin(i * .35) + 1.2 * Math.sin(i * .9)]),
};
export function globe(g, cx, cy, R, lon0, lat0, a = 1) {
  const r = Math.PI / 180, cl = Math.cos(lat0 * r), sl = Math.sin(lat0 * r);
  const P = (lon, lat) => { const x = Math.cos(lat * r) * Math.sin((lon - lon0) * r), y = cl * Math.sin(lat * r) - sl * Math.cos(lat * r) * Math.cos((lon - lon0) * r), z = sl * Math.sin(lat * r) + cl * Math.cos(lat * r) * Math.cos((lon - lon0) * r); return [cx + x * R, cy - y * R, z]; };
  g.save();
  const gr = g.createRadialGradient(cx - R * .3, cy - R * .3, 0, cx, cy, R); gr.addColorStop(0, `rgba(10,60,76,${.55 * a})`); gr.addColorStop(1, `rgba(2,12,18,${.9 * a})`);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  const line = (pts, col, w, al) => { g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = al * a; g.beginPath(); let pen = false; for (const [lo, la] of pts) { const [x, y, z] = P(lo, la); if (z > 0) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false; } g.stroke(); };
  for (let la = -75; la <= 75; la += 15) line(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, la]), C.glow, 1, .16);
  for (let lo = -180; lo < 180; lo += 15) line(Array.from({ length: 37 }, (_, i) => [lo, -90 + i * 5]), C.glow, 1, .16);
  g.shadowColor = C.glow; g.shadowBlur = 10; for (const k in COAST) line(COAST[k], C.glow, 2.5, .8);
  g.shadowBlur = 0; g.globalAlpha = .6 * a; g.strokeStyle = C.glow; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  g.restore(); return P;
}
// A tabular iceberg at the waterline (y = waterline). crack 0..1 runs a fracture down it; split 0..1 tips the right slab away.
export function iceberg(g, x, y, s, crack = 0, split = 0, t = 0, a = 1) {
  const CUT = [[.18, -.36], [.22, -.1], [.15, .2], [.21, .55], [.16, 1.06]];
  const LEFT = [[-1, -.32], [-.6, -.36], [-.1, -.34], ...CUT, [-.5, .95], [-1.05, .3]];
  const RIGHT = [[.35, -.37], [1, -.33], [1.05, .25], [.7, .9], [.16, 1.06], ...CUT.slice(0, -1).reverse()];
  const slab = (pts, dx, dy, rot, px, py) => {
    g.save(); g.translate(x + dx * s, y + dy * s); g.translate(px * s, py * s); g.rotate(rot); g.translate(-px * s, -py * s);
    const p = new Path2D(); pts.forEach(([u, v], i) => i ? p.lineTo(u * s, v * s) : p.moveTo(u * s, v * s)); p.closePath();
    const gr = g.createLinearGradient(0, -.4 * s, 0, 1.1 * s); gr.addColorStop(0, `rgba(210,250,255,${.6 * a})`); gr.addColorStop(.28, `rgba(70,180,210,${.32 * a})`); gr.addColorStop(1, `rgba(10,50,70,${.12 * a})`);
    g.fillStyle = gr; g.fill(p); g.strokeStyle = `rgba(210,250,255,${.85 * a})`; g.lineWidth = Math.max(1.5, s * .006); g.shadowColor = C.glow; g.shadowBlur = s * .04; g.stroke(p);
    // strata lines in the ice
    g.shadowBlur = 0; g.globalAlpha = .25 * a; g.beginPath(); for (let k = 1; k < 6; k++) { const v = -.32 + k * .22; g.moveTo(-1.1 * s, v * s); g.lineTo(1.1 * s, (v + .02) * s); } g.save(); g.clip(p); g.stroke(); g.restore();
    g.restore();
  };
  const e = ss(split);
  slab(LEFT, -e * .05, 0, -e * .04, -1, 1);
  slab(RIGHT, e * .35, e * .12, e * .5, .2, 1.06);
  if (crack > 0 && e < .2) {   // the fracture racing down the cut line
    const pts = CUT, tot = crack * (pts.length - 1), n = Math.floor(tot), f = tot - n;
    g.save(); g.translate(x, y); g.strokeStyle = `rgba(255,255,255,${a * (1 - e * 5)})`; g.lineWidth = Math.max(2, s * .01); g.shadowColor = '#fff'; g.shadowBlur = s * .06;
    g.beginPath(); g.moveTo(pts[0][0] * s, pts[0][1] * s); for (let i = 1; i <= n; i++) g.lineTo(pts[i][0] * s, pts[i][1] * s);
    if (n < pts.length - 1) g.lineTo(lerp(pts[n][0], pts[n + 1][0], f) * s, lerp(pts[n][1], pts[n + 1][1], f) * s); g.stroke();
    const r = rng(8); g.lineWidth = Math.max(1, s * .004); for (let i = 0; i <= n; i++) { const [u, v] = pts[i]; g.beginPath(); g.moveTo(u * s, v * s); g.lineTo((u + (r() - .5) * .35) * s, (v + r() * .1) * s); g.stroke(); }
    g.restore();
  }
  // waterline
  g.save(); g.strokeStyle = `rgba(111,246,255,${.5 * a})`; g.lineWidth = 2; g.beginPath(); for (let u = -1.6; u <= 1.6; u += .02) g.lineTo(x + u * s, y + Math.sin(u * 9 + t * 2) * s * .01); g.stroke(); g.restore();
}

// Greenland shark: thick slow body, blunt snout, tiny fins. Faces left. xray = see-through body.
export function shark(g, x, y, s, t = 0, a = 1, opt = {}) {
  g.save(); g.translate(x, y); if (opt.flip) g.scale(-1, 1); const w = Math.sin(t * 1.4) * .025;
  const P = (u, v) => [u * s, (v + (u > .3 ? w * (u - .3) * 2.2 : 0)) * s];
  const p = new Path2D(); const M = (u, v) => p.moveTo(...P(u, v)), Lt = (u, v) => p.lineTo(...P(u, v)), B = (a1, b1, a2, b2, a3, b3) => p.bezierCurveTo(...P(a1, b1), ...P(a2, b2), ...P(a3, b3));
  M(-1, .03); B(-1, -.13, -.82, -.2, -.5, -.2); B(-.2, -.2, 0, -.19, .06, -.18); Lt(.13, -.27); Lt(.2, -.17);
  B(.32, -.15, .42, -.14, .48, -.13); Lt(.55, -.2); Lt(.6, -.11); B(.7, -.08, .78, -.06, .84, -.05);
  Lt(1.18, -.3); B(1.12, -.15, 1.08, -.04, 1.03, .02); Lt(1.1, .14); Lt(.84, .05);
  B(.65, .1, .5, .12, .45, .12); Lt(.42, .2); Lt(.36, .13); B(.1, .17, -.2, .19, -.42, .17);
  B(-.65, .15, -.85, .14, -.95, .09); B(-.99, .07, -1, .05, -1, .03);
  if (!opt.xray) { const gr = g.createLinearGradient(0, -.2 * s, 0, .2 * s); gr.addColorStop(0, `rgba(10,40,52,${a})`); gr.addColorStop(1, `rgba(3,14,20,${a})`); g.fillStyle = gr; g.fill(p); }
  else { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(111,246,255,${.06 * a})`; g.fill(p); g.restore(); }
  glowStroke(g, p, C.glow, Math.max(1.2, s * .008), .75 * a, s * .03);
  const d = new Path2D(); for (let i = 0; i < 5; i++) { d.moveTo(...P(-.62 + i * .035, -.04)); d.lineTo(...P(-.63 + i * .035, .08)); }
  d.moveTo(...P(-.44, .15)); d.lineTo(...P(-.3, .34)); d.lineTo(...P(-.25, .17));   // pectoral fin
  d.moveTo(...P(-.86, .07)); d.quadraticCurveTo(...P(-.8, .1), ...P(-.74, .08));   // mouth
  for (let i = 0; i < 26; i++) { const u = -.7 + i * .06; d.moveTo(...P(u, -.15 + Math.sin(i) * .02)); d.lineTo(...P(u + .01, -.14 + Math.sin(i) * .02)); }   // speckles
  glowStroke(g, d, C.glow, Math.max(.8, s * .005), .45 * a, s * .02);
  orb(g, ...P(-.8, -.07), s * .018, .8 * a, '200,245,255');
  if (opt.parasite) { const q = new Path2D(); const [ex, ey] = P(-.8, -.07); q.moveTo(ex, ey); q.bezierCurveTo(ex + s * .02, ey + s * .05, ex - s * .03 + Math.sin(t * 2) * s * .01, ey + s * .08, ex + Math.sin(t * 2.3) * s * .015, ey + s * .12); glowStroke(g, q, C.pink, Math.max(1.5, s * .012), opt.parasite * a, s * .03); orb(g, ex + Math.sin(t * 2.3) * s * .015, ey + s * .12, s * .012, opt.parasite * a, '255,179,193'); }
  g.restore();
}
export function bear(g, x, y, s, a = 1, col = C.glow) {   // polar bear, side view, walking left
  g.save(); g.translate(x, y);
  const pts = [[-1, -.05], [-.95, -.18], [-.86, -.24], [-.8, -.3], [-.74, -.25], [-.6, -.2], [-.4, -.33], [0, -.4], [.4, -.42], [.7, -.36], [.85, -.2], [.86, .05], [.82, .4], [.7, .4], [.68, .12], [.55, .1], [.5, .4], [.38, .4], [.38, .1], [-.2, .08], [-.28, .4], [-.4, .4], [-.42, .08], [-.55, .06], [-.6, .4], [-.72, .4], [-.7, .02], [-.85, 0], [-.97, .02]];
  const p = new Path2D(); pts.forEach(([u, v], i) => i ? p.lineTo(u * s, v * s) : p.moveTo(u * s, v * s)); p.closePath();
  glowStroke(g, p, col, Math.max(1.2, s * .012), .8 * a, s * .04); orb(g, -.85 * s, -.17 * s, s * .02, a);
  g.restore();
}
export function walker(g, x, y, s, t = 0, a = 1) {   // a person walking right, line figure
  g.save(); g.translate(x, y); const k = Math.sin(t * 6);
  const p = new Path2D(); p.arc(0, -s * .85, s * .1, 0, 7); p.moveTo(0, -s * .74); p.lineTo(0, -s * .25);
  p.moveTo(0, -s * .25); p.lineTo(k * s * .18, s * .2); p.moveTo(0, -s * .25); p.lineTo(-k * s * .18, s * .2);
  p.moveTo(0, -s * .62); p.lineTo(-k * s * .16, -s * .32); p.moveTo(0, -s * .62); p.lineTo(k * s * .16, -s * .32);
  glowStroke(g, p, C.white, Math.max(2, s * .03), .85 * a, s * .06); g.restore();
}

// Small crewed submersible: a cylinder with a domed viewport, end cap and thruster pods. Faces left.
export function sub(g, x, y, s, t = 0, a = 1) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * .7) * .02);
  const p = new Path2D(); p.moveTo(-s * .55, -s * .2); p.lineTo(s * .7, -s * .2); p.arcTo(s * .9, -s * .2, s * .9, 0, s * .2); p.arcTo(s * .9, s * .2, s * .7, s * .2, s * .2); p.lineTo(-s * .55, s * .2); p.closePath();
  const gr = g.createLinearGradient(0, -s * .2, 0, s * .2); gr.addColorStop(0, `rgba(30,70,84,${a})`); gr.addColorStop(1, `rgba(6,20,28,${a})`); g.fillStyle = gr; g.fill(p);
  glowStroke(g, p, C.glow, Math.max(1.2, s * .012), .8 * a, s * .05);
  const dome = new Path2D(); dome.moveTo(-s * .55, -s * .2); dome.bezierCurveTo(-s * .85, -s * .2, -s * .85, s * .2, -s * .55, s * .2);
  glowStroke(g, dome, C.glow, Math.max(1.2, s * .012), .8 * a, s * .05);
  g.save(); g.globalCompositeOperation = 'lighter'; const vg = g.createRadialGradient(-s * .68, 0, 0, -s * .68, 0, s * .16); vg.addColorStop(0, `rgba(255,230,170,${.8 * a})`); vg.addColorStop(1, 'rgba(255,207,107,0)'); g.fillStyle = vg; g.beginPath(); g.arc(-s * .68, 0, s * .16, 0, 7); g.fill(); g.restore();
  const d = new Path2D(); for (const yy of [-.2, .2]) { d.rect(s * .55, yy * s - s * .07 + (yy > 0 ? s * .02 : -s * .02), s * .3, s * .1); }
  d.moveTo(-s * .2, -s * .2); d.lineTo(-s * .2, s * .2); d.moveTo(s * .3, -s * .2); d.lineTo(s * .3, s * .2); d.moveTo(-s * .45, s * .2); d.lineTo(-s * .5, s * .28); d.lineTo(s * .6, s * .28); d.lineTo(s * .55, s * .2);
  glowStroke(g, d, C.glow, Math.max(1, s * .008), .5 * a, s * .03);
  g.restore();
}
export function gamepad(g, x, y, s, a = 1) {
  g.save(); g.translate(x, y);
  const p = new Path2D(); p.moveTo(-s * .55, -s * .22); p.bezierCurveTo(-s * .2, -s * .3, s * .2, -s * .3, s * .55, -s * .22); p.bezierCurveTo(s * .85, -s * .15, s * 1.0, s * .35, s * .8, s * .42); p.bezierCurveTo(s * .6, s * .5, s * .45, s * .2, s * .3, s * .15);
  p.lineTo(-s * .3, s * .15); p.bezierCurveTo(-s * .45, s * .2, -s * .6, s * .5, -s * .8, s * .42); p.bezierCurveTo(-s * 1.0, s * .35, -s * .85, -s * .15, -s * .55, -s * .22);
  glowStroke(g, p, C.white, Math.max(1.5, s * .012), .85 * a, s * .05);
  const d = new Path2D(); d.rect(-s * .58, -s * .04, s * .24, s * .08); d.rect(-s * .5, -s * .12, s * .08, s * .24);
  for (const [u, v] of [[.45, -.1], [.6, 0], [.45, .1], [.3, 0]]) { d.moveTo((u + .05) * s, v * s); d.arc(u * s, v * s, s * .05, 0, 7); }
  for (const u of [-.18, .18]) { d.moveTo((u + .1) * s, s * .1); d.arc(u * s, s * .1, s * .1, 0, 7); }
  glowStroke(g, d, C.glow, Math.max(1, s * .01), .7 * a, s * .03); g.restore();
}
// Giant squid, swimming left (mantle trailing to the right). arms ripple with t.
export function squid(g, x, y, s, t = 0, a = 1, col = '111,246,255') {
  g.save(); g.translate(x, y); const c = `rgb(${col})`;
  const m = new Path2D(); m.moveTo(-s * .1, -s * .12); m.bezierCurveTo(s * .3, -s * .16, s * .7, -s * .1, s * .95, 0); m.bezierCurveTo(s * .7, s * .1, s * .3, s * .16, -s * .1, s * .12); m.closePath();
  const fin = new Path2D(); fin.moveTo(s * .72, -s * .06); fin.lineTo(s * .98, -s * .16); fin.lineTo(s * 1.0, 0); fin.lineTo(s * .98, s * .16); fin.lineTo(s * .72, s * .06);
  const gr = g.createLinearGradient(-s * .1, 0, s, 0); gr.addColorStop(0, `rgba(${col},${.12 * a})`); gr.addColorStop(1, `rgba(${col},${.03 * a})`);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fill(m); g.restore();
  glowStroke(g, m, c, Math.max(1.2, s * .008), .8 * a, s * .03); glowStroke(g, fin, c, Math.max(1, s * .006), .6 * a, s * .02);
  const head = new Path2D(); head.ellipse(-s * .17, 0, s * .1, s * .09, 0, 0, 7); glowStroke(g, head, c, Math.max(1.2, s * .008), .8 * a, s * .03);
  orb(g, -s * .17, -s * .02, s * .035, a, '220,250,255');
  const arms = new Path2D();
  for (let i = 0; i < 8; i++) { const yy = (i - 3.5) * s * .022; arms.moveTo(-s * .26, yy); for (let k = 1; k <= 20; k++) { const u = k / 20; arms.lineTo(-s * .26 - u * s * .45, yy * (1 + u * 1.5) + Math.sin(t * 2 + u * 6 + i) * s * .03 * u); } }
  for (const sd of [-1, 1]) { arms.moveTo(-s * .26, sd * s * .02); for (let k = 1; k <= 40; k++) { const u = k / 40; arms.lineTo(-s * .26 - u * s * 1.05, sd * s * (.02 + u * .1) + Math.sin(t * 1.6 + u * 5 + sd) * s * .05 * u); } }
  glowStroke(g, arms, c, Math.max(1, s * .006), .6 * a, s * .02);
  for (const sd of [-1, 1]) { const u = 1, xx = -s * .26 - u * s * 1.05, yy = sd * s * .12 + Math.sin(t * 1.6 + 5 + sd) * s * .05; const club = new Path2D(); club.ellipse(xx + s * .04, yy, s * .06, s * .02, 0, 0, 7); glowStroke(g, club, c, Math.max(1, s * .007), .7 * a, s * .02); }
  g.restore();
}
export function spermWhale(g, x, y, s, a = 1) {   // boxy head, faces left
  g.save(); g.translate(x, y);
  const p = new Path2D(); p.moveTo(-s, -s * .12); p.lineTo(-s, s * .1); p.quadraticCurveTo(-s * .95, s * .2, -s * .7, s * .18); p.bezierCurveTo(-s * .2, s * .22, s * .4, s * .12, s * .75, s * .03);
  p.lineTo(s * .95, -s * .12); p.quadraticCurveTo(s * .9, 0, s * 1.0, s * .12); p.lineTo(s * .75, -s * .01); p.bezierCurveTo(s * .4, -s * .1, s * .1, -s * .14, -s * .3, -s * .2); p.quadraticCurveTo(-s * .8, -s * .26, -s, -s * .12);
  g.fillStyle = `rgba(2,10,16,${a})`; g.fill(p); glowStroke(g, p, C.glow, Math.max(1.2, s * .008), .65 * a, s * .03);
  const j = new Path2D(); j.moveTo(-s * .95, s * .12); j.lineTo(-s * .55, s * .13); glowStroke(g, j, C.glow, Math.max(1, s * .006), .5 * a, s * .02);
  orb(g, -s * .62, s * .02, s * .012, .7 * a); g.restore();
}
export function bus(g, x, y, s, a = 1) {   // side view, s = half length
  g.save(); g.translate(x, y); const p = new Path2D(); p.roundRect(-s, -s * .28, s * 2, s * .28, s * .04);
  for (let i = 0; i < 7; i++) p.rect(-s * .9 + i * s * .26, -s * .24, s * .2, s * .1);
  p.moveTo(-s * .62, 0); p.arc(-s * .7, 0, s * .08, 0, 7); p.moveTo(s * .78, 0); p.arc(s * .7, 0, s * .08, 0, 7);
  glowStroke(g, p, C.white, Math.max(1.2, s * .006), .6 * a, s * .02); g.restore();
}
export function mountain(g, x, y, s, a = 1) {   // Everest-like massif, base centred at (x, y), s = height
  g.save(); g.translate(x, y);
  const pts = [[-.95, 0], [-.7, -.35], [-.55, -.3], [-.32, -.68], [-.2, -.6], [0, -1], [.12, -.82], [.22, -.86], [.4, -.55], [.55, -.6], [.8, -.25], [1.0, 0]];
  const p = new Path2D(); pts.forEach(([u, v], i) => i ? p.lineTo(u * s * .75, v * s) : p.moveTo(u * s * .75, v * s)); p.closePath();
  const gr = g.createLinearGradient(0, -s, 0, 0); gr.addColorStop(0, `rgba(40,80,92,${a})`); gr.addColorStop(1, `rgba(6,18,24,${a})`); g.fillStyle = gr; g.fill(p);
  glowStroke(g, p, C.white, Math.max(1.5, s * .004), .7 * a, s * .015);
  const snow = new Path2D(); snow.moveTo(-.16 * s * .75, -.68 * s); snow.lineTo(0, -s); snow.lineTo(.1 * s * .75, -.84 * s); snow.lineTo(.04 * s * .75, -.74 * s); snow.lineTo(-.06 * s * .75, -.78 * s); snow.closePath();
  g.fillStyle = `rgba(233,251,255,${.8 * a})`; g.fill(snow); g.restore();
}
export function amphipod(g, x, y, s, t = 0, a = 1) {   // curled, segmented shrimp-like crustacean
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * .05);
  const p = new Path2D(); for (let i = 0; i < 9; i++) { const an = Math.PI * (.95 - i * .11), r = s * (1 - i * .03); const x0 = Math.cos(an) * r, y0 = -Math.sin(an) * r * .7; p.moveTo(x0, y0); p.ellipse(x0, y0, s * .16, s * .2, an, 0, 7); }
  glowStroke(g, p, C.pink, Math.max(1, s * .02), .75 * a, s * .1);
  const l = new Path2D(); for (let i = 0; i < 7; i++) { const an = Math.PI * (.9 - i * .12), x0 = Math.cos(an) * s * .9, y0 = -Math.sin(an) * s * .63; l.moveTo(x0, y0 + s * .12); l.lineTo(x0 + Math.sin(t * 8 + i) * s * .05, y0 + s * .45); }
  l.moveTo(-s * .95, -s * .05); l.quadraticCurveTo(-s * 1.4, -s * .4, -s * 1.5, -s * .1); l.moveTo(-s * .95, -s * .05); l.quadraticCurveTo(-s * 1.3, -s * .6, -s * 1.6, -s * .5);
  glowStroke(g, l, C.pink, Math.max(1, s * .015), .55 * a, s * .06); orb(g, -s * .85, -s * .15, s * .05, a, '255,220,228'); g.restore();
}
export function trieste(g, x, y, s, a = 1) {   // 1960 bathyscaphe: long float on top, crew sphere hanging below
  g.save(); g.translate(x, y);
  const p = new Path2D(); p.moveTo(-s, 0); p.bezierCurveTo(-s, -s * .22, -s * .7, -s * .25, -s * .4, -s * .25); p.lineTo(s * .7, -s * .25); p.quadraticCurveTo(s * 1.0, -s * .2, s, 0); p.quadraticCurveTo(s * 1.0, s * .15, s * .7, s * .15); p.lineTo(-s * .7, s * .15); p.quadraticCurveTo(-s, s * .12, -s, 0);
  p.rect(-s * .12, -s * .45, s * .3, s * .2);
  p.moveTo(-s * .05, s * .15); p.lineTo(-s * .05, s * .28); p.moveTo(s * .12, s * .15); p.lineTo(s * .12, s * .28);
  p.moveTo(s * .26, s * .45); p.arc(s * .04, s * .45, s * .22, 0, 7);
  g.fillStyle = `rgba(3,12,18,${a})`; g.fill(p); glowStroke(g, p, C.glow, Math.max(1.2, s * .01), .75 * a, s * .04);
  orb(g, s * .04, s * .5, s * .03, a, '255,207,107'); g.restore();
}
