// Meet the Mapinguari (intro short): picture = render(t)
// Grim storm jungle: a walking low-poly giant sloth (rkuhlf, CC BY) on a rain-soaked set of Kenney CC0 props.
// Every named thing gets its own moving explainer: the Amazon map, bullets bouncing, the one eye and belly mouth,
// backwards footprints, Megatherium vs a person and 4 tonnes as cars, a Mylodon skin whose bones turn to chain mail,
// and a 12,000-year clock. Mixers are driven from the frame time only.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 800);
const STORM = 0x34433f;
const bg = new THREE.Color(STORM), fog = new THREE.Fog(STORM, 6, 48); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0x9fb3b0, 0x2a2f26, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xb8c8d8, 1.3); sun.position.set(-8, 14, 10); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 70 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x9fc0e0, 1.6); rim.position.set(6, 6, -12); scene.add(rim);   // cold back light: the giant's outline reads against the storm

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const gSloth = await load('sloth_walk');
const PROPS = {};
const NAMES = ['tree_palmTall', 'tree_palmDetailedTall', 'tree_palmBend', 'tree_fat', 'tree_oak', 'plant_bushLarge', 'plant_bushDetailed', 'plant_bush', 'plant_bushLargeTriangle', 'log', 'log_large', 'stump_old', 'rock_largeA', 'rock_smallA', 'stone_largeB', 'grass_large'];
await Promise.all(NAMES.map(async n => { PROPS[n] = (await load(n)).scene; }));

// ---------------------------------------------------------------- actors: model + mixer, posed from the frame time
// length: scale so the body is this long (m); hideRe: meshes to drop (the model's display sphere and ground disc)
function makeActor(g, length, { tint = null, base = 'Walk', hideRe = null, parent = scene } = {}) {
  const root = SkeletonUtils.clone(g.scene);
  const mixer = new THREE.AnimationMixer(root), acts = {};
  const holder = new THREE.Group(), fix = new THREE.Group(); holder.add(fix); fix.add(root);
  const mats = [];
  root.traverse(o => { if (o.isMesh) {
    const mn = (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.name).join(' ');
    if (hideRe && (hideRe.test(o.name) || hideRe.test(mn))) { o.visible = false; return; }
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const nm = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); if (tint) c.color.multiply(new THREE.Color(tint)); c.userData.base = c.color.clone(); mats.push(c); return c; });
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
function tintActor(A, hex, f) { const c = new THREE.Color(hex); for (const m of A.mats) m.color.copy(m.userData.base).lerp(c, f); }

// gait: from the Walk clip itself, find which way the model faces and how fast the planted foot slides back,
// so the world can scroll at exactly that speed (no skating feet)
function gait(A) {
  const c = A.clip('Walk'), d = c.duration, n = 90, bones = []; A.root.traverse(o => { if (o.isBone) bones.push(o); });
  const p = new THREE.Vector3(); let prev = null, vx = 0, vz = 0, m = 0;
  for (let i = 0; i <= n; i++) {
    pose(A, 'Walk', d * i / n); A.holder.updateMatrixWorld(true);
    let lo = null, ly = 1e9; for (const b of bones) { b.getWorldPosition(p); if (p.y < ly) { ly = p.y; lo = [b, p.x, p.z]; } }
    if (prev && prev[0] === lo[0]) { vx += (lo[1] - prev[1]) / (d / n); vz += (lo[2] - prev[2]) / (d / n); m++; }
    prev = lo;
  }
  vx /= m; vz /= m; const sp = Math.hypot(vx, vz);
  return { speed: sp, yaw: Math.atan2(-vz, -vx), dur: d };   // forward = opposite of the planted foot's slide
}

const sloth = makeActor(gSloth, 6, { hideRe: /icosphere|object_273|ground/i, tint: 0xd8c8b0 });   // Megatherium: 6 m long
const G = gait(sloth);
const WALK_V = G.speed, YAW = G.yaw;   // m/s of the planted foot; yaw that turns the model to face +x

// ---------------------------------------------------------------- the set: storm jungle, dark Kenney palms, bushes, logs
const mudMat = new THREE.MeshStandardMaterial({ color: 0x2b3322, roughness: .55, metalness: .05 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mudMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
const tintCache = new Map();
function tinted(src, hex) {
  const root = SkeletonUtils.clone(src);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const key = m.uuid + hex; if (!tintCache.has(key)) { const c = m.clone(); c.color.multiply(new THREE.Color(hex)); c.roughness = .9; tintCache.set(key, c); } return tintCache.get(key); });
    if (o.material.length === 1) o.material = o.material[0]; } });
  return root;
}
function prop(name, x, y, z, s, ry, hex = 0x55665a, parent = world) {
  const o = tinted(PROPS[name], hex); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
{
  const r = mulberry(11), trees = ['tree_palmTall', 'tree_palmDetailedTall', 'tree_palmBend', 'tree_fat', 'tree_oak'], bush = ['plant_bushLarge', 'plant_bushDetailed', 'plant_bush', 'plant_bushLargeTriangle'];
  for (let i = 0; i < 90; i++) { const x = (r() - .5) * 120, z = -6 - r() * 50; prop(trees[i % 5], x, 0, z, 3.6 + r() * 3, r() * 6.28, 0x4a5a4e); }
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 90, z = -3 - r() * 30; prop(bush[i % 4], x, 0, z, 1.6 + r() * 1.8, r() * 6.28, 0x445a44); }
  for (let i = 0; i < 18; i++) prop(['log', 'log_large', 'stump_old', 'rock_smallA', 'stone_largeB'][i % 5], (r() - .5) * 70, 0, -2 - r() * 14, 1.6 + r() * 1.2, r() * 6.28, 0x5a5a50);
  for (let i = 0; i < 40; i++) prop('grass_large', (r() - .5) * 70, 0, 2 - r() * 12, 1.8 + r() * .8, r() * 6.28, 0x4f6046);
  for (const [x, z, s] of [[-7, 1.4, 2.4], [8, 1.0, 2.6], [-12, -1, 3.0], [13, -1, 2.8], [20, 1, 2.6], [-18, 1.2, 2.8]]) prop('plant_bushLarge', x, 0, z, s, x, 0x3c5040);
}
// puddles: flat mirrors of the grey sky on the mud
const puddleMat = new THREE.MeshStandardMaterial({ color: 0x55666a, roughness: .08, metalness: .6 });
{ const r = mulberry(5); for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(.6 + r() * 1.2, 20), puddleMat); p.rotation.x = -Math.PI / 2; p.scale.set(1.6, 1, 1); p.position.set((r() - .5) * 80, .01, 3 - r() * 9); world.add(p); } }

// ---------------------------------------------------------------- explainer sets (hidden unless their beat is on)
const sets = {};
const mk = (geo, color, o = {}) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
// 1. a person for scale (1.75 m), dark silhouette
sets.man = new THREE.Group(); scene.add(sets.man);
{ const m = { color: 0x15181a, roughness: .9 }, add = (g, x, y, z) => { const o = mk(g, m.color); o.position.set(x, y, z); o.castShadow = true; sets.man.add(o); return o; };
  add(new THREE.CapsuleGeometry(.17, .55, 6, 12), 0, 1.15, 0); add(new THREE.SphereGeometry(.12, 16, 12), 0, 1.63, 0);
  sets.man.legs = [add(new THREE.CapsuleGeometry(.07, .62, 4, 8), -.08, .4, 0), add(new THREE.CapsuleGeometry(.07, .62, 4, 8), .08, .4, 0)]; }
// 3. Mylodon skin cutaway: fur, skin, and bony pebbles (osteoderms) that rise into place; a jaguar tooth bites and bounces off
sets.skin = new THREE.Group(); scene.add(sets.skin);
{ const fur = mk(new THREE.BoxGeometry(3, .22, 2), 0x5a4030, { roughness: 1, transparent: true, opacity: .55, depthWrite: false }); fur.position.y = .56; sets.skin.add(fur); sets.skin.fur = fur;
  const derm = mk(new THREE.BoxGeometry(3, .42, 2), 0xb07a62, { roughness: .7, transparent: true, opacity: .45, depthWrite: false });   derm.position.y = .24; sets.skin.add(derm);   // see-through: the bones show inside
  const meat = mk(new THREE.BoxGeometry(3, .5, 2), 0x7a2e2a, { roughness: .6 }); meat.position.y = -.22; sets.skin.add(meat);
  sets.skin.bones = []; const r = mulberry(3);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) { const o = mk(new THREE.SphereGeometry(.15, 14, 10), 0xeee2c4, { roughness: .45 }); o.scale.set(1.25, .55, 1.1);
    o.userData = { x: -1.32 + i * .44 + (r() - .5) * .06, z: -.8 + j * .4 + (r() - .5) * .06, d: r() * .5 }; o.castShadow = true; sets.skin.add(o); sets.skin.bones.push(o); }
  const tooth = mk(new THREE.ConeGeometry(.14, .9, 14), 0xf4f0e6, { roughness: .3 }); tooth.rotation.x = Math.PI; tooth.castShadow = true; sets.skin.add(tooth); sets.skin.tooth = tooth;
  const gum = mk(new THREE.BoxGeometry(1.2, .3, .5), 0x3a1a1a); sets.skin.add(gum); sets.skin.gum = gum; }
// 5. mud for the footprints
sets.mud = new THREE.Group(); scene.add(sets.mud);
const PRINTS = [], printMat = new THREE.MeshStandardMaterial({ color: 0x14170f, roughness: .25, metalness: .3 }), edgeMat = new THREE.MeshBasicMaterial({ color: 0xf5c23a, transparent: true });
for (let i = 0; i < 18; i++) { const g = new THREE.Group(), side = i % 2 ? 1 : -1;
  const p = new THREE.Mesh(new THREE.CircleGeometry(.24, 24), printMat); p.scale.set(1.7, 1, 1); p.rotation.x = -Math.PI / 2; g.add(p);
  for (let c = 0; c < 3; c++) { const cl = new THREE.Mesh(new THREE.CircleGeometry(.06, 10), printMat); cl.rotation.x = -Math.PI / 2; cl.position.set(.5, .002, (c - 1) * .12); g.add(cl); }   // claw dents
  const e = new THREE.Mesh(new THREE.RingGeometry(.2, .26, 24, 1, side > 0 ? 0 : Math.PI, Math.PI), edgeMat); e.scale.set(1.7, 1, 1); e.rotation.x = -Math.PI / 2; e.position.y = .004; g.add(e); g.edge = e;
  g.position.set(-3 + i * .9, .012, side * .55); g.rotation.y = side * .45; g.side = side; sets.mud.add(g); PRINTS.push(g); }   // turned-in feet: toes point to the midline

const SETS = Object.values(sets);
function only(name) { for (const s of SETS) s.visible = false; if (name) sets[name].visible = true; }

// ---------------------------------------------------------------- weather: rain, lightning, leaves
const RAINN = 1400, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAINN * 6);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xa8b8c0, transparent: true, opacity: .4, fog: false })); rain.frustumCulled = false; scene.add(rain);
const RR = (() => { const r = mulberry(21), a = []; for (let i = 0; i < RAINN; i++) a.push([r(), r(), r()]); return a; })();
function rainAt(t, on) {
  rain.visible = on; if (!on) return; const c = camera.position;
  for (let i = 0; i < RAINN; i++) { const [a, b, cc] = RR[i], x = c.x + (a - .5) * 18, z = c.z - 1 - b * 16, y = c.y - 6 + ((cc * 14 - t * 16) % 14 + 14) % 14;
    rainPos.set([x, y, z, x + .05, y + .45, z], i * 6); }
  rainGeo.attributes.position.needsUpdate = true;
}


// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  bullets0: wt('bullets'), caught: wt('caught'), meet: wt('meet'), mapinguari: wt('mapinguari'), amazon: wt('amazon'), brazil: wt('brazil'), huge: wt('huge'), smell: wt('smell'),
  bounce: wt('bounce'), eye: wt('eye'), mouth: wt('mouth'), feet: wt('feet'), back: wt('backwards'), mystery: wt('mystery'), giants: wt('giants'), ground: wt('ground'), mega: wt('megatherium'),
  six: wt('six'), tonnes: wt('tonnes'), mylodon: wt('mylodon'), plates: wt('plates'), armour: wt('armour'), vanished: wt('vanished'), twelve: wt('twelve'), hidden: wt('hidden'), next: wt('next'),
};
const S = { a: 0, b: wt('meet') - .3, c: wt('in') - .3, d: wt('bullets', 1) - .3, e: wt('some') - .3, f: wt('others') - .3, g: wt('now') - .3, h: wt('its', 3) - .3, i: wt('they') - .3 };
S.end = words[words.length - 1].t1 + 1.3;
window.DUR = S.end;
const BOLTS = [.9, T.mapinguari, T.bounce - .4, T.mystery, T.vanished];   // lightning on the monster beats
const HITS = [0, 1, 2].map(k => T.bounce - .13 + k * .22);                // bullets reach the skin

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.up.set(0, 1, 0); camera.position.copy(pos); camera.lookAt(look.x, look.y, look.z); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
function bolt(t) { let k = 0; for (const b of BOLTS) { const d = t - b; if (d >= 0 && d < .7) k = Math.max(k, Math.exp(-d * 7) * (d < .07 || d > .15 ? 1 : .25)); } return k; }
function gauge(x, y, w, label, frac, color, k) {
  const c = ov.x; c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(14,20,24,.85)'; c.beginPath(); c.roundRect(x, y, w, H * .045, 14); c.fill();
  c.fillStyle = color; c.beginPath(); c.roundRect(x + 6, y + 6, (w - 12) * frac * k, H * .045 - 12, 10); c.fill();
  c.font = "700 34px 'Fredoka'"; c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 6; c.textAlign = 'left'; c.strokeText(label, x + 18, y - 10); c.fillText(label, x + 18, y - 10); c.restore();
}
function vignette(k = .55) { const x = ov.x, g = x.createRadialGradient(W / 2, H * .45, H * .25, W / 2, H * .45, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
function label(text, x, y, color = '#fff', size = 40, align = 'center') { const c = ov.x; c.save(); c.font = `700 ${size}px 'Fredoka'`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = 'rgba(8,10,12,.95)'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y); c.restore(); }
// the giant's nose: the bone furthest forward (+x once turned by YAW); the eye sits just behind and above it
const nose = (() => { pose(sloth, 'Walk', 0); place(sloth, 0, 0, 0, YAW); sloth.holder.updateMatrixWorld(true);
  let best = null, bx = -1e9; const p = new THREE.Vector3(); sloth.root.traverse(o => { if (o.isBone) { o.getWorldPosition(p); if (p.x > bx) { bx = p.x; best = o; } } }); return best; })();
const headAt = () => { const p = new THREE.Vector3(); nose.getWorldPosition(p); return p.add(V(-.45, .2, 0)); };

// ---------------------------------------------------------------- 2D explainer panels (overlay)
function panel(x0, y0, w, h, a) { const x = ov.x; x.save(); x.globalAlpha = a; x.beginPath(); x.roundRect(x0, y0, w, h, 28); x.fillStyle = 'rgba(14,22,26,.92)'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#e9b949'; x.stroke(); x.clip(); return x; }
// South America: the Amazon river draws itself across Brazil, a pin drops on the rainforest
function amazonMap(t, a) {
  const px = W * .08, py = H * .16, pw = W * .84, ph = H * .42, x = panel(px, py, pw, ph, a);
  const P = ([u, v]) => [px + pw * (.08 + u * .84), py + ph * (.05 + v * .9)];
  const poly = (pts, fill) => { x.beginPath(); pts.forEach((q, i) => { const [X, Y] = P(q); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.fillStyle = fill; x.fill(); };
  poly([[.30, .02], [.45, 0], [.62, .08], [.80, .17], [.98, .30], [.92, .45], [.78, .55], [.70, .68], [.58, .80], [.48, .92], [.42, 1], [.38, .92], [.40, .75], [.36, .55], [.22, .42], [.12, .30], [.18, .15]], '#3a4636');
  const b = eo(seg(t, T.brazil - .2, T.brazil + .4));
  poly([[.45, .08], [.62, .08], [.80, .17], [.98, .30], [.92, .45], [.78, .55], [.66, .66], [.56, .62], [.50, .48], [.36, .40], [.34, .26], [.42, .18]], `rgba(76,128,66,${.35 + .65 * b})`);
  // rainforest canopy dots fill the basin
  const g = eo(seg(t, T.amazon - .1, T.amazon + .8)); x.fillStyle = '#2f6a34';
  for (let i = 0; i < 70; i++) { const u = .3 + ((i * .618) % 1) * .42, v = .12 + ((i * .414) % 1) * .3; if ((i / 70) < g) { const [X, Y] = P([u, v]); x.beginPath(); x.arc(X, Y, 9, 0, 6.3); x.fill(); } }
  // the river
  const r = eio(seg(t, T.amazon - .3, T.amazon + 1.0)), R = [[.22, .26], [.32, .22], [.42, .25], [.52, .2], [.62, .23], [.72, .18], [.82, .2]];
  x.strokeStyle = '#6fb4d8'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); const n = (R.length - 1) * r;
  for (let i = 0; i <= Math.floor(n); i++) { const [X, Y] = P(R[i]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
  if (n % 1 && Math.floor(n) + 1 < R.length) { const A = R[Math.floor(n)], B = R[Math.floor(n) + 1], f = n % 1; const [X, Y] = P([lerp(A[0], B[0], f), lerp(A[1], B[1], f)]); x.lineTo(X, Y); }
  x.stroke(); x.restore();
  const pin = eo(seg(t, T.brazil, T.brazil + .4)); if (pin > 0) { const [X, Y] = P([.5, .3]); O.ring(ov, X, Y, W * .05 * (1 + .3 * Math.sin(t * 6)), pin, '#ff6b5b'); label('BRAZIL', X, Y + H * .055, '#ffffff', 40); }
  if (r > .3) { const [X, Y] = P([.62, .15]); ov.x.save(); ov.x.globalAlpha = a * clamp((r - .3) * 3); label('AMAZON', X, Y, '#9fd4f0', 34); ov.x.restore(); }
}
// 4 tonnes: three cars drop onto a scale, the needle swings
function carIcon(cx, cy, s, a) { const x = ov.x; x.save(); x.globalAlpha = a; x.fillStyle = '#cfd8dc'; x.beginPath(); x.roundRect(cx - s, cy - s * .35, s * 2, s * .5, s * .12); x.fill();
  x.beginPath(); x.roundRect(cx - s * .55, cy - s * .7, s * 1.1, s * .45, s * .15); x.fill(); x.fillStyle = '#20282c'; for (const d of [-.6, .6]) { x.beginPath(); x.arc(cx + d * s, cy + s * .17, s * .22, 0, 6.3); x.fill(); } x.restore(); }
function tonnes(t, a) {
  const px = W * .08, py = H * .2, pw = W * .84, ph = H * .3, x = panel(px, py, pw, ph, a); x.restore();
  for (let i = 0; i < 3; i++) { const d = eo(seg(t, T.tonnes + i * .25, T.tonnes + .35 + i * .25)); if (d > 0) carIcon(px + pw * (.22 + i * .28), py + ph * (.12 + .38 * d), W * .1, d); }
  const k = eo(seg(t, T.tonnes, T.tonnes + 1.0)), cx = W / 2, cy = py + ph * .97, x2 = ov.x;
  x2.save(); x2.globalAlpha = a; x2.fillStyle = '#e9b949'; x2.fillRect(px + pw * .1, py + ph * .62, pw * .8, 10);
  x2.restore();
  label('4 TONNES ≈ 3 CARS', cx, py + ph * .72, '#ffffff', 36);
}
// chain mail: interlocking steel rings link up row by row
function mail(t, a) {
  const px = W * .12, py = H * .14, pw = W * .76, ph = H * .17, x = panel(px, py, pw, ph, a);
  const k = seg(t, T.armour - .1, T.armour + .9), rr = W * .03;
  x.lineWidth = 6; x.strokeStyle = '#c2ccd4';
  for (let j = 0; j < 4; j++) for (let i = 0; i < 13; i++) { if ((j * 13 + i) / 52 > k) continue; x.beginPath(); x.arc(px + rr * 1.6 + i * rr * 1.35 + (j % 2) * rr * .68, py + rr * 1.5 + j * rr * 1.15, rr * .62, 0, 6.3); x.stroke(); }
  x.restore(); label('LIKE CHAIN MAIL', W / 2, py + ph + H * .03, '#c2ccd4', 38);
}
// the clock: 12,000 years ago -> now, the giants' bar runs out
function clock(t, a) {
  const px = W * .08, py = H * .18, pw = W * .84, ph = H * .2, x = panel(px, py, pw, ph, a); x.restore();
  const k = eio(seg(t, T.vanished - .1, T.twelve + 1.2)), yrs = Math.round(12000 * k / 100) * 100;
  label(`${yrs.toLocaleString('en-US')} YEARS AGO`, W / 2, py + ph * .3, '#f5c23a', 54);
  const bx = px + pw * .08, bw = pw * .84, by = py + ph * .62, c = ov.x; c.save(); c.globalAlpha = a;
  c.fillStyle = '#2c3a3e'; c.fillRect(bx, by, bw, 14); c.fillStyle = '#d0624a'; c.fillRect(bx, by, bw * (1 - k), 14); c.restore();
  label('GIANT SLOTHS', bx, by + H * .035, '#d0624a', 28, 'left'); label('NOW', bx + bw, by + H * .035, '#cfe3ff', 28, 'right');
}
function stink(t, a) {   // green fumes rising off the beast
  const c = ov.x, h = toScreen(V(0, 2.6, 0)); c.save(); c.lineWidth = 9; c.lineCap = 'round'; c.strokeStyle = `rgba(150,220,90,${.85 * a})`;
  for (let k = 0; k < 5; k++) { const bx = h[0] + (k - 2) * W * .09, u0 = (t * 1.2 + k * .37) % 1; c.beginPath();
    for (let j = 0; j <= 16; j++) { const u = j / 16, X = bx + Math.sin(u * 7 + t * 3 + k) * W * .018, Y = h[1] - (u * .15 + u0 * .03) * H; j ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke(); }
  c.restore();
}

window.render = (t) => {
  texts.length = 0; O.clear(ov); only(null);
  const jungle = on => { world.visible = on; sloth.holder.visible = on; ground.visible = on; };
  jungle(true);
  world.position.x = 8 - WALK_V * t;   // the walk clip treads in place; the jungle slides by at the foot's speed
  sky(STORM, 6, 48); hemi.color.set(0x9fb3b0); hemi.intensity = 1.5; sun.color.set(0xb8c8d8); sun.intensity = 1.3; sun.position.set(-8, 14, 10); sun.target.position.set(0, 0, 0);
  pose(sloth, 'Walk', t); place(sloth, 0, 0, 0, YAW);
  tintActor(sloth, 0x40603a, 0);
  let after = null, wet = true;

  if (t < S.b) {            // hook: a shape in the storm that nothing can stop
    const k = eio(seg(t, 0, S.b)); cam(V(lerp(14, 10, k), lerp(1.2, 1.6, k), lerp(6, 9, k)), V(0, 1.1, 0), 46);
    after = () => { showChip('BULLETPROOF · NEVER CAUGHT', .3, S.b, t); };
  } else if (t < S.c) {     // the name
    const k = eio(seg(t, S.b, S.c)); cam(V(lerp(8, 6.5, k), 1.5, lerp(8, 7, k)), V(.8, 1.3, 0), 46);
    after = () => { showChip('MEET THE MAPINGUARI', T.meet - .2, S.c, t); };
  } else if (t < T.huge - .15) {   // AMAZON / BRAZIL: the map
    jungle(false); wet = false; sky(0x0e1416, 4, 20); cam(V(0, 2, 8), V(0, 1, 0), 46);
    after = () => { showChip('STORIES FROM THE AMAZON', S.c + .1, T.huge - .15, t, .1); amazonMap(t, eo(seg(t, S.c, S.c + .35))); };
  } else if (t < S.d) {     // huge, hairy, and a smell you meet first
    const k = eio(seg(t, T.huge - .15, S.d)); cam(V(lerp(5, 7, k), lerp(.9, 1.3, k), lerp(9, 8, k)), V(.5, 1.6, 0), 50);
    if (t > T.smell) { const g = eo(seg(t, T.smell, T.smell + .6)); bg.lerp(new THREE.Color(0x3c5a2a), .5 * g); fog.color.copy(bg); fog.near = lerp(6, 3, g); }
    after = () => { showChip('HUGE · HAIRY', T.huge - .05, T.smell - .1, t); showChip('A STINK YOU MEET FIRST', T.smell - .05, S.d, t); if (t > T.smell) stink(t, eo(seg(t, T.smell, T.smell + .5))); };
  } else if (t < S.e) {     // BULLETS: three shots spark off its hide
    cam(V(2, 1.4, 9.5), V(.4, 1.3, 0), 46);
    const shake = HITS.reduce((s, h) => { const d = t - h; return s + (d > 0 && d < .2 ? Math.sin(d * 90) * .04 * (1 - d / .2) : 0); }, 0); camera.position.x += shake;
    camera.updateMatrixWorld();
    after = () => { showChip('BULLETS BOUNCE OFF', T.bounce - .4, S.e, t);
      for (let k = 0; k < 3; k++) { const hit = toScreen(V(.3 + k * .5, 1.4 + k * .2, 1.1)), a = t - (HITS[k] - .2); if (a < 0 || a > 1.1) continue;
        const x0 = -W * .05, y0 = H * (.3 + k * .05), px = a < .2 ? lerp(x0, hit[0], a / .2) : hit[0] - (a - .2) * W * .35, py = a < .2 ? lerp(y0, hit[1], a / .2) : hit[1] - (a - .2) * H * .12 + (a - .2) ** 2 * H * .4;
        const c = ov.x; c.save(); c.strokeStyle = 'rgba(255,230,150,.7)'; c.lineWidth = 4; if (a < .2) { c.beginPath(); c.moveTo(lerp(x0, px, .4), lerp(y0, py, .4)); c.lineTo(px, py); c.stroke(); }
        c.fillStyle = '#ffd34a'; c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; c.beginPath(); c.arc(px, py, 11, 0, 6.3); c.fill(); c.stroke(); c.restore();
        if (a > .2 && a < .5) { O.ring(ov, hit[0], hit[1], W * .07 * (a - .2) / .3, 1, '#ffffff'); label('PING!', hit[0] + W * .08, hit[1] - H * .05, '#f5c23a', 44); } } };
  } else if (t < T.mouth - .1) {   // ONE BIG EYE: it opens on the giant's face
    cam(V(7, 1.9, 5.5), V(2, 1.6, 0), 44);
    after = () => { showChip('SOME SAY: ONE BIG EYE', T.eye - .8, T.mouth, t);
      const e = eo(seg(t, T.eye - .3, T.eye + .2)), h = toScreen(headAt()), r = W * .065 * e, blink = Math.abs(Math.sin((t - T.eye) * 1.6)) > .05 ? 1 : .1, c = ov.x;
      if (e > 0) { c.save(); c.fillStyle = '#f7f0d0'; c.beginPath(); c.ellipse(h[0], h[1], r, r * blink, 0, 0, 6.3); c.fill(); c.fillStyle = '#d63a1e'; c.beginPath(); c.ellipse(h[0] + r * .15, h[1], r * .5, r * .5 * blink, 0, 0, 6.3); c.fill();
        c.fillStyle = '#111'; c.beginPath(); c.ellipse(h[0] + r * .2, h[1], r * .2, r * .2 * blink, 0, 0, 6.3); c.fill(); c.restore(); O.ring(ov, h[0], h[1], r * 1.6, e, '#ff6b5b'); } };
  } else if (t < S.f) {     // A MOUTH DOWN TO ITS BELLY: it splits open and gapes
    cam(V(4, 1.1, 8), V(.5, 1.1, 0), 46);
    after = () => { showChip('A MOUTH ON ITS BELLY', T.mouth - .05, S.f, t);
      const b = toScreen(V(.3, 1.0, 1.0)), o = eo(seg(t, T.mouth, T.mouth + .4)) * (.75 + .25 * Math.sin(t * 7)), c = ov.x, w = W * .14;
      if (o > 0) { c.save(); c.fillStyle = '#2a0808'; c.beginPath(); c.ellipse(b[0], b[1], w, H * .03 * o, 0, 0, 6.3); c.fill(); c.fillStyle = '#f4ecd8';
        for (let i = 0; i < 7; i++) { const tx = b[0] - w * .8 + i * w * .27; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(tx - 9, b[1] + s * H * .03 * o); c.lineTo(tx + 9, b[1] + s * H * .03 * o); c.lineTo(tx, b[1] + s * H * .012 * o); c.fill(); } } c.restore(); }
      O.arrow(ov, b[0] + W * .1, b[1] - H * .2, b[0] + W * .02, b[1] - H * .05, seg(t, T.mouth, T.mouth + .5), '#ff6b5b', 10); };
  } else if (t < S.g) {     // FEET POINT BACKWARDS: top-down mud, the prints seem to walk the other way
    jungle(false); ground.visible = true; sets.mud.visible = true; sky(0x2a3328, 6, 40); wet = false;
    const sx = lerp(-3, 9, seg(t, S.f, S.g)); sloth.holder.visible = true; pose(sloth, 'Walk', (sx + 3) / G.speed); place(sloth, sx, 0, 0, YAW);   // clip time follows the distance walked: feet stay planted
    for (const p of PRINTS) { p.visible = p.position.x < sx - 2.2; p.rotation.y = p.side * .45 + Math.PI; p.edge.visible = false; }   // claws drawn at the heel: backwards prints
    const cx = sx - 1.8; camera.up.set(1, 0, 0); camera.position.set(cx, 12, 0); camera.lookAt(cx, 0, 0); camera.fov = 50; camera.updateProjectionMatrix();
    after = () => { showChip('OTHERS SAY: FEET POINT BACKWARDS', T.feet - .5, S.g, t);
      if (t > T.back - .2) { O.arrow(ov, W * .78, H * .3, W * .78, H * .52, seg(t, T.back - .2, T.back + .3), '#ff6b5b', 12); label('TRACKS LEAD BACK', W * .62, H * .27, '#ff6b5b', 36); } };
  } else if (t < T.mega - .15) {   // the real mystery: giants really lived here
    const k = eio(seg(t, S.g, T.mega)); cam(V(lerp(-6, -9, k), 1.4, lerp(7, 9, k)), V(0, 1.4, 0), 46);
    after = () => { showChip('THE REAL MYSTERY', T.mystery - .1, T.ground - .1, t); showChip('GIANT GROUND SLOTHS', T.ground - .05, T.mega, t); };
  } else if (t < S.h) {     // MEGATHERIUM: 6 m next to a person, then 4 tonnes as cars
    sets.man.visible = true; sets.man.position.set(3.9, 0, .9); sets.man.rotation.y = -.5; const sw = Math.sin(t * 5.2) * .25; sets.man.legs[0].rotation.x = sw; sets.man.legs[1].rotation.x = -sw;
    const k = eio(seg(t, T.mega - .15, T.mega + .9)); cam(V(lerp(9, 1.2, k), lerp(1.7, 2.2, k), lerp(10, 16, k)), V(.4, 1.0, 0), 50);
    after = () => { showChip('MEGATHERIUM', T.mega - .1, T.six - .1, t); showChip('6 M LONG', T.six - .1, T.tonnes - .2, t);
      const p = eo(seg(t, T.six - .1, T.six + .5)) * (1 - eo(seg(t, T.tonnes - .3, T.tonnes))), a = toScreen(V(-3, 0, 0)), b = toScreen(V(3, 0, 0)), y = H * .3;
      if (p > 0) { O.arrow(ov, (a[0] + b[0]) / 2, y, a[0], y, p, '#f5c23a', 10); O.arrow(ov, (a[0] + b[0]) / 2, y, b[0], y, p, '#f5c23a', 10); }
      if (t > T.six && t < T.tonnes - .2) { const m = toScreen(V(3.9, 1.95, .9)); label('YOU · 1.75 M', Math.min(m[0], W * .8), m[1] - H * .03, '#cfe3ff', 34); }
      if (t > T.tonnes - .3) tonnes(t, eo(seg(t, T.tonnes - .3, T.tonnes))); };
  } else if (t < S.i) {     // MYLODON: bony pebbles rise into its skin, a bite clangs off, then they turn to steel: like armour
    jungle(false); sets.skin.visible = true; wet = false; sky(0x1c2224, 4, 20); hemi.intensity = 1.3; sun.intensity = 2.0; sun.position.set(4, 8, 6);
    const u = t - S.h, ang = .5 + u * .18; cam(V(Math.sin(ang) * 4.2, 2.0, Math.cos(ang) * 4.2), V(0, .2, 0), 44);
    const steel = new THREE.Color(0x9aa6b0), bone = new THREE.Color(0xeee2c4);
    for (const b of sets.skin.bones) { const k = eo(seg(t, T.plates - .3 + b.userData.d, T.plates + .2 + b.userData.d)); b.position.set(b.userData.x, lerp(-.6, .24, k), b.userData.z); b.visible = k > 0;
      const m = clamp((t - T.armour - b.userData.x * .15 - .1) * 3); b.material.color.copy(bone).lerp(steel, m); b.material.metalness = .8 * m; b.material.roughness = lerp(.45, .25, m); }
    const hit = T.plates + .7, td = t - hit, ty = td < 0 ? lerp(2.4, .95, ei(seg(t, hit - .45, hit))) : .95 + Math.sin(Math.min(td, .5) / .5 * Math.PI / 2) * 1.2;
    sets.skin.tooth.position.set(.2, ty, .2); sets.skin.gum.position.set(.2, ty + .55, .2); sets.skin.tooth.visible = sets.skin.gum.visible = td < .6;
    sets.skin.position.set(td > 0 && td < .25 ? Math.sin(td * 90) * .03 * (1 - td / .25) : 0, 0, 0);
    after = () => { showChip('ITS COUSIN MYLODON', T.mylodon - .2, T.plates - .1, t); showChip('BONY PLATES IN ITS SKIN', T.plates - .1, S.i, t, .32);
      if (td > 0 && td < .35) { ov.x.save(); ov.x.globalAlpha = 1 - td / .35; const s = toScreen(V(.2, .85, .2)); label('CLANG!', s[0], H * .25, '#f5c23a', 64); ov.x.restore(); }
      if (t < S.h + 1.3) tonnes(t, 1 - eo(seg(t, S.h + .9, S.h + 1.3)));
      if (t > T.armour - .1) mail(t, eo(seg(t, T.armour - .1, T.armour + .3))); };
  } else if (t < T.hidden - .3) {   // VANISHED 12,000 YEARS AGO: the clock runs, the giant fades into the fog
    const g = eio(seg(t, S.i, T.hidden - .3)); tintActor(sloth, 0x10140f, .6 * g); sky(0x1e2826, lerp(6, 2, g), lerp(48, 20, g));
    cam(V(-9, 1.4, 6), V(0, 1.2, 0), 46);
    after = () => { clock(t, eo(seg(t, S.i, S.i + .35))); };
  } else {                  // COULD ONE HAVE HIDDEN? it turns jungle-green and melts into the trees
    const g = eio(seg(t, T.hidden - .3, T.hidden + .9)); tintActor(sloth, 0x4a7a3e, .5 * g); sky(0x2a3634, 4, 32); hemi.intensity = 1.1;
    cam(V(lerp(-9, -13, g), lerp(1.4, 1.9, g), lerp(6, 8, g)), V(lerp(0, 2, g), 1.2, 0), 46);
    after = () => { showChip('COULD ONE HAVE HIDDEN?', T.hidden - .3, T.next - .3, t); showChip('FIND OUT NEXT', T.next - .3, S.end, t); };
  }
  const b = bolt(t); if (b > 0) { hemi.intensity += 3.2 * b; bg.lerp(new THREE.Color(0xc8d4e8), .75 * b); fog.color.copy(bg); }
  ground.position.set(camera.position.x, 0, camera.position.z);
  rainAt(t, wet);
  renderer.render(scene, camera);
  vignette(.6);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'rain' }, { t: T.mapinguari, type: 'swell' }, { t: T.amazon, type: 'pop' }, { t: T.brazil, type: 'blip' }, { t: T.smell, type: 'buzz' },
  ...HITS.map(h => ({ t: h, type: 'clang' })), { t: T.eye, type: 'blip' }, { t: T.mouth, type: 'buzz' }, { t: T.back, type: 'thud' }, { t: T.mega, type: 'swell' },
  { t: T.tonnes, type: 'thud' }, { t: T.tonnes + .25, type: 'thud' }, { t: T.tonnes + .5, type: 'thud' }, { t: T.plates + .7, type: 'clang' }, { t: T.armour, type: 'pop' }, { t: T.vanished, type: 'tick' }, { t: T.hidden, type: 'swell' }];
for (const b of BOLTS) EV.push({ t: b, type: 'thunder' });
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;

