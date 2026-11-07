// Scene boilerplate shared by every Void Atlas short: fonts, timeline, timing helpers, text, stat card, end card.
// Usage in a short's scene.js:
//   import { setup } from '../../lib/kit.js'; const K = await setup();
//   K.frame(t => { ...draw the story... }, { card: t => ['1977', 'LAUNCHED'] })
import * as D from './draw.js';
import { makeCaptions } from './captions.js';
const { C, clamp, lerp, ss, seg } = D;
export const W = 1080, H = 1920;

export async function setup() {
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  await Promise.all(['900 70px Montserrat', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"', '300 40px "Space Grotesk"', '500 40px "Space Grotesk"', '700 40px "Space Grotesk"'].map(f => document.fonts.load(f)));
  const TL = await fetch('timeline.json').then(r => r.json()), LN = TL.lines, caps = makeCaptions(LN);
  const T0 = i => LN[i].t0, T1 = i => LN[i].t1;
  // start time of the first word in line i containing `w`
  const word = (i, w) => { const q = LN[i].words.find(q => q[0].toLowerCase().includes(w.toLowerCase())); if (!q) throw new Error(`word "${w}" not in line ${i}`); return q[1]; };
  // 0..1 visibility of a scene spanning lines a..b, with soft fades in and out
  const vis = (t, a, b = a) => ss(seg(t, T0(a) - .5, T0(a) + .1)) * (b + 1 < LN.length ? 1 - ss(seg(t, T0(b + 1) - .45, T0(b + 1) + .05)) : 1 - ss(seg(t, TL.end - .4, TL.end + .3)));
  const lineAt = t => { let k = 0; for (let i = 0; i < LN.length; i++) if (t >= T0(i) - .45) k = i; return k; };
  function label(text, x, y, px = 24, a = 1, col = 'rgba(255,214,150,.85)', align = 'center', ls = 5, weight = 400) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `${weight} ${px}px "JetBrains Mono"`; g.letterSpacing = `${ls}px`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y); g.restore();
  }
  function big(text, x, y, px = 150, a = 1, col = C.cream, glowCol = C.gold) {
    if (a <= 0) return; g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `200 ${px}px "JetBrains Mono"`; g.letterSpacing = `${-px * .04}px`;
    g.fillStyle = col; g.shadowColor = glowCol; g.shadowBlur = px * .22; g.fillText(text, x, y); g.restore();
  }
  // stat card at the top: cards[i](t) -> [number, label] for line i (null = no card)
  function card(t, cards, a, header) {
    if (header) label(header, 540, 150, 20, a * .6, 'rgba(255,243,220,.65)', 'center', 4);
    const i = lineAt(t), c = cards[i] && cards[i](t); if (!c) return; const k = ss(seg(t, T0(i) - .45, T0(i) + .1));
    big(c[0], 540, 300 + (1 - k) * 30, c[2] || 140, a * k);
    g.save(); g.globalAlpha = a * k; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '500 30px "Space Grotesk"'; g.letterSpacing = '8px'; g.fillStyle = 'rgba(255,196,107,.9)'; g.fillText(c[1], 545, 410); g.restore();
  }
  function endCard(t, tag = 'FOLLOW FOR THE NEXT MAP') {
    const endK = ss(seg(t, TL.end - .4, TL.end + .5)); if (endK <= 0) return;
    g.fillStyle = `rgba(4,3,12,${endK})`; g.fillRect(0, 0, W, H); D.stars(g, W, H, 0, 120, 77, endK * .6, 1, t);
    const a = ss(seg(t, TL.end + .1, TL.end + .9)); D.mark(g, 540, 820, 420, t - TL.end, a);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = '500 60px "Space Grotesk"'; g.letterSpacing = '24px'; g.fillStyle = C.cream; g.shadowColor = C.gold; g.shadowBlur = 24;
    g.fillText('VOID ATLAS', 552, 1120); g.shadowBlur = 0; g.font = '400 28px "JetBrains Mono"'; g.letterSpacing = '6px'; g.fillStyle = C.gold; g.fillText(tag, 543, 1200); g.restore();
  }
  // full frame: bg(t) draws the story; opt.cards = stat cards; opt.header = small top line
  function frame(draw, opt = {}) {
    window.render = t => {
      draw(t);
      D.vignette(g, W, H, .65);
      if (opt.cards) card(t, opt.cards, ss(seg(t, .1, .7)) * (1 - ss(seg(t, TL.end - .4, TL.end + .3))), opt.header);
      caps(g, t, opt.capY || 1360);
      endCard(t, opt.endTag);
      if (t < .5) { g.fillStyle = `rgba(0,0,0,${1 - t / .5})`; g.fillRect(0, 0, W, H); }
      D.grain(g, W, H, .05, Math.floor(t * 30));
    };
    window.DUR = TL.dur; window.READY = true;
  }
  return { g, cv, TL, LN, T0, T1, word, vis, lineAt, label, big, frame, D, C, clamp, lerp, ss, seg, W, H };
}
