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

// Football match on TV: pitch, players moving, score bug. p: {home, away, score, clock}
export function drawPitch(g, W, H, t, p) {
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#2f9e44' : '#37b24d'; g.fillRect(i * W / 10, 0, W / 10, H); }
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 6; g.strokeRect(30, 30, W - 60, H - 60);
  g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 80, 0, 7); g.stroke();
  g.strokeRect(30, H / 2 - 120, 110, 240); g.strokeRect(W - 140, H / 2 - 120, 110, 240);
  for (let i = 0; i < 8; i++) { const x = W / 2 + Math.sin(t * .8 + i * 1.7) * W * .32, y = H / 2 + Math.cos(t * .6 + i * 2.3) * H * .3; g.fillStyle = i % 2 ? '#e8384f' : '#ffffff'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
  const bx = W / 2 + Math.sin(t * 1.3) * W * .3, by = H / 2 + Math.sin(t * 1.9) * H * .25; g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 8, 0, 7); g.fill();
  center(g); g.fillStyle = 'rgba(10,10,20,.85)'; rrect(g, 40, 40, 330, 70, 14); g.fill();
  g.fillStyle = '#fff'; g.font = '900 40px Nunito'; g.fillText(`${p.home || 'CASA'} ${p.score || '1-0'} ${p.away || 'OSPITI'}`, 205, 77);
  g.fillStyle = '#ffd23f'; rrect(g, 380, 40, 120, 70, 14); g.fill(); g.fillStyle = '#1d1d1d'; g.fillText(p.clock || "88'", 440, 77);
}

// Chat screen. p: {name, msgs:[{from:'them'|'me', text, at, code?}]}
export function drawChat(g, W, H, t, p) {
  g.fillStyle = '#ece5dd'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1f8f6a'; g.fillRect(0, 0, W, 110); g.fillStyle = '#fff'; g.beginPath(); g.arc(70, 55, 32, 0, 7); g.fill();
  g.fillStyle = '#1f8f6a'; g.font = '900 34px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((p.name || 'A')[0], 70, 57);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '900 36px Nunito'; g.fillText(p.name || 'Amico', 120, 45); g.font = '700 24px Nunito'; g.fillText('online', 120, 80);
  let y = 150;
  for (const m of p.msgs || []) {
    const k = clamp((t - (m.at ?? 1e9)) / .2); if (k <= 0) continue;
    const me = m.from === 'me'; g.font = m.code ? '900 38px Nunito' : '800 34px Nunito';
    const tw = Math.min(W - 160, g.measureText(m.text).width + 50), h = m.code ? 120 : 76, x = me ? W - 30 - tw : 30;
    g.globalAlpha = k; g.fillStyle = me ? '#d9fdd3' : '#fff'; rrect(g, x, y + (1 - k) * 20, tw, h, 22); g.fill();
    g.fillStyle = '#1d2340'; g.textBaseline = 'middle'; g.fillText(m.text, x + 25, y + (m.code ? 40 : h / 2) + (1 - k) * 20);
    if (m.code) { g.fillStyle = '#1f8f6a'; rrect(g, x + 25, y + 70, 130, 38, 19); g.fill(); g.fillStyle = '#fff'; g.font = '900 22px Nunito'; g.fillText('COPIA', x + 52, y + 90); }
    g.globalAlpha = 1; y += h + 22;
  }
}

// Cycling list: the latest item whose time has come fills the screen. p: {items:[{title, sub, at}], head}
export function drawList(g, W, H, t, p) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1b1d4f'); gr.addColorStop(1, '#4b2a8f'); g.fillStyle = gr; g.fillRect(0, 0, W, H); center(g);
  if (p.head) { g.fillStyle = '#ffd23f'; g.font = '900 54px Nunito'; g.fillText(p.head, W / 2, 70); }
  let it = null, i0 = -1; (p.items || []).forEach((x, i) => { if (t >= (x.at ?? 1e9)) { it = x; i0 = i; } }); if (!it) return;
  const k = clamp((t - it.at) / .18), sc = .7 + .3 * k; g.save(); g.translate(W / 2, H * .5); g.scale(sc, sc); g.globalAlpha = k;
  g.fillStyle = '#fff'; fitText(g, it.title, W - 100, 130, 900); g.fillText(it.title, 0, -30);
  if (it.sub) { g.fillStyle = '#33c26b'; fitText(g, it.sub, W - 140, 64, 900); g.fillText(it.sub, 0, 80); }
  g.restore(); g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < p.items.length; i++) { g.beginPath(); g.arc(W / 2 + (i - (p.items.length - 1) / 2) * 34, H - 40, i === i0 ? 10 : 7, 0, 7); g.fill(); }
}

export const PANELS = { list: drawList, chat: drawChat, pitch: drawPitch, form: drawPhoneForm, store: drawStore, paid: drawPaid, billboard: drawBillboard, poster: drawPoster };
