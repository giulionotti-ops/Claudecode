// Small shared pieces for scene files: labels, big numbers, the end card, loading fonts and the timeline.
import * as D from './draw.js';
import { makeCaptions } from './captions.js';
const { C, ss, seg } = D;
export async function setup() {
  const cv = document.getElementById('c'), g = cv.getContext('2d');
  await Promise.all(['900 70px Montserrat', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"', '300 40px "Space Grotesk"', '500 40px "Space Grotesk"'].map(f => document.fonts.load(f)));
  const TL = await fetch('timeline.json').then(r => r.json()), LN = TL.lines;
  const T0 = i => LN[i].t0;
  const word = (i, w) => { const q = LN[i].words.find(q => q[0].toLowerCase().includes(w)); if (!q) throw new Error(`word "${w}" not in line ${i + 1}`); return q[1]; };
  const vis = (t, a, b = a) => ss(seg(t, T0(a) - .5, T0(a) + .1)) * (b + 1 < LN.length ? 1 - ss(seg(t, T0(b + 1) - .45, T0(b + 1) + .05)) : 1 - ss(seg(t, TL.end - .4, TL.end + .3)));
  const label = (text, x, y, px = 24, a = 1, col = 'rgba(111,246,255,.8)', align = 'center', ls = 5) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `400 ${px}px "JetBrains Mono"`; g.letterSpacing = `${ls}px`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y); g.restore(); };
  const bigNum = (text, y, a, px = 200) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `200 ${px}px "JetBrains Mono"`; g.letterSpacing = `${-px * .03}px`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = px * .2; g.fillText(text, 540, y); g.restore(); };
  const caps = makeCaptions(LN);
  const finish = t => {   // vignette, captions, end card, fade-in, grain: call last in render()
    D.vignette(g, 1080, 1920, .7); caps(g, t, 1360);
    const endK = ss(seg(t, TL.end - .4, TL.end + .5));
    if (endK > 0) {
      g.fillStyle = `rgba(1,3,8,${endK})`; g.fillRect(0, 0, 1080, 1920);
      const a = ss(seg(t, TL.end + .1, TL.end + .9)); D.mark(g, 540, 820, 300, t, a);
      g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = '300 52px "Space Grotesk"'; g.letterSpacing = '16px'; g.fillStyle = C.white; g.shadowColor = C.glow; g.shadowBlur = 20;
      g.fillText('BELOW ZERO LIGHT', 548, 1120); g.shadowBlur = 0; g.font = '400 30px "JetBrains Mono"'; g.letterSpacing = '6px'; g.fillStyle = C.glow; g.fillText('FOLLOW FOR THE NEXT DIVE', 543, 1200); g.restore();
    }
    if (t < .5) { g.fillStyle = `rgba(0,0,0,${1 - t / .5})`; g.fillRect(0, 0, 1080, 1920); }
    D.grain(g, 1080, 1920, .05, Math.floor(t * 30));
  };
  return { g, TL, LN, T0, word, vis, label, bigNum, finish, W: 1080, H: 1920 };
}
