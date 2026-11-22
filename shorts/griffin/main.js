// Could a GRIFFIN actually fly? picture = render(t)
// Golden-hour ridge: animated griffin (VitSh, CC BY), Quetzalcoatlus + Protoceratops (kenchoo, CC BY), an eagle (Asim3d, CC BY),
// Kenney CC0 rocks. Every named thing gets its own moving explainer: limb count, a scale, a 10 m wingspan, a keel cutaway,
// a four-limb launch, bird/pterosaur/bat arms, and Protoceratops in the Gobi. Mixers are driven from the frame time only.
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
const DUSK = 0xe8a46a;
const bg = new THREE.Color(DUSK), fog = new THREE.Fog(DUSK, 14, 120); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xffe2c0, 0x5a4636, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc88a, 2.4); sun.position.set(-10, 9, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x9fb8ff, 1.0); rim.position.set(8, 6, -12); scene.add(rim);

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const [gGrif, gQuetz, gProto, gEagle] = await Promise.all(['griffin', 'quetz', 'protoc', 'eagle'].map(load));
const PROPS = {};
await Promise.all(['rock_largeA', 'rock_largeC', 'rock_smallA', 'stone_largeB', 'tree_oak', 'plant_bush', 'plant_bushLarge', 'grass_large'].map(async n => { PROPS[n] = (await load(n)).scene; }));

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
function tinted(src, hex) {
  const root = SkeletonUtils.clone(src);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const key = m.uuid + hex; if (!tintCache.has(key)) { const c = m.clone(); c.color.multiply(new THREE.Color(hex)); c.roughness = .9; tintCache.set(key, c); } return tintCache.get(key); });
    if (o.material.length === 1) o.material = o.material[0]; } });
  return root;
}
const tintCache = new Map();
const world = new THREE.Group(); scene.add(world);
function prop(name, x, y, z, s, ry, hex = 0x55665a, parent = world) {
  const o = tinted(PROPS[name], hex); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
const mk = (geo, color, o = {}) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.up.set(0, 1, 0); camera.position.copy(pos); camera.lookAt(look.x, look.y, look.z); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
function gauge(x, y, w, label, frac, color, k) {
  const c = ov.x; c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(14,20,24,.85)'; c.beginPath(); c.roundRect(x, y, w, H * .045, 14); c.fill();
  c.fillStyle = color; c.beginPath(); c.roundRect(x + 6, y + 6, (w - 12) * frac * k, H * .045 - 12, 10); c.fill();
  c.font = "700 34px 'Fredoka'"; c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 6; c.textAlign = 'left'; c.strokeText(label, x + 18, y - 10); c.fillText(label, x + 18, y - 10); c.restore();
}
function vignette(k = .55) { const x = ov.x, g = x.createRadialGradient(W / 2, H * .45, H * .25, W / 2, H * .45, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
function label(text, x, y, color = '#fff', size = 40, align = 'center') { const c = ov.x; c.save(); c.font = `700 ${size}px 'Fredoka'`; c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = 'rgba(8,10,12,.95)'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y); c.restore(); }
// eyes in the bushes (easy prey)
const eyes = []; { const r = mulberry(17); for (let i = 0; i < 4; i++) { const g = new THREE.Group(); for (const dx of [-.09, .09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false })); e.position.x = dx; g.add(e); } g.position.set(-4 + i * 2.7 + r(), .7 + r() * .6, -2.6 - r() * 1.2); g.visible = false; scene.add(g); eyes.push(g); } }


// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  six: wt('six'), limbs: wt('limbs'), take: wt('take'), imagine: wt('imagine'), lion: wt("lion's"), eagle: wt("eagle's"), problem: wt('problem'), weight: wt('weight'),
  lion2: wt('lion'), ninety: wt('ninety'), birds: wt('birds'), eighteen: wt('eighteen'), copy: wt('copy'), quetz: wt('quetzalcoatlus'), ten: wt('ten'), two: wt('two'),
  engine: wt('engine'), keel: wt('keel'), grow: wt('grow'), launch: wt('launch'), quetz2: wt('quetzalcoatlus', 1), vaulted: wt('vaulted'), four: wt('four'), griffins: wt('griffins'), legs: wt('legs'),
  five: wt('five'), six2: wt('six', 2), bats: wt('bats'), arms: wt('arms'), none: wt('none'), pair: wt('pair'), mayor: wt('mayor'), gold: wt('gold'), proto: wt('protoceratops'),
  skeletons: wt('skeletons'), beak: wt('beak'), frill: wt('frill'), send: wt('send'), legends: wt('legends'), griffin3: wt('griffin', 2), limbs3: wt('limbs', 3),
};
const S = { a: 0, b: T.imagine - .15, c: T.problem - .2, d: T.copy - .3, e: wt('but', 0) - .3, f: wt('but', 1) - .3, g: wt('but', 2) - .3, h: wt('where') - .3, i: T.send - .3 };
S.end = words[words.length - 1].t1 + .6;
window.DUR = S.end;

// ---------------------------------------------------------------- actors
const GR = makeActor(gGrif, 3.0, { base: 'Action' });
const QZ = makeActor(gQuetz, 10, { base: 'Animation' });
const PT = makeActor(gProto, 2.6, { base: 'Animation' });
const EG = makeActor(gEagle, 1.9, { base: 'motion4' });
const QZ2 = makeActor(gQuetz, 10, { base: 'Animation' });
// the facing of each model (yaw that turns it to face +x) is set from a probe, see FACE
const FACE = { gr: Math.PI / 2, qz: 0, pt: 0, eg: 0 };

// ---------------------------------------------------------------- the set: rocky ridge at golden hour
const groundMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: .95 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
{
  const r = mulberry(4), rocks = ['rock_largeA', 'rock_largeC', 'stone_largeB', 'rock_smallA'];
  for (let i = 0; i < 46; i++) { const x = (r() - .5) * 90, z = -5 - r() * 40; prop(rocks[i % 4], x, 0, z, 3 + r() * 5, r() * 6.28, 0x9a7b5c); }
  for (let i = 0; i < 24; i++) prop(rocks[i % 4], (r() - .5) * 40, 0, -2 - r() * 7, 1 + r() * 1.8, r() * 6.28, 0xa88a68);
  for (let i = 0; i < 14; i++) prop('tree_oak', (r() - .5) * 70, 0, -8 - r() * 30, 3.6 + r() * 2, r() * 6.28, 0x7a8a3c);
  for (let i = 0; i < 26; i++) prop(i % 2 ? 'plant_bush' : 'grass_large', (r() - .5) * 44, 0, 1 - r() * 8, 1.6 + r() * .9, r() * 6.28, 0x9a9a4a);
}
const sets = {};
const SETS = () => Object.values(sets);
function only(name) { for (const s of SETS()) s.visible = false; if (name) sets[name].visible = true; }

// 1. balance scale: a lion block against a bird
sets.scale = new THREE.Group(); scene.add(sets.scale);
{
  const post = mk(new THREE.CylinderGeometry(.14, .22, 2.4, 14), 0x3a3028); post.position.y = 1.2; post.castShadow = true; sets.scale.add(post);
  const foot = mk(new THREE.CylinderGeometry(.9, 1.05, .16, 24), 0x3a3028); foot.position.y = .08; sets.scale.add(foot);
  sets.scale.beam = new THREE.Group(); sets.scale.beam.position.y = 2.4; sets.scale.add(sets.scale.beam);
  const bm = mk(new THREE.BoxGeometry(6.2, .16, .22), 0xd8b24a, { metalness: .5, roughness: .35 }); bm.castShadow = true; sets.scale.beam.add(bm);
  sets.scale.panL = new THREE.Group(); sets.scale.panR = new THREE.Group(); sets.scale.add(sets.scale.panL, sets.scale.panR);
  for (const p of [sets.scale.panL, sets.scale.panR]) { const d = mk(new THREE.CylinderGeometry(1.15, 1.0, .12, 28), 0xd8b24a, { metalness: .5, roughness: .35 }); d.castShadow = true; p.add(d); }
  const block = mk(new THREE.BoxGeometry(1.7, 1.5, 1.7), 0xc9892f, { roughness: .6 }); block.position.y = .85; block.castShadow = true; sets.scale.panL.add(block);
  const cord = [0, 1].map(() => mk(new THREE.CylinderGeometry(.02, .02, 1, 6), 0x3a3028)); sets.scale.cords = cord; cord.forEach(c => sets.scale.add(c));
  sets.scale.panR.add(EG.holder); EG.holder.position.set(0, .2, 0);
}
// 2. keel cutaway: breastbone blade and flight muscle; wings are two arm bones
sets.keel = new THREE.Group(); scene.add(sets.keel);
{
  const shp = new THREE.Shape(); shp.moveTo(-.9, .5); shp.quadraticCurveTo(-.5, -1.4, 0, -1.55); shp.quadraticCurveTo(.5, -1.4, .9, .5); shp.lineTo(-.9, .5);
  const blade = mk(new THREE.ExtrudeGeometry(shp, { depth: .1, bevelEnabled: false }), 0xf1e6c8, { roughness: .4 }); blade.position.z = -.05; blade.castShadow = true;
  const ribs = new THREE.Group(); for (let i = 0; i < 5; i++) { const rb = mk(new THREE.TorusGeometry(1.05 - i * .05, .045, 8, 28, Math.PI), 0xf1e6c8, { roughness: .4 }); rb.rotation.set(Math.PI / 2, 0, 0); rb.position.set(0, .4 - i * .22, .0); ribs.add(rb); }
  sets.keel.core = new THREE.Group(); sets.keel.core.add(blade, ribs); sets.keel.add(sets.keel.core);
  sets.keel.blade = blade; sets.keel.muscle = [];
  for (const sd of [-1, 1]) { const m = mk(new THREE.SphereGeometry(.7, 22, 16), 0xb83a2e, { roughness: .55 }); m.scale.set(.55, 1.15, .75); m.position.set(sd * .55, -.15, 0); m.castShadow = true; sets.keel.core.add(m); sets.keel.muscle.push(m);
    const arm = new THREE.Group(); arm.position.set(sd * 1.05, .55, 0); const bone = mk(new THREE.CylinderGeometry(.07, .06, 2.4, 10), 0xe9ddc0); bone.rotation.z = Math.PI / 2; bone.position.x = sd * 1.2; arm.add(bone); arm.side = sd; sets.keel.add(arm); (sets.keel.arms = sets.keel.arms || []).push(arm); }
}
// 3. a code-built bat (bones of the arm and finger membrane), flapping
function makeBat() {
  const g = new THREE.Group(), fur = 0x3a2a24;
  const body = mk(new THREE.SphereGeometry(.28, 16, 12), fur); body.scale.set(.8, 1.1, .8); body.castShadow = true; g.add(body);
  const head = mk(new THREE.SphereGeometry(.17, 14, 10), fur); head.position.set(0, .38, .08); g.add(head);
  for (const sx of [-.08, .08]) { const ear = mk(new THREE.ConeGeometry(.06, .18, 8), fur); ear.position.set(sx, .55, .06); g.add(ear); }
  g.wings = [];
  for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sd * .2, .1, 0);
    const v = new Float32Array([0, 0, 0, sd * 1.8, .35, 0, sd * 1.5, -.5, 0, 0, 0, 0, sd * 1.5, -.5, 0, 0, -.4, 0]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(v, 3)); geo.computeVertexNormals();
    const mem = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a3f36, side: THREE.DoubleSide, roughness: .9 })); mem.castShadow = true; w.add(mem);
    const bone = mk(new THREE.CylinderGeometry(.03, .025, 1.85, 6), 0xe9ddc0); bone.rotation.z = Math.PI / 2; bone.position.set(sd * .92, .17, 0); bone.rotation.z = Math.PI / 2 - sd * .2; w.add(bone);
    g.add(w); g.wings.push([w, sd]);
  }
  return g;
}
const BAT = makeBat(); BAT.scale.setScalar(.5); scene.add(BAT);
// 4. gold nuggets for the miners
const NUGS = new THREE.Group(); scene.add(NUGS);
{ const r = mulberry(9); for (let i = 0; i < 16; i++) { const n = mk(new THREE.IcosahedronGeometry(.1 + r() * .12, 0), 0xffc83a, { metalness: .9, roughness: .25, emissive: 0x6a4a00 }); n.position.set((r() - .5) * 1.4, .1 + r() * .15, (r() - .5) * 1.0); n.castShadow = true; NUGS.add(n); } }
// 5. dust puffs for the launch
const DUST = []; for (let i = 0; i < 18; i++) { const d = mk(new THREE.SphereGeometry(.3, 10, 8), 0xd9bf98, { transparent: true, opacity: 0, depthWrite: false }); d.visible = false; scene.add(d); DUST.push(d); }
function dustAt(x, z, t0, t) { const u = t - t0; for (let i = 0; i < DUST.length; i++) { const d = DUST[i], a = i / DUST.length * 6.28, k = clamp(u / 1.2); d.visible = u > 0 && u < 1.2;
  d.position.set(x + Math.cos(a) * (.4 + k * 2.2), .2 + k * .6, z + Math.sin(a) * (.4 + k * 1.6)); d.scale.setScalar(.5 + k * 1.6); d.material.opacity = .55 * (1 - k); } }
function hideDust() { for (const d of DUST) d.visible = false; }

// ---------------------------------------------------------------- 2D explainer bits
function limbNumbers(pts, t, t0, gap, color = '#f5c23a') {   // pts: [[x,y]] screen points; numbers pop in one by one
  for (let i = 0; i < pts.length; i++) { const k = eo(seg(t, t0 + i * gap, t0 + i * gap + .25)); if (k <= 0) continue;
    const c = ov.x, [x, y] = pts[i], r = 38 * (.6 + .4 * k); c.save(); c.globalAlpha = k; c.fillStyle = i < 4 ? '#1c2a44' : '#7a1c1c'; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); c.lineWidth = 6; c.strokeStyle = i < 4 ? color : '#ff8a7a'; c.stroke();
    c.font = "700 44px 'Fredoka'"; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), x, y + 2); c.restore(); }
}
function bonePts(A) {   // world positions near the four feet and two wings of the griffin
  A.root.updateMatrixWorld(true); const b = new THREE.Box3(); A.root.traverse(o => { if (o.isMesh && o.visible) b.expandByObject(o, true); });
  const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  return { c, s, min: b.min, max: b.max };
}

// ---------------------------------------------------------------- the picture
const gp = (A, x, y, z, yaw = 0, s = 1) => { A.holder.visible = true; place(A, x, y, z, yaw, s); };
const allActors = [GR, QZ, QZ2, PT, EG];
const GROUND_COL = 0x8a6a4a;
window.render = (t) => {
  texts.length = 0; O.clear(ov); only(null); hideDust();
  for (const A of allActors) A.holder.visible = false;
  BAT.visible = false; NUGS.visible = false; world.visible = true; ground.visible = true; groundMat.color.set(GROUND_COL);
  sky(DUSK, 14, 120); hemi.intensity = 1.25; hemi.color.set(0xffe2c0); sun.color.set(0xffc88a); sun.intensity = 2.4; sun.position.set(-10, 9, 12); sun.target.position.set(0, 0, 0);
  const flap = (A, name, tt, rate = 1) => pose(A, name, tt * rate);
  let after = null;

  if (t < S.b) {            // HOOK: the griffin on its ridge; six limbs count themselves
    pose(GR, 'Action', t); gp(GR, 0, 0, 0, FACE.gr);
    const k = eio(seg(t, 0, S.b)); cam(V(lerp(6, 4.2, k), lerp(1.3, 1.5, k), lerp(8, 6.5, k)), V(0, 1.3, 0), 48);
    after = () => { showChip('GREECE · PERSIA · LEGEND', .15, T.six + .6, t);
      const B = bonePts(GR), pts = [[B.min.x + B.s.x * .22, 0, B.min.z + B.s.z * .7], [B.min.x + B.s.x * .75, 0, B.min.z + B.s.z * .7], [B.min.x + B.s.x * .22, 0, B.min.z + B.s.z * .3], [B.min.x + B.s.x * .75, 0, B.min.z + B.s.z * .3]].map(p => toScreen(V(p[0], .35, p[2])));
      const wings = [toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .85)), toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .15))];
      limbNumbers([...pts, ...wings], t, T.six - .1, .32); };
  } else if (t < S.c) {     // IMAGINE: lion body, eagle wings
    pose(GR, 'Action', t); gp(GR, 0, 0, 0, FACE.gr);
    const k = eio(seg(t, S.b, S.c)); const a = lerp(-.9, .9, k); cam(V(Math.sin(a) * 6.5, 1.5, Math.cos(a) * 6.5), V(0, 1.3, 0), 48);
    after = () => { showChip('LION BODY', T.lion - .1, T.eagle - .1, t); showChip('EAGLE WINGS', T.eagle - .05, S.c, t);
      const B = bonePts(GR); const p = t < T.eagle ? toScreen(V(B.c.x, B.min.y + B.s.y * .35, B.c.z)) : toScreen(V(B.c.x, B.max.y * .9, B.c.z));
      O.arrow(ov, p[0] + W * .22, p[1] - H * .08, p[0] + W * .04, p[1] - H * .01, eo(seg(t, t < T.eagle ? T.lion : T.eagle, (t < T.eagle ? T.lion : T.eagle) + .4)), t < T.eagle ? '#f5c23a' : '#9fd0ff', 11); };
  } else if (t < S.d) {     // PROBLEM 1: WEIGHT: a lion block against the heaviest flying bird
    world.visible = false; sets.scale.visible = true; sky(0xf0c9a0, 20, 80); groundMat.color.set(0xb89b78);
    const tilt = -.34 * eio(seg(t, T.ninety - .6, T.ninety + .7)), L = 2.6, hy = 2.4;
    sets.scale.beam.rotation.z = tilt;
    const ex = Math.cos(tilt) * L, ey = Math.sin(tilt) * L;
    sets.scale.panL.position.set(-ex, hy + ey - 1.5, 0); sets.scale.panR.position.set(ex, hy - ey - 1.5, 0);
    [[sets.scale.panL, -1], [sets.scale.panR, 1]].forEach(([p, sd], i) => { const c = sets.scale.cords[i]; const top = hy + (sd < 0 ? ey : -ey); c.position.set(p.position.x, (top + p.position.y) / 2, 0); c.scale.y = top - p.position.y; });
    sets.scale.panR.add(EG.holder); EG.holder.visible = true; pose(EG, 'motion4', t * 1.2); EG.holder.position.set(0, .2, 0); EG.holder.rotation.y = FACE.eg + .6; EG.holder.scale.setScalar(1.7);
    cam(V(0, 3.0, 15), V(0, 2.2, 0), 46);
    after = () => { showChip('PROBLEM 1: WEIGHT', S.c + .2, T.lion2 - .1, t); showChip('LION: 190 KG', T.lion2 - .1, T.birds - .1, t); showChip('FLYING BIRD: ~18 KG MAX', T.birds - .1, S.d, t);
      const l = toScreen(V(sets.scale.panL.position.x, sets.scale.panL.position.y + 1.8, 0)), r = toScreen(V(sets.scale.panR.position.x, sets.scale.panR.position.y + 1.5, 0));
      const a = eo(seg(t, T.lion2, T.lion2 + .4)); if (a > 0) { ov.x.save(); ov.x.globalAlpha = a; label('190 KG', l[0], l[1] - H * .03, '#ffd27a', 58); ov.x.restore(); }
      const b = eo(seg(t, T.eighteen - .2, T.eighteen + .3)); if (b > 0) { ov.x.save(); ov.x.globalAlpha = b; label('18 KG', r[0], r[1] - H * .05, '#bfe3ff', 58); ov.x.restore(); } };
  } else if (t < S.e) {     // FIX: copy Quetzalcoatlus: a ten-metre wingspan glides over the ridge
    const u = t - S.d; pose(QZ, 'Animation', u * .9); gp(QZ, lerp(-4, 4, eio(seg(t, S.d, S.e))), 6.5 + Math.sin(u * 1.1) * .3, 0, FACE.qz);
    cam(V(0, 3.0, 27), V(0, 6, 0), 56); sky(0xf3b982, 24, 140);
    after = () => { showChip('QUETZALCOATLUS · PTEROSAUR', T.copy - .1, T.ten - .1, t); showChip('10 M WINGSPAN', T.ten - .05, T.two - .1, t); showChip('200 KG', T.two - .05, S.e, t);
      const q = QZ.holder.position, l = toScreen(V(q.x - 5, q.y - 3, 0)), r = toScreen(V(q.x + 5, q.y - 3, 0)), p = eo(seg(t, T.ten, T.ten + .5));
      O.arrow(ov, (l[0] + r[0]) / 2, l[1], l[0], l[1], p, '#f5c23a', 10); O.arrow(ov, (l[0] + r[0]) / 2, l[1], r[0], r[1], p, '#f5c23a', 10);
      if (p > .5) label('10 M', (l[0] + r[0]) / 2, l[1] - H * .035, '#ffe08a', 52);
      const kg = Math.round(200 * eio(seg(t, T.two, T.two + 1.1))); if (t > T.two - .1) label(kg + ' KG', W * .5, H * .3, '#fff', 66); };
  } else if (t < S.f) {     // PROBLEM 2: ENGINE: the keel and flight muscle, then a giant keel
    sets.keel.visible = true; world.visible = false; ground.visible = false; sky(0x6a5a52, 20, 80); groundMat.color.set(0x3a302a); hemi.intensity = 1.6; sun.intensity = 2.8;
    const g = eio(seg(t, T.grow - .1, T.grow + .9)), sc = lerp(1, 1.5, g); sets.keel.core.scale.setScalar(sc); sets.keel.core.position.y = lerp(0, -.2, g);
    const fl = Math.sin(t * 5), ang = fl * .45;
    for (const a of sets.keel.arms) { a.rotation.z = a.side * ang; a.position.set(a.side * 1.05 * sc, .55 * sc - .2 * g, 0); }
    sets.keel.muscle.forEach(m => m.scale.set(.55 * (1 + .1 * Math.abs(fl)), 1.15, .75));
    cam(V(0, .2, 12.5), V(0, -.1, 0), 50); sets.keel.rotation.y = Math.sin((t - S.e) * .6) * .35;
    after = () => { showChip('PROBLEM 2: NO ENGINE', S.e + .2, T.keel - .1, t); showChip('BIRD KEEL: ANCHORS FLIGHT MUSCLE', T.keel - .1, T.grow - .15, t); showChip('FIX: GIANT KEEL', T.grow - .1, S.f, t);
      const a = eo(seg(t, T.keel, T.keel + .5)); const k0 = toScreen(V(0, -1.55 * sc + (g ? -.2 * g : 0), .1)), m0 = toScreen(V(.6 * sc, -.1, .5));
      O.arrow(ov, k0[0] - W * .18, k0[1] + H * .02, k0[0] - W * .02, k0[1] - H * .005, a, '#f5c23a', 11); if (a > .4) label('KEEL', k0[0] - W * .2, k0[1] + H * .02, '#fff2c8', 44, 'right');
      O.arrow(ov, m0[0] + W * .12, m0[1] - H * .08, m0[0] + W * .04, m0[1] - H * .01, a, '#ff8a7a', 11); if (a > .4) label('MUSCLE', m0[0] + W * .12, m0[1] - H * .095, '#ffc6bc', 40, 'center'); };
  } else if (t < S.g) {     // PROBLEM 3: LAUNCH: Quetzalcoatlus vaults on all four limbs, then the griffin does it
    const q = t < T.griffins - .15, tt = q ? t - (T.quetz2 - .3) : t - (T.griffins - .15);
    const jump = x => { const u = clamp(x / 1.5); return u > 0 && u < 1 ? 3.6 * 4 * u * (1 - u) : 0; };
    const A = q ? QZ : GR, y = jump(tt - 1.6 + .3) + (q ? 0 : 0);
    pose(A, q ? 'Animation' : 'Action', tt * 1.0); gp(A, 0, y + (q ? 1.4 : 0), 0, q ? FACE.qz : FACE.gr, 1);
    if (q) { A.holder.scale.setScalar(.55); }
    cam(V(7, 1.3, 9), V(0, q ? 2.2 : 1.6, 0), 52); sky(0xf3b982, 20, 120);
    dustAt(0, 0, q ? T.vaulted : T.griffins + .7, t);
    after = () => { showChip('PROBLEM 3: LAUNCH', S.f + .2, T.quetz2 - .1, t); showChip('QUETZALCOATLUS: ALL FOUR LIMBS', T.quetz2 - .1, T.griffins - .15, t); showChip('GRIFFIN: FOUR LEGS', T.griffins - .1, S.g, t);
      const dy = q ? T.vaulted : T.griffins + .7, kk = eo(seg(t, dy, dy + .4)), B = bonePts(A);
      if (kk > 0 && kk < 1.01 && t < dy + 1.3) for (const [fx, fz] of [[.25, .3], [.75, .3], [.25, .7], [.75, .7]]) { const s = toScreen(V(B.min.x + B.s.x * fx, 0, B.min.z + B.s.z * fz)); O.arrow(ov, s[0], s[1] + H * .1, s[0], s[1], kk, '#f5c23a', 10); }
      if (!q && t > T.legs) O.mark(ov, W * .5, H * .38, true, seg(t, T.legs, T.legs + .4)); };
  } else if (t < S.h) {     // PROBLEM 4: SIX LIMBS: birds, bats and pterosaurs fly with their arms
    const u = t - S.g;
    if (t < T.none - .15) {
      const flapT = t * 1.2;
      scene.add(EG.holder); pose(EG, 'motion4', flapT); gp(EG, -2.2, 2.2 + Math.sin(t * 3) * .1, 0, FACE.eg - 1.57 + 1.0, 1.6);
      pose(QZ, 'Animation', flapT * .8); gp(QZ, 0, 3.6, -1.5, FACE.qz - 1.57 + 1.0, .42);
      BAT.visible = true; BAT.position.set(2.2, 2.2 + Math.sin(t * 3 + 1) * .1, 0); BAT.rotation.set(0, 0, 0); for (const [w, sd] of BAT.wings) w.rotation.z = sd * Math.sin(t * 9) * .5;
      cam(V(0, 2.6, 14), V(0, 2.6, 0), 50); sky(0xf3b982, 20, 120);
      after = () => { showChip('PROBLEM 4: SIX LIMBS', S.g + .2, T.arms - .3, t); showChip('FLIERS USE THEIR ARMS', T.arms - .3, T.none - .1, t);
        const a = eo(seg(t, T.bats - .2, T.bats + .5));
        for (const [name, x, y] of [['BIRD', -2.2, 3.4], ['PTEROSAUR', 0, 4.9], ['BAT', 2.2, 3.2]]) { const s = toScreen(V(x, y, 0)); label(name, s[0], s[1], '#fff', 42); }
        if (t > T.arms - .5) for (const [x, y] of [[-2.2, 2.2], [0, 3.4], [2.2, 2.2]]) { const s = toScreen(V(x, y, 0)); O.arrow(ov, s[0], s[1] + H * .12, s[0], s[1] + H * .02, eo(seg(t, T.arms - .5, T.arms)), '#f5c23a', 9); } };
    } else {
      pose(GR, 'Action', t); gp(GR, 0, 0, 0, FACE.gr); cam(V(5.5, 1.5, 6.5), V(0, 1.4, 0), 48);
      after = () => { showChip('GRIFFIN: SPARE PAIR?', T.none - .1, S.h, t);
        const B = bonePts(GR), pts = [[.22, .7], [.75, .7], [.22, .3], [.75, .3]].map(([fx, fz]) => toScreen(V(B.min.x + B.s.x * fx, .35, B.min.z + B.s.z * fz)));
        const wings = [toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .85)), toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .15))];
        limbNumbers([...pts, ...wings], t, T.none, .12); O.mark(ov, W * .5, H * .4, false, seg(t, T.pair - .3, T.pair + .2)); };
    }
  } else if (t < S.i) {     // ORIGIN: Protoceratops in the Gobi
    const u = t - S.h; sky(0xf0cf9e, 18, 90); groundMat.color.set(0xd2b078); hemi.intensity = 1.5;
    const alive = t < T.skeletons - .2;
    pose(PT, 'Animation', alive ? u * .8 : 0); tintActor(PT, 0xe8dcc0, alive ? 0 : eio(seg(t, T.skeletons - .2, T.skeletons + .5)) * .85);
    gp(PT, alive ? lerp(-4, 0, eio(seg(t, S.h, T.gold))) : 0, alive ? 0 : -.35 * eio(seg(t, T.skeletons - .2, T.skeletons + .6)), 0, FACE.pt, alive ? 1 : 1);
    NUGS.visible = t > T.gold - .3; NUGS.position.set(-1.8, 0, 1.4); NUGS.children.forEach((n, i) => { n.rotation.y = t * 2 + i; n.scale.setScalar(1 + .15 * Math.sin(t * 6 + i)); });
    const k = eio(seg(t, T.skeletons - .4, T.skeletons + 1)); cam(V(lerp(5, 3.2, k), lerp(1.6, 1.2, k), lerp(6.5, 4.6, k)), V(0, .8, 0), 48);
    after = () => { showChip('GOBI DESERT · MONGOLIA', S.h + .1, T.gold - .1, t); showChip('GOLD MINERS FIND SKELETONS', T.gold - .05, T.beak - .1, t); showChip('PROTOCERATOPS: BEAK + FRILL', T.beak - .1, S.i, t);
      const B = bonePts(PT);
      if (t > T.beak - .1) { const bk = toScreen(V(B.max.x, B.min.y + B.s.y * .5, B.c.z)), a = eo(seg(t, T.beak, T.beak + .4)); O.arrow(ov, bk[0] + W * .1, bk[1] - H * .14, bk[0] + W * .01, bk[1] - H * .02, a, '#f5c23a', 10); if (a > .5) label('BEAK', bk[0] + W * .12, bk[1] - H * .16, '#fff2c8', 44); }
      if (t > T.frill - .1) { const fr = toScreen(V(B.max.x - B.s.x * .25, B.max.y, B.c.z)), a = eo(seg(t, T.frill, T.frill + .4)); O.arrow(ov, fr[0] - W * .12, fr[1] - H * .1, fr[0] - W * .01, fr[1] - H * .005, a, '#ff8a7a', 10); if (a > .5) label('FRILL', fr[0] - W * .15, fr[1] - H * .12, '#ffc6bc', 44); } };
  } else {                  // payoff: the griffin on its ridge, and the six numbers come back for the loop
    pose(GR, 'Action', t); gp(GR, 0, 0, 0, FACE.gr);
    const k = eio(seg(t, S.i, S.end)); cam(V(lerp(6, 4.2, k), lerp(1.3, 1.5, k), lerp(8, 6.5, k)), V(0, 1.3, 0), 48);
    after = () => { showChip('SEND THIS TO A FRIEND', T.send - .05, T.griffin3 - .1, t);
      if (t > T.griffin3 - .1) { const B = bonePts(GR), pts = [[.22, .7], [.75, .7], [.22, .3], [.75, .3]].map(([fx, fz]) => toScreen(V(B.min.x + B.s.x * fx, .35, B.min.z + B.s.z * fz)));
        const wings = [toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .85)), toScreen(V(B.c.x, B.max.y * .95, B.min.z + B.s.z * .15))]; limbNumbers([...pts, ...wings], t, T.griffin3 + .3, .22); } };
  }
  ground.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  vignette(.45);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'wind' }, { t: T.six, type: 'tick' }, { t: T.imagine, type: 'swell' }, { t: T.ninety, type: 'thud' }, { t: T.eighteen, type: 'blip' }, { t: T.ten, type: 'swell' },
  { t: T.grow, type: 'pop' }, { t: T.vaulted, type: 'thud' }, { t: T.griffins + .7, type: 'thud' }, { t: T.none, type: 'buzz' }, { t: T.gold, type: 'ding' }, { t: T.skeletons, type: 'clang' }, { t: T.beak, type: 'pop' }, { t: T.frill, type: 'pop' }, { t: T.griffin3, type: 'tick' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
