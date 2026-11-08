// The Brother Who Killed His Best Friend: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 54.0;
export const LINES = [
  ['L1', 0.6, 4.422, "Ferrus Manus and Fulgrim were the closest of all the Emperor's sons."],
  ['L2', 6.6, 3.187, "To honour their bond, they forged weapons for each other."],
  ['L3', 11.2, 7.255, "Ferrus made Fireblade, a sword that burned forever. Fulgrim made Forgebreaker, a mighty hammer."],
  ['L4', 19.9, 4.437, "Then Fulgrim fell to the dark gods, and begged his brother to join Horus."],
  ['L5', 25.0, 1.038, "Ferrus refused."],
  ['L6', 27.8, 4.03, "On Isstvan Five, they met again, each holding the other's gift."],
  ['L7', 32.4, 3.271, "Ferrus was winning. Then Fulgrim drew a daemon blade."],
  ['L8', 37.1, 2.849, "With one stroke, he cut off his best friend's head."],
  ['L9', 41.7, 2.769, "The Iron Hands never found their father's body."],
  ['L10', 45.4, 3.195, "And Fulgrim knew, too late, how far he had fallen."],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { forge: 8.4, fire: 12.3, hammer: 15.9, tempt: 21.2, refuse: 25.1, clash: 30.0, winning: 32.6, daemon: 34.5, stroke: 38.0, head: 39.3, search: 41.8, regret: 45.4 };

const CAM = [[0, 0, -22, 2.7], [5.2, 0, -14, 2.8], [5.7, 0, 700, .95], [6.4, 0, 1494, 3.1], [10.0, 0, 1504, 3.35],
  [10.8, 0, 1166, 3.2], [18.7, 0, 1172, 3.4], [19.5, 0, 838, 3.2], [26.3, 0, 846, 3.4], [27.1, 0, 508, 3.2], [36.0, 0, 514, 3.4],
  [36.6, 0, 178, 3.1], [40.6, 0, 186, 3.4], [41.3, 0, -228, 2.75], [50.2, 0, -236, 2.95], [52.2, 0, 470, .8], [54.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const FORGE = [1, .62, .32], GOLD = [1, .82, .55], COLD = [.8, .85, 1], VIOLET = [.9, .55, 1], WAR = [1, .5, .3], BLOOD = [1, .4, .3], ASH = [.85, .8, .9];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [5.2, -22, 420, 2.4, GOLD], [5.7, 600, 2400, 1.6, GOLD],
  [6.4, 1500, 440, 2.4, FORGE], [10.0, 1500, 440, 2.4, FORGE], [10.8, 1170, 440, 2.4, GOLD], [18.7, 1170, 440, 2.4, GOLD],
  [19.5, 840, 440, 2.2, VIOLET], [26.3, 840, 440, 2.2, VIOLET], [27.1, 510, 440, 2.6, WAR], [36.0, 510, 440, 2.6, WAR],
  [36.6, 180, 440, 2.4, BLOOD], [40.6, 180, 440, 2.4, BLOOD], [41.3, -230, 440, 1.8, ASH], [54, -230, 440, 1.8, ASH]];

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  if (t >= T.head && t < T.head + 2 / 24) st.cam = [st.cam[0] + (t - T.head < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  st.med[0] = { spark: t >= T.forge && t < T.forge + .6, pose: t < T.forge - .4 ? POSE.guard : stepPose(t, T.forge - .4, 'guard', 'strike', .375), fpose: POSE.guard };
  st.med[1] = { fire: t >= T.fire, hammer: t >= T.hammer };
  st.med[2] = { wisps: t >= T.tempt, refuse: t >= T.refuse };
  st.med[3] = { daemon: t >= T.daemon, pose: t < T.winning ? (t < T.clash ? POSE.guard : stepPose(t, T.clash, 'guard', 'strike', .25)) : stepPose(t, T.winning, 'strike', 'raise', .25),
    fpose: t < T.clash ? POSE.guard : t < T.winning ? stepPose(t, T.clash + .2, 'guard', 'strike', .25) : t < T.daemon ? POSE.hit : stepPose(t, T.daemon, 'hit', 'guard', .375) };
  st.med[4] = { dead: t >= T.head, pose: POSE.kneel, fpose: t < T.stroke ? POSE.guard : stepPose(t, T.stroke, 'guard', 'strike', .375) };
  st.med[5] = { search: t >= T.search && t < T.regret, regret: t >= T.regret };
  if (t >= T.head) { /* no cracks */ }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.forge, 0, 1536, 90, 2.4, [1, .7, .3]); flash(T.fire, -50, 1100, 90, 2.0, [1, .6, .2]); flash(T.tempt, -70, 800, 90, 1.8, [.8, .3, 1]); flash(T.clash, 0, 500, 100, 2.4); flash(T.daemon, 50, 500, 100, 2.2, [.8, .3, 1]); flash(T.head, -20, 180, 160, 3.0, [1, .3, .2]);
  st.expo = 1.1 + (t >= T.head && t < T.head + .35 ? .5 * (1 - (t - T.head) / .35) : 0); st.spill = sunI * .35;
  st.fade = ss(seg(t, 53.3, 54.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 5.3, type: 'whoosh', d: 1.2 }, { t: 6.4, type: 'light' }, { t: T.forge, type: 'strike' }, { t: T.forge + .5, type: 'tinkle' },
  { t: 10.1, type: 'glide', d: .7 }, { t: 10.75, type: 'light' }, { t: T.fire, type: 'ray' }, { t: T.hammer, type: 'clash' },
  { t: 18.8, type: 'glide', d: .7 }, { t: 19.45, type: 'light' }, { t: T.tempt, type: 'whisper', d: 3.0 }, { t: T.refuse, type: 'thump' },
  { t: 26.4, type: 'glide', d: .7 }, { t: 27.05, type: 'light' }, { t: T.clash, type: 'clash' }, { t: T.winning, type: 'strike' }, { t: T.daemon, type: 'whisper', d: 1.4 },
  { t: 35.9, type: 'glide', d: .7 }, { t: 36.55, type: 'light' }, { t: T.stroke, type: 'whoosh', d: .6 }, { t: T.head, type: 'crack' },
  { t: 40.7, type: 'glide', d: .7 }, { t: 41.25, type: 'light' }, { t: 48.4, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
