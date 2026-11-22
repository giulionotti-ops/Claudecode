// Meet the Kelpie (intro short): picture = render(t)
// A Scottish loch at dusk: an animated game horse ("Horse" by Henry S, CC BY) on a Kenney CC0 set.
// Every named thing gets its own moving explainer: the map of Scotland, a rider climbing on and gallopping into the loch,
// the shape-shift, weed in the hair, the bridle, stones for the Laird's castle, Burns writing 1786, a child warned off the water.
// Mixers are driven from the frame time only.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 900);
const DUSK = 0x4a4a6a;
const bg = new THREE.Color(DUSK), fog = new THREE.Fog(DUSK, 14, 260); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xa8b4e0, 0x4a5a34, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc088, 1.25); sun.position.set(-10, 7, -12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 70 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0xb0c0ff, 1.0); rim.position.set(8, 5, 10); scene.add(rim);

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const loadSrc = p => gl.loadAsync('models/' + p);
const gHorse = await loadSrc('hsrc/scene.gltf');
const PROPS = {};
const NAMES = ['tree_pineTallA', 'tree_pineDefaultA', 'tree_pineRoundA', 'tree_pineSmallA', 'rock_largeA', 'rock_largeC', 'rock_smallA', 'stone_largeB', 'rock_tallA', 'rock_tallC', 'stone_tallB', 'log', 'plant_bush', 'plant_bushLarge', 'grass_large', 'cliff_large_rock', 'flower_purpleA', 'flower_yellowA', 'stump_old'];
await Promise.all(NAMES.map(async n => { PROPS[n] = (await load(n)).scene; }));

// ---------------------------------------------------------------- actors: model + mixer, posed from the frame time
function makeActor(g, length, { base = 'Walk', parent = scene } = {}) {
  const root = SkeletonUtils.clone(g.scene);
  const mixer = new THREE.AnimationMixer(root), acts = {};
  const holder = new THREE.Group(), fix = new THREE.Group(); holder.add(fix); fix.add(root);
  const mats = [];
  root.traverse(o => { if (o.isMesh) {
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const nm = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); c.userData.base = c.color.clone(); mats.push(c); return c; });
    o.material = nm.length === 1 ? nm[0] : nm; } });
  const clip = n => g.animations.find(a => a.name.trim() === n) || g.animations.find(a => a.name.trim().endsWith('|' + n));
  const a0 = clip(base) || g.animations[0]; const act0 = mixer.clipAction(a0); act0.play(); acts[base] = act0; mixer.update(0);
  root.updateMatrixWorld(true);
  const vis = new THREE.Box3(); root.traverse(o => { if (o.isMesh && o.visible) vis.expandByObject(o, true); });
  const len = Math.max(vis.max.x - vis.min.x, vis.max.z - vis.min.z), k = length / len;
  root.scale.multiplyScalar(k); root.position.set(-(vis.min.x + vis.max.x) / 2 * k, -vis.min.y * k, -(vis.min.z + vis.max.z) / 2 * k);
  const A = { holder, fix, root, mixer, acts, g, clip, k, mats, height: (vis.max.y - vis.min.y) * k };
  parent.add(holder); return A;
}
function pose(A, a, ta) {
  for (const n in A.acts) A.acts[n].setEffectiveWeight(0);
  if (!A.acts[a]) { const c = A.clip(a); if (!c) throw new Error('clip ' + a); const x = A.mixer.clipAction(c); x.play(); A.acts[a] = x; }
  const X = A.acts[a], d = X.getClip().duration; X.setEffectiveWeight(1); X.time = ((ta % d) + d) % d;
  A.mixer.update(0);
}
function place(A, x, y, z, ry = 0, s = 1) { A.holder.position.set(x, y, z); A.holder.rotation.y = ry; A.holder.scale.setScalar(s); }
function tintActor(A, hex, f) { const c = new THREE.Color(hex); for (const m of A.mats) { if (/saddle|cornea|horseshoe/i.test(m.name)) continue; m.color.copy(m.userData.base).lerp(c, f); } }

// gait: from a locomotion clip, find which way the model faces and how fast the planted foot slides back
function gait(A, name) {
  const c = A.clip(name), d = c.duration, n = 90, bones = []; A.root.traverse(o => { if (o.isBone) bones.push(o); });
  const p = new THREE.Vector3(); let prev = null, vx = 0, vz = 0, m = 0;
  for (let i = 0; i <= n; i++) {
    pose(A, name, d * i / n); A.holder.updateMatrixWorld(true);
    let lo = null, ly = 1e9; for (const b of bones) { b.getWorldPosition(p); if (p.y < ly) { ly = p.y; lo = [b, p.x, p.z]; } }
    if (prev && prev[0] === lo[0]) { vx += (lo[1] - prev[1]) / (d / n); vz += (lo[2] - prev[2]) / (d / n); m++; }
    prev = lo;
  }
  vx /= m; vz /= m; return { speed: Math.hypot(vx, vz), yaw: Math.atan2(-vz, -vx), dur: d };
}

const horse = makeActor(gHorse, 2.6, { base: 'Walk' });
const GW = gait(horse, 'Walk'), GG = gait(horse, 'Gallop');
GW.speed = 1.6; GG.speed = 8.5;   // measured foot slide is unreliable on four legs: hand-set strides
const YAW = GW.yaw;                       // turns the model to face +x
const FX = YAW, FNZ = YAW + Math.PI / 2, FPZ = YAW - Math.PI / 2, FNX = YAW + Math.PI;   // face +x, -z (the loch), +z (camera), -x
const spineBone = (() => { let b = null; horse.root.traverse(o => { if (o.isBone && /Spine_02/.test(o.name)) b = o; }); return b; })();
const headBone = (() => { let b = null; horse.root.traverse(o => { if (o.isBone && /Head_00/.test(o.name)) b = o; }); return b; })();
const bp = new THREE.Vector3();
const boneAt = (b, dy = 0) => { horse.holder.updateMatrixWorld(true); b.getWorldPosition(bp); return bp.clone().add(new THREE.Vector3(0, dy, 0)); };

// ---------------------------------------------------------------- the set: moor, loch, hills
const mk = (geo, color, o = {}) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .85, ...o }));
const moor = mk(new THREE.PlaneGeometry(900, 900), 0x56703a); moor.rotation.x = -Math.PI / 2; moor.receiveShadow = true; scene.add(moor);
const loch = mk(new THREE.PlaneGeometry(900, 400), 0x3a5a78, { roughness: .35, metalness: 0, emissive: 0x16283a }); loch.rotation.x = -Math.PI / 2; loch.position.set(0, .06, -203); loch.receiveShadow = true; scene.add(loch);   // water for z < -3
const world = new THREE.Group(); scene.add(world);   // scrolls along x on the walking beats
const tintCache = new Map();
function tinted(src, hex) {
  const root = SkeletonUtils.clone(src);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const key = m.uuid + hex; if (!tintCache.has(key)) { const c = m.clone(); c.color.multiply(new THREE.Color(hex)); c.roughness = .9; tintCache.set(key, c); } return tintCache.get(key); });
    if (o.material.length === 1) o.material = o.material[0]; } });
  return root;
}
function prop(name, x, y, z, s, ry, hex = 0x66705a, parent = world) {
  const o = tinted(PROPS[name], hex); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
{
  const r = mulberry(7), pines = ['tree_pineTallA', 'tree_pineDefaultA', 'tree_pineRoundA', 'tree_pineSmallA'];
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 140, z = 16 + r() * 30; if (Math.abs(z - 5) < 1.2) continue; prop(pines[i % 4], x, 0, z, 3 + r() * 2.5, r() * 6.28, 0x3c5a48); }   // pines behind the camera side and on the moor
  for (let i = 0; i < 40; i++) { const x = (r() - .5) * 110, z = 13 + r() * 6; prop(pines[i % 4], x, 0, z, 2.2 + r() * 1.8, r() * 6.28, 0x41624c); }
  for (let i = 0; i < 40; i++) prop(['rock_largeA', 'rock_largeC', 'rock_smallA', 'stone_largeB', 'rock_smallA'][i % 5], (r() - .5) * 90, 0, -2 - r() * 1.5, 1.2 + r() * 1.3, r() * 6.28, 0x6a6a66);   // shore stones
  for (let i = 0; i < 90; i++) prop(['grass_large', 'plant_bush'][i % 2], (r() - .5) * 90, 0, -2.6 + r() * 11, 1.6 + r() * .9, r() * 6.28, 0x5a6a44);
  for (let i = 0; i < 30; i++) prop(['flower_purpleA', 'flower_yellowA'][i % 2], (r() - .5) * 60, 0, 1 + r() * 6, 2.4, r() * 6.28, 0x9a8a9a);
}
// far hills across the water: low-poly cones and Kenney cliffs, fading into the dusk fog
{ const r = mulberry(17);
  for (let i = 0; i < 16; i++) { const m = mk(new THREE.ConeGeometry(30 + r() * 35, 26 + r() * 30, 7), i % 2 ? 0x232640 : 0x2c3050, { flatShading: true, roughness: 1 }); m.position.set(-190 + i * 26 + r() * 10, 10, -170 - r() * 45); m.rotation.y = r() * 3; scene.add(m); }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshBasicMaterial({ color: 0xf0a070, fog: false })); glow.position.set(-60, 28, -330); scene.add(glow); }
// ripple rings on the water (pooled)
const RIP = []; { const rm = new THREE.MeshBasicMaterial({ color: 0xcfe0f0, transparent: true, opacity: .6, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.95, 1, 40), rm.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); RIP.push(m); } }
let ripN = 0;
function ripple(x, z, a, s0 = .3, s1 = 2.2) { const m = RIP[ripN++ % RIP.length]; m.visible = a > 0 && a < 1; m.position.set(x, .09, z); m.scale.setScalar(lerp(s0, s1, a)); m.material.opacity = .65 * (1 - a); }
function rippleOff() { for (const m of RIP) m.visible = false; ripN = 0; }

// ---------------------------------------------------------------- people (code-built silhouettes, as needed for scale and story)
function makeMan(h = 1.75, color = 0x1a1d22) {
  const g = new THREE.Group(), s = h / 1.75, add = (geo, x, y, z) => { const o = mk(geo, color, { roughness: .9 }); o.position.set(x * s, y * s, z * s); o.castShadow = true; g.add(o); return o; };
  add(new THREE.CapsuleGeometry(.17 * s, .55 * s, 6, 12), 0, 1.15, 0); add(new THREE.SphereGeometry(.12 * s, 16, 12), 0, 1.63, 0);
  g.legs = [add(new THREE.CapsuleGeometry(.07 * s, .62 * s, 4, 8), -.08, .4, 0), add(new THREE.CapsuleGeometry(.07 * s, .62 * s, 4, 8), .08, .4, 0)];
  g.arms = [add(new THREE.CapsuleGeometry(.05 * s, .5 * s, 4, 8), -.24, 1.12, 0), add(new THREE.CapsuleGeometry(.05 * s, .5 * s, 4, 8), .24, 1.12, 0)];
  scene.add(g); return g;
}
const man = makeMan(1.75, 0x4a5064), kid = makeMan(1.05, 0x6a2d2d);
function walkLegs(g, t, sp = 5.2) { const sw = Math.sin(t * sp) * .35; g.legs[0].rotation.x = sw; g.legs[1].rotation.x = -sw; g.arms[0].rotation.x = -sw * .6; g.arms[1].rotation.x = sw * .6; }
function stillLegs(g) { for (const l of g.legs) l.rotation.x = 0; for (const a of g.arms) a.rotation.x = 0; }

// ---------------------------------------------------------------- explainer sets
const sets = {};
// the castle the Laird builds: stone rows rise
sets.castle = new THREE.Group(); scene.add(sets.castle);
{ const r = mulberry(4); sets.castle.rows = [];
  for (let j = 0; j < 7; j++) { const row = new THREE.Group(); row.position.y = .4 + j * .8;
    for (let i = 0; i < 9; i++) { if (j % 2 && i === 8) continue; const b = mk(new THREE.BoxGeometry(1.1, .75, 1.1), [0x9a9488, 0xa8a094, 0x8a8478][(i + j) % 3], { roughness: 1 }); b.position.set(i * 1.14 - 4.6 + (j % 2) * .57, 0, 0); b.castShadow = true; b.receiveShadow = true; row.add(b);
      if ((j === 6) && i % 2 === 0) { const m = mk(new THREE.BoxGeometry(.8, .6, 1.1), 0x8a8478, { roughness: 1 }); m.position.set(i * 1.14 - 4.6, .65, 0); m.castShadow = true; row.add(m); } }
    sets.castle.add(row); sets.castle.rows.push(row); } }
// stones on the horse's back
sets.load = new THREE.Group(); scene.add(sets.load);
for (const [x, y, z, s] of [[-.5, .15, .55, .5], [-.5, .15, -.55, .5], [.35, .2, .5, .42], [.35, .2, -.5, .42]]) { const o = tinted(PROPS['stone_largeB'], 0xb8b0a0); o.position.set(x, y, z); o.scale.setScalar(s); sets.load.add(o); }
const SETS = Object.values(sets);
function only(...names) { for (const s of SETS) s.visible = false; for (const n of names) sets[n].visible = true; }

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  friendliest: wt('friendliest'), kelpie: wt('kelpie'), scottish: wt('scottish'), folklore: wt('folklore'), monster: wt('monster'), waits: wt('waits'),
  imagine: wt('imagine'), loch: wt('loch'), dusk: wt('dusk'), there: wt('there'), beautiful: wt('beautiful'), grey: wt('grey'), tame: wt('tame'),
  climb: wt('climb'), gallops: wt('gallops'), water2: wt('water', 2), drowns: wt('drowns'), rider: wt('rider'), change: wt('change'), handsome: wt('handsome'), weed: wt('weed'), hair: wt('hair'),
  bridle: wt('bridle'), laird: wt('laird'), morphie: wt('morphie'), carry: wt('carry'), stones: wt('stones'), castle: wt('castle'), burns: wt('burns'), seventeen: wt('seventeen'), wrote: wt('wrote'),
  haunt: wt('haunt'), ford: wt('ford'), children: wt('children'), deep: wt('deep'), could: wt('could', 1), work: wt('work'), find: wt('find'), next: wt('next'), send: wt('send'), horseEnd: wt('horse', 3),
};
const S = { b: wt('this') - .3, c: wt('water') - .1, d: wt('it') - .3, e: wt('imagine') - .3, f: wt('you', 1) - .3, g: wt('and', 1) - .3, i: wt('storytellers') - .3, j: wt('as') - .3,
  k: wt('strangest') - .3, l: wt('robert') - .3, m: wt('storytellers', 1) - .3, n: wt('but') - .2, o: wt('find') - .3 };
S.end = words[words.length - 1].t1 + 1.3;
window.DUR = S.end;
const SPLASH = T.water2 - .2;   // the horse hits the loch

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.up.set(0, 1, 0); camera.position.copy(pos); camera.lookAt(look.x, look.y, look.z); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
function vignette(k = .5) { const x = ov.x, g = x.createRadialGradient(W / 2, H * .5, H * .28, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
function label(text, x, y, color = '#fff', size = 40, align = 'center') { const c = ov.x; c.save(); c.font = `700 ${size}px 'Fredoka'`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = 'rgba(8,10,12,.95)'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y); c.restore(); }
function panel(x0, y0, w, h, a) { const x = ov.x; x.save(); x.globalAlpha = a; x.beginPath(); x.roundRect(x0, y0, w, h, 28); x.fillStyle = 'rgba(14,22,30,.92)'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#e9b949'; x.stroke(); x.clip(); return x; }

// ---------------------------------------------------------------- 2D explainer panels
// Scotland: the outline fills in, lochs glint, a pin drops on a loch
function scotlandMap(t, a) {
  const px = W * .16, py = H * .09, pw = W * .68, ph = H * .43, x = panel(px, py, pw, ph, a);
  const P = ([u, v]) => [px + pw * (.06 + u * .88), py + ph * (.04 + v * .92)];
  const pts = [[.52, 0], [.62, .03], [.70, .08], [.66, .14], [.72, .20], [.62, .26], [.60, .32], [.66, .38], [.74, .42], [.70, .50], [.62, .56], [.68, .62], [.78, .66], [.74, .72], [.64, .76], [.56, .82], [.50, .90], [.40, .94], [.34, .88], [.40, .80], [.32, .74], [.28, .66], [.30, .58], [.22, .52], [.26, .44], [.18, .38], [.24, .30], [.30, .24], [.26, .16], [.34, .10], [.44, .06]];
  const k = eo(seg(t, T.scottish - .35, T.scottish + .5)); x.beginPath(); pts.forEach((q, i) => { const [X, Y] = P(q); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath();
  x.fillStyle = `rgba(86,110,70,${.25 + .75 * k})`; x.fill(); x.lineWidth = 5; x.strokeStyle = `rgba(233,185,73,${k})`; x.stroke();
  const lk = eo(seg(t, T.scottish + .1, T.folklore));
  x.fillStyle = '#6fb4d8'; for (const [u, v, rw, rh] of [[.46, .38, .05, .012], [.40, .50, .03, .02], [.58, .32, .035, .012], [.50, .62, .045, .015], [.44, .22, .03, .012]]) { const [X, Y] = P([u, v]); x.beginPath(); x.ellipse(X, Y, pw * rw * lk, ph * rh * lk * 2.2, .5, 0, 6.3); x.fill(); }
  x.restore();
  const pin = eo(seg(t, T.folklore - .4, T.folklore + .1)); if (pin > 0) { const [X, Y] = P([.46, .38]); O.ring(ov, X, Y, W * .045 * (1 + .25 * Math.sin(t * 6)), pin, '#ff6b5b'); label('A LOCH', X + W * .15, Y - H * .018, '#9fd4f0', 36); }
  label('SCOTLAND', W / 2, py + ph + H * .035, '#f5c23a', 46);
}
// water weed in the hair: a face, green weed growing out of the hair, drips
function weedFace(t, a) {
  const px = W * .2, py = H * .08, pw = W * .6, ph = H * .42, x = panel(px, py, pw, ph, a), cx = px + pw / 2, cy = py + ph * .5, R = pw * .22;
  x.fillStyle = '#e8b890'; x.beginPath(); x.arc(cx, cy, R, 0, 6.3); x.fill();
  x.fillStyle = '#3a2a22'; x.beginPath(); x.arc(cx, cy - R * .12, R * 1.06, Math.PI * 1.02, Math.PI * 1.98); x.quadraticCurveTo(cx + R * .9, cy - R * .5, cx + R * .6, cy - R * .5); x.quadraticCurveTo(cx, cy - R * .8, cx - R * .6, cy - R * .5); x.closePath(); x.fill();   // hair
  x.fillStyle = '#222'; for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + s * R * .38, cy + R * .02, R * .08, 0, 6.3); x.fill(); }
  x.strokeStyle = '#7a4a3a'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy + R * .2, R * .38, .25, Math.PI - .25); x.stroke();   // smile
  const g = eo(seg(t, T.weed - .2, T.weed + .9));
  x.strokeStyle = '#2f9a4a'; x.lineWidth = 11;
  for (let i = 0; i < 6; i++) { const bx = cx + (i - 2.5) * R * .36, by = cy - R * .62; x.beginPath();
    for (let j = 0; j <= 14; j++) { const u = j / 14 * g, X = bx + Math.sin(u * 6 + i + t * 3) * R * .08 + (i - 2.5) * R * .12 * u, Y = by + u * R * 1.5; j ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); }
  x.fillStyle = '#8fd0f0'; for (let i = 0; i < 5; i++) { const u = (t * .8 + i * .21) % 1; if (g > .6) { x.beginPath(); x.ellipse(cx + (i - 2) * R * .42, cy + R * 1.0 + u * R * .9, 7, 11, 0, 0, 6.3); x.fill(); } }
  x.restore();
  const wk = eo(seg(t, T.weed, T.weed + .4)); if (wk > 0) { O.ring(ov, cx - R * .3, cy - R * .7, R * .5, wk, '#ff6b5b'); label('WATER WEED', cx, py + ph + H * .035, '#9be0a8', 44); }
}
// Burns: the verse is written letter by letter, the year counts up
function burnsPage(t, a) {
  const px = W * .08, py = H * .09, pw = W * .84, ph = H * .36, x = panel(px, py, pw, ph, a);
  x.fillStyle = '#e8d8b0'; x.fillRect(px, py, pw, ph);
  x.fillStyle = 'rgba(120,90,50,.18)'; for (let i = 0; i < 6; i++) x.fillRect(px, py + ph * (.3 + i * .12), pw, 3);
  x.restore();
  const lines = ['Then, Water-kelpies haunt the foord,', 'By your direction'], k = clamp((t - (T.wrote - .2)) / (T.ford + .6 - T.wrote + .2)), n = Math.floor(k * (lines[0].length + lines[1].length));
  const c = ov.x; c.save(); c.globalAlpha = a; c.font = `700 ${Math.round(W * .05)}px 'Fredoka'`; c.fillStyle = '#3a2a1a'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(lines[0].slice(0, n), px + pw * .06, py + ph * .46); if (n > lines[0].length) c.fillText(lines[1].slice(0, n - lines[0].length), px + pw * .06, py + ph * .66); c.restore();
  const yr = Math.round(lerp(1700, 1786, eo(seg(t, T.seventeen - .1, T.seventeen + .9))));
  label('ROBERT BURNS', px + pw / 2, py + ph * .14, '#6a3a1a', 40); label(String(yr), px + pw - W * .1, py + ph * .88, '#a04a1a', 54, 'center');
}
function sparkle(cx, cy, k) { const c = ov.x; c.save(); for (let i = 0; i < 22; i++) { const a = i * 2.4, r = (W * .04 + k * W * .22) * (.5 + (i % 5) / 5); c.globalAlpha = Math.max(0, 1 - k) * .9; c.fillStyle = i % 2 ? '#bfe6ff' : '#ffffff'; c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.2 - k * H * .04, 7 * (1 - k * .6), 0, 6.3); c.fill(); } c.restore(); }

window.render = (t) => {
  texts.length = 0; O.clear(ov); only(); rippleOff();
  man.visible = false; man.scale.setScalar(1); kid.visible = false; horse.holder.visible = true; moor.visible = true; loch.visible = true; world.visible = true;
  sky(DUSK, 14, 260); hemi.intensity = 1.5; hemi.color.set(0xa8b4e0); sun.color.set(0xffc088); sun.intensity = 1.25; sun.position.set(-10, 7, -12); sun.target.position.set(0, 0, 0);
  world.position.x = 0; tintActor(horse, 0xb4b9c8, .8);
  let after = null; const hx0 = 0, hz0 = 0;
  const idle = (name = '1 Ilde', k = 1) => pose(horse, name, t * k);
  const ex = () => { const e = horse.holder.position; ripple(e.x, -3.6, ((t * .45) % 1), .3, 1.6); ripple(e.x + 1.2, -4.5, ((t * .45 + .5) % 1), .3, 1.8); };

  if (t < S.b) {            // hook: the grey horse stands by the loch at dusk
    const k = eio(seg(t, 0, S.b)); idle(); place(horse, 0, 0, 0, FPZ - .55);
    cam(V(lerp(4.6, 3.6, k), lerp(1.4, 1.35, k), lerp(5.8, 4.8, k)), V(0, lerp(1.3, 1.25, k), 0), 46); ex();
    after = () => { showChip('SCOTLAND · FOLKLORE', .3, S.b, t); };
  } else if (t < S.c) {     // the name
    const k = eio(seg(t, S.b, S.c)); idle('2 Ilde'); place(horse, 0, 0, 0, FPZ - .35);
    cam(V(lerp(4, 3, k), 1.55, lerp(5.5, 4.4, k)), V(0, 1.3, 0), 44); ex();
    after = () => { showChip('MEET THE KELPIE', T.kelpie - .2, S.c, t); };
  } else if (t < S.d) {     // SCOTTISH FOLKLORE: the map, horse waits below
    idle('2 Ilde'); place(horse, 0, 0, 0, FPZ - .35); cam(V(3, 1.0, 6.2), V(0, 2.9, 0), 50); ex();
    after = () => { scotlandMap(t, eo(seg(t, S.c, S.c + .3))); };
  } else if (t < S.e) {     // IT WAITS: still horse, rings on the water, a slow creep
    const k = eio(seg(t, S.d, S.e)); idle('3 Ilde'); place(horse, 0, 0, 0, FPZ + .5);
    cam(V(lerp(-5, -3.6, k), 1.3, lerp(6.5, 5, k)), V(0, 1.2, 0), 46); ex();
    after = () => { showChip('IT DOES NOT HUNT · IT WAITS', S.d + .1, S.e, t); };
  } else if (t < T.there - .2) {   // IMAGINE: you walk home along the loch at dusk
    const k = seg(t, S.e, T.there); idle('1 Ilde'); place(horse, 5.5, 0, 0, FPZ + .3);
    man.visible = true; man.position.set(lerp(-8, -1.8, k), 0, 1.2); man.rotation.y = -Math.PI / 2; walkLegs(man, t);
    cam(V(lerp(-2, 2.5, k), 1.8, 12), V(lerp(-3, 2.5, k), 1.3, 0), 48);
    ripple(5.5, -4.3, (t * .4) % 1, .3, 1.6);
    after = () => { showChip('YOU · A LOCH AT DUSK', S.e + .2, T.there - .2, t); const m = toScreen(V(man.position.x, 2.05, 1.2)); label('YOU', m[0], m[1], '#cfe3ff', 38); };
  } else if (t < S.f) {     // a beautiful grey horse: it looks tame
    idle('1 Ilde'); place(horse, 0, 0, 0, FPZ + .45);
    man.visible = true; man.position.set(-2.4, 0, 1.6); man.rotation.y = -Math.PI / 2 + .5; stillLegs(man);
    const k = eio(seg(t, T.there - .2, S.f)); cam(V(lerp(5.5, 3.8, k), 1.5, lerp(7, 5.4, k)), V(-.5, 1.3, 0), 46); ex();
    after = () => { showChip('A BEAUTIFUL GREY HORSE', T.beautiful - .2, T.tame - .1, t); showChip('IT LOOKS TAME', T.tame - .1, S.f + .3, t); };
  } else if (t < S.g) {     // YOU CLIMB ON: the rider swings up onto the saddle
    idle('1 Ilde'); place(horse, 0, 0, 0, FNX + .0);
    const k = eio(seg(t, T.climb - .2, S.g)); const sp = boneAt(spineBone, .2);
    man.visible = true; man.position.set(lerp(-2.0, sp.x, k), lerp(0, sp.y - .7, Math.sin(k * Math.PI / 2)), lerp(.9, sp.z, k)); man.rotation.y = 0; stillLegs(man);
    cam(V(0, 1.8, 7), V(0, 1.2, 0), 46); ex();
    after = () => { showChip('YOU CLIMB ON', T.climb - .2, S.g, t); };
  } else if (t < S.i) {     // IT GALLOPS INTO THE LOCH, rider and all; the rider is dragged under
    const dz = T.drowns, a0 = S.g;
    const into = Math.min(t, SPLASH);
    const z = -3 - GG.speed * (t - SPLASH);                // running toward -z
    const inWater = z < -3.4;
    const swimK = clamp((t - SPLASH) / .5);
    if (!inWater) { pose(horse, 'Gallop', t); place(horse, 0, 0, z, FNZ); }
    else { pose(horse, 'Swim', t); place(horse, 0, lerp(0, -.85, eio(swimK)), Math.max(z, -3.4 - 2.5 * (1 - Math.exp(-(t - SPLASH) * 1.2))), FNZ); }
    const hz = horse.holder.position.z; const sp = boneAt(spineBone, .15);
    man.visible = true; const dr = clamp((t - dz) / 1.1);
    man.scale.set(1, .74, 1); man.position.set(sp.x, sp.y - .55 - dr * 2.4, sp.z - dr * .4); man.rotation.set(0, Math.PI / 2, dr * 1.4); stillLegs(man);
    cam(V(9.5, 2.0 + .2 * (1 - clamp(t - SPLASH)), hz + 3.2), V(0, .9, hz - 1.2), 46);
    if (inWater) { for (let i = 0; i < 6; i++) ripple(0, hz - 1 + i * .4, ((t - SPLASH) * .9 + i * .17) % 1, .4, 2.6); }
    if (t > dz) for (let i = 0; i < 3; i++) ripple(sp.x, sp.z, ((t - dz) * 1.3 + i * .3) % 1, .2, 1.8);
    after = () => { showChip('INTO THE LOCH', T.gallops - .2, T.drowns - .4, t); showChip('THE RIDER IS DRAGGED UNDER', T.drowns - .4, S.i, t); };
  } else if (t < T.change - .1) {   // the horse waits in the shallows
    idle('1 Ilde'); place(horse, 0, 0, -1.2, FPZ + .2); cam(V(2.6, 1.4, 3.8), V(0, 1.1, -1.2), 46); ex();
    after = () => { showChip('IT CAN CHANGE SHAPE', S.i + .1, T.change + 1.4, t); };
  } else if (t < S.j) {     // SHAPE-SHIFT: horse dissolves, a man stands where it stood
    const k = eio(seg(t, T.change, T.change + .9)); idle('1 Ilde'); place(horse, 0, 0, -1.2, FPZ + .2, Math.max(.001, 1 - k));
    man.visible = k > .1; man.position.set(0, 0, -1.2); man.rotation.y = .4; man.scale.setScalar(Math.max(.001, k)); stillLegs(man);
    cam(V(2.6, 1.4, 3.8), V(0, 1.1, -1.2), 46); ex();
    after = () => { showChip('IT CAN CHANGE SHAPE', S.i + .1, T.change + 1.4, t); if (k > 0 && k < 1) sparkle(...toScreen(V(0, 1.2, -1.2)), k); };
  } else if (t < S.k) {     // HANDSOME MAN, WEED IN HIS HAIR: the face explainer
    man.visible = true; man.position.set(0, 0, -1.2); man.rotation.y = .4; man.scale.setScalar(1); stillLegs(man);
    horse.holder.visible = false; cam(V(2.4, 1.2, 5.2), V(0, 2.1, -1.2), 50); ex();
    after = () => { weedFace(t, eo(seg(t, S.j, S.j + .3))); };
  } else if (t < S.l) {     // THE BRIDLE: close on the head, arrow to the bridle, the scene turns to the building site
    horse.holder.visible = true;
    if (t < T.laird - .2) {
      idle('1 Ilde'); place(horse, 0, 0, 0, FPZ + .9);
      const h = boneAt(headBone, 0); cam(V(h.x + 2.6, h.y + .3, h.z + 3.4), V(h.x, h.y - .1, h.z), 40); ex();
      after = () => { showChip('THE BRIDLE', T.bridle - .5, T.laird - .1, t); const q = toScreen(h.clone().add(V(0, -.1, .3))); O.arrow(ov, q[0] + W * .22, q[1] - H * .12, q[0] + W * .03, q[1] - H * .01, seg(t, T.bridle, T.bridle + .5), '#f5c23a', 12); };
    } else {                // LAIRD OF MORPHIE: bridled horse hauls stones, the castle wall rises
      only('castle', 'load'); const u = t - (T.laird - .2), x = -9 + GW.speed * u;
      pose(horse, 'Walk', u); place(horse, x, 0, 0, FX);
      const b = boneAt(spineBone, 0); sets.load.position.set(b.x, b.y - .05, b.z); sets.load.rotation.y = 0;
      sets.castle.position.set(x + 2.6, 0, -2); sets.castle.scale.setScalar(.5); const rows = Math.min(7, Math.max(0, (t - (T.stones - .2)) / .5)); sets.castle.rows.forEach((r, i) => { const f = clamp(rows - i); r.visible = f > 0; r.position.y = lerp(-.6, .4 + i * .8, eo(f)); });
      sets.load.visible = t < T.castle + .2;
      cam(V(x + .6, 1.9, 7.5), V(x + .5, 1.2, 0), 50);
      after = () => { showChip('THE LAIRD OF MORPHIE', T.laird - .2, T.carry - .05, t); showChip('STONES FOR HIS CASTLE', T.carry - .05, S.l, t); };
    }
  } else if (t < S.m) {     // BURNS: the verse, the year; the horse stands in the ford below
    idle('1 Ilde'); place(horse, 0, 0, -1.3, FPZ + .6); cam(V(3, 1.1, 4.8), V(0, 2.1, -1.2), 50); ex();
    after = () => { burnsPage(t, eo(seg(t, S.l, S.l + .3))); };
  } else if (t < S.n) {     // CHILDREN: a child runs for the water, the kelpie rises, the child turns back
    const k = seg(t, S.m, T.deep + .3), back = eo(seg(t, T.deep + .2, S.n));
    kid.visible = true; const kz = lerp(4, 0.3, eo(k)) + back * 5.5; kid.position.set(-1.8, 0, kz); kid.rotation.y = back > 0 ? Math.PI : 0; walkLegs(kid, t, 8); if (k >= .99 && back < .02) stillLegs(kid);
    idle('1 Ilde'); place(horse, .9, 0, -1.4, FPZ + .3);
    cam(V(7, 1.6, 6), V(-.2, .9, 0), 48); ex();
    after = () => { showChip('A WARNING FOR CHILDREN', T.children - .3, S.n, t); const m = toScreen(V(-1.8, 1.55, kz)); if (kz < 1.6 && back < .5) label('!', m[0], m[1] - H * .01, '#ff6b5b', 90); };
  } else if (t < S.o) {     // COULD A WATER HORSE WORK? it swims across the loch
    const u = t - S.n; pose(horse, 'Swim', u); place(horse, lerp(-4, 4, eio(seg(t, S.n, S.o))), -.85, -7, FX);
    for (let i = 0; i < 5; i++) ripple(horse.holder.position.x - 1.3 - i * .7, -7, ((u * .8 + i * .2) % 1), .4, 2.2);
    cam(V(0, 1.9, 6.2), V(horse.holder.position.x * .6, .5, -7), 46);
    after = () => { showChip('COULD A WATER HORSE WORK?', T.could - .1, S.o, t); };
  } else {                  // FIND OUT NEXT: it faces the camera from the dark water, eyes lit
    const g = eio(seg(t, S.o, S.o + 1.4)); sky(0x232338, lerp(14, 6, g), lerp(260, 80, g)); hemi.intensity = lerp(1.5, .8, g); sun.intensity = lerp(1.25, .6, g);
    pose(horse, 'Swim', t); place(horse, 0, -.85, lerp(-6, -1.6, g), FPZ);
    cam(V(0, 1.1, 5.2), V(0, .8, -2.5), 46); for (let i = 0; i < 6; i++) ripple(0, horse.holder.position.z + .3 - i * .35, ((t * .8 + i * .17) % 1), .4, 2.0);
    after = () => { showChip('FIND OUT NEXT', T.find - .2, T.send - .1, t); showChip('SEND IT TO SOMEONE WHO TRUSTS HORSES', T.send - .1, S.end, t); };
  }
  ground_follow();
  renderer.render(scene, camera);
  vignette(.5);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};
function ground_follow() { moor.position.set(camera.position.x, 0, camera.position.z); loch.position.x = camera.position.x; }

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'wind' }, { t: T.kelpie, type: 'swell' }, { t: T.scottish, type: 'pop' }, { t: T.folklore - .3, type: 'blip' }, { t: T.waits, type: 'thud' },
  { t: T.climb, type: 'thud' }, { t: SPLASH, type: 'splash' }, { t: T.drowns, type: 'splash' }, { t: T.change, type: 'swell' }, { t: T.weed, type: 'blip' }, { t: T.bridle, type: 'clang' },
  { t: T.stones, type: 'clang' }, { t: T.stones + .5, type: 'clang' }, { t: T.stones + 1, type: 'clang' }, { t: T.castle, type: 'thud' }, { t: T.seventeen, type: 'tick' },
  { t: T.children, type: 'buzz' }, { t: T.could, type: 'swell' }];
for (let g = SPLASH - 1.2; g < SPLASH; g += .25) EV.push({ t: g, type: 'thud' });   // hooves
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'k', 'l', 'm', 'n', 'o']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
