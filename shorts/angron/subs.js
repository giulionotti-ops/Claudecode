// Subtitles on a parchment banderole that unfurls from the centre; long lines wrap to two.
import { clamp, ss, seg } from '/core/lib.js';
const FONT = '46px "IM Fell English"', MAXW = 820, CX = 540, CY = 1668;

export function wrap(O, text) {
  O.font = FONT; if (O.measureText(text).width <= MAXW) return [text];
  const w = text.split(' '); let best = null;
  for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '), m = Math.max(O.measureText(a).width, O.measureText(b).width); if (!best || m < best[0]) best = [m, [a, b]]; }
  return best[1];
}
export function drawBanderole(O, subs, t) {
  const s = subs.find(q => t >= q.t0 - .05 && t < q.t1 + .3); if (!s) return null;
  const k = Math.min(ss(seg(t, s.t0 - .05, s.t0 + .3)), 1 - ss(seg(t, s.t1, s.t1 + .28))); if (k <= 0) return null;
  O.save(); O.font = FONT;
  const lines = wrap(O, s.text), tw = Math.max(...lines.map(l => O.measureText(l).width));
  const Wd = (tw + 130) * (.25 + .75 * k), Hd = 28 + lines.length * 52, x0 = CX - Wd / 2, x1 = CX + Wd / 2, sag = 8, cy = CY;
  O.globalAlpha = clamp(k * 1.4);
  const end = (x, dir) => { O.fillStyle = '#b39a6c'; O.beginPath(); O.moveTo(x, cy - Hd / 2 + 6); O.lineTo(x + dir * 34, cy - Hd / 2 + 14); O.lineTo(x + dir * 20, cy); O.lineTo(x + dir * 34, cy + Hd / 2 + 10); O.lineTo(x, cy + Hd / 2 + 2); O.closePath(); O.fill();
    O.fillStyle = '#8c7348'; O.beginPath(); O.ellipse(x + dir * 2, cy + 4, 6, Hd / 2 - 2, 0, 0, 7); O.fill(); };
  end(x0 + 4, -1); end(x1 - 4, 1);
  O.shadowColor = 'rgba(0,0,0,.5)'; O.shadowBlur = 16; O.shadowOffsetY = 4;
  O.beginPath(); O.moveTo(x0, cy - Hd / 2); O.quadraticCurveTo(CX, cy - Hd / 2 + sag, x1, cy - Hd / 2); O.lineTo(x1, cy + Hd / 2); O.quadraticCurveTo(CX, cy + Hd / 2 + sag, x0, cy + Hd / 2); O.closePath();
  const gr = O.createLinearGradient(0, cy - Hd / 2, 0, cy + Hd / 2); gr.addColorStop(0, '#f3e6c6'); gr.addColorStop(.5, '#ecdcb6'); gr.addColorStop(1, '#d9c497');
  O.fillStyle = gr; O.fill(); O.shadowColor = 'transparent';
  O.strokeStyle = 'rgba(110,80,40,.55)'; O.lineWidth = 1.5; O.stroke();
  O.strokeStyle = 'rgba(140,40,30,.5)'; O.lineWidth = 1.2; O.beginPath(); O.moveTo(x0 + 10, cy - Hd / 2 + 7); O.quadraticCurveTo(CX, cy - Hd / 2 + sag + 7, x1 - 10, cy - Hd / 2 + 7); O.moveTo(x0 + 10, cy + Hd / 2 - 6); O.quadraticCurveTo(CX, cy + Hd / 2 + sag - 6, x1 - 10, cy + Hd / 2 - 6); O.stroke();
  O.save(); O.beginPath(); O.rect(x0 + 8, cy - Hd, Wd - 16, Hd * 2); O.clip();
  const ta = clamp((k - .75) / .25); O.globalAlpha = ta;
  O.fillStyle = '#3a2412'; O.textAlign = 'center'; O.textBaseline = 'middle';
  lines.forEach((l, i) => O.fillText(l, CX, cy + 6 + (i - (lines.length - 1) / 2) * 52));
  O.restore(); O.restore();
  return ta >= 1 ? { id: 'sub' + s.t0, text: s.text, x0: x0 + 40, y0: cy - Hd / 2, x1: x1 - 40, y1: cy + Hd / 2 } : null;
}
