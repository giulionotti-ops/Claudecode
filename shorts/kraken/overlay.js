// 2D layer over the 3D picture: one-word captions, label chips, arrows, rings.
import { clamp, back, eo, seg } from '/core/lib.js';

export function makeOverlay(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; document.body.appendChild(c);
  return { c, x: c.getContext('2d'), W, H };
}

export function clear(o) { o.x.clearRect(0, 0, o.W, o.H); }

// one word at a time, pops in, like spoken
export function caption(o, word, age) {
  if (!word) return;
  const x = o.x, s = .86 + .14 * back(clamp(age / .12), 2.4);
  x.save(); x.translate(o.W / 2, o.H * .70); x.scale(s, s);
  x.font = `${Math.round(o.W * .105)}px 'Lilita One', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineJoin = 'round'; x.lineWidth = o.W * .022; x.strokeStyle = 'rgba(10,10,12,.95)'; x.strokeText(word, 0, 0);
  x.fillStyle = '#ffffff'; x.fillText(word, 0, 0);
  x.restore();
}

// a label chip near the top: dark, rounded, gold outline
export function chip(o, text, age, out, y = .165) {
  if (age < 0 || out <= 0) return null;
  const x = o.x, k = back(clamp(age / .3), 2) * clamp(out);
  x.save(); x.font = `700 ${Math.round(o.W * .042)}px 'Fredoka', sans-serif`;
  const w = x.measureText(text).width + o.W * .07, h = o.W * .085;
  x.translate(o.W / 2, o.H * y); x.scale(k, k); x.globalAlpha = clamp(out * 3);
  x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, h * .32);
  x.fillStyle = 'rgba(14,20,24,.88)'; x.fill(); x.lineWidth = o.W * .005; x.strokeStyle = '#e9b949'; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 0, h * .04);
  x.restore();
  return { x0: o.W / 2 - w / 2, y0: o.H * y - h / 2, x1: o.W / 2 + w / 2, y1: o.H * y + h / 2 };
}

// a thick arrow growing from a to b (screen pixels), p = 0..1
export function arrow(o, ax, ay, bx, by, p, color = '#f5c23a', wdt = 14, dashed = false) {
  if (p <= 0) return;
  const x = o.x, ex = ax + (bx - ax) * eo(p), ey = ay + (by - ay) * eo(p), a = Math.atan2(ey - ay, ex - ax);
  x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = wdt; x.lineCap = 'round';
  x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8;
  if (dashed) x.setLineDash([wdt * 1.6, wdt * 1.4]);
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(ex - Math.cos(a) * wdt * 1.2, ey - Math.sin(a) * wdt * 1.2); x.stroke();
  x.setLineDash([]);
  const hs = wdt * 2.6; x.beginPath(); x.moveTo(ex, ey);
  x.lineTo(ex - Math.cos(a - .5) * hs, ey - Math.sin(a - .5) * hs); x.lineTo(ex - Math.cos(a + .5) * hs, ey - Math.sin(a + .5) * hs); x.closePath(); x.fill();
  x.restore();
}

export function ring(o, cx, cy, r, p, color = '#f5c23a') {
  if (p <= 0) return;
  const x = o.x; x.save(); x.strokeStyle = color; x.lineWidth = 9; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 8;
  x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eo(p)); x.stroke(); x.restore();
}

// a vertical ruler with ticks and a label (scene 5)
export function ruler(o, x0, y0, y1, p, label) {
  if (p <= 0) return;
  const x = o.x, ye = y0 + (y1 - y0) * eo(p);
  x.save(); x.strokeStyle = '#ffffff'; x.lineWidth = 8; x.lineCap = 'round'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 10;
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0, ye); x.stroke();
  for (let i = 0; i <= 10; i++) { const yy = y0 + (y1 - y0) * i / 10; if (yy > ye) break; x.lineWidth = i % 5 ? 4 : 7; x.beginPath(); x.moveTo(x0 - (i % 5 ? 14 : 26), yy); x.lineTo(x0 + (i % 5 ? 14 : 26), yy); x.stroke(); }
  if (p > .6) {
    x.globalAlpha = seg(p, .6, 1); x.font = `700 ${Math.round(o.W * .04)}px 'Fredoka', sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText(label, x0 + 40, (y0 + y1) / 2);
  }
  x.restore();
}

// a small round thermometer readout (scene 4)
export function readout(o, cx, cy, value, color, a) {
  if (a <= 0) return;
  const x = o.x; x.save(); x.globalAlpha = a;
  x.beginPath(); x.arc(cx, cy, 78, 0, 7); x.fillStyle = 'rgba(14,20,24,.9)'; x.fill(); x.lineWidth = 8; x.strokeStyle = color; x.stroke();
  x.font = `700 ${Math.round(o.W * .042)}px 'Fredoka', sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(`${Math.round(value)}°C`, cx, cy + 3); x.restore();
}

// a check mark or a cross that draws itself
export function mark(o, cx, cy, ok, p) {
  if (p <= 0) return;
  const x = o.x; x.save(); x.lineWidth = 22; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = ok ? '#5fe07a' : '#ff4b4b';
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10; x.beginPath();
  if (ok) { const q = eo(p); x.moveTo(cx - 50, cy); x.lineTo(cx - 50 + 35 * Math.min(1, q * 2), cy + 35 * Math.min(1, q * 2)); if (q > .5) x.lineTo(cx - 15 + 80 * (q - .5) * 2, cy + 35 - 85 * (q - .5) * 2); }
  else { const q = eo(p); x.moveTo(cx - 50, cy - 50); x.lineTo(cx - 50 + 100 * Math.min(1, q * 2), cy - 50 + 100 * Math.min(1, q * 2)); if (q > .5) { x.moveTo(cx + 50, cy - 50); x.lineTo(cx + 50 - 100 * (q - .5) * 2, cy - 50 + 100 * (q - .5) * 2); } }
  x.stroke(); x.restore();
}

// a vertical gauge with a label under it (oxygen); v = 0..1, a = alpha
export function meter(o, cx, cy, h, v, label, a) {
  if (a <= 0) return;
  const x = o.x, w = 54; x.save(); x.globalAlpha = a;
  x.beginPath(); x.roundRect(cx - w / 2 - 8, cy - h / 2 - 8, w + 16, h + 16, 20); x.fillStyle = 'rgba(14,20,24,.88)'; x.fill();
  x.lineWidth = 5; x.strokeStyle = '#e9b949'; x.stroke();
  const fv = clamp(v), col = fv > .5 ? '#5fe07a' : fv > .25 ? '#f5c23a' : '#ff4b4b';
  x.beginPath(); x.roundRect(cx - w / 2, cy + h / 2 - h * fv, w, h * fv, 12); x.fillStyle = col; x.fill();
  x.globalAlpha = a; x.font = `700 ${Math.round(o.W * .034)}px 'Fredoka', sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'top';
  x.lineWidth = 8; x.strokeStyle = 'rgba(10,10,12,.9)'; x.lineJoin = 'round'; x.strokeText(label, cx, cy + h / 2 + 22); x.fillText(label, cx, cy + h / 2 + 22);
  x.restore();
}
