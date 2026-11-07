import { makeComp } from './comp.js';
import { renderScene, W, H } from './scene.js';
import * as STORY from './story.js';
import { drawBanderole } from './subs.js';


const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const L = { G: mk(), S: mk(), R: mk(), O: mk(), P: mk(8, 8) };
const Lc = {}; for (const k in L) Lc[k] = L[k].getContext('2d');
await document.fonts.load('600 40px Cinzel'); await document.fonts.load('40px "IM Fell English"');

// timemap.json (retime.py) fits the film to a new narration: render(t) shows the old timeline at R(t)
const TM = await fetch('timemap.json').then(r => r.ok ? r.json() : null).catch(() => null);
const lerpMap = (pts, x) => { if (x <= pts[0][0]) return pts[0][1] + x - pts[0][0]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, b] = pts[i - 1], [c, d] = pts[i]; return b + (x - a) * (d - b) / (c - a); } const [a, b] = pts[pts.length - 1]; return b + x - a; };
const F = t => TM ? lerpMap(TM.anchors, t) : t, R = t => TM ? lerpMap(TM.anchors.map(([o, n]) => [n, o]), t) : t;
const chars = s => s.replace(/\s/g, '').length;
const LN = TM ? STORY.LINES.map(([id, , , text]) => [id, TM.lines[id][0], TM.lines[id][1], text]) : STORY.LINES;
const SUBS = TM ? LN.map(([id, t0, d, text], i) => ({ id, t0, t1: Math.min(LN[i + 1] ? LN[i + 1][1] - .35 : TM.dur - .3, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text })) : STORY.SUBS;
window.DUR = TM ? TM.dur : STORY.DUR; window.EV = STORY.EV.map(e => ({ ...e, t: e.type === 'voice' && TM ? TM.lines[e.id][0] : F(e.t) })); window.SUBS = SUBS;
let texts = [];
window.TEXTS = () => texts;
window.render = t => {
  const st = STORY.state(R(t)); st.time = t;
  texts = [];
  if (t > 1.2 && t < 5.2) texts.push({ id: 'title', text: "THE CHAPTER THAT VANISHED", x0: 300, y0: 1150, x1: 780, y1: 1220 });
  if (!Q.get('nosub')) st.overlay = O => { const r = drawBanderole(O, SUBS, t); if (r) texts.push(r); };
  if (Q.get('textsonly')) { Lc.O.clearRect(0, 0, W, H); return st.overlay(Lc.O); }   // fast path for readcheck.mjs
  renderScene(Lc, L, comp, st);
};
window.READY = true;
