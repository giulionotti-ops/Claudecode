// Flat app/screen UIs drawn on 2D canvases (used as textures on phones, TVs and billboards).
import { rrect, fitText, clamp, seg } from './kit.js';

const center = g => { g.textAlign = 'center'; g.textBaseline = 'middle'; };

// Phone sign-up form. p: {title, sub, chip, field, code, button, typeAt, typeDur, pressAt}
export function drawPhoneForm(g, W, H, t, p) {
  const D = p.dark; g.fillStyle = D ? '#14162b' : '#f4f6fb'; g.fillRect(0, 0, W, H);
  center(g);
  g.fillStyle = D ? '#ffffff' : '#1d2340'; fitText(g, p.title || 'Apri il conto', W - 60, 58, 900); g.fillText(p.title || 'Apri il conto', W / 2, 110);
  if (p.sub) { g.fillStyle = '#6b6fd6'; g.font = '800 34px Nunito'; g.fillText(p.sub, W / 2, 170); }
  if (p.chip && t >= (p.chipAt ?? -1)) { g.font = '900 34px Nunito'; const tw = g.measureText(p.chip).width + 50; g.fillStyle = '#ffd23f'; rrect(g, (W - tw) / 2, 215, tw, 60, 30); g.fill(); g.fillStyle = '#1d1d1d'; g.fillText(p.chip, W / 2, 246); }
  g.fillStyle = '#7a7f99'; g.font = '800 28px Nunito'; g.fillText(p.field || 'CODICE INVITO', W / 2, 345);
  g.fillStyle = D ? '#22254a' : '#fff'; g.strokeStyle = p.accent || '#3b4cca'; g.lineWidth = 5; rrect(g, 50, 375, W - 100, 92, 16); g.fill(); g.stroke();
  const code = p.code || ''; const n = Math.floor(clamp((t - (p.typeAt ?? 1e9)) / (p.typeDur || 1.2)) * code.length);
  g.fillStyle = D ? '#ffd23f' : '#1d2340'; fitText(g, code, W - 140, 46, 900, 'Nunito'); g.fillText(code.slice(0, n), W / 2, 423);
  if (n < code.length && n > 0 && Math.floor(t * 4) % 2) { const tw = g.measureText(code.slice(0, n)).width; g.fillRect(W / 2 + tw / 2 + 4, 400, 4, 46); }
  const ready = n >= code.length && code.length > 0, pressed = t >= (p.pressAt ?? 1e9);
  g.fillStyle = pressed ? '#1f8f4a' : ready ? (p.accent || '#3b4cca') : (D ? '#2e3157' : '#d7dae6'); rrect(g, 70, 520, W - 140, 90, 45); g.fill();
  g.fillStyle = ready || pressed ? '#fff' : '#9aa0b8'; g.font = '900 38px Nunito'; g.fillText(pressed ? 'FATTO ✓' : (p.button || 'CONTINUA'), W / 2, 567);
}

// Store screen: title, price, button
export function drawStore(g, W, H, t, p) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1b1d4f'); gr.addColorStop(1, '#4b2a8f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  center(g);
  g.fillStyle = '#fff'; fitText(g, p.title, W - 80, 150, 900); g.fillText(p.title, W / 2, H * .25);
  g.fillStyle = '#ffd23f'; fitText(g, p.price, W - 80, 120, 900); g.fillText(p.price, W / 2, H * .5);
  const k = t >= (p.pressAt ?? 1e9) ? .94 : 1; const bw = W * .55 * k, bh = 110 * k;
  g.fillStyle = '#ff3d8b'; rrect(g, (W - bw) / 2, H * .73 - bh / 2, bw, bh, bh / 2); g.fill();
  g.fillStyle = '#fff'; fitText(g, p.button || 'ACQUISTA', bw - 60, 64, 900); g.fillText(p.button || 'ACQUISTA', W / 2, H * .73 + 3);
}

// Confirmation screen: big title + checklist row
export function drawPaid(g, W, H, t, p) {
  g.fillStyle = '#25b35a'; g.fillRect(0, 0, W, H); center(g);
  g.fillStyle = '#fff'; fitText(g, p.title, W - 80, 110, 900); g.fillText(p.title, W / 2, H * .3);
  (p.checks || []).forEach((c, i) => {
    const k = clamp((t - (p.checkAt ?? 0) - i * .5) / .25); if (k <= 0) return;
    const y = H * .55 + i * 130; g.globalAlpha = k;
    g.fillStyle = '#fff'; rrect(g, 60, y - 50, W - 120, 100, 24); g.fill();
    g.fillStyle = '#25b35a'; g.beginPath(); g.arc(120, y, 32, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(104, y); g.lineTo(116, y + 13); g.lineTo(138, y - 12); g.stroke();
    g.fillStyle = '#1d2340'; g.textAlign = 'left'; fitText(g, c, W - 260, 50, 800); g.fillText(c, 175, y + 2); g.textAlign = 'center'; g.globalAlpha = 1;
  });
}

// Billboard: dark countdown style or bright pink "headline" style
export function drawBillboard(g, W, H, t, p) {
  const on = t >= (p.switchAt ?? 1e9), s = on ? (p.after || p) : p;
  if (on) { g.fillStyle = '#ff2e88'; rrect(g, 0, 0, W, H, 30); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 14; rrect(g, 10, 10, W - 20, H - 20, 24); g.stroke(); }
  else { g.fillStyle = '#12142e'; rrect(g, 0, 0, W, H, 30); g.fill(); g.strokeStyle = '#4b4f8f'; g.lineWidth = 10; rrect(g, 8, 8, W - 16, H - 16, 24); g.stroke(); }
  center(g);
  g.fillStyle = '#fff'; fitText(g, s.title || '', W - 80, H * .34, 900); g.fillText(s.title || '', W / 2, H * .3);
  if (s.sub) { if (on) { g.font = `900 ${H * .17}px Nunito`; const tw = g.measureText(s.sub).width + 60; g.fillStyle = '#7a0f45'; rrect(g, (W - tw) / 2, H * .55, tw, H * .25, 20); g.fill(); g.fillStyle = '#fff'; g.fillText(s.sub, W / 2, H * .68); }
    else { g.fillStyle = '#ffd23f'; fitText(g, s.sub, W - 80, H * .22, 900); g.fillText(s.sub, W / 2, H * .6); } }
  if (s.small) { g.fillStyle = on ? '#ffe' : '#9aa0d8'; g.font = `800 ${H * .08}px Nunito`; g.fillText(s.small, W / 2, H * .86); }
}

// A plain poster: colour + silhouette-ish big label
export function drawPoster(g, W, H, t, p) {
  g.fillStyle = p.bg || '#ff8fb1'; g.fillRect(0, 0, W, H);
  g.fillStyle = p.fg || '#3a1d4f'; center(g);
  if (p.icon) { g.font = `${H * .45}px serif`; g.fillText(p.icon, W / 2, H * .42); }
  if (p.text) { fitText(g, p.text, W - 60, H * .2, 900); g.fillText(p.text, W / 2, H * .82); }
}

export const PANELS = { form: drawPhoneForm, store: drawStore, paid: drawPaid, billboard: drawBillboard, poster: drawPoster };
