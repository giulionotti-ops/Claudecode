// The Chapter That Vanished: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';
import { GPOSE } from './cadia.js';

export const DUR = 54.0;
export const LINES = [
  ['L1', .6, 4.734, 'In the year nine six three, an entire Chapter of Space Marines vanished.'],
  ['L2', 7.0, 5.398, 'The Fire Hawks boarded their great fortress-ship, the Raptorus Rex, and entered the warp.'],
  ['L3', 14.0, .987, 'They never came out.'],
  ['L4', 17.4, 4.256, 'No wreck was found. No message. Not a single survivor.'],
  ['L5', 23.2, 4.006, 'Then, on battlefields across the galaxy, a new legend began.'],
  ['L6', 27.8, 5.501, 'When all hope is lost, warriors in black armour appear, wreathed in ghostly fire.'],
  ['L7', 34.8, 4.938, 'The Legion of the Damned. They save the doomed, then vanish without a word.'],
  ['L8', 41.2, 3.85, 'Some say they are the lost Fire Hawks, burning forever in the warp.'],
  ['L9', 46.0, 3.397, 'No one knows for sure. And the Legion never speaks.'],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { raise: 10.2, warp: 13.5, gone: 14.9, appear: 30.6, save: 36.6, dead: 37.0, vanish: 38.5, hawk: 43.6, unknown: 45.6, grim: 46.6 };

const CAM = [[0, 0, -22, 2.7], [5.7, 0, -14, 2.8], [6.2, 0, 700, .95], [6.9, 0, 1494, 3.1], [12.7, 0, 1504, 3.35],
  [13.5, 0, 1166, 3.2], [16.2, 0, 1172, 3.4], [17.0, 0, 838, 3.2], [22.0, 0, 846, 3.4], [22.8, 0, 508, 3.2], [33.6, 0, 514, 3.4],
  [34.4, 0, 178, 3.1], [40.0, 0, 186, 3.4], [40.8, 0, -228, 2.75], [50.2, 0, -236, 2.95], [52.2, 0, 470, .8], [54.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const COLD = [.75, .8, 1], WARP = [.8, .5, 1], GOLD = [1, .82, .55], FIRE = [1, .6, .3], EMBER = [1, .5, .25];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [5.7, -22, 420, 2.4, GOLD], [6.2, 600, 2400, 1.6, GOLD],
  [6.9, 1500, 440, 2.2, COLD], [12.7, 1500, 440, 2.2, COLD], [13.5, 1170, 440, 2.4, WARP], [16.2, 1170, 440, 2.4, WARP],
  [17.0, 840, 440, 1.7, COLD], [22.0, 840, 440, 1.7, COLD], [22.8, 510, 440, 2.0, EMBER], [30.4, 510, 440, 2.0, EMBER], [30.9, 510, 440, 2.8, FIRE], [33.6, 510, 440, 2.8, FIRE],
  [34.4, 180, 440, 2.6, FIRE], [40.0, 180, 440, 2.6, FIRE], [40.8, -230, 440, 2.2, FIRE], [54, -230, 440, 2.2, FIRE]];

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  const q8 = Math.floor(t * 8) / 8;
  st.med[0] = { pose: t < T.raise ? POSE.stand : stepPose(t, T.raise, 'stand', 'raise', .375), pose2: t < T.raise + .2 ? POSE.stand : stepPose(t, T.raise + .2, 'stand', 'raise', .375) };
  const k = ss(seg(q8, T.warp, T.gone));
  st.med[1] = { t: q8 * .6, gone: t >= T.gone, shipX: -90 + 90 * k, shipS: 1 - .85 * k };
  st.med[2] = {};
  st.med[3] = { t: q8 * 8, legion: t >= T.appear, dpose: t < T.appear ? POSE.strike : stepPose(t, T.appear, 'strike', 'hit', .375), gpose: t < T.appear ? POSE.kneel : GPOSE.gRaise };
  st.med[4] = { t: q8 * 8, pose: t < T.save ? POSE.guard : stepPose(t, T.save, 'guard', 'strike', .25), dead: t >= T.dead, vanish: t >= T.vanish };
  st.med[5] = { hawk: t >= T.hawk && t < T.unknown, pose: t < T.grim ? POSE.stand : stepPose(t, T.grim, 'stand', 'guard', .375) };
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.gone, 0, 1170, 160, 2.6, [.8, .5, 1]); flash(T.appear, -10, 510, 140, 3.0, [1, .6, .3]); flash(T.vanish, -60, 180, 120, 2.2, [1, .7, .3]); flash(T.hawk, 0, -230, 150, 2.0, [1, .7, .3]); flash(T.unknown, 0, -230, 120, 1.6, [1, .4, .2]);
  if (t >= T.appear && t < T.vanish && st.pts.length < 4) st.pts.push([-30, t < 33.6 ? 510 : 180, 80, .8 + .2 * Math.sin(t * 17), [1, .55, .2]]);   // the ghost-fire flickers
  st.expo = 1.1; st.spill = sunI * .35;
  st.fade = ss(seg(t, 53.3, 54.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 5.8, type: 'whoosh', d: 1.2 }, { t: 6.9, type: 'light' }, { t: T.raise, type: 'clash' },
  { t: 12.8, type: 'glide', d: .7 }, { t: 13.45, type: 'light' }, { t: T.warp, type: 'whisper', d: 1.6 }, { t: T.gone, type: 'crack' },
  { t: 16.3, type: 'glide', d: .7 }, { t: 16.95, type: 'light' },
  { t: 22.1, type: 'glide', d: .7 }, { t: 22.75, type: 'light' }, { t: 25.0, type: 'clash' }, { t: T.appear, type: 'ray' }, { t: T.appear + .05, type: 'whoosh', d: 1.0 },
  { t: 33.7, type: 'glide', d: .7 }, { t: 34.35, type: 'light' }, { t: T.save, type: 'strike' }, { t: T.dead, type: 'thump' }, { t: T.vanish, type: 'whoosh', d: .9 }, ...[0, 1, 2].map(k => ({ t: T.vanish + .1 + k * .1, type: 'tinkle' })),
  { t: 40.1, type: 'glide', d: .7 }, { t: 40.75, type: 'light' }, { t: T.hawk, type: 'ray' }, { t: T.unknown, type: 'crack' }, { t: 48.6, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
