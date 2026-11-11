// First and Only: the timeline. All times come from timing.json (python3 timing.py, fitted to voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE } from './figures.js';

const TJ = await fetch('timing.json').then(r => r.json());
const LINES_JSON = await fetch('lines.json').then(r => r.json());
export const DUR = TJ.dur;
export const LINES = LINES_JSON.map(l => [l.id, TJ.S[l.id], TJ.D[l.id], l.text]);
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = TJ.T;
const S = TJ.S, MY = [1500, 1170, 840, 510, 180, -230];

// camera: title scroll, dive to medallion 0 during L1, then hop up one medallion before the line that needs it
const CAM = [[0, 0, -22, 2.7], [3.6, 0, -14, 2.8], [4.1, 0, 700, 0.95], [4.8, 0, 1494, 3.1]];
const SUN = [[0, -22, 20, 0, [1, .88, .6]], [.3, -22, 20, 2.4, [1, .88, .6]], [1.2, -22, 420, 2.4, [1, .88, .6]], [3.6, -22, 420, 2.4, [1, .88, .6]], [4.1, 600, 2400, 1.6, [1, .88, .6]]];
const LIGHT = [[.75, 1, .7], [1, .9, .65], [1, .5, .45], [1, .55, .3], [1, .45, .3], [.8, .85, 1]];
const INT = [2.2, 2.4, 2.2, 2.6, 2.4, 2.5];
let cur = 0;
CAM.push([0, 0, MY[0] + 4, 3.1].map((v, k) => k ? v : 4.8)); SUN.push([4.8, MY[0], 440, INT[0], LIGHT[0]]);
for (const [id] of LINES_JSON.map(l => [l.id])) {
  const m = TJ.MED[id]; if (m === cur) continue;
  const t = S[id];
  CAM.push([t - 1.3, 0, MY[cur] + 6, 3.4], [t - .5, 0, MY[m] - 4, m === 5 ? 2.75 : 3.2]);
  SUN.push([t - 1.3, MY[cur], 440, INT[cur], LIGHT[cur]], [t - .5, MY[m], 440, INT[m], LIGHT[m]]);
  cur = m;
}
const endL = S.L9 + TJ.D.L9;
CAM.push([endL + .5, 0, -236, 2.95], [endL + 2.5, 0, 470, 0.8], [DUR, 0, 462, 0.84]);
SUN.push([DUR, -230, 440, INT[5], LIGHT[5]]);
CAM.sort((a, b) => a[0] - b[0]);

function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / Math.max(1e-6, b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }
const step = (t, t0, d = .375) => Math.ceil(clamp((t - t0) / d) * 3) / 3;   // 8 fps held steps

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  const q8 = Math.floor(t * 8) / 8;
  st.med[0] = { shift: t < T.shift ? 0 : 10 * Math.sin((q8 - T.shift) * 1.2) };
  st.med[1] = { gaunt: t >= T.gaunt, salute: t >= T.salute };
  st.med[2] = { fleet: t >= T.fleet, shipY: -120 + 80 * ss(seg(q8, T.fleet, T.fleet + 3.5)) };
  st.med[3] = { fire: t >= T.fire, order: t >= T.order };
  st.med[4] = { burn: t >= T.burn, rawne: t >= T.rawne, draw: t >= T.draw };
  st.med[5] = { raise: t >= T.raise, row: t >= T.row };
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.gaunt, 74, 1170, 110, 2.0, [1, .9, .6]); flash(T.fleet, 0, 800, 130, 2.2, [1, .4, .3]); flash(T.fire, 0, 560, 120, 2.2, [1, .6, .3]);
  flash(T.burn, 0, 166, 160, 3.0, [1, .5, .2]); flash(T.raise, 0, -260, 140, 2.4, [.9, .95, 1]);
  st.expo = 1.1 + (t >= T.burn && t < T.burn + .35 ? .5 * (1 - (t - T.burn) / .35) : 0); st.spill = sunI * .35;
  st.fade = ss(seg(t, DUR - .7, DUR));
  return st;
}

const hop = LINES_JSON.filter((l, k) => k && TJ.MED[l.id] !== TJ.MED[LINES_JSON[k - 1].id]).map(l => S[l.id]);
export const EV = [
  { t: .3, type: 'ray' }, { t: 3.7, type: 'whoosh', d: 1.2 }, { t: 4.8, type: 'light' }, { t: T.shift, type: 'whisper', d: 2.0 },
  ...hop.flatMap(s => [{ t: s - 1.2, type: 'glide', d: .7 }, { t: s - .55, type: 'light' }]),
  { t: T.gaunt, type: 'step' }, { t: T.salute, type: 'ray' }, { t: T.fleet, type: 'whoosh', d: 2.4 }, { t: T.fire, type: 'thump' }, { t: T.order, type: 'clash' },
  { t: T.burn, type: 'crack' }, { t: T.draw, type: 'clash' }, { t: T.raise, type: 'ray' }, { t: T.row, type: 'step' }, { t: T.bell, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
