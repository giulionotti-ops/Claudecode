// How do you hide a 4-tonne monster in the Amazon? picture = render(t)
// Grim storm jungle: a walking low-poly giant sloth (rkuhlf, CC BY) on a rain-soaked set of Kenney CC0 props.
// Every named thing gets its own moving explainer: Megatherium vs a person, a living sloth on a branch,
// a Mylodon skin cutaway, algae in fur, footprints in mud, and an island-sloths map. Mixers are driven from the frame time only.
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
const little = makeActor(gSloth, .6, { hideRe: /icosphere|object_273|ground/i, tint: 0xe0d0b8 });   // a living sloth: ~60 cm
const LG = gait(little);

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
// 2. a branch for the living sloth
sets.branch = new THREE.Group(); scene.add(sets.branch);
{ const b = mk(new THREE.CylinderGeometry(.045, .06, 8, 10), 0x4a3a2c); b.rotation.z = Math.PI / 2; b.position.y = 2; b.castShadow = true; sets.branch.add(b);
  for (const [x, z, s] of [[-2.4, -.3, .9], [2.1, -.4, 1.0], [3.2, .2, .8], [-3.4, .1, .8]]) prop('plant_bushDetailed', x, 1.6, z, s, x, 0x4a6a48, sets.branch);
  const flip = new THREE.Group(); flip.rotation.x = Math.PI; flip.position.y = 2 - .04; sets.branch.add(flip); flip.add(little.holder); }   // hangs upside down under the branch
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
// 4. macro of fur strands turning green with algae
sets.fur = new THREE.Group(); scene.add(sets.fur);
const FURN = 900, furMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .02, 1, 5).translate(0, .5, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), FURN);
sets.fur.add(furMesh); const FUR = (() => { const r = mulberry(8), a = []; for (let i = 0; i < FURN; i++) a.push([(r() - .5) * 3.2, (r() - .5) * 2.6, .6 + r() * .6, r() * 6.28, r()]); return a; })();
{ const bed = mk(new THREE.PlaneGeometry(4, 4), 0x2e2218); bed.rotation.x = -Math.PI / 2; sets.fur.add(bed); }
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
const LEAFN = 40, leaves = []; for (let i = 0; i < LEAFN; i++) { const l = mk(new THREE.PlaneGeometry(.22, .12), 0x4f6a2e, { side: THREE.DoubleSide }); l.visible = false; scene.add(l); leaves.push(l); }
function leafFall(t, t0, on) { for (let i = 0; i < LEAFN; i++) { const l = leaves[i]; l.visible = on; if (!on) continue; const r = (i * 0.6180339) % 1, s = (i * 0.414) % 1, u = t - t0 + r * 3;
  l.position.set(-1.5 + s * 5 + Math.sin(u * 2 + i) * .3, 4.5 - ((u * 1.1) % 4.5), -.6 + r * 1.8); l.rotation.set(u * 3 + i, u * 2, u + i); } }

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  six: wt('six'), mega: wt('megatherium'), leaves: wt('leaves'), poor: wt('poor'), copy: wt('copy'), half: wt('half'), mammal: wt('mammal'), prey: wt('prey'), armour: wt('armour'), mylodon: wt('mylodon'), plates: wt('plates'),
  stand: wt('stand'), green: wt('green'), living2: wt('living', 1), algae: wt('algae'), hides: wt('hides'), tracks: wt('tracks'), mega2: wt('megatherium', 1), edges: wt('edges'), backwards: wt('backwards'),
  still: wt('still', 1), island: wt('island'), ago: wt('ago'), mapi: wt('mapinguari'), ran: wt('ran'), send: wt('send'), because: wt('because'),
};
const S = { a: 0, b: wt('problem') - .3, c: wt('but', 0) - .3, d: wt('but', 1) - .3, e: wt('but', 2) - .3, f: wt('but', 3) - .3, g: wt('so', 4) - .3 };
S.end = words[words.length - 1].t1 + .6;
window.DUR = S.end;
const BOLTS = [1.45, T.prey, T.backwards + .1, T.mapi, T.because + .3];   // lightning on the monster beats

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
// eyes in the bushes (easy prey)
const eyes = []; { const r = mulberry(17); for (let i = 0; i < 4; i++) { const g = new THREE.Group(); for (const dx of [-.09, .09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false })); e.position.x = dx; g.add(e); } g.position.set(-4 + i * 2.7 + r(), .7 + r() * .6, -2.6 - r() * 1.2); g.visible = false; scene.add(g); eyes.push(g); } }

// ---------------------------------------------------------------- island-sloths map (2D, drawn on the overlay)
function islandMap(t, a) {
  const x = ov.x, px = W * .06, py = H * .2, pw = W * .88, ph = H * .4;
  x.save(); x.globalAlpha = a; x.beginPath(); x.roundRect(px, py, pw, ph, 28); x.fillStyle = '#16262c'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#e9b949'; x.stroke(); x.clip();
  const land = '#3d4a36', blob = pts => { x.beginPath(); pts.forEach(([u, v], i) => { const X = px + u * pw, Y = py + v * ph; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.fill(); };
  x.fillStyle = land;
  blob([[.05, .55], [.3, .5], [.55, .55], [.75, .62], [.95, .7], [1, 1], [.0, 1]]);   // South America (north coast)
  blob([[.0, .08], [.18, .1], [.22, .2], [.1, .26], [0, .22]]);                        // Central America edge
  const isl = [[.32, .2, .13, .04], [.52, .24, .07, .035], [.66, .26, .05, .03], [.78, .33, .025, .025], [.84, .4, .02, .02], [.88, .47, .02, .02]];   // Cuba, Hispaniola, Puerto Rico, Lesser Antilles
  for (const [u, v, rw, rh] of isl) { x.beginPath(); x.ellipse(px + u * pw, py + v * ph, rw * pw, rh * ph, -.15, 0, 6.3); x.fill(); }
  // years counter: 12,000 -> 4,400 years ago
  const k = eio(seg(t, T.island - .1, T.ago + .2)), yrs = Math.round((12000 - 7600 * k) / 100) * 100;
  const main = 1 - seg(yrs, 11500, 10500), islands = yrs > 4400 ? 1 : Math.max(0, 1 - (t - T.ago - .2) / .6);
  const dot = (u, v, s) => { if (s <= 0) return; x.globalAlpha = a * s; x.beginPath(); x.arc(px + u * pw, py + v * ph, 13, 0, 6.3); x.fillStyle = '#c99a5a'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#2a1a10'; x.stroke(); x.globalAlpha = a; };
  for (const [u, v] of [[.2, .7], [.4, .78], [.6, .74], [.3, .9], [.75, .85], [.5, .92], [.12, .85]]) dot(u, v, main);
  for (const [u, v] of [[.28, .2], [.36, .19], [.5, .24], [.54, .23], [.66, .26]]) dot(u, v, islands);
  x.globalAlpha = a; x.font = "700 30px 'Fredoka'"; x.fillStyle = '#9fb0a8'; x.textAlign = 'left'; x.fillText('MAINLAND', px + pw * .06, py + ph * .64); x.fillText('CARIBBEAN ISLANDS', px + pw * .3, py + ph * .1);
  x.font = `${Math.round(W * .08)}px 'Lilita One'`; x.textAlign = 'center'; x.fillStyle = yrs <= 4400 ? '#ff6b5b' : '#fff'; x.lineWidth = 10; x.strokeStyle = '#0b1215';
  const s = yrs.toLocaleString('en-US') + ' YEARS AGO'; x.strokeText(s, px + pw / 2, py + ph * .46); x.fillText(s, px + pw / 2, py + ph * .46);
  x.restore();
  texts.push({ id: 'map', text: 'island map', x0: px, y0: py, x1: px + pw, y1: py + ph, pass: true });
}

// ---------------------------------------------------------------- the picture
window.render = (t) => {
  texts.length = 0; O.clear(ov); only(null);
  const jungle = on => { world.visible = on; sloth.holder.visible = on; ground.visible = on; };
  jungle(true); for (const e of eyes) e.visible = false;
  world.position.x = 8 - WALK_V * t;   // the walk clip treads in place; the jungle slides by at the foot's speed
  sky(STORM, 6, 48); hemi.color.set(0x9fb3b0); hemi.intensity = 1.5; sun.color.set(0xb8c8d8); sun.intensity = 1.3; sun.position.set(-8, 14, 10); sun.target.position.set(0, 0, 0);
  pose(sloth, 'Walk', t); place(sloth, 0, 0, 0, YAW);
  tintActor(sloth, 0x40603a, 0);
  let after = null, wet = true, leafOn = false, flash = 1;

  if (t < T.mega - .15) {   // hook: a shape in the storm
    const k = eio(seg(t, 0, T.mega)); cam(V(lerp(13, 9, k), lerp(1.3, 1.7, k), lerp(7, 10, k)), V(0, 1.1, 0), 46);
    after = () => { showChip('AMAZON · 4 TONNES', .2, T.six - .4, t); };
  } else if (t < S.b) {     // MEGATHERIUM: 6 m long, next to a person
    sets.man.visible = true; sets.man.position.set(3.9, 0, .9); sets.man.rotation.y = -.5; const sw = Math.sin(t * 5.2) * .25; sets.man.legs[0].rotation.x = sw; sets.man.legs[1].rotation.x = -sw;
    const k = eio(seg(t, T.mega - .15, T.mega + .9)); cam(V(lerp(9, 1.2, k), lerp(1.7, 2.2, k), lerp(10, 16, k)), V(.4, 1.0, 0), 50);
    after = () => { showChip('MEGATHERIUM · 6 M LONG', T.mega - .1, S.b, t);
      const p = eo(seg(t, T.mega + .5, T.mega + 1.1)), a = toScreen(V(-3, 0, 0)), b = toScreen(V(3, 0, 0)), y = H * .3;
      O.arrow(ov, (a[0] + b[0]) / 2, y, a[0], y, p, '#f5c23a', 10); O.arrow(ov, (a[0] + b[0]) / 2, y, b[0], y, p, '#f5c23a', 10);
      if (p > .5) { const m = toScreen(V(3.9, 1.95, .9)); label('YOU · 1.75 M', Math.min(m[0], W * .8), m[1] - H * .03, '#cfe3ff', 34); } };
  } else if (t < S.c) {     // food: it browses through falling leaves
    leafOn = true; cam(V(7, 2.0, 9), V(0, 1.2, 0), 48);
    after = () => { showChip('PROBLEM 1: FOOD', S.b + .3, T.leaves - .1, t); showChip('FIX: EAT LEAVES', T.leaves - .1, S.c, t); if (t > T.leaves + .1) O.mark(ov, W * .5, H * .4, true, seg(t, T.leaves + .1, T.leaves + .5)); };
  } else if (t < T.copy - .2) {   // poor fuel: a leaf is a weak battery
    cam(V(9, 1.7, 7), V(0, 1.2, 0), 46);
    after = () => { showChip('PROBLEM 2: POOR FUEL', S.c + .3, S.d, t); const k = eo(seg(t, T.poor, T.poor + .5));
      if (k > 0) gauge(W * .12, H * .33, W * .76, 'ENERGY IN LEAVES', .18, '#d0624a', k); };
  } else if (t < S.d) {     // LIVING SLOTHS: one creeps upside down along a branch, on half the energy
    jungle(false); world.visible = true; sets.branch.visible = true; wet = false;
    sky(0x3c4c48, 3, 30); hemi.intensity = 1.8;
    const u = t - T.copy; pose(little, 'Walk', u * .45); place(little, -.5 + LG.speed * .45 * u, 0, 0, LG.yaw);
    cam(V(.7 + .1 * u, 1.75, 1.6), V(-.2 + .1 * u, 1.85, 0), 42);
    after = () => { showChip('LIVING SLOTHS · ULTRA SLOW', T.copy - .1, T.half - .5, t); showChip('FIX: HALF THE ENERGY', T.half - .5, S.d, t);
      const k = eo(seg(t, T.half - .4, T.half + .4)); if (k > 0) { gauge(W * .12, H * .3, W * .76, 'NORMAL MAMMAL', 1, '#e9b949', k); gauge(W * .12, H * .41, W * .76, 'LIVING SLOTH', .5, '#6fcf5a', k); }
      if (t > T.mammal) O.mark(ov, W * .5, H * .54, true, seg(t, T.mammal, T.mammal + .4)); };
  } else if (t < T.mylodon - .25) {   // easy prey: eyes in the dark
    cam(V(5, 1.4, 11), V(0, 1.1, -.5), 50);
    for (let i = 0; i < eyes.length; i++) eyes[i].visible = t > T.prey - .4 + i * .15 && Math.sin(t * 3 + i * 2) > -.85;
    after = () => { showChip('PROBLEM 3: EASY PREY', S.d + .3, T.armour - .1, t); showChip('FIX: ARMOUR', T.armour - .05, S.e, t); };
  } else if (t < S.e) {     // MYLODON: bony plates inside the skin, a bite bounces off
    jungle(false); sets.skin.visible = true; wet = false; sky(0x1c2224, 4, 20); hemi.intensity = 1.3; sun.intensity = 2.0; sun.position.set(4, 8, 6);
    const u = t - (T.mylodon - .25), ang = .5 + u * .18; cam(V(Math.sin(ang) * 4.2, 2.0, Math.cos(ang) * 4.2), V(0, .2, 0), 44);
    for (const b of sets.skin.bones) { const k = eo(seg(t, T.mylodon + b.userData.d, T.mylodon + .5 + b.userData.d)); b.position.set(b.userData.x, lerp(-.6, .24, k), b.userData.z); b.visible = k > 0; }
    const hit = T.plates + .25, td = t - hit, ty = td < 0 ? lerp(2.4, .95, ei(seg(t, hit - .45, hit))) : .95 + Math.sin(Math.min(td, .5) / .5 * Math.PI / 2) * 1.2;
    sets.skin.tooth.position.set(.2, ty, .2); sets.skin.gum.position.set(.2, ty + .55, .2);
    const shake = td > 0 && td < .25 ? Math.sin(td * 90) * .03 * (1 - td / .25) : 0; sets.skin.position.set(shake, 0, 0);
    after = () => { showChip('MYLODON · BONY PLATES IN ITS SKIN', T.mylodon - .2, S.e, t);
      if (td > 0 && td < .35) { ov.x.save(); ov.x.globalAlpha = 1 - td / .35; const s = toScreen(V(.2, .85, .2)); label('CLANG!', s[0], s[1] - H * .08, '#f5c23a', 64); ov.x.restore(); }
      const s = toScreen(V(1.32, .3, .8)); if (t > T.mylodon + .8) label('BONE', s[0] + W * .1, s[1], '#eee2c4', 36); };
  } else if (t < T.living2 - .15) {   // stands out: brown in a green jungle
    cam(V(7, 1.6, 9), V(0, 1.1, 0), 46);
    after = () => { showChip('PROBLEM 4: STANDS OUT', S.e + .1, T.green - .1, t); showChip('FIX: GO GREEN', T.green - .05, S.f, t); };
  } else if (t < T.hides) {   // ALGAE: fur strands go green
    jungle(false); sets.fur.visible = true; wet = false; sky(0x1e2a24, 2, 12); hemi.intensity = 1.2; sun.intensity = 1.6; sun.position.set(2, 6, 4);
    const u = t - (T.living2 - .15), front = lerp(-2.2, 2.2, eio(seg(t, T.algae - .2, T.hides - .1))), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), br = new THREE.Color(0x6a4a32), gr = new THREE.Color(0x4e8a3a);
    for (let i = 0; i < FURN; i++) { const [x, z, h, ph, r] = FUR[i]; e.set(.35 + Math.sin(t * 1.6 + ph) * .12, ph * .2, Math.sin(t * 1.3 + ph) * .1); q.setFromEuler(e);
      m.compose(V(x, 0, z), q, V(1, h, 1)); furMesh.setMatrixAt(i, m); furMesh.setColorAt(i, c.copy(br).lerp(gr, clamp((front - x) * 1.5 + r * .3))); }
    furMesh.instanceMatrix.needsUpdate = true; furMesh.instanceColor.needsUpdate = true;
    cam(V(-1.2 + u * .25, 1.1, 2.4), V(0, .4, 0), 46);
    after = () => { showChip('LIVING SLOTHS · ALGAE IN THE FUR', T.living2 - .1, T.hides, t); };
  } else if (t < S.f) {     // ...and it hides them: the giant turns green and melts into the trees
    const g = eio(seg(t, T.hides - .1, T.hides + .7)); tintActor(sloth, 0x5a8a4a, .55 * g);
    cam(V(lerp(7, 9, g), 1.6, lerp(9, 12, g)), V(0, 1.1, 0), 46);
    after = () => { showChip('HIDDEN', T.hides, S.f, t); };
  } else if (t < S.g) {     // TRACKS: top-down mud, turned-in prints, then the "backwards feet" trick
    jungle(false); ground.visible = true; sets.mud.visible = true; sky(0x2a3328, 6, 40);
    tintActor(sloth, 0x5a8a4a, .55);
    wet = false; const sx = lerp(-3, 9, seg(t, S.f, S.g)); sloth.holder.visible = true; pose(sloth, 'Walk', (sx + 3) / G.speed); place(sloth, sx, 0, 0, YAW);   // clip time follows the distance walked: feet stay planted
    for (const p of PRINTS) { p.visible = p.position.x < sx - 2.2; p.edge.material.opacity = eo(seg(t, T.edges - .1, T.edges + .5)); }
    const cx = 1.5; camera.up.set(1, 0, 0); camera.position.set(cx, 9, 0); camera.lookAt(cx, 0, 0); camera.fov = 50; camera.updateProjectionMatrix();
    after = () => { showChip('PROBLEM 5: TRACKS', S.f + .3, T.mega2 - .1, t); showChip('MEGATHERIUM: FEET TURNED IN', T.mega2 - .05, T.edges - .1, t); showChip('WALKS ON THE OUTER EDGES', T.edges - .05, T.backwards - .2, t); showChip('BACKWARDS FEET?', T.backwards - .15, S.g, t);
      if (t > T.edges) { const hero = PRINTS[6], s = toScreen(hero.position), up = t < T.backwards - .2;   // arrows stay in the upper half, clear of the captions
        if (up) O.arrow(ov, s[0] + W * .1, s[1], s[0] + W * .1, s[1] - H * .14, seg(t, T.edges, T.edges + .5), '#f5c23a', 12);
        else O.arrow(ov, s[0] + W * .1, s[1] - H * .14, s[0] + W * .1, s[1], seg(t, T.backwards, T.backwards + .5), '#ff6b5b', 12);
        label(up ? 'REAL WAY' : 'LOOKS THIS WAY', s[0] + W * .1, s[1] - H * .17, up ? '#f5c23a' : '#ff6b5b', 36); } };
  } else if (t < T.island - .15) {   // is one still out there? it walks off into the fog
    sky(0x2a3634, 4, 32); cam(V(-10, 1.5, 6), V(0, 1.2, 0), 46);
    after = () => { showChip('STILL OUT THERE?', T.still - .2, T.island, t); };
  } else if (t < T.mapi - .2) {   // ISLAND SLOTHS: the map and the clock running out
    jungle(false); wet = false; sky(0x0e1416, 4, 20); cam(V(0, 2, 8), V(0, 1, 0), 46);
    after = () => { showChip('ISLAND SLOTHS', T.island - .1, T.mapi - .2, t, .13); islandMap(t, eo(seg(t, T.island - .15, T.island + .25))); };
  } else {                  // the Mapinguari: a giant that ran out of time, gone into the storm
    sky(0x1e2826, 3, 26); hemi.intensity = .8; const k = eio(seg(t, T.mapi - .2, S.end));
    tintActor(sloth, 0x10140f, .6 * k);
    cam(V(lerp(-9, -14, k), lerp(1.4, 1.9, k), lerp(6, 8, k)), V(lerp(0, 2, k), 1.2, 0), 46);
    after = () => { showChip('THE MAPINGUARI', T.mapi - .1, T.ran - .2, t); showChip('A GIANT THAT RAN OUT OF TIME', T.ran - .2, T.send - .1, t); showChip('SEND THIS TO A FRIEND', T.send - .05, S.end, t); };
  }
  const b = bolt(t) * flash; if (b > 0) { hemi.intensity += 3.2 * b; bg.lerp(new THREE.Color(0xc8d4e8), .75 * b); fog.color.copy(bg); }
  ground.position.set(camera.position.x, 0, camera.position.z);
  rainAt(t, wet); leafFall(t, S.b, leafOn);
  renderer.render(scene, camera);
  vignette(.6);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'rain' }, { t: T.mega, type: 'swell' }, { t: T.leaves, type: 'pop' }, { t: T.half, type: 'blip' }, { t: T.plates + .25, type: 'clang' }, { t: T.algae, type: 'pop' }, { t: T.edges, type: 'thud' }, { t: T.backwards, type: 'buzz' }, { t: T.island, type: 'tick' }, { t: T.ago + .2, type: 'thud' }, { t: T.ran, type: 'swell' }];
for (const b of BOLTS) EV.push({ t: b, type: 'thunder' });
for (const k of ['b', 'c', 'd', 'e', 'f', 'g']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
