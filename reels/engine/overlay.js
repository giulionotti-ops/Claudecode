// 2D overlays drawn on top of the 3D frame: word captions, top disclosure bar, scene notes, end card.
import { rrect, fitText, clamp, seg, pop } from './kit.js';

// Group words the way the reference does: one word on screen, short words glued to a neighbour.
export function captionGroups(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    let g = [words[i]];
    const len = () => g.map(x => x.w).join(' ').length;
    while (i + 1 < words.length && words[i + 1].line === g[0].line &&
      g.length < 2 && g[0].w.replace(/[^\p{L}\d']/gu, '').length <= 3 && !/[,.:;!?]$/.test(g[0].w) && len() + words[i + 1].w.length < 15) g.push(words[++i]);
    out.push({ text: g.map(x => x.w).join(' '), s: g[0].s, e: g[g.length - 1].e });
  }
  out.forEach((g, i) => { const n = out[i + 1]; g.t1 = n ? Math.min(n.s, g.e + .7) : g.e + .8; });
  return out;
}
const clean = s => s.replace(/^[«"“(]+|[»"”),.;:!?…]+$/g, '');

export function drawCaption(g, groups, t, y = 1340) {
  const c = groups.find(q => t >= q.s - .02 && t < q.t1); if (!c) return;
  const text = clean(c.text); const k = pop(seg(t, c.s - .02, c.s + .14));
  g.save(); g.translate(540, y); g.scale(k, k);
  const size = fitText(g, text, 900, 128, 800, 'Baloo');
  g.font = `800 ${size}px Baloo`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18; g.shadowOffsetY = 8;
  g.strokeStyle = '#2b1505'; g.lineWidth = size * .2; g.strokeText(text, 0, 0); g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, -size * .4, 0, size * .4); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffe56b');
  g.fillStyle = gr; g.fillText(text, 0, 0);
  g.restore();
}

// Top bar: "Pubblicità" + handle pill + two tiny disclaimer lines (paid-partnership disclosure).
export function drawTopBar(g, B) {
  g.save(); g.textBaseline = 'middle';
  let x = 34; const y = 70, h = 46;
  const pill = (text, bg, fg, font) => { g.font = font; const w = g.measureText(text).width + 34; g.fillStyle = bg; rrect(g, x, y - h / 2, w, h, 12); g.fill(); g.fillStyle = fg; g.textAlign = 'left'; g.fillText(text, x + 17, y + 2); x += w + 12; };
  pill(B.adLabel || 'Pubblicità', 'rgba(20,16,40,.72)', '#fff', '800 26px Nunito');
  if (B.handle) pill(B.handle, '#ffd23f', '#1d1d1d', '900 28px Nunito');
  if (B.topRight?.length) { g.fillStyle = 'rgba(20,16,40,.72)'; g.font = '800 20px Nunito'; const w = Math.max(...B.topRight.map(l => g.measureText(l).width)) + 28; rrect(g, x, y - h / 2, w, h, 12); g.fill(); g.fillStyle = '#fff'; B.topRight.forEach((l, i) => g.fillText(l, x + 14, y - 10 + i * 21)); }
  if (B.disclaimer) { g.font = '800 21px Nunito'; const w = g.measureText(B.disclaimer).width + 28; g.fillStyle = 'rgba(20,16,40,.72)'; rrect(g, 34, y + 32, w, 34, 10); g.fill(); g.fillStyle = '#fff'; g.fillText(B.disclaimer, 48, y + 50); }
  g.restore();
}
export function drawNote(g, text, k = 1) {
  if (!text || k <= 0) return;
  g.save(); g.globalAlpha = k; g.font = '800 26px Nunito'; g.textBaseline = 'middle'; g.textAlign = 'left';
  const lines = wrap(g, text, 640), h = 20 + lines.length * 32, w = Math.max(...lines.map(l => g.measureText(l).width)) + 32;
  g.fillStyle = 'rgba(255,255,255,.9)'; rrect(g, 34, 170, w, h, 12); g.fill();
  g.fillStyle = '#1d2340'; lines.forEach((l, i) => g.fillText(l, 50, 170 + 26 + i * 32));
  g.restore();
}
function wrap(g, text, maxW) { const w = text.split(' '), out = []; let cur = ''; for (const x of w) { const n = cur ? cur + ' ' + x : x; if (g.measureText(n).width > maxW && cur) { out.push(cur); cur = x; } else cur = n; } if (cur) out.push(cur); return out; }

// End card: yellow brand card, code box, small conditions. p: {title, sub, lines:[...], linesAt}
export function makeEndCard(B) {
  return (g, t, p) => {
    const k = pop(seg(t, p._t0, p._t0 + .45));
    g.save(); g.translate(540, 760); g.scale(k, k);
    g.fillStyle = '#1d1d1d'; rrect(g, -410, -190, 820, 380, 36); g.fill();
    g.fillStyle = '#ffd23f'; rrect(g, -400, -200, 800, 370, 32); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1d1d1d';
    if (B.logo) { g.font = '900 80px Nunito'; g.fillText(B.logo, 0, -110); }
    const title = p.title || B.handle || 'CODICE INVITO'; fitText(g, title, 720, 104, 900); g.fillText(title, 0, B.logo ? 0 : -40);
    g.font = '800 40px Nunito'; g.fillText(p.sub || 'il codice invito è qui', 0, B.logo ? 90 : 70);
    g.restore();
    const k2 = pop(seg(t, p._t0 + .3, p._t0 + .7)); if (k2 <= 0) return;
    g.save(); g.translate(540, 1030); g.scale(k2, k2);
    const code = p.code || B.code; g.font = '900 64px Nunito'; const w = g.measureText(code).width + 90;
    g.fillStyle = '#1b1550'; rrect(g, -w / 2, -60, w, 120, 22); g.fill();
    g.setLineDash([14, 10]); g.strokeStyle = '#ffd23f'; g.lineWidth = 5; rrect(g, -w / 2 + 8, -52, w - 16, 104, 16); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(code, 0, 4);
    g.restore();
    (p.lines || []).forEach((l, i) => {
      const a = clamp((t - (p.linesAt ?? p._t0 + .8) - i * .4) / .25); if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
      const big = i === 0; g.font = big ? '900 42px Nunito' : '900 34px Nunito'; const tw = g.measureText(l).width + 44, y = 1175 + i * 72;
      if (!big) { g.fillStyle = '#ffd23f'; rrect(g, 540 - tw / 2, y - 24, tw, 48, 24); g.fill(); g.fillStyle = '#1d1d1d'; } else { g.fillStyle = 'rgba(15,10,45,.85)'; rrect(g, 540 - tw / 2, y - 30, tw, 60, 18); g.fill(); g.fillStyle = '#fff'; }
      g.fillText(l, 540, y); g.restore();
    });
  };
}

// Money badges in screen space. b: {text, kind, at, out, pos:[x,y] px, scale}
const BADGE = { green: ['#33c26b', '#1f8f4a', '#fff'], red: ['#f04a4a', '#b82626', '#fff'], yellow: ['#ffd23f', '#d9a400', '#1d1d1d'], white: ['#fff', '#cfcfcf', '#1d1d1d'] };
export function drawBadges(g, list = [], t) {
  list.forEach((b, i) => {
    const a = typeof b.at === 'number' ? b.at : -1, o = typeof b.out === 'number' ? b.out : 1e9;
    const k = pop(seg(t, a, a + .3)), f = 1 - seg(t, o, o + .2); if (k <= 0 || f <= 0) return;
    const [x, y] = b.pos || [i % 2 ? 790 : 290, 470]; const c = BADGE[b.kind] || BADGE.green, s = (b.scale || 1) * k;
    g.save(); g.globalAlpha = f; g.translate(x, y + Math.sin(t * 3 + i) * 4); g.rotate((i % 2 ? 1 : -1) * .04); g.scale(s, s);
    g.font = '900 78px Nunito'; const w = g.measureText(b.text).width + 64, h = 108;
    g.fillStyle = 'rgba(0,0,0,.25)'; rrect(g, -w / 2, -h / 2 + 10, w, h, 34); g.fill();
    g.fillStyle = c[1]; rrect(g, -w / 2, -h / 2 + 5, w, h, 34); g.fill();
    g.fillStyle = c[0]; rrect(g, -w / 2, -h / 2, w, h, 34); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; rrect(g, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 29); g.stroke();
    g.fillStyle = c[2]; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.text, 0, 5);
    g.restore();
  });
}
