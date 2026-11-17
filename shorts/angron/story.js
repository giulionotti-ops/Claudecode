// The Saddest Primarch: the timeline. Times from the measured voice (voice/dur.json, words.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';
import { GPOSE } from './cadia.js';
import { GLADIATOR, DAEMON } from './angron.js';

export const DUR = 55.0;
export const LINES = [
  ['L1', .6, 2.469, "Angron was the saddest of the Emperor's sons."],
  ['L2', 6.6, 4.068, 'He fell to a world of slavers, and was made to fight in the arena.'],
  ['L3', 12.4, 4.747, "They hammered the Butcher's Nails into his skull."],
  ['L4', 17.9, 2.13, 'Angron led his fellow slaves in revolt.'],
  ['L5', 22.4, 3.208, 'Cornered in the mountains, they swore to die together.'],
  ['L6', 27.8, 2.188, 'Then the Emperor came, and took him away.'],
  ['L7', 33.2, 1.476, 'His brothers died without him.'],
  ['L8', 37.2, 1.895, 'Angron never forgave his father.'],
  ['L9', 42.0, 3.427, 'He joined Horus, and gave his soul to the Blood God.'],
  ['L10', 47.6, 3.506, 'He broke his chains, only to become a slave once more.'],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = { fight: 9.42, nails: 13.36, rage: 16.38, led: 18.22, revolt: 19.48, came: 28.18, took: 29.16, died: 33.56, forgave: 37.9, soul: 43.92, broke: 47.62, slave: 49.84 };

const CAM = [[0, 0, 500, 2.75], [5.1, 0, 506, 2.85], [5.3, 0, 506, 2.85], [5.9, 0, 1000, 1.9], [6.5, 0, 1452, 3.1], [11.0, 0, 1468, 3.3],
  [11.8, 0, 1142, 3.2], [16.9, 0, 1150, 3.4], [17.6, 0, 815, 3.2], [21.6, 0, 826, 3.36], [22.3, 0, 492, 3.2], [31.4, 0, 502, 3.45],
  [32.8, 0, 162, 3.0], [40.6, 0, 170, 3.3], [41.8, 0, -210, 2.6], [47.4, 0, -224, 2.86], [51.4, 0, -230, 2.95], [53.2, 0, 470, .8], [55.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const OMEN = [1, .5, .4], DAWN = [.85, .88, 1.0], NOON = [1, .95, .85], GOLD = [1, .82, .55], RED = [1, .55, .38], DUSK = [1, .48, .26], DEEP = [1, .4, .22];
const SUN = [[0, 510, 20, 0, DUSK], [.3, 510, 20, 2.5, DUSK], [1.3, 510, 440, 2.5, DUSK], [5.1, 510, 440, 2.5, DUSK], [5.6, 510, 440, 0, DUSK],
  [6.2, 1500, 20, 0, NOON], [6.4, 1500, 20, 2.5, NOON], [7.2, 1500, 440, 2.5, NOON], [11.0, 1500, 440, 2.5, NOON], [11.8, 1170, 440, 2.3, OMEN], [16.9, 1170, 440, 2.3, OMEN],
  [17.6, 840, 440, 2.6, GOLD], [21.6, 840, 440, 2.6, GOLD], [22.3, 510, 440, 2.5, DUSK], [31.4, 510, 440, 2.5, DUSK],
  [32.8, 180, 440, 2.2, DEEP], [40.6, 180, 440, 2.2, DEEP], [41.8, -230, 440, 2.6, RED], [46.0, -230, 440, 2.5, RED], [48.4, -230, 440, 0, RED], [55, -230, 440, 0, RED]];

function crackLines(x, y, seed, dirs, len) {
  const r = mulberry(seed);
  return dirs.map((a, i) => { const pts = [[x, y]]; let px = x, py = y, ang = a; const n = 8 + (r() * 4 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; const L = len[i % len.length] / n * (.6 + r() * .8); px += Math.cos(ang) * L; py += Math.sin(ang) * L; pts.push([px, py]); } return pts; });
}
const CR = crackLines(0, 150, 61, [-1.6, -1.0, -2.2, 1.5, .4, 2.7], [260, 160, 160, 160, 110, 110]);
const q8 = t => Math.floor(t * 8) / 8;
const GROUPS = [['weapon', ['blade', 'grip', 'guard'], [22, -34]], ['legs', ['thighB', 'shinB', 'kneeB', 'bootB', 'thighF', 'shinF', 'kneeF', 'bootF', 'tassetB', 'tassetF'], [0, 34]],
  ['body', ['torso', 'belt', 'pelvis', 'loin', 'cloak', 'collar', 'pelt', 'wingB', 'wingF'], [-34, 0]], ['arms', ['upperB', 'foreB', 'handB', 'upperF', 'foreF', 'handF', 'pauldB', 'pauldF', 'rimB', 'rimF'], [34, -8]], ['head', ['head', 'nails'], [0, -34]]];
const RL0 = T.soul - .2, RLSTEP = .3, RLDUR = .375;
export const WELDS = GROUPS.map((g, i) => RL0 + i * RLSTEP + RLDUR);

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  const night = ss(seg(t, 46.0, 48.4));
  st.skyI = .12 + night * .2; st.skyCol = [.55 - night * .05, .65, .95 + night * .05]; st.amb = .16 - night * .05;
  if (t >= T.forgave && t < T.forgave + 2 / 24) st.cam = [st.cam[0] + (t - T.forgave < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  st.med[0] = { angron: t < T.fight ? POSE.guard : stepPose(t, T.fight, 'guard', 'strike', .25) };
  st.med[1] = { angron: t < T.rage ? POSE.kneelLow : stepPose(t, T.rage, 'kneelLow', 'raise', .375), nails: t >= T.nails, rage: t >= T.rage };
  st.med[2] = { angron: t < T.led ? POSE.guard : stepPose(t, T.led, 'guard', 'raise', .375), up: t >= T.revolt };
  st.med[3] = { beam: t >= T.came && t < 32.4, gone: t >= T.took + .375, angron: t < T.took ? GPOSE.gRaise : stepPose(t, T.took, GPOSE.gRaise, POSE.stand, .375) };
  st.med[4] = {};
  // TOP: re-leaded into a daemon on "soul"; the chains break on "broke", and new ones burn on "slave"
  const off = {}, turned = new Set();
  GROUPS.forEach(([g, parts, d], i) => { const t0 = RL0 + i * RLSTEP, k = clamp((q8(t) - t0) / RLDUR), b = Math.sin(Math.PI * k);
    if (k > 0 && k < 1) for (const p of parts) off[p] = [d[0] * b, d[1] * b];
    if (k >= .5) for (const p of parts) turned.add(p); });
  const daemon = t >= RL0;
  st.med[5] = { daemon, off, pal: q => turned.has(q.n) ? DAEMON : { ...GLADIATOR, nails: '#c02a2a' }, angron: t < T.broke ? POSE.guard : stepPose(t, T.broke, 'guard', 'raise', .375),
    broken: t < T.broke ? 0 : 20 * clamp((q8(t) - T.broke) / .375), newChains: t >= T.slave };
  if (t >= T.forgave) { const k = clamp((t - T.forgave) / .26), bright = t < T.forgave + .55; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3.4 }); }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.forgave, 0, 150, 200, 3.0); flash(T.rage, 0, 1110, 70, 2.2, [1, .3, .2]); flash(T.came, 0, 470, 120, 2.6, [1, .9, .6]);
  for (const tw of WELDS) if (t >= tw && t < tw + .3 && st.pts.length < 4) st.pts.push([0, -260, 40, 2.4 * Math.exp(-(t - tw) / .07), [1, .5, .3]]);
  const nailsGlow = ss(seg(t, 46.0, 48.0)) * 1.0 + ss(seg(t, T.slave - .3, T.slave + .6)) * 1.6;   // the Nails keep burning in the dark
  if (nailsGlow > 0 && st.pts.length < 4) st.pts.push([4, -306, 40, nailsGlow, [1, .25, .2]]);
  st.expo = 1.1 + (t >= T.forgave && t < T.forgave + .35 ? .55 * (1 - (t - T.forgave) / .35) : 0);
  st.spill = sunI * .35 + nailsGlow * .12;
  st.fade = ss(seg(t, 54.3, 55.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 5.3, type: 'whoosh', d: 1.2 }, { t: 6.4, type: 'ray' }, { t: T.fight, type: 'clash' },
  { t: 11.1, type: 'glide', d: .7 }, { t: 11.75, type: 'light' }, { t: T.nails, type: 'strike' }, { t: T.nails + .5, type: 'strike' }, { t: T.rage, type: 'crack' },
  { t: 16.9, type: 'glide', d: .7 }, { t: 17.55, type: 'light' }, { t: T.led, type: 'step' }, { t: T.revolt, type: 'clash' },
  { t: 21.6, type: 'glide', d: .7 }, { t: 22.25, type: 'light' }, { t: T.came, type: 'ray' }, { t: T.took, type: 'whoosh', d: .6 },
  { t: 31.6, type: 'glide', d: .9 }, { t: 32.7, type: 'light' }, { t: T.died, type: 'thump' }, { t: T.forgave, type: 'crack' },
  { t: 40.7, type: 'glide', d: .9 }, { t: 41.75, type: 'light' }, ...WELDS.map(t => ({ t, type: 'weld' })), ...WELDS.map(t => ({ t: t - RLDUR, type: 'slide', d: RLDUR })),
  { t: T.broke, type: 'clash' }, ...[0, 1, 2].map(k => ({ t: T.broke + .1 + k * .08, type: 'tinkle' })), { t: T.slave, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
