// The Angel's Last Stand: the timeline. Times from the measured voice (voice/dur.json, words.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 52.0;
// [id, start, spoken length, subtitle]
export const LINES = [
  ['L1', .6, 4.556, 'Before the Emperor faced Horus, one son reached him first.'],
  ['L2', 7.2, 4.357, 'Sanguinius, the Angel, Primarch of the Blood Angels.'],
  ['L3', 12.5, 3.42, 'He had foreseen his own death, and went anyway.'],
  ['L4', 17.4, 3.56, "Aboard Horus's flagship, the two brothers met."],
  ['L5', 22.3, 2.895, 'Horus offered him a place at his side.'],
  ['L6', 26.8, 1.987, 'Sanguinius refused.'],
  ['L7', 30.5, 2.991, 'Horus broke him, and cast him down.'],
  ['L8', 34.6, 4.933, "The Angel struck true, and left a crack in Horus's armour."],
  ['L9', 40.5, 2.895, 'Through it, the Emperor would end the Heresy.'],
  ['L10', 46.0, 3.306, 'His sons still carry his death in their blood.'],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
// key moments (line start + word start)
export const T = { angel: 8.68, death: 13.76, went: 14.86, met: 20.26, offered: 22.76, refused: 27.9, broke: 30.96, down: 32.8, struck: 35.5, crack: 37.4, end: 42.12, blood: 48.7 };

const CAM = [[0, 0, 820, 2.75], [5.1, 0, 826, 2.85], [5.3, 0, 826, 2.85], [6.2, 0, 1180, 1.9], [7.1, 0, 1452, 3.1], [11.6, 0, 1468, 3.3],
  [12.4, 0, 1142, 3.2], [16.6, 0, 1150, 3.36], [17.3, 0, 815, 3.2], [21.6, 0, 826, 3.36], [22.3, 0, 492, 3.2], [28.9, 0, 502, 3.4],
  [30.3, 0, 162, 3.0], [37.3, 0, 170, 3.2], [39.4, 0, 170, 3.3], [40.4, 0, -210, 2.6], [46.0, 0, -224, 2.86], [48.8, 0, -224, 2.9], [50.4, 0, 470, .8], [52.0, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const OMEN = [1, .55, .42], DAWN = [.8, .9, 1.0], NOON = [1, .97, .9], GOLD = [1, .84, .55], RED = [1, .58, .38], DUSK = [1, .5, .26], DEEP = [1, .44, .22];
const SUN = [[0, 840, 20, 0, OMEN], [.3, 840, 20, 2.5, OMEN], [1.3, 840, 440, 2.5, OMEN], [5.1, 840, 440, 2.5, OMEN], [5.7, 840, 440, 0, OMEN],
  [6.7, 1500, 20, 0, DAWN], [6.9, 1500, 20, 2.4, DAWN], [7.8, 1500, 440, 2.4, DAWN], [11.6, 1500, 440, 2.4, DAWN], [12.4, 1170, 440, 2.6, NOON], [16.6, 1170, 440, 2.6, NOON],
  [17.3, 840, 440, 2.5, GOLD], [21.6, 840, 440, 2.5, GOLD], [22.3, 510, 440, 2.5, RED], [28.9, 510, 440, 2.3, RED],
  [30.3, 180, 440, 2.6, DUSK], [39.4, 180, 440, 2.6, DUSK], [40.4, -230, 440, 2.7, DEEP], [44.6, -230, 440, 2.5, DEEP], [46.6, -230, 440, 0, DEEP], [52, -230, 440, 0, DEEP]];

function crackLines(x, y, seed, dirs, len) {
  const r = mulberry(seed);
  return dirs.map((a, i) => { const pts = [[x, y]]; let px = x, py = y, ang = a; const n = 7 + (r() * 4 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; const L = len[i % len.length] / n * (.6 + r() * .8); px += Math.cos(ang) * L; py += Math.sin(ang) * L; pts.push([px, py]); } return pts; });
}
const CR = crackLines(46, 158, 23, [-1.7, -.6, .4, 1.6, 2.6, -2.5], [70, 50, 60, 80, 50, 60]);   // across Horus's breastplate
const q8 = t => Math.floor(t * 8) / 8;
const FEATHERS = [...Array(9)].map((_, k) => { const r = mulberry(90 + k); return [-90 + r() * 150, -110 + r() * 60, r() * 6, 13850 + k * 3, .5 + r() * .8]; });

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  const night = ss(seg(t, 44.6, 47.0));
  st.skyI = .12 + night * .2; st.skyCol = [.55 - night * .05, .65, .95 + night * .05]; st.amb = .16 - night * .05;
  if (t >= T.crack && t < T.crack + 2 / 24) st.cam = [st.cam[0] + (t - T.crack < 1 / 24 ? 4 : -3) / st.cam[2], st.cam[1] + 2 / st.cam[2], st.cam[2]];
  // M1: the wings open on "Angel"
  st.med[0] = { wings: t < T.angel ? 'folded' : 'spread', pose: t < T.angel ? POSE.stand : stepPose(t, T.angel, 'stand', 'raise') };
  // M2: the vision lights on "death"; he rises on "went"
  st.med[1] = { vision: t >= T.death, pose: t < T.went ? POSE.kneel : stepPose(t, T.went, 'kneel', 'stand'), face: t >= T.death ? 'grief' : 'calm' };
  // M3: the brothers face each other (the hook), weapons up on "met"
  st.med[2] = { horus: t < T.met && t > 6 ? POSE.stand : POSE.guard, angel: t < T.met && t > 6 ? POSE.stand : POSE.guard };
  // M4: Horus offers his hand; the Angel turns away on "refused"
  st.med[3] = { horus: t < T.offered ? POSE.stand : stepPose(t, T.offered, 'stand', 'reach'), angel: POSE.stand, away: t >= T.refused, wings: t >= T.refused ? 'folded' : 'spread', face: 'stern' };
  // M5: Horus strikes on "broke", the Angel falls on "down"; feathers drift
  const fell = t >= T.down;
  st.med[4] = { horus: t < T.broke ? POSE.guard : stepPose(t, T.broke, 'guard', 'strike', .25), angel: t < T.broke ? POSE.guard : !fell ? stepPose(t, T.broke + .1, 'guard', 'hit', .25) : stepPose(t, T.down, 'hit', 'lie', .5),
    wings: fell ? 'folded' : 'spread', ay: fell ? -6 : 8, ax: fell ? -30 : -48, face: t >= T.broke ? 'pain' : 'stern',
    feathers: t < T.broke ? [] : FEATHERS.map(([x, y, a, id, v]) => [x, y + (q8(t) - T.broke) * 40 * v, a + q8(t), id]).filter(f => f[1] < 80) };
  // TOP: the Emperor strikes through the crack on "end"; the chalice glows at night
  st.med[5] = { father: t < T.end ? POSE.reach : stepPose(t, T.end, 'reach', 'strike', .25), horus: t < T.end + .2 ? POSE.guard : stepPose(t, T.end + .2, 'guard', 'hit', .25), hx: t < T.end + .2 ? 60 : 68, cup: t >= 45 };
  // the crack across Horus's armour: bright as it runs, then a mending lead
  if (t >= T.crack) { const k = clamp((t - T.crack) / .26), bright = t < T.crack + .6; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3 }); }
  const flash = (tc, x, y, r, I) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), [1, .92, .8]]); };
  flash(T.crack, 46, 158, 110, 3.0); flash(T.broke, -10, 150, 80, 1.8); flash(T.end, 0, -250, 90, 2.4); flash(T.angel, 0, 1460, 120, 1.4);
  if (t >= T.death && t < 16.6 && st.pts.length < 4) st.pts.push([56, 1120, 50, 1.2, [.8, .4, 1]]);   // the vision's glow
  const cup = ss(seg(t, 45.0, 47.0)) * 1.0 + ss(seg(t, T.blood - .3, T.blood + .6)) * 1.6;   // the chalice keeps its own light
  if (cup > 0 && st.pts.length < 4) st.pts.push([0, -338, 40, cup, [1, .3, .25]]);
  st.expo = 1.1 + (t >= T.crack && t < T.crack + .35 ? .5 * (1 - (t - T.crack) / .35) : 0);
  st.spill = sunI * .35 + cup * .12;
  st.fade = ss(seg(t, 51.3, 52.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 5.4, type: 'whoosh', d: 1.6 }, { t: 6.9, type: 'ray' }, { t: T.angel, type: 'wings' },
  { t: 11.75, type: 'glide', d: .7 }, { t: 12.35, type: 'light' }, { t: T.death, type: 'whisper', d: 2.2 }, { t: T.went, type: 'step' },
  { t: 16.7, type: 'glide', d: .7 }, { t: 17.25, type: 'light' }, { t: T.met, type: 'clash' },
  { t: 21.65, type: 'glide', d: .7 }, { t: 22.25, type: 'light' }, { t: T.offered, type: 'step' }, { t: T.refused, type: 'wings' },
  { t: 29.4, type: 'glide', d: .9 }, { t: 30.25, type: 'light' }, { t: T.broke, type: 'strike' }, { t: T.down, type: 'thump' },
  ...[0, 1, 2, 3].map(k => ({ t: T.broke + .2 + k * .3, type: 'tinkle' })), { t: T.struck, type: 'clash' }, { t: T.crack, type: 'crack' },
  { t: 39.5, type: 'glide', d: .9 }, { t: 40.35, type: 'light' }, { t: T.end, type: 'clash' }, { t: T.end + .45, type: 'thump' }, { t: T.blood, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
