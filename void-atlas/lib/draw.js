// Void Atlas: shared drawing kit (brand art + shorts). Plain canvas 2D, no dependencies.
// Look: an old star atlas brought to life. Indigo-black sky, warm gold line art, thin mono coordinates,
// soft violet nebula haze, planets as glowing gold-rimmed spheres.
export const C = {
  void: '#04030c', ink: '#0a0820', indigo: '#16123a', violet: '#3a2470', plum: '#6b2f7a',
  gold: '#ffc46b', goldSoft: 'rgba(255,196,107,', cream: '#fff3dc', ice: '#9fd8ff', rose: '#ff7aa8', red: '#ff5a4a',
};
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Deep sky background with a faint violet haze band (like the Milky Way seen edge-on).
export function sky(g, w, h, t = 0, haze = 1, ang = -.5) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, C.ink); gr.addColorStop(.55, C.void); gr.addColorStop(1, '#020108');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (haze > 0) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(w / 2, h / 2); g.rotate(ang);
    const r = rng(3), L = Math.hypot(w, h);
    for (let i = 0; i < 26; i++) {
      const x = (r() - .5) * L, y = (r() - .5) * h * .18, R = 120 + r() * 380, col = r() < .6 ? '58,36,112' : r() < .7 ? '107,47,122' : '40,60,120';
      const gg = g.createRadialGradient(x, y, 0, x, y, R); gg.addColorStop(0, `rgba(${col},${.16 * haze})`); gg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gg; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    }
    g.restore();
  }
}
// Star field. drift = how far the camera has moved (px); z-depth gives parallax. zoom > 1 pushes stars outward (flying in).
export function stars(g, w, h, drift = 0, n = 260, seed = 7, a = 1, zoom = 1, t = 0) {
  const r = rng(seed); g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const z = r(), bx = r(), by = r(), tw = .7 + .3 * Math.sin(t * (1 + r() * 3) + i);
    let x = ((bx * w - drift * (.1 + z * .9)) % w + w) % w, y = by * h;
    if (zoom !== 1) { x = w / 2 + (x - w / 2) * zoom; y = h / 2 + (y - h / 2) * zoom; }
    const size = (.4 + z * z * 2.4) * Math.sqrt(zoom), al = (.25 + .7 * z) * a * tw;
    const warm = r() < .25, col = warm ? '255,220,170' : r() < .3 ? '180,210,255' : '255,250,240';
    g.fillStyle = `rgba(${col},${al})`; g.beginPath(); g.arc(x, y, size, 0, 7); g.fill();
    if (z > .93) { g.fillStyle = `rgba(${col},${al * .18})`; g.beginPath(); g.arc(x, y, size * 4, 0, 7); g.fill(); spike(g, x, y, size * 9, al * .5, col); }
  }
  g.restore();
}
export function spike(g, x, y, L, a, col = '255,243,220') {   // 4-point diffraction spike
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke(); g.restore();
}
export function vignette(g, w, h, k = .75) {
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.hypot(w, h) * .6);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
let grainTile = null;
export function grain(g, w, h, a = .06, seed = 1) {
  if (!grainTile) { grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 256; const x = grainTile.getContext('2d'), im = x.createImageData(256, 256), r = rng(99); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay'; const o = (seed * 97) % 256;
  g.translate(-o, -((seed * 53) % 256)); g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w + 256, h + 256); g.restore();
}
export function glow(g, x, y, r, a = 1, col = '255,196,107') {   // soft point light / star core
  g.save(); g.globalCompositeOperation = 'lighter';
  let gr = g.createRadialGradient(x, y, 0, x, y, r * 8); gr.addColorStop(0, `rgba(${col},${.35 * a})`); gr.addColorStop(.3, `rgba(${col},${.1 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 8, 0, 7); g.fill();
  gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.5, `rgba(${col},${.9 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore();
}
// A planet: shaded sphere lit from `light` angle, optional bands, atmosphere rim and ring.
export function planet(g, x, y, R, o = {}) {
  const { base = ['#2a4a8a', '#0b1530'], bands = 0, bandCol = 'rgba(255,255,255,.08)', light = -2.4, atmo = '159,216,255', ring = null, a = 1, spin = 0, seed = 5 } = o;
  g.save(); g.globalAlpha = a;
  if (ring) ringHalf(g, x, y, R, ring, false);
  g.save(); g.beginPath(); g.arc(x, y, R, 0, 7); g.clip();
  const lx = x + Math.cos(light) * R * .5, ly = y + Math.sin(light) * R * .5;
  const gr = g.createRadialGradient(lx, ly, R * .05, x, y, R * 1.05); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
  g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
  if (bands) { const r = rng(seed); for (let i = 0; i < bands; i++) { const yy = y - R + (i + r() * .6) * (2 * R / bands), hh = R * (.03 + r() * .09); g.fillStyle = bandCol; g.beginPath(); g.ellipse(x + Math.sin(spin + i) * R * .05, yy, R * 1.1, hh, 0, 0, 7); g.fill(); } }
  // night side
  const sh = g.createLinearGradient(lx, ly, x - Math.cos(light) * R, y - Math.sin(light) * R); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(.55, 'rgba(0,0,0,.2)'); sh.addColorStop(1, 'rgba(2,1,8,.92)');
  g.fillStyle = sh; g.fillRect(x - R, y - R, R * 2, R * 2); g.restore();
  // atmosphere rim + gold limb line
  g.save(); g.globalCompositeOperation = 'lighter';
  const at = g.createRadialGradient(x, y, R * .92, x, y, R * 1.18); at.addColorStop(0, `rgba(${atmo},0)`); at.addColorStop(.35, `rgba(${atmo},.35)`); at.addColorStop(1, `rgba(${atmo},0)`);
  g.fillStyle = at; g.beginPath(); g.arc(x, y, R * 1.2, 0, 7); g.fill();
  g.strokeStyle = `rgba(255,214,150,.55)`; g.lineWidth = Math.max(1.5, R * .012); g.beginPath(); g.arc(x, y, R, light - 1.3, light + 1.3); g.stroke(); g.restore();
  if (ring) ringHalf(g, x, y, R, ring, true);
  g.restore();
}
function ringHalf(g, x, y, R, ring, front) {
  const { tilt = .22, inner = 1.35, outer = 2.1, col = '255,214,150', rot = -.25 } = ring;
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  if (front) g.rect(-R * 3, 0, R * 6, R * 3); else g.rect(-R * 3, -R * 3, R * 6, R * 3); g.clip();
  for (let k = 0; k < 14; k++) { const rr = lerp(inner, outer, k / 13) * R; g.strokeStyle = `rgba(${col},${.08 + .2 * Math.sin(k * 1.7) ** 2})`; g.lineWidth = R * .045; g.beginPath(); g.ellipse(0, 0, rr, rr * tilt, 0, 0, 7); g.stroke(); }
  g.restore();
}
export function sun(g, x, y, R, t = 0, a = 1) {   // our star: hot core, corona, slow flicker
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'lighter';
  const c = g.createRadialGradient(x, y, R * .6, x, y, R * 4); c.addColorStop(0, 'rgba(255,190,90,.5)'); c.addColorStop(.3, 'rgba(255,120,40,.12)'); c.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = c; g.beginPath(); g.arc(x, y, R * 4, 0, 7); g.fill();
  const d = g.createRadialGradient(x - R * .2, y - R * .2, 0, x, y, R); d.addColorStop(0, '#fffbe8'); d.addColorStop(.6, '#ffd27a'); d.addColorStop(1, 'rgba(255,150,50,.9)');
  g.fillStyle = d; g.beginPath(); g.arc(x, y, R * (1 + .01 * Math.sin(t * 3)), 0, 7); g.fill(); g.restore();
}
// Voyager-style probe: dish, bus, booms. Line art, gold. Faces left by default.
export function probe(g, x, y, s, t = 0, a = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / 100, s / 100); g.globalAlpha = a;
  g.strokeStyle = C.gold; g.fillStyle = 'rgba(255,196,107,.12)'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.shadowColor = C.gold; g.shadowBlur = 10;
  g.beginPath(); g.ellipse(-8, 0, 12, 48, 0, 0, 7); g.fill(); g.stroke();                 // dish (edge-on-ish)
  g.beginPath(); g.moveTo(-8, -48); g.lineTo(-40, 0); g.lineTo(-8, 48); g.stroke();      // feed struts
  g.beginPath(); g.arc(-42, 0, 3, 0, 7); g.stroke();
  g.strokeRect(4, -14, 26, 28);                                                           // bus
  g.beginPath(); g.moveTo(30, 0); g.lineTo(130, -6); g.stroke();                          // science boom
  g.strokeRect(118, -20, 18, 14);
  g.beginPath(); g.moveTo(20, 14); g.lineTo(60, 70); g.stroke(); g.strokeRect(54, 66, 14, 26);   // RTG boom
  g.beginPath(); g.moveTo(16, -14); g.lineTo(-10, -150); g.stroke();                      // magnetometer boom
  g.restore();
  glow(g, x - 42 * s / 100, y, 4 * s / 100, a * (.6 + .4 * Math.sin(t * 2)), '255,214,150');
}
// Radio telescope: a dish on a mount, line art. Optional incoming wave.
export function dish(g, x, y, s, a = 1, tilt = -.6) {
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = 2.6; g.lineJoin = 'round'; g.shadowColor = C.gold; g.shadowBlur = 8;
  g.beginPath(); g.moveTo(-50, 100); g.lineTo(0, 10); g.lineTo(50, 100); g.moveTo(-30, 100); g.lineTo(30, 100); g.stroke();
  g.save(); g.rotate(tilt); g.fillStyle = 'rgba(255,196,107,.1)'; g.beginPath(); g.moveTo(-80, -10); g.quadraticCurveTo(0, 50, 80, -10); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-60, 0); g.lineTo(0, -70); g.lineTo(60, 0); g.stroke(); g.beginPath(); g.arc(0, -72, 4, 0, 7); g.stroke(); g.restore();
  g.restore();
}
// Spiral galaxy seen at an angle. Particles, gold core, violet arms.
export function galaxy(g, x, y, R, rot = 0, a = 1, tilt = .45, seed = 11, n = 1400) {
  const r = rng(seed); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.translate(x, y);
  const core = g.createRadialGradient(0, 0, 0, 0, 0, R * .35); core.addColorStop(0, 'rgba(255,230,180,.9)'); core.addColorStop(.4, 'rgba(255,196,107,.25)'); core.addColorStop(1, 'rgba(255,196,107,0)');
  g.save(); g.scale(1, tilt); g.fillStyle = core; g.beginPath(); g.arc(0, 0, R * .35, 0, 7); g.fill(); g.restore();
  for (let i = 0; i < n; i++) {
    const arm = i % 2, d = Math.pow(r(), .7), th = d * 7 + arm * Math.PI + rot + (r() - .5) * .7, rr = d * R;
    const px = Math.cos(th) * rr, py = Math.sin(th) * rr * tilt, sz = .6 + r() * 1.8 * (1 - d * .5);
    const col = d < .25 ? '255,220,170' : r() < .5 ? '170,150,255' : '255,160,210';
    g.fillStyle = `rgba(${col},${.25 + .5 * (1 - d)})`; g.beginPath(); g.arc(px, py, sz, 0, 7); g.fill();
  }
  g.restore();
}
// Constellation: points joined by thin gold lines, drawn on with k (0..1).
export function constellation(g, pts, k = 1, a = 1, label = null) {
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,196,107,.55)'; g.lineWidth = 1.6; g.setLineDash([]);
  const segs = pts.length - 1, upto = k * segs;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= segs; i++) { const f = clamp(upto - (i - 1)); if (f <= 0) break; g.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); }
  g.stroke(); g.restore();
  for (const [x, y, m = 1] of pts) glow(g, x, y, 3 + m * 3, a * .9, '255,236,200');
}
// Coordinate grid arc, like an atlas plate border (RA/Dec ticks).
export function atlasFrame(g, w, h, a = 1, inset = 40) {
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,196,107,.35)'; g.lineWidth = 1.5; g.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  g.strokeStyle = 'rgba(255,196,107,.25)'; g.strokeRect(inset + 10, inset + 10, w - inset * 2 - 20, h - inset * 2 - 20);
  for (let x = inset + 10; x <= w - inset - 10; x += (w - inset * 2 - 20) / 24) { g.beginPath(); g.moveTo(x, inset); g.lineTo(x, inset + 10); g.moveTo(x, h - inset); g.lineTo(x, h - inset - 10); g.stroke(); }
  for (let y = inset + 10; y <= h - inset - 10; y += (h - inset * 2 - 20) / 40) { g.beginPath(); g.moveTo(inset, y); g.lineTo(inset + 10, y); g.moveTo(w - inset, y); g.lineTo(w - inset - 10, y); g.stroke(); }
  g.restore();
}
// Black hole: dark disc, photon ring, tilted accretion disc (front half over the shadow).
export function blackHole(g, x, y, R, t = 0, a = 1) {
  g.save(); g.globalAlpha = a;
  const disc = (front) => { g.save(); g.translate(x, y); g.beginPath(); if (front) g.rect(-R * 6, 0, R * 12, R * 6); else g.rect(-R * 6, -R * 6, R * 12, R * 6); g.clip(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 30; k++) { const rr = R * (1.5 + k * .09), al = .5 * (1 - k / 30); g.strokeStyle = `rgba(255,${180 - k * 3},${90 - k * 2},${al})`; g.lineWidth = R * .07; g.beginPath(); g.ellipse(0, 0, rr * 1.9, rr * .2, 0, 0, 7); g.stroke(); } g.restore(); };
  disc(false);
  g.save(); g.globalCompositeOperation = 'lighter'; const pr = g.createRadialGradient(x, y, R * .95, x, y, R * 1.35); pr.addColorStop(0, 'rgba(255,220,160,.95)'); pr.addColorStop(.3, 'rgba(255,170,80,.35)'); pr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = pr; g.beginPath(); g.arc(x, y, R * 1.35, 0, 7); g.fill(); g.restore();
  g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  // far side of the disc, bent up over the shadow by gravity (the 'halo' arc)
  g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(255,${200 - k * 8},${110 - k * 6},${.45 * (1 - k / 10)})`; g.lineWidth = R * .06; g.beginPath(); g.ellipse(x, y, R * (1.12 + k * .05), R * (1.1 + k * .06), 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke(); } g.restore();
  disc(true); g.restore();
}
// Channel mark: an atlas sphere — a gold ring with one meridian, an orbit ellipse and a small world on it.
export function mark(g, x, y, s, t = 0, a = 1) {
  g.save(); g.translate(x, y); g.globalAlpha = a; g.strokeStyle = C.gold; g.lineWidth = s * .022; g.shadowColor = C.gold; g.shadowBlur = s * .08; g.lineCap = 'round';
  const R = s * .3;
  g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
  g.lineWidth = s * .012; g.globalAlpha = a * .7; g.beginPath(); g.ellipse(0, 0, R * .42, R, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, 0, R, R * .3, 0, 0, 7); g.stroke();
  g.globalAlpha = a; g.lineWidth = s * .014; g.save(); g.rotate(-.42); g.beginPath(); g.ellipse(0, 0, R * 1.55, R * .5, 0, 0, 7); g.stroke();
  const th = 2.3 + t * .4; const px = Math.cos(th) * R * 1.55, py = Math.sin(th) * R * .5; g.restore();
  const rx = px * Math.cos(-.42) - py * Math.sin(-.42), ry = px * Math.sin(-.42) + py * Math.cos(-.42);
  g.restore(); glow(g, x + rx, y + ry, s * .045, a, '255,214,150');
}
export function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }
// Light rays / signal wave travelling from (x0,y0) to (x1,y1); k = 0..1 progress.
export function beam(g, x0, y0, x1, y1, k, a = 1, col = '255,196,107', wav = 0) {
  const x = lerp(x0, x1, k), y = lerp(y0, y1, k); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
  const gr = g.createLinearGradient(x0, y0, x, y); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},.8)`);
  g.strokeStyle = gr; g.lineWidth = 3; g.beginPath();
  const dx = x - x0, dy = y - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= 80; i++) { const f = i / 80, w = wav ? Math.sin(f * L / 18) * wav : 0; g.lineTo(x0 + dx * f + nx * w, y0 + dy * f + ny * w); }
  g.stroke(); g.restore(); glow(g, x, y, 8, a, col);
}
