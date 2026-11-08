// The Night Haunter: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';
import { GPOSE } from './cadia.js';

export const DUR = 49.0;
export const LINES = [
  ['L1', 0.6, 3.78, "Konrad Curze could see the future. And it was always dark."],
  ['L2', 6.0, 4.001, "He grew up alone on Nostramo, a world that never saw the sun."],
  ['L3', 11.6, 3.91, "He hunted its criminals in the night, until the whole world feared him."],
  ['L4', 17.1, 2.954, "He led the Night Lords, and ruled through terror."],
  ['L5', 21.7, 3.246, "When his homeworld fell back into crime, he destroyed it."],
  ['L6', 26.6, 2.824, "He joined Horus. Then he saw his own death."],
  ['L7', 30.0, 2.153, "An assassin, sent by the Emperor."],
  ['L8', 33.8, 4.463, "Curze could have fled. Instead, he waited for her on his throne."],
  ['L9', 39.3, 4.388, "His last words: death is nothing, compared to vindication."],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { vision: 7.6, hunt: 12.6, fear: 14.0, lords: 17.9, lance: 22.6, destroyed: 24.2, horus: 26.6, death: 28.6, assassin: 30.2, approach: 33.8, raise: 38.6, strike: 43.9 };

const CAM = [[0, 0, -22, 2.7], [4.6, 0, -14, 2.8], [5.1, 0, 700, .95], [5.8, 0, 1494, 3.1], [10.3, 0, 1504, 3.35],
  [11.1, 0, 1166, 3.2], [15.8, 0, 1172, 3.4], [16.6, 0, 838, 3.2], [20.4, 0, 846, 3.4], [21.2, 0, 508, 3.2], [25.4, 0, 514, 3.4],
  [26.1, 0, 178, 3.1], [32.6, 0, 186, 3.4], [33.3, 0, -228, 2.75], [45.0, 0, -236, 2.95], [47.0, 0, 470, .8], [49.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const NIGHT = [.6, .7, 1], MOON = [.75, .8, 1], STORM = [.85, .9, 1], FIRE = [1, .55, .3], DREAD = [.9, .45, .6], CANDLE = [1, .75, .5];
const SUN = [[0, -22, 20, 0, MOON], [.3, -22, 20, 2.2, MOON], [1.2, -22, 420, 2.2, MOON], [4.6, -22, 420, 2.2, MOON], [5.1, 600, 2400, 1.4, MOON],
  [5.8, 1500, 440, 1.8, NIGHT], [10.3, 1500, 440, 1.8, NIGHT], [11.1, 1170, 440, 1.8, NIGHT], [15.8, 1170, 440, 1.8, NIGHT],
  [16.6, 840, 440, 2.2, STORM], [20.4, 840, 440, 2.2, STORM], [21.2, 510, 440, 2.0, NIGHT], [24.0, 510, 440, 2.0, NIGHT], [24.4, 510, 440, 2.6, FIRE], [25.4, 510, 440, 2.6, FIRE],
  [26.1, 180, 440, 2.2, DREAD], [32.6, 180, 440, 2.2, DREAD], [33.3, -230, 440, 2.0, CANDLE], [49, -230, 440, 2.0, CANDLE]];
const CR = (() => { const r = mulberry(23), out = []; for (const a of [-2.6, -1.4, -.3, .9, 2.0, 3.0]) { let x = 0, y = 540, ang = a; const pts = [[x, y]]; for (let k = 0; k < 7; k++) { ang += (r() - .5) * .8; x += Math.cos(ang) * 13; y += Math.sin(ang) * 13; pts.push([x, y]); } out.push(pts); } return out; })();

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  st.med[0] = { pose: t < T.vision ? POSE.kneelLow : stepPose(t, T.vision, 'kneelLow', 'kneel', .375), face: 'pain' };
  st.med[1] = { pose: t < T.hunt ? POSE.guard : stepPose(t, T.hunt, 'guard', 'strike', .25), tpose: t < T.hunt + .2 ? GPOSE.gAim : stepPose(t, T.hunt + .2, GPOSE.gAim, POSE.lie, .375), tpose2: t < T.fear ? POSE.stand : stepPose(t, T.fear, 'stand', 'kneelLow', .375) };
  st.med[2] = { bolt: t >= T.lords && t < T.lords + .4, pose: t < T.lords ? POSE.stand : stepPose(t, T.lords, 'stand', 'raise', .375) };
  st.med[3] = { lance: t >= T.lance && t < T.destroyed + .8 };
  st.med[4] = { horus: t >= T.horus && t < T.death, vision: t >= T.death, spose: t < T.assassin ? GPOSE.gStand : stepPose(t, T.assassin, GPOSE.gStand, GPOSE.gRaise, .375), pose: t < T.death ? POSE.stand : stepPose(t, T.death, 'stand', 'hit', .375) };
  const k = ss(seg(Math.floor(t * 8) / 8, T.approach, T.raise));
  st.med[5] = { shenX: 150 - 90 * k, spose: t < T.raise ? GPOSE.gStand : t < T.strike ? stepPose(t, T.raise, GPOSE.gStand, GPOSE.gRaise, .375) : stepPose(t, T.strike, GPOSE.gRaise, POSE.strike, .25) };
  if (t >= T.destroyed) { const kk = clamp((t - T.destroyed) / .3), bright = t < T.destroyed + .5; for (const pts of CR) st.cracks.push({ pts, k: kk, lead: !bright, w: 3.2 }); }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.vision, -6, 1440, 120, 2.2, [.8, .3, .4]); flash(T.hunt, -20, 1150, 90, 2.0, [.7, .8, 1]); flash(T.lords, 20, 760, 160, 3.0, [.85, .9, 1]); flash(T.destroyed, 0, 540, 180, 3.2, [1, .5, .2]); flash(T.death, 66, 160, 110, 2.0, [.9, .3, .5]); flash(T.strike, 20, -230, 150, 2.6, [.5, 1, .4]);
  st.expo = 1.1 + (t >= T.destroyed && t < T.destroyed + .35 ? .5 * (1 - (t - T.destroyed) / .35) : 0); st.spill = sunI * .35;
  st.fade = ss(seg(t, 48.3, 49.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 4.7, type: 'whoosh', d: 1.2 }, { t: 5.8, type: 'light' }, { t: T.vision, type: 'whisper', d: 2.0 },
  { t: 10.4, type: 'glide', d: .7 }, { t: 11.05, type: 'light' }, { t: T.hunt, type: 'strike' }, { t: T.hunt + .4, type: 'thump' }, { t: T.fear, type: 'step' },
  { t: 15.9, type: 'glide', d: .7 }, { t: 16.55, type: 'light' }, { t: T.lords, type: 'crack' },
  { t: 20.5, type: 'glide', d: .7 }, { t: 21.15, type: 'light' }, { t: T.lance, type: 'ray' }, { t: T.destroyed, type: 'crack' },
  { t: 25.5, type: 'glide', d: .6 }, { t: 26.05, type: 'light' }, { t: T.death, type: 'whisper', d: 2.4 },
  { t: 32.7, type: 'glide', d: .6 }, { t: 33.25, type: 'light' }, ...[0, 1, 2, 3, 4, 5].map(k => ({ t: T.approach + .7 * k, type: 'step' })), { t: T.raise, type: 'ray' }, { t: T.strike, type: 'clash' }, { t: 44.4, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
