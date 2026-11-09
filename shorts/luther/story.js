// The First Betrayal: the timeline. Line times are fitted to the measured voice (voice/dur.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose } from './figures.js';

export const DUR = 54.0;
export const LINES = [
  ['L1', 0.6, 5.753, "Luther found the Lion as a wild child in the forests of Caliban, and raised him like a son."],
  ['L2', 7.8, 3.296, "They became brothers. Then the Emperor came for the Lion."],
  ['L3', 12.6, 4.794, "The Lion led the Dark Angels to the stars. Luther was left behind."],
  ['L4', 18.0, 4.244, "Year after year in the Lion's shadow, his love turned to jealousy."],
  ['L5', 23.6, 2.765, "The dark gods whispered, and Luther listened."],
  ['L6', 27.8, 4.473, "When the Lion came home, Luther turned the guns of Caliban on his brother."],
  ['L7', 32.9, 3.671, "The two friends fought, and Caliban broke apart around them."],
  ['L8', 38.2, 6.065, "The Lion vanished. Luther was taken alive, and locked away for ten thousand years."],
  ['L9', 45.0, 4.706, "To this day, the Dark Angels hunt the Fallen, to bury their shame."],
];
const chars = s => s.replace(/\s/g, '').length;
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
export const T = {"find": 4.6, "emperor": 9.6, "ships": 14.6, "jealous": 20.6, "whisper": 24.4, "listen": 25.6, "guns": 30.4, "duel": 33.4, "broke": 35.0, "vanish": 38.8, "locked": 41.6, "hunt": 45.6};

const CAM = [[0, 0, -22, 2.7], [3.6, 0, -14, 2.8], [4.1, 0, 700, 0.95], [4.8, 0, 1494, 3.1], [6.5, 0, 1504, 3.35], [7.3, 0, 1166, 3.2], [11.3, 0, 1172, 3.4], [12.1, 0, 838, 3.2], [22.4, 0, 846, 3.4], [23.2, 0, 508, 3.2], [26.6, 0, 514, 3.4], [27.4, 0, 178, 3.1], [37.0, 0, 186, 3.4], [37.8, 0, -228, 2.75], [50.2, 0, -236, 2.95], [52.2, 0, 470, 0.8], [54.0, 0, 462, 0.84]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

const FOREST = [.75, 1, .7], GOLD = [1, .88, .6], COLD = [.75, .8, 1], VIOLET = [.85, .5, 1], FIRE = [1, .5, .3], NIGHT = [.65, .7, 1];
const SUN = [[0, -22, 20, 0, GOLD], [.3, -22, 20, 2.4, GOLD], [1.2, -22, 420, 2.4, GOLD], [3.6, -22, 420, 2.4, GOLD], [4.1, 600, 2400, 1.6, GOLD],
  [4.8, 1500, 440, 2.2, FOREST], [6.5, 1500, 440, 2.2, FOREST], [7.3, 1170, 440, 2.4, GOLD], [11.3, 1170, 440, 2.4, GOLD], [12.1, 840, 440, 2.0, COLD], [22.4, 840, 440, 2.0, COLD],
  [23.2, 510, 440, 2.0, VIOLET], [26.6, 510, 440, 2.0, VIOLET], [27.4, 180, 440, 2.6, FIRE], [37.0, 180, 440, 2.6, FIRE], [37.8, -230, 440, 2.5, NIGHT], [54, -230, 440, 2.5, NIGHT]];
const CR = (() => { const r = mulberry(41), out = []; for (const a of [-2.8, -1.8, -.6, .5, 1.6, 2.6]) { let x = 0, y = 250, ang = a; const pts = [[x, y]]; for (let k = 0; k < 8; k++) { ang += (r() - .5) * .8; x += Math.cos(ang) * 15; y += Math.sin(ang) * 15; pts.push([x, y]); } out.push(pts); } return out; })();

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  if (t >= T.broke && t < T.broke + 2 / 24) st.cam = [st.cam[0] + (t - T.broke < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  st.med[0] = { pose: t < T.find ? POSE.fstand : stepPose(t, T.find, 'fstand', 'reach', .375) };
  st.med[1] = { emperor: t >= T.emperor };
  const q8 = Math.floor(t * 8) / 8;
  st.med[2] = { ships: t >= T.ships && t < 21.2, shipY: -60 - 120 * ss(seg(q8, T.ships, 19.0)), jealous: t >= T.jealous };
  st.med[3] = { wisps: t >= T.whisper, listen: t >= T.listen };
  st.med[4] = { guns: t >= T.guns && t < T.duel, duel: t >= T.duel };
  st.med[5] = { locked: t >= T.locked, hunt: t >= T.hunt };
  if (t >= T.broke) { const k = clamp((t - T.broke) / .3), bright = t < T.broke + .5; for (const pts of CR) st.cracks.push({ pts, k, lead: !bright, w: 3.2 }); }
  const flash = (tc, x, y, r, I, col = [1, .92, .8]) => { if (t >= tc && t < tc + .7) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .14), col]); };
  flash(T.emperor, 84, 1150, 120, 2.6, [1, .9, .6]); flash(T.whisper, -60, 470, 90, 2.0, [.8, .3, 1]); flash(T.guns, 0, 60, 120, 2.4, [1, .8, .4]); flash(T.broke, 0, 250, 170, 3.0, [1, .5, .2]); flash(T.vanish, 0, -250, 150, 2.4, [.8, .85, 1]);
  st.expo = 1.1 + (t >= T.broke && t < T.broke + .35 ? .5 * (1 - (t - T.broke) / .35) : 0); st.spill = sunI * .35;
  st.fade = ss(seg(t, 53.3, 54.0));
  return st;
}

export const EV = [
  { t: .3, type: 'ray' }, { t: 3.7, type: 'whoosh', d: 1.2 }, { t: 4.8, type: 'light' }, { t: T.find, type: 'step' },
  { t: 6.6, type: 'glide', d: .7 }, { t: 7.25, type: 'light' }, { t: T.emperor, type: 'ray' },
  { t: 11.4, type: 'glide', d: .7 }, { t: 12.05, type: 'light' }, { t: T.ships, type: 'whoosh', d: 2.0 }, { t: T.jealous, type: 'thump' },
  { t: 22.5, type: 'glide', d: .7 }, { t: 23.15, type: 'light' }, { t: T.whisper, type: 'whisper', d: 2.4 },
  { t: 26.7, type: 'glide', d: .7 }, { t: 27.35, type: 'light' }, { t: T.guns, type: 'clash' }, { t: T.duel, type: 'clash' }, { t: T.broke, type: 'crack' },
  { t: 37.1, type: 'glide', d: .7 }, { t: 37.75, type: 'light' }, { t: T.vanish, type: 'whoosh', d: 1.0 }, { t: T.locked, type: 'thump' }, { t: T.hunt, type: 'step' }, { t: 50.0, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
