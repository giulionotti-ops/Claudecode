// Word-by-word captions: 1-3 words at a time, the word being spoken lit cyan.
import { ss, seg, C } from './draw.js';
export function makeCaptions(lines) {
  const CH = []; for (const l of lines) { let cur = []; for (const w of l.words) { cur.push(w); if (cur.length >= 3 || /[.,?!…]$/.test(w[0])) { CH.push(cur); cur = []; } } if (cur.length) CH.push(cur); }
  return (g, t, y = 1300) => {
    const i = CH.findIndex((ch, k) => t >= ch[0][1] - .05 && t < (CH[k + 1] ? Math.min(CH[k + 1][0][1] - .05, ch[ch.length - 1][2] + .6) : ch[ch.length - 1][2] + .6)); if (i < 0) return;
    const ch = CH[i], pop = ss(seg(t, ch[0][1] - .05, ch[0][1] + .12));
    g.save(); g.font = '900 78px Montserrat'; g.textBaseline = 'middle'; g.letterSpacing = '1px';
    const words = ch.map(w => w[0].toUpperCase().replace(/\.\.\.$/, '…').replace(/[.,]$/, '')), sp = 22;
    const ws = words.map(w => g.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    const sc = Math.min(1, 900 / tot) * (.86 + .14 * pop); g.translate(540, y); g.scale(sc, sc);
    const cur = ch.findLastIndex(q => t >= q[1] - .03); let x = -tot / 2;
    words.forEach((w, k) => {
      g.lineWidth = 14; g.strokeStyle = 'rgba(0,8,14,.85)'; g.lineJoin = 'round'; g.strokeText(w, x, 0);
      g.fillStyle = k > cur ? 'rgba(255,255,255,.55)' : k === cur ? C.glow : '#ffffff';
      if (k === cur) { g.shadowColor = C.glow; g.shadowBlur = 24; }
      g.fillText(w, x, 0); g.shadowBlur = 0; x += ws[k] + sp;
    });
    g.restore();
  };
}
