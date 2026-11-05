// The timeline: one source of truth for picture, sound and subtitles. Times from the measured voice (voice/dur.json, words.json).
import { mulberry, clamp, ss, seg } from '/core/lib.js';
import { POSE, stepPose, lerpPose, SON_TURNED, SON_PAL } from './figures.js';
import { MED, EYES } from './win.js';

export const DUR = 57.0;
// line start times; text = subtitle (numbers as digits)
export const LINES = [
  ['L1', .6, 4.421, "10,000 years ago, the Emperor's favourite son betrayed him."],
  ['L2', 7.3, 3.66, 'Horus, first son found, and the brightest.'],
  ['L3', 11.9, 4.51, 'Warmaster of the Great Crusade, to conquer the stars.'],
  ['L4', 17.4, 3.731, "On Davin's moon, a blade struck him."],
  ['L5', 21.6, 4.376, 'As he lay dying, the dark gods whispered. And he listened.'],
  ['L6', 28.4, 4.234, 'Half the Legions followed him into rebellion.'],
  ['L7', 33.4, 3.555, 'They burned across the galaxy to Terra.'],
  ['L8', 38.2, 4.079, "Father and son met aboard Horus's flagship."],
  ['L9', 43.0, 4.821, 'Horus fell. The broken Emperor was sealed upon the Golden Throne.'],
  ['L10', 50.0, 4.023, 'The Heresy was over. The long night had only begun.'],
];
const chars = s => s.replace(/\s/g, '').length;   // readcheck counts every non-space character
export const SUBS = LINES.map(([id, t0, d, text], i) => {
  const next = LINES[i + 1] ? LINES[i + 1][1] - .35 : DUR - .3;
  return { id, t0, t1: Math.min(next, Math.max(t0 + d + .4, t0 + 1.8, t0 + .36 + chars(text) / 15 + 1.5)), text };
});
// key moments (from the word timings)
export const T = { crack1: 3.8, rise: 8.9, raise: 12.38, strike: 19.48, down: 19.86, whisper: 23.0, listened: 25.16, crack2: 27.4, clash: 38.98, fell: 43.34, sealed: 45.48, bell: 50.0 };

// ---------- camera: [t, x, y, zoom], eased between keys ----------
const CAM = [[0, 0, -205, 2.55], [4.9, 0, -212, 2.68], [5.2, 0, -212, 2.68], [6.1, 0, 640, 1.7], [7.0, 0, 1452, 3.1], [10.9, 0, 1468, 3.3],
  [11.8, 0, 1142, 3.2], [16.3, 0, 1150, 3.36], [17.2, 0, 815, 3.2], [25.9, 0, 826, 3.48], [27.25, 0, 682, 1.72], [32.7, 0, 676, 1.82],
  [33.5, 0, 152, 3.2], [37.1, 0, 168, 3.36], [38.1, 0, -208, 2.6], [47.0, 0, -224, 2.86], [47.8, 0, -224, 2.86], [50.0, 0, 470, .8], [57, 0, 462, .85]];
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const k = ss((t - a[0]) / (b[0] - a[0])); return a.slice(1).map((v, j) => Array.isArray(v) ? v.map((x, m) => x + (b[j + 1][m] - x) * k) : v + (b[j + 1] - v) * k); } }
  return keys[keys.length - 1].slice(1);
}
// zoom is eased in log space so pulls and pushes feel even
function camAt(t) { const z = CAM.map(k => [k[0], k[1], k[2], Math.log(k[3])]); const [x, y, lz] = track(z, t); return [x, y, Math.exp(lz)]; }

// ---------- the sun (the clock) ----------
const DAWN = [.78, .88, 1.0], NOON = [1, .97, .9], GOLD = [1, .84, .55], RED = [1, .58, .38], DUSK = [1, .5, .26], DEEP = [1, .44, .22];
const SUN = [[0, -230, 20, 0, DUSK], [.3, -230, 20, 2.6, DUSK], [1.3, -230, 440, 2.6, DUSK], [4.9, -230, 440, 2.6, DUSK], [5.5, -230, 440, 0, DUSK],
  [6.5, 1500, 20, 0, DAWN], [6.7, 1500, 20, 2.3, DAWN], [7.6, 1500, 440, 2.3, DAWN], [10.9, 1500, 440, 2.3, DAWN], [11.8, 1170, 440, 2.7, NOON], [16.3, 1170, 440, 2.7, NOON],
  [17.2, 840, 440, 2.5, GOLD], [21.4, 840, 440, 2.5, GOLD], [25.9, 840, 440, 2.5, RED], [27.3, 840, 440, 1.4, RED], [27.45, 680, 820, 2.6, RED], [32.7, 680, 820, 2.4, RED],
  [33.5, 180, 440, 2.6, DUSK], [37.1, 180, 440, 2.6, DUSK], [38.1, -230, 440, 2.8, DEEP], [47.8, -230, 440, 2.6, DEEP], [49.8, -230, 440, 0, DEEP], [57, -230, 440, 0, DEEP]];

// ---------- cracks: jagged lines from an impact ----------
function crackLines(x, y, seed, dirs, len) {
  const r = mulberry(seed);
  return dirs.map((a, i) => { const pts = [[x, y]]; let px = x, py = y, ang = a; const n = 9 + (r() * 5 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; const L = len[i % len.length] / n * (.6 + r() * .8); px += Math.cos(ang) * L; py += Math.sin(ang) * L; pts.push([px, py]); } return pts; });
}
const CR1 = crackLines(4, -236, 11, [-1.62, -1.2, 1.5, 1.9, -.2, 3.0], [150, 90, 150, 100, 46, 50]);
const CR2 = crackLines(-30, 830, 29, [-1.55, -1.85, -1.3, 1.6, .2, 2.9, -.6], [420, 300, 260, 160, 80, 90, 120]);

// ---------- re-leading: the son's pieces slide out along the leads and come back blood-red ----------
const GROUPS = [['sword', ['blade', 'grip', 'guard'], [22, -34]], ['legs', ['thighB', 'shinB', 'bootB', 'thighF', 'shinF', 'bootF'], [0, 34]],
  ['body', ['torso', 'faulds', 'pelvis', 'cloak'], [-34, 0]], ['arms', ['upperB', 'foreB', 'handB', 'upperF', 'foreF', 'handF', 'pauldB', 'pauldF'], [34, -8]], ['head', ['head', 'hair'], [0, -34]]];
const RL0 = 28.0, RLSTEP = .5, RLDUR = .375;
export const WELDS = GROUPS.map((g, i) => RL0 + i * RLSTEP + RLDUR);
const HELM_R = [3, 4, 5, 9, 10, 11], HL0 = 29.25, HLSTEP = .32;
export const HELM_WELDS = HELM_R.map((k, j) => HL0 + j * HLSTEP + RLDUR);
const q8 = t => Math.floor(t * 8) / 8;   // figures step at 8 fps

function sonM3(t) {
  const f = {};
  if (t < T.strike) f.son = POSE.stand;
  else if (t < T.down) f.son = stepPose(t, T.strike, 'stand', 'hit', .25);
  else if (t < 22.2) f.son = stepPose(t, T.down, 'hit', 'kneel');
  else f.son = stepPose(t, 22.2, 'kneel', 'kneelLow', .5);
  f.face = t < T.strike ? 'stern' : t < T.listened ? 'pain' : 'turned';
  if (t >= T.listened && t < 30.4) f.son = lerpPose(POSE.kneelLow, { ...POSE.kneelLow, head: .2 }, 1);
  if (t >= 30.4) f.son = stepPose(t, 30.4, lerpPose(POSE.kneelLow, { ...POSE.kneelLow, head: .2 }, 1), 'guard', .5);
  // re-leading
  const off = {}, turned = new Set();
  GROUPS.forEach(([g, parts, d], i) => { const t0 = RL0 + i * RLSTEP, k = clamp((q8(t) - t0) / RLDUR); const b = Math.sin(Math.PI * k);
    if (k > 0 && k < 1) for (const p of parts) off[p] = [d[0] * b, d[1] * b];
    if (k >= .5) for (const p of parts) turned.add(p); });
  f.off = off; f.pal = q => turned.has(q.n) ? SON_TURNED : SON_PAL;
  return f;
}
function helmsM4(t) {
  const helmOff = {}, helmTurned = {};
  HELM_R.forEach((k, j) => { const t0 = HL0 + j * HLSTEP, u = clamp((q8(t) - t0) / RLDUR); if (u > 0 && u < 1) helmOff[k] = [16 * Math.sin(Math.PI * u), -6 * Math.sin(Math.PI * u)]; if (u >= .5) helmTurned[k] = true; });
  return { helmOff, helmTurned };
}
function starsM5(t) {
  const s = [], tq = q8(t);
  for (let k = 0; k < 8; k++) { const ts = 32.4 + k * .62, u = tq - ts; if (u < 0) continue; const x = 110 - (k % 3) * 70 - u * 52, y = -150 + u * 120 + (k % 2) * 20; if (y > 70) continue; s.push({ x, y, id: 9200 + k * 3 }); }
  return { stars: s, step: Math.floor(t * 8) };
}
function topMed(t) {
  const f = { sonPal: SON_TURNED };
  if (t < 30) { f.father = POSE.reach; f.son = POSE.guard; f.fface = 'stern'; return f; }
  // the duel
  if (t < T.clash) { f.father = POSE.reach; f.son = POSE.guard; }
  else if (t < 40.4) { f.father = stepPose(t, T.clash, 'reach', 'strike', .25); f.son = stepPose(t, T.clash, 'guard', 'strike', .25); }
  else if (t < T.fell) { f.father = stepPose(t, 40.4, 'strike', 'reach'); f.son = stepPose(t, 40.4, 'strike', 'guard'); }
  else { f.father = stepPose(t, T.fell, 'reach', 'strike', .25); f.son = t < T.fell + .5 ? stepPose(t, T.fell, 'guard', 'hit', .25) : stepPose(t, T.fell + .5, 'hit', 'lie', .5); f.sy = 6; f.sx = t < T.fell + .5 ? 66 : 44; if (t >= T.fell + .5) f.sy = -8; }
  if (t >= T.sealed) { const k = clamp(Math.ceil((t - T.sealed) / .375 * 3) / 3); f.fx = -62 + 62 * k; f.fy = 6 - 4 * k; f.father = stepPose(t, T.sealed, 'strike', 'seated', .375); f.fface = 'grief'; }
  return f;
}

export function state(t) {
  const st = { time: t, cam: camAt(t), med: [], cracks: [], pts: [] };
  const [sunU, bandW, sunI, sunCol] = track(SUN, t);
  Object.assign(st, { sunU, bandW, sunI, sunCol, skew: .12 });
  // night: moonlight from 48 s
  const night = ss(seg(t, 47.8, 50.2));
  st.skyI = .12 + night * .2; st.skyCol = [.55 - night * .05, .65, .95 + night * .05]; st.amb = .16 - night * .05;
  // crack shake (2 frames)
  for (const tc of [T.crack1, T.crack2]) if (t >= tc && t < tc + 2 / 24) st.cam = [st.cam[0] + (t - tc < 1 / 24 ? 5 : -4) / st.cam[2], st.cam[1] + 3 / st.cam[2], st.cam[2]];
  // medallions
  st.med[0] = { father: t < T.rise ? POSE.fstand : stepPose(t, T.rise, 'fstand', 'reach'), son: t < T.rise ? POSE.kneel : stepPose(t, T.rise, 'kneel', 'stand') };
  st.med[1] = { son: t < T.raise ? POSE.stand : stepPose(t, T.raise, 'stand', 'raise') };
  st.med[2] = { ...sonM3(t), shade: t < T.strike ? POSE.sReady : stepPose(t, T.strike, 'sReady', 'sStab', .25) };
  st.med[3] = helmsM4(t);
  st.med[4] = starsM5(t);
  st.med[5] = topMed(t);
  // cracks: bright for ~.5 s while they run, then mending leads
  const crack = (lines, tc) => { if (t < tc) return; const k = clamp((t - tc) / .26), bright = t < tc + .55; for (const pts of lines) st.cracks.push({ pts, k, lead: !bright, w: 3.4 }); };
  crack(CR1, T.crack1); crack(CR2, T.crack2);
  // point lights: crack flashes, whispering eyes, weld sparks, clash, the throne's own light
  const flash = (tc, x, y, r, I) => { if (t >= tc && t < tc + .6) st.pts.push([x, y, r, I * Math.exp(-(t - tc) / .12), [1, .97, .92]]); };
  flash(T.crack1, 4, -236, 170, 3.2); flash(T.crack2, -30, 830, 300, 3.0); flash(T.clash, 0, -262, 60, 2.6);
  const eyes = t < T.whisper ? 0 : t < 25.6 ? ss(seg(t, T.whisper, 23.6)) * 2.6 : t < T.crack2 ? 2.6 - ss(seg(t, 25.6, 27.2)) * 1.4 : 0;
  if (eyes > 0) for (const [x, y] of EYES.slice(0, 4 - st.pts.length)) st.pts.push([x, y, 36, eyes, [.45, 1, .3]]);
  for (const tw of [...WELDS, ...HELM_WELDS]) if (t >= tw && t < tw + .3 && st.pts.length < 4) st.pts.push([tw < 30.6 && WELDS.includes(tw) ? -40 : 60, tw < 30.6 && WELDS.includes(tw) ? 816 : 510, 34, 2.4 * Math.exp(-(t - tw) / .07), [1, .85, .6]]);
  const throne = ss(seg(t, 45.6, 48)) * 1.1 + ss(seg(t, 48, 50.5)) * 1.4;
  if (throne > 0 && st.pts.length < 4) st.pts.push([0, -262, 150, throne, [1, .72, .32]]);
  st.expo = 1.1 + (t >= T.crack1 && t < T.crack1 + .3 ? .5 * (1 - (t - T.crack1) / .3) : 0) + (t >= T.crack2 && t < T.crack2 + .3 ? .5 * (1 - (t - T.crack2) / .3) : 0);
  st.spill = sunI * .35 + throne * .15;
  st.fade = ss(seg(t, 56.3, 57));
  return st;
}

// ---------- events for the mixer ----------
export const EV = [
  { t: .3, type: 'ray' }, { t: T.crack1, type: 'crack' }, { t: 5.2, type: 'whoosh', d: 1.8 }, { t: 6.7, type: 'ray' },
  { t: T.rise, type: 'step' }, { t: 11.15, type: 'glide', d: .7 }, { t: 11.75, type: 'light' }, { t: T.raise, type: 'raise' },
  { t: 16.5, type: 'glide', d: .7 }, { t: 17.15, type: 'light' }, { t: T.strike, type: 'strike' }, { t: T.down, type: 'thump' },
  { t: T.whisper, type: 'whisper', d: 2.6 }, { t: T.listened, type: 'creak' }, { t: T.crack2, type: 'crack' },
  ...WELDS.map(t => ({ t, type: 'weld' })), ...WELDS.map(t => ({ t: t - RLDUR, type: 'slide', d: RLDUR })),
  ...HELM_WELDS.map(t => ({ t, type: 'weld', soft: 1 })), { t: 33.0, type: 'glide', d: .6 }, { t: 33.45, type: 'light' },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ t: 32.4 + k * .62, type: 'tinkle' })), { t: 37.3, type: 'glide', d: .8 }, { t: 38.05, type: 'light' },
  { t: T.clash, type: 'clash' }, { t: T.fell, type: 'clash' }, { t: T.fell + .5, type: 'thump' }, { t: T.sealed, type: 'slide', d: .375 }, { t: T.sealed + .375, type: 'weld' },
  { t: T.bell, type: 'bell' },
  ...LINES.map(([id, t]) => ({ t, type: 'voice', id })),
];
