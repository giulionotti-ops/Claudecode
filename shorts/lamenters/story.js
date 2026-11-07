// The Cursed Chapter (the Lamenters): the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 54.0;
export const LINES = [
  ['L1', .6, 2.903, 'The Lamenters may be the unluckiest Chapter in the Imperium.'],
  ['L2', 5.4, 6.285, "Sons of the Blood Angels, they carry their father's curse, and misfortune follows them everywhere."],
  ['L3', 13.2, 5.896, 'When the Tyrant of Badab rose against the Imperium, the Lamenters believed his cause was just.'],
  ['L4', 20.6, 2.618, 'They fought their loyal brothers, and they lost.'],
  ['L5', 24.8, 5.42, 'They were spared, but stripped of their relics, and sent on a hundred-year penitent crusade.'],
  ['L6', 31.8, 1.165, 'Then the Tyranids came.'],
  ['L7', 33.5, 5.186, 'Hive Fleet Kraken devoured world after world, and the Lamenters stood in its path.'],
  ['L8', 40.6, 2.542, 'When it was over, only a few hundred remained.'],
  ['L9', 44.0, 1.519, 'Still, they fight on.'],
  ['L10', 46.4, 3.497, 'Their very name means mourning, and they have never stopped.'],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { curse: 8.9, believed: 17.0, fought: 21.4, lost: 22.6, stripped: 26.6, sent: 28.4, came: 32.4, devoured: 34.6, stood: 37.4, remained: 42.6, fight: 44.9, mourning: 48.0 };

// medallion centres (win.js): 1500, 1170, 840, 510, 180, -230; the title scroll at -22
const CAM = [[0, 0, -22, 2.7], [3.7, 0, -14, 2.8], [4.3, 0, 700, .95], [5.1, 0, 1494, 3.1], [11.6, 0, 1504, 3.35],
  [12.3, 0, 1166, 3.2], [19.6, 0, 1172, 3.4], [20.2, 0, 838, 3.2], [23.8, 0, 846, 3.4], [24.4, 0, 508, 3.2], [30.8, 0, 514, 3.4],
  [31.4, 0, 178, 3.1], [39.4, 0, 186, 3.4], [40.2, 0, -228, 2.75], [50.4, 0, -236, 2.95], [52.2, 0, 470, .8], [54.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const STORM = [.7, .75, 1], DAWN = [.85, .88, 1.0], GOLD = [1, .82, .55], RED = [1, .55, .38], DUSK = [1, .48, .26], VIOLET = [.9, .5, .8], MORN = [1, .9, .7];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [3.7, -22, 420, 2.4, GOLD], [4.2, 600, 2400, 1.6, GOLD],
  [5.1, 1500, 440, 2.2, STORM], [11.6, 1500, 440, 2.2, STORM], [12.3, 1170, 440, 2.4, DUSK], [19.6, 1170, 440, 2.4, DUSK],
  [20.2, 840, 440, 2.4, [1, .86, .72]], [23.8, 840, 440, 2.4, [1, .86, .72]], [24.4, 510, 440, 2.2, DAWN], [30.8, 510, 440, 2.2, DAWN],
  [31.4, 180, 440, 2.0, VIOLET], [39.4, 180, 440, 2.0, VIOLET], [40.2, -230, 440, 1.6, MORN], [43.8, -230, 440, 1.6, MORN], [45.0, -230, 440, 2.8, MORN], [54, -230, 440, 2.8, MORN]];

function crackLines(x, y, seed, dirs, len) {
  const r = mulberry(seed);
  return dirs.map((a, i) => { const pts = [[x, y]]; let px = x, py = y, ang = a; const n = 8 + (r() * 4 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; const L = len[i % len.length] / n * (.6 + r() * .8); px += Math.cos(ang) * L; py += Math.sin(ang) * L; pts.push([px, py]); } return pts; });
}
const CR = crackLines(30, 1400, 17, [-1.4, -2.0, -.6, 1.2, 2.4], [150, 120, 120, 110, 100]);

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  if (t >= T.curse && t < T.curse + 2 / 24) st.cam = [st.cam[0] + (t - T.curse < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  st.med[0] = { bolt: t >= T.curse && t < T.curse + .5, pose: t < T.curse ? POSE.stand : stepPose(t, T.curse, 'stand', 'guard', .375) };
  st.med[1] = { pose: t < T.believed ? POSE.stand : stepPose(t, T.believed, 'stand', 'raise', .375) };
  st.med[2] = { pose: t < T.fought ? POSE.guard : t < T.lost ? stepPose(t, T.fought, 'guard', 'strike', .25) : stepPose(t, T.lost, 'hit', 'kneelLow', .375),
    foe: t < T.fought ? POSE.guard : stepPose(t, T.fought + .2, 'guard', 'strike', .25) };
  st.med[3] = { taken: t >= T.stripped, pose: t < T.sent ? POSE.kneel : stepPose(t, T.sent, 'kneel', 'stand', .375) };
  const q8 = Math.floor(t * 8) / 8;
  st.med[4] = { t: q8, swarm: t < T.came ? 0 : Math.min(6, 1 + Math.floor((t - T.came) / .4)), pose: t < T.stood ? POSE.guard : stepPose(t, T.stood, 'guard', 'strike', .25) };
  st.med[5] = { pose: t < T.fight ? POSE.stand : stepPose(t, T.fight, 'stand', 'raise', .375) };
  if (t >= T.curse) { const k = clamp((t - T.curse) / .26), bright = t < T.curse + .55; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3.2 }); }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.curse, 30, 1440, 200, 3.0, [.9, .92, 1]); flash(T.lost, -20, 840, 90, 2.2, [1, .4, .2]); flash(T.came, 60, 180, 120, 2.0, [.9, .3, .8]); flash(T.fight, 0, -230, 140, 1.6, [1, .9, .7]);
  st.expo = 1.1 + (t >= T.curse && t < T.curse + .35 ? .55 * (1 - (t - T.curse) / .35) : 0);
  st.spill = sunI * .35;
  st.fade = ss(seg(t, 53.3, 54.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 3.8, type: 'whoosh', d: 1.2 }, { t: 5.1, type: 'light' }, { t: T.curse, type: 'crack' },
  { t: 11.7, type: 'glide', d: .7 }, { t: 12.25, type: 'light' }, { t: T.believed, type: 'step' },
  { t: 19.7, type: 'glide', d: .6 }, { t: 20.15, type: 'light' }, { t: T.fought, type: 'clash' }, { t: T.lost, type: 'strike' }, { t: T.lost + .4, type: 'thump' },
  { t: 23.9, type: 'glide', d: .6 }, { t: 24.35, type: 'light' }, { t: T.stripped, type: 'tinkle' }, { t: T.stripped + .1, type: 'tinkle' }, { t: T.sent, type: 'step' },
  { t: 30.9, type: 'glide', d: .6 }, { t: 31.35, type: 'light' }, { t: T.came, type: 'whisper', d: 2.6 }, ...[0, 1, 2, 3, 4].map(k => ({ t: T.came + .4 * (k + 1), type: 'slide', d: .3 })), { t: T.stood, type: 'clash' },
  { t: 39.5, type: 'glide', d: .8 }, { t: 40.15, type: 'light' }, { t: T.fight, type: 'ray' }, { t: T.mourning, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
