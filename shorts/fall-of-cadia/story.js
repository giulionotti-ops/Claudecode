// The Fall of Cadia: the timeline. Times from the measured voice (voice/dur.json, words.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';
import { GPOSE } from './cadia.js';

export const DUR = 52.5;
// [id, start, spoken length, subtitle (numbers as digits; long lines condensed so they can be read)]
export const LINES = [
  ['L1', .6, 4.516, '10,000 years, one world held the gates of hell shut.'],
  ['L2', 7.2, 4.483, 'Cadia, a fortress world, ringed with ancient pylons.'],
  ['L3', 12.6, 4.157, 'Its children were handed rifles before they could walk.'],
  ['L4', 17.9, 5.17, 'Twelve times, Abaddon the Despoiler led a Black Crusade.'],
  ['L5', 23.6, 2.397, 'Twelve times Cadia held.'],
  ['L6', 27.2, 3.924, 'On the 13th, he brought a star fortress,'],
  ['L7', 31.6, 2.349, 'and hurled it down.'],
  ['L8', 35.2, 3.418, 'The pylons shattered. The world split open.'],
  ['L9', 39.9, 5.106, 'Cadia fell. Its soldiers fought on in the ruins.'],
  ['L10', 46.0, 2.722, 'Cadia fell. But Cadia stands.'],
];
const chars = s => s.replace(/\s/g, '').length;   // readcheck counts every non-space character
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
// key moments (line start + word start)
export const T = { ringed: 9.4, handed: 13.78, led: 20.6, held: 25.26, fortress: 30.14, hurled: 31.82, crack: 33.24, shatter: 35.9, split: 37.38, fought: 41.94, stands: 47.88 };

// ---------- camera [t, x, y, zoom] ----------
const CAM = [[0, 0, 150, 2.6], [5.1, 0, 158, 2.75], [5.3, 0, 158, 2.75], [6.2, 0, 820, 1.7], [7.1, 0, 1452, 3.1], [11.6, 0, 1468, 3.3],
  [12.4, 0, 1142, 3.2], [17.0, 0, 1150, 3.36], [17.8, 0, 815, 3.2], [25.9, 0, 826, 3.45], [27.1, 0, 492, 3.2], [31.2, 0, 502, 3.36],
  [32.1, 0, 162, 2.9], [38.4, 0, 168, 3.05], [39.6, 0, -210, 2.6], [47.9, 0, -224, 2.86], [48.6, 0, -224, 2.86], [50.6, 0, 470, .8], [52.5, 0, 462, .84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

// ---------- the sun ----------
const OMEN = [1, .5, .42], DAWN = [.78, .88, 1.0], NOON = [1, .97, .9], GOLD = [1, .84, .55], RED = [1, .58, .38], VIOLET = [.92, .48, .62], DUSK = [1, .5, .26], DEEP = [1, .44, .22];
const SUN = [[0, 180, 20, 0, OMEN], [.3, 180, 20, 2.5, OMEN], [1.3, 180, 440, 2.5, OMEN], [5.1, 180, 440, 2.5, OMEN], [5.7, 180, 440, 0, OMEN],
  [6.7, 1500, 20, 0, DAWN], [6.9, 1500, 20, 2.3, DAWN], [7.8, 1500, 440, 2.3, DAWN], [11.6, 1500, 440, 2.3, DAWN], [12.4, 1170, 440, 2.7, NOON], [17.0, 1170, 440, 2.7, NOON],
  [17.8, 840, 440, 2.5, GOLD], [22.5, 840, 440, 2.5, GOLD], [25.9, 840, 440, 2.5, RED], [27.1, 510, 440, 2.4, VIOLET], [31.2, 510, 440, 2.4, VIOLET],
  [32.1, 180, 440, 2.6, DUSK], [38.4, 180, 440, 2.6, DUSK], [39.6, -230, 440, 2.6, DEEP], [44.8, -230, 440, 2.5, DEEP], [47.0, -230, 440, 0, DEEP], [52.5, -230, 440, 0, DEEP]];

// ---------- the crack at the impact ----------
function crackLines(x, y, seed, dirs, len) {
  const r = mulberry(seed);
  return dirs.map((a, i) => { const pts = [[x, y]]; let px = x, py = y, ang = a; const n = 9 + (r() * 5 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; const L = len[i % len.length] / n * (.6 + r() * .8); px += Math.cos(ang) * L; py += Math.sin(ang) * L; pts.push([px, py]); } return pts; });
}
const CR = crackLines(0, 180 - 12, 41, [-1.6, -1.1, -2.1, 1.5, .3, 2.8, .9], [380, 240, 240, 200, 120, 120, 150]);
const q8 = t => Math.floor(t * 8) / 8;   // figures step at 8 fps
const SHATTER = [...Array(8)].map((_, k) => { const a = -Math.PI / 2 + k / 8 * Math.PI * 2, r = mulberry(70 + k); return [Math.cos(a) * (18 + r() * 14), Math.sin(a) * (18 + r() * 14), (r() - .5) * 1.2]; });

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  const night = ss(seg(t, 44.8, 47.2));
  st.skyI = .12 + night * .2; st.skyCol = [.55 - night * .05, .65, .95 + night * .05]; st.amb = .16 - night * .05;
  if (t >= T.crack && t < T.crack + 2 / 24) st.cam = [st.cam[0] + (t - T.crack < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  // M1: pylons wake one by one from "ringed"
  st.med[0] = { lit: clamp(Math.floor((q8(t) - T.ringed) / .15) + 1, 0, 8) };
  // M2: the child is handed a rifle
  st.med[1] = { adult: GPOSE.gStand, child: t < T.handed + .4 ? POSE.stand : stepPose(t, T.handed + .4, 'stand', GPOSE.gStand), childArmed: t >= T.handed + .4 };
  // M3: twelve marks; Abaddon strikes on "led", is thrown back on "held"
  const marks = clamp(Math.floor((q8(t) - 17.9) / ((T.held - 17.9) / 12)) + 1, 0, 12);
  st.med[2] = { marks, abaddon: t < T.led ? POSE.guard : t < T.held ? stepPose(t, T.led, 'guard', 'strike', .25) : stepPose(t, T.held, 'strike', 'hit', .25), ax: t >= T.held ? 10 * clamp((t - T.held) / .375) : 0 };
  // M4: the fortress drifts in; its core ignites on "fortress"
  st.med[3] = { fx: 30 - 30 * ss(seg(q8(t), 26, 30)), fy: -6 * ss(seg(q8(t), 26, 30)), core: t >= T.fortress };
  // M5: it falls (8 fps) from "hurled" to the impact, then burns; the pylons shatter; the world splits
  const fall = clamp((q8(t) - T.hurled) / (T.crack - T.hurled));
  st.med[4] = { fortress: t < T.hurled ? -92 : -92 + 78 * fall * fall, burn: t >= T.crack, step: Math.floor(t * 8),
    shatter: t < T.shatter ? null : SHATTER.map(([x, y, a]) => { const k = clamp((q8(t) - T.shatter) / .375); return [x * k, y * k, a * k]; }), split: 9 * clamp((q8(t) - T.split) / .375) };
  if (t < 5.3) st.med[4].fortress = -100 + 8 * ss(t / 5.3);   // the hook: it hangs above the world
  // TOP: the soldiers raise their rifles on "fought"
  const up = t < T.fought ? GPOSE.gStand : stepPose(t, T.fought, GPOSE.gStand, GPOSE.gAim);
  st.med[5] = { g1: up, g2: t < T.fought ? GPOSE.gStand : stepPose(t, T.fought, GPOSE.gStand, GPOSE.gRaise), g3: up };
  // the crack: bright as it runs, then mending leads
  if (t >= T.crack) { const k = clamp((t - T.crack) / .26), bright = t < T.crack + .55; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3.4 }); }
  const flash = (tc, x, y, r, I) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), [1, .9, .75]]); };
  flash(T.crack, 0, 168, 220, 3.4); flash(T.held, 0, 840, 120, 1.6); flash(T.fortress, 0, 508, 60, 2.2);
  if (t >= T.fortress && t < 31.6 && st.pts.length < 4) st.pts.push([0, 506, 30, 1.2, [1, .6, .3]]);   // the core's glow
  const banner = ss(seg(t, 45.0, 47.0)) * 1.0 + ss(seg(t, T.stands - .3, T.stands + .6)) * 1.6;   // the banner keeps its own light
  if (banner > 0 && st.pts.length < 4) st.pts.push([22, -270, 70, banner, [1, .55, .35]]);
  st.expo = 1.1 + (t >= T.crack && t < T.crack + .35 ? .6 * (1 - (t - T.crack) / .35) : 0);
  st.spill = sunI * .35 + banner * .12;
  st.fade = ss(seg(t, 51.8, 52.5));
  return st;
}

// ---------- events for the mixer ----------
export const EV = [
  { t: .3, type: 'ray' }, { t: 5.4, type: 'whoosh', d: 1.6 }, { t: 6.9, type: 'ray' },
  ...[...Array(8)].map((_, k) => ({ t: T.ringed + k * .15, type: 'light' })),
  { t: 11.75, type: 'glide', d: .7 }, { t: 12.35, type: 'light' }, { t: T.handed, type: 'step' }, { t: T.handed + .4, type: 'step' },
  { t: 17.1, type: 'glide', d: .7 }, { t: 17.75, type: 'light' },
  ...[...Array(12)].map((_, k) => ({ t: 17.9 + k * (T.held - 17.9) / 12, type: 'tinkle' })),
  { t: T.led, type: 'strike' }, { t: T.held, type: 'clash' }, { t: T.held + .2, type: 'thump' },
  { t: 26.3, type: 'glide', d: .8 }, { t: 27.05, type: 'light' }, { t: T.fortress, type: 'creak' },
  { t: 31.3, type: 'glide', d: .8 }, { t: T.hurled, type: 'whoosh', d: T.crack - T.hurled }, { t: T.crack, type: 'crack' }, { t: T.crack + .05, type: 'thump' },
  { t: T.shatter, type: 'slide', d: .375 }, ...[...Array(4)].map((_, k) => ({ t: T.shatter + .1 + k * .07, type: 'tinkle' })), { t: T.split, type: 'slide', d: .375 }, { t: T.split + .375, type: 'thump' },
  { t: 38.6, type: 'glide', d: .9 }, { t: 39.5, type: 'light' }, { t: T.fought, type: 'step' }, { t: T.stands, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
