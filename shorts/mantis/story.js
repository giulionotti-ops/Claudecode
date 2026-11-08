// The Mantis Warriors: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 51.0;
export const LINES = [
  ['L1', 0.6, 6.617, "For a thousand years, the Mantis Warriors guarded a cluster of worlds at the edge of the Maelstrom, alone."],
  ['L2', 8.0, 5.764, "Then Lufgt Huron, the Tyrant of Badab, called on his brothers to defend their freedom from Terra."],
  ['L3', 14.4, 1.28, "The Mantis Warriors answered."],
  ['L4', 17.2, 3.366, "They never knew Huron had already given his soul to Chaos."],
  ['L5', 22.2, 4.587, "When the war was lost, they begged the Emperor's forgiveness, and it was granted."],
  ['L6', 28.4, 4.128, "But their Chapter Master was stripped of his armour, and locked away for life."],
  ['L7', 34.1, 5.974, "Their home was given away, and they were sent on a hundred-year crusade, forbidden to recruit."],
  ['L8', 40.8, 2.092, "Year after year, their numbers dwindled."],
  ['L9', 43.6, 3.058, "They were forgiven. But many still call them traitors."],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { answer: 14.5, chaos: 19.6, granted: 25.4, stripped: 29.8, locked: 31.4, given: 34.4, dwindle: 40.8, traitors: 45.6 };

const CAM = [[0, 0, -22, 2.7], [3.6, 0, -14, 2.8], [4.1, 0, 700, .95], [4.8, 0, 1494, 3.1], [7.3, 0, 1504, 3.35],
  [8.0, 0, 1166, 3.2], [15.9, 0, 1172, 3.4], [16.7, 0, 838, 3.2], [20.9, 0, 846, 3.4], [21.7, 0, 508, 3.2], [27.1, 0, 514, 3.4],
  [27.9, 0, 178, 3.1], [33.0, 0, 186, 3.4], [33.7, 0, -228, 2.75], [47.2, 0, -236, 2.95], [49.2, 0, 470, .8], [51.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const DESERT = [1, .82, .55], DUSK = [1, .55, .35], RED = [1, .4, .3], GOLD = [1, .9, .65], COLD = [.75, .8, 1], ASH = [.9, .82, .75];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [3.6, -22, 420, 2.4, GOLD], [4.1, 600, 2400, 1.6, GOLD],
  [4.8, 1500, 440, 2.4, DESERT], [7.3, 1500, 440, 2.4, DESERT], [8.0, 1170, 440, 2.4, DUSK], [15.9, 1170, 440, 2.4, DUSK],
  [16.7, 840, 440, 2.2, RED], [20.9, 840, 440, 2.2, RED], [21.7, 510, 440, 2.0, COLD], [25.2, 510, 440, 2.0, COLD], [25.6, 510, 440, 2.6, GOLD], [27.1, 510, 440, 2.6, GOLD],
  [27.9, 180, 440, 1.8, COLD], [33.0, 180, 440, 1.8, COLD], [33.7, -230, 440, 2.2, ASH], [51, -230, 440, 2.2, ASH]];

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  st.med[0] = {};
  st.med[1] = { pose: t < T.answer ? POSE.stand : stepPose(t, T.answer, 'stand', 'raise', .375) };
  st.med[2] = { chaos: t >= T.chaos };
  st.med[3] = { granted: t >= T.granted };
  st.med[4] = { stripped: t >= T.stripped, locked: t >= T.locked };
  st.med[5] = { firehawk: t >= T.given, count: t < T.dwindle ? 5 : Math.max(2, 5 - Math.floor((t - T.dwindle) / .7)) };
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.answer, -60, 1150, 90, 1.8); flash(T.chaos, 30, 790, 140, 2.6, [1, .3, .2]); flash(T.granted, 0, 460, 130, 2.6, [1, .9, .6]); flash(T.locked, 0, 180, 110, 1.6, [.8, .85, 1]);
  st.expo = 1.1; st.spill = sunI * .35;
  st.fade = ss(seg(t, 50.3, 51.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 3.7, type: 'whoosh', d: 1.2 }, { t: 4.8, type: 'light' },
  { t: 7.4, type: 'glide', d: .7 }, { t: 7.95, type: 'light' }, { t: T.answer, type: 'clash' },
  { t: 16.0, type: 'glide', d: .7 }, { t: 16.65, type: 'light' }, { t: T.chaos, type: 'whisper', d: 2.0 }, { t: T.chaos, type: 'crack' },
  { t: 21.0, type: 'glide', d: .7 }, { t: 21.65, type: 'light' }, { t: T.granted, type: 'ray' },
  { t: 27.2, type: 'glide', d: .7 }, { t: 27.85, type: 'light' }, { t: T.stripped, type: 'slide', d: .4 }, { t: T.locked, type: 'thump' },
  { t: 33.1, type: 'glide', d: .6 }, { t: 33.65, type: 'light' }, { t: T.given, type: 'step' }, ...[0, 1, 2].map(k => ({ t: T.dwindle + .7 * (k + 1), type: 'tinkle' })), { t: 47.0, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
