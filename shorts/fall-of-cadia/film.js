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

window.DUR = STORY.DUR; window.EV = STORY.EV; window.SUBS = STORY.SUBS;
let texts = [];
window.TEXTS = () => texts;
window.render = t => {
  const st = STORY.state(t);
  texts = [];
  if (t > 1.2 && t < 5.2) texts.push({ id: 'title', text: 'THE FALL OF CADIA', x0: 300, y0: 1150, x1: 780, y1: 1220 });
  if (!Q.get('nosub')) st.overlay = O => { const r = drawBanderole(O, STORY.SUBS, t); if (r) texts.push(r); };
  if (Q.get('textsonly')) { Lc.O.clearRect(0, 0, W, H); return st.overlay(Lc.O); }   // fast path for readcheck.mjs
  renderScene(Lc, L, comp, st);
};
window.READY = true;
