// The Crimson King: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 52.0;
export const LINES = [
  ['L1', 0.6, 4.162, "Magnus the Red tried to save his father. It destroyed everything he loved."],
  ['L2', 6.0, 3.683, "The sorcerer Primarch foresaw that Horus would betray the Emperor."],
  ['L3', 11.2, 4.07, "So he used forbidden sorcery to send the warning straight to Terra."],
  ['L4', 16.8, 3.88, "His spell shattered the wards guarding the Emperor's greatest secret."],
  ['L5', 22.2, 5.587, "The Emperor sent the Space Wolves to bring him in. Horus twisted the order into a death sentence."],
  ['L6', 29.3, 4.128, "The Wolves burned Prospero, his city of light, to the ground."],
  ['L7', 34.0, 3.191, "Magnus faced Leman Russ, and Russ broke him."],
  ['L8', 38.8, 5.214, "As his world died, only one power answered his cry: Tzeentch."],
  ['L9', 44.8, 2.816, "He warned his father of a traitor, and became one."],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = {"vision": 7.4, "cast": 12.6, "shatter": 18.6, "twist": 25.4, "clash": 31.0, "broke": 36.4, "answer": 42.4, "risen": 45.6};

const CAM = [[0, 0, -22, 2.7], [4.8, 0, -14, 2.8], [5.3, 0, 700, 0.95], [6.0, 0, 1494, 3.1], [9.9, 0, 1504, 3.35], [10.7, 0, 1166, 3.2], [15.5, 0, 1172, 3.4], [16.3, 0, 838, 3.2], [20.9, 0, 846, 3.4], [21.7, 0, 508, 3.2], [28.0, 0, 514, 3.4], [28.8, 0, 178, 3.1], [37.5, 0, 186, 3.4], [38.3, 0, -228, 2.75], [48.2, 0, -236, 2.95], [50.2, 0, 470, 0.8], [52.0, 0, 462, 0.84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const WARP = [.6, .8, 1], GOLD = [1, .85, .55], DUSK = [1, .55, .35], COLD = [.8, .85, 1], FIRE = [1, .5, .25], TZ = [.7, .55, 1];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [4.8, -22, 420, 2.4, GOLD], [5.3, 600, 2400, 1.6, GOLD],
  [6.0, 1500, 440, 2.4, GOLD], [9.9, 1500, 440, 2.4, GOLD], [10.7, 1170, 440, 2.2, WARP], [15.5, 1170, 440, 2.2, WARP], [16.3, 840, 440, 2.4, GOLD], [20.9, 840, 440, 2.4, GOLD],
  [21.7, 510, 440, 2.0, COLD], [28.0, 510, 440, 2.0, COLD], [28.8, 180, 440, 2.6, FIRE], [37.5, 180, 440, 2.6, FIRE], [38.3, -230, 440, 2.2, TZ], [52, -230, 440, 2.2, TZ]];
const CR = (() => { const r = mulberry(31), out = []; for (const a of [-2.4, -1.2, -.2, 1.0, 2.2]) { let x = 0, y = 830, ang = a; const pts = [[x, y]]; for (let k = 0; k < 8; k++) { ang += (r() - .5) * .8; x += Math.cos(ang) * 14; y += Math.sin(ang) * 14; pts.push([x, y]); } out.push(pts); } return out; })();

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  if (t >= T.broke && t < T.broke + 2 / 24) st.cam = [st.cam[0] + (t - T.broke < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  st.med[0] = { vision: t >= T.vision, pose: t < T.vision ? POSE.stand : stepPose(t, T.vision, 'stand', 'reach', .375) };
  st.med[1] = { cast: t >= T.cast };
  st.med[2] = { shatter: t >= T.shatter };
  st.med[3] = { twist: t >= T.twist };
  st.med[4] = { broken: t >= T.broke, rpose: t < T.clash ? POSE.guard : t < T.broke ? stepPose(t, T.clash, 'guard', 'strike', .25) : stepPose(t, T.broke - .2, 'strike', 'raise', .25), mpose: t < T.clash ? POSE.guard : t < T.broke ? stepPose(t, T.clash + .2, 'guard', 'reach', .25) : stepPose(t, T.broke, 'hit', 'kneelLow', .375) };
  st.med[5] = { flames: t >= T.answer, risen: t >= T.risen, pose: t < T.risen ? POSE.kneelLow : stepPose(t, T.risen, 'kneelLow', 'raise', .375) };
  if (t >= T.shatter) { const k = clamp((t - T.shatter) / .3), bright = t < T.shatter + .5; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3.2 }); }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.vision, 66, 1434, 90, 2.0, [.4, .8, 1]); flash(T.cast, 0, 1100, 120, 2.6, [.5, .85, 1]); flash(T.shatter, 0, 830, 170, 3.0, [1, .9, .6]); flash(T.twist, 80, 440, 90, 2.0, [1, .3, .2]); flash(T.broke, 20, 180, 130, 2.6, [1, .5, .2]); flash(T.answer, 0, -280, 150, 2.6, [.6, .4, 1]);
  st.expo = 1.1 + (t >= T.shatter && t < T.shatter + .35 ? .5 * (1 - (t - T.shatter) / .35) : 0); st.spill = sunI * .35;
  st.fade = ss(seg(t, 51.3, 52.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 4.9, type: 'whoosh', d: 1.2 }, { t: 6.0, type: 'light' }, { t: T.vision, type: 'whisper', d: 1.6 },
  { t: 10.0, type: 'glide', d: .7 }, { t: 10.65, type: 'light' }, { t: T.cast, type: 'ray' }, { t: T.cast + .1, type: 'whoosh', d: 1.4 },
  { t: 15.6, type: 'glide', d: .7 }, { t: 16.25, type: 'light' }, { t: T.shatter, type: 'crack' },
  { t: 21.0, type: 'glide', d: .7 }, { t: 21.65, type: 'light' }, { t: 23.0, type: 'step' }, { t: T.twist, type: 'whisper', d: 1.8 },
  { t: 28.1, type: 'glide', d: .7 }, { t: 28.75, type: 'light' }, { t: T.clash, type: 'clash' }, { t: T.broke, type: 'strike' }, { t: T.broke + .4, type: 'thump' },
  { t: 37.6, type: 'glide', d: .7 }, { t: 38.25, type: 'light' }, { t: T.answer, type: 'whisper', d: 2.4 }, { t: T.risen, type: 'ray' }, { t: 48.0, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
