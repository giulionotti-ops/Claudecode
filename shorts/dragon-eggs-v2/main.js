// How a dragon egg could hatch in a volcano (remake, new style): picture = render(t)
// Animated game dragons (GLB): the mother is "European Dragon" (Idle Sit clip, on the ground), the baby the "Flying" dragon; Kenney CC0 rocks and pines; volcano, eggs and the ground cutaway built in code.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 900);
const bg = new THREE.Color(0xe8a878), fog = new THREE.Fog(0xe8a878, 90, 380); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xffe2c4, 0x5a4a44, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2a0, 2.8); sun.position.set(-12, 14, 12); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 80 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const gDragon = await load('dragon'), gMum = await load('eurodragon');
const PROPS = {};
await Promise.all(['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'rock_smallA', 'rock_smallC', 'stone_largeB', 'stump_old', 'log',
  'tree_pineTallA', 'tree_pineTallC', 'tree_pineSmallB', 'tree_pineRoundA'].map(async n => { PROPS[n] = (await load(n)).scene; }));

// ---------------------------------------------------------------- actor: model + mixer, posed from the frame time
function makeActor(g, height, { base } = {}) {
  const root = SkeletonUtils.clone(g.scene);
  const acts = {}, mixer = new THREE.AnimationMixer(root);
  const holder = new THREE.Group(); holder.rotation.order = 'YXZ'; holder.add(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const nm = ms.map(m => { const c = m.clone(); if (c.transparent) { c.transparent = false; c.depthWrite = true; c.alphaTest = .5; } return c; });   // cut-out, never see-through
    o.material = nm.length === 1 ? nm[0] : nm; } });
  const clip = n => g.animations.find(a => a.name.trim() === n.trim());
  const a0 = clip(base) || g.animations[0]; const act0 = mixer.clipAction(a0); act0.play(); acts[a0.name] = act0; mixer.update(0);   // registered so pose() can set its weight
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true), h = box.max.y - box.min.y, k = height / h;
  root.scale.multiplyScalar(k); root.position.set(-(box.min.x + box.max.x) / 2 * k, -(box.min.y + box.max.y) / 2 * k, -(box.min.z + box.max.z) / 2 * k);   // origin at the body's middle (it flies)
  scene.add(holder);
  return { holder, root, mixer, acts, clip };
}
function pose(A, a, ta) {
  for (const n in A.acts) A.acts[n].setEffectiveWeight(0);
  if (!A.acts[a]) { const c = A.clip(a); if (!c) throw new Error('clip ' + a); const x = A.mixer.clipAction(c); x.play(); A.acts[a] = x; }
  const X = A.acts[a], d = X.getClip().duration; X.setEffectiveWeight(1); X.time = ((ta % d) + d) % d; A.mixer.update(0);
}
function place(A, x, y, z, yaw = 0, pitch = 0, bank = 0, s = 1) { A.holder.position.set(x, y, z); A.holder.rotation.set(pitch, yaw, bank); A.holder.scale.setScalar(s); }

const mother = makeActor(gMum, 3.2, { base: 'Idle Sit' });
mother.yawFix = 0; mother.lookAxis = new THREE.Vector3(0, 0, 1);
mother.neck = []; mother.root.traverse(o => { if (o.isBone && /^DEF-neck\.00[1-4]_/.test(o.name)) mother.neck.push(o); });
mother.root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) { m.color.setRGB(2.1, 1.05, .78); } });   // the model is near-black: warm it to the baby's red-brown
const baby = makeActor(gDragon, 3.2, { base: 'Flying' });
const RIGHT = Math.PI / 2;
const flap = (A, t, rate = 1) => pose(A, 'Flying', t * rate);
// the mother on the ground: a second game dragon (European Dragon, Regina Cachoa, CC BY) that has real ground clips; she plays "Idle Sit"
// (sitting up, wings folded, breathing) and now and then turns her head to look around; feet kept on the ground
const LOOK = [0, .5, -.35, .15, -.55, .3, 0, -.2];
function perch(A, t, x, z, yaw, s = 1, press = 0) {
  const cl = 'Idle Sit'; pose(A, cl, t);
  const seg4 = Math.floor(t / 3.2), f = eio(Math.min(1, (t / 3.2 - seg4) * 2.5));        // a new look every 3.2 s, turned in about 1.3 s, then held
  const look = lerp(LOOK[seg4 % LOOK.length], LOOK[(seg4 + 1) % LOOK.length], f);
  for (const b of A.neck) b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(A.lookAxis, look / A.neck.length));
  if (!A.footY) A.footY = {};
  if (!(cl in A.footY)) { A.holder.position.set(0, 0, 0); A.holder.rotation.set(0, 0, 0); A.holder.scale.setScalar(1); A.holder.updateMatrixWorld(true); A.footY[cl] = new THREE.Box3().setFromObject(A.root, true).min.y; }
  A.holder.rotation.set(0, yaw + A.yawFix, 0); A.holder.scale.setScalar(s); A.holder.position.set(x, -A.footY[cl] * s - press * .12, z); A.holder.visible = true;
}
const GLIDE = 2.6;
const glide = (A, t) => pose(A, 'Flying', GLIDE + Math.sin(t * 1.3) * .05);

// ---------------------------------------------------------------- the set: dark volcanic plain, Kenney rocks and pines, a volcano built in code
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
const forest = new THREE.Group(); scene.add(forest);
const tintCache = new Map();
function prop(name, x, y, z, s, ry, hex = 0x4a403c, parent = world) {
  const o = SkeletonUtils.clone(PROPS[name]);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true;
    if (hex !== null) { m.material = (Array.isArray(m.material) ? m.material : [m.material]).map(src => { const key = src.uuid + hex; if (!tintCache.has(key)) { const c = src.clone(); c.map = null; c.color.set(hex); c.roughness = .95; tintCache.set(key, c); } return tintCache.get(key); });
      if (m.material.length === 1) m.material = m.material[0]; } } });
  o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
{ const r = mulberry(11), rocks = ['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'stone_largeB', 'rock_smallA', 'rock_smallC'];
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 120, z = -2 - r() * 60; if (Math.abs(x) < 6 && z > -8) continue;
    prop(rocks[Math.floor(r() * rocks.length)], x, 0, z, 1.8 + r() * 3.4, r() * 6.28, [0x3e3532, 0x4c403a, 0x34302e][i % 3]); }
}
// a pine forest edge for the chick's first flight (scene 7), kept in its own group
{ const r = mulberry(23), pines = ['tree_pineTallA', 'tree_pineTallC', 'tree_pineSmallB', 'tree_pineRoundA'];
  for (let i = 0; i < 46; i++) { const x = 2 + r() * 30, z = -3 - r() * 26; prop(pines[i % 4], x, 0, z, 3 + r() * 3, r() * 6.28, null, forest); }
  for (let i = 0; i < 14; i++) prop(i % 2 ? 'rock_smallA' : 'stone_largeB', (i % 2 ? -1 : 1) * (3 + r() * 5), 0, -1 - r() * 8, 1 + r() * 1.5, r() * 6.28, 0x5a4c44, forest);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(.6, 14, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a4c, roughness: 1 })); mound.scale.set(1.3, .3, 1); mound.position.set(0, 0, -.5); mound.receiveShadow = true; forest.add(mound); }
// volcano: lathe profile with a crater, vertex colours (dark rock, glowing lip), lava streaks, glow and smoke
const VOL = new THREE.Group(); scene.add(VOL); VOL.position.set(0, 0, -130);
const VR = 7, VH = 30;
{ const pts = []; for (let i = 0; i <= 24; i++) { const f = i / 24; pts.push(new THREE.Vector2(lerp(38, VR, Math.pow(f, .8)), VH * (1 - Math.pow(1 - f, 1.6)))); }
  pts.push(new THREE.Vector2(VR - 1.2, VH - .4), new THREE.Vector2(VR - 2.2, VH - 3.2)); pts.reverse();
  const g = new THREE.LatheGeometry(pts, 48), pa = g.attributes.position, col = [], rr = mulberry(3);
  for (let j = 0; j < pa.count; j++) { const y = pa.getY(j), f = y / VH, n = (rr() - .5) * .9; pa.setX(j, pa.getX(j) + n); pa.setZ(j, pa.getZ(j) + n);
    const c = new THREE.Color(0x4a3e38).lerp(new THREE.Color(0x231c1a), f); if (f > .93) c.lerp(new THREE.Color(0xff5a1e), (f - .93) * 9); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  VOL.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })));
  for (let k = 0; k < 4; k++) { const a = -.5 + k * .35, crv = new THREE.CatmullRomCurve3([...Array(8)].map((_, i) => { const f = i / 7, rad = lerp(VR + .4, 24, f), y = VH * (1 - Math.pow(f, .9)) * .985; return new THREE.Vector3(Math.sin(a + Math.sin(f * 5 + k) * .06) * rad, y + .3, Math.cos(a + Math.sin(f * 5 + k) * .06) * rad); }));
    VOL.add(new THREE.Mesh(new THREE.TubeGeometry(crv, 40, .55 - k * .06, 6), new THREE.MeshBasicMaterial({ color: 0xff7a24 }))); }
  const lava = new THREE.Mesh(new THREE.CircleGeometry(VR - 1.6, 32), new THREE.MeshBasicMaterial({ color: 0xffa040 })); lava.rotation.x = -Math.PI / 2; lava.position.y = VH - 2.6; VOL.add(lava);
}
{ const rr = mulberry(5); for (let i = 0; i < 9; i++) { const rad = 30 + rr() * 20, hgt = 26 + rr() * 22, g = new THREE.ConeGeometry(rad, hgt, 7, 4); const pa = g.attributes.position;
    for (let j = 0; j < pa.count; j++) { const f = (pa.getY(j) + hgt / 2) / hgt; pa.setX(j, pa.getX(j) + (rr() - .5) * 4 * (1 - f)); pa.setZ(j, pa.getZ(j) + (rr() - .5) * 4 * (1 - f)); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5a4648, roughness: 1, flatShading: true })); m.position.set(-170 + i * 42 + rr() * 10, hgt / 2 - 4, -230 - rr() * 40); scene.add(m); } }
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xff7a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 })); glow.scale.set(30, 16, 1); glow.position.set(0, VH + 2, 0); VOL.add(glow);
const SMOKE = []; { const r = mulberry(17); for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x6a5c58, transparent: true, depthWrite: false })); VOL.add(s); SMOKE.push([s, r(), r(), r()]); } }
function smoke(t) { for (const [s, a, b, c] of SMOKE) { const f = ((t * .05 + a) % 1); s.position.set((b - .5) * 6 + f * 14, VH + 1 + f * 40, (c - .5) * 6); s.scale.setScalar(5 + f * 18); s.material.opacity = .55 * Math.sin(Math.PI * f); } }
const DUST = []; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x9a8a80, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); DUST.push(s); }
function dust(cx, cz, t, amt, sc = 1) { for (let i = 0; i < DUST.length; i++) { const s = DUST[i], f = ((t * .9 + i / DUST.length) % 1), a = i * 2.4; s.visible = amt > 0; s.position.set(cx + Math.cos(a) * (.3 + f * 1.4) * sc, .1 + f * .9 * sc, cz + Math.sin(a) * (.3 + f * 1.0) * sc); s.scale.setScalar((.4 + f * 1.2) * sc); s.material.opacity = amt * .7 * (1 - f); } }

// ---------------------------------------------------------------- eggs: a lathe egg in two parts (body + cap), so the cap can pop off
const EGG_H = .7;
function eggProfile(f0, f1) { const pts = []; for (let i = 0; i <= 20; i++) { const f = lerp(f0, f1, i / 20), a = f * Math.PI, r = Math.sin(a) * (f < .5 ? .5 : .5 - (f - .5) * .18) * .78; pts.push(new THREE.Vector2(Math.max(r, .0001), -Math.cos(a) * .5)); } return pts; }
const eggMat = new THREE.MeshStandardMaterial({ color: 0xc0583a, roughness: .45, metalness: .05, emissive: 0x3a0e04 });
function makeEgg(withCap = true) {
  const g = new THREE.Group(), m = eggMat.clone();
  const body = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(0, withCap ? .66 : 1), 36), m); body.castShadow = true; g.add(body);
  let cap = null; if (withCap) { cap = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(.66, 1), 36), m); cap.castShadow = true; g.add(cap); }
  // gold speckles
  const sp = new THREE.InstancedMesh(new THREE.SphereGeometry(.012, 6, 4), new THREE.MeshStandardMaterial({ color: 0xe9b949, roughness: .4 }), 60), r = mulberry(7), M = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) { const f = .12 + r() * (withCap ? .5 : .76), a = r() * 6.28, rad = Math.sin(f * Math.PI) * .39; M.makeTranslation(Math.cos(a) * rad, -Math.cos(f * Math.PI) * .5, Math.sin(a) * rad); sp.setMatrixAt(i, M); }
  g.add(sp); g.scale.setScalar(EGG_H); scene.add(g);
  return { g, body, cap, m };
}
const heroEgg = makeEgg(true);                       // the one we follow
const nestEggs = [makeEgg(false), makeEgg(false), makeEgg(false)];
// pores on the hero egg: tiny dark dots, shown in the close-up
const PORES = new THREE.InstancedMesh(new THREE.SphereGeometry(.009, 6, 4), new THREE.MeshBasicMaterial({ color: 0x2a0e08 }), 420);
{ const r = mulberry(31), M = new THREE.Matrix4(); for (let i = 0; i < 420; i++) { const f = .1 + r() * .8, a = r() * 6.28, rad = Math.sin(f * Math.PI) * (f < .5 ? .5 : .5 - (f - .5) * .18) * .78 + .003; M.makeTranslation(Math.cos(a) * rad, -Math.cos(f * Math.PI) * .5, Math.sin(a) * rad); PORES.setMatrixAt(i, M); } }
heroEgg.g.add(PORES);
const warm = new THREE.PointLight(0xff7a30, 6, 4, 1.5); scene.add(warm);

// ---------------------------------------------------------------- the ground cutaway: a block of earth with a painted front face (layers, stones, a lava vein)
const BW = 14, BH = 8;
const soilTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 585; const x = c.getContext('2d'), r = mulberry(41);
  const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#6e5444'); g.addColorStop(.12, '#5b4234'); g.addColorStop(.5, '#46322a'); g.addColorStop(1, '#2e2120'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(${30 + i * 8},${20 + i * 5},${16 + i * 3},.35)`; const y = 40 + i * 110 + r() * 30; x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= 10; k++) x.lineTo(k * 103, y + Math.sin(k * 1.3 + i) * 10); x.lineTo(1024, y + 26); x.lineTo(0, y + 26); x.fill(); }
  for (let i = 0; i < 160; i++) { x.fillStyle = ['#7a6656', '#3a2c26', '#8a7462', '#2a201c'][i % 4]; x.beginPath(); x.ellipse(r() * 1024, 20 + r() * 560, 3 + r() * 9, 2 + r() * 6, r() * 3, 0, 7); x.fill(); }
  // lava vein rising from the bottom left, glowing
  const vx = u => u * 1024 / BW, vy = v => v * 585 / BH;           // block metres -> pixels (u from the left edge, v down from the top)
  x.save(); x.shadowColor = '#ff6a1a'; x.shadowBlur = 40; x.strokeStyle = '#ff7a24'; x.lineCap = 'round';
  for (const [w, a] of [[46, .9], [24, 1]]) { x.lineWidth = w; x.globalAlpha = a; x.beginPath(); x.moveTo(vx(3.4), vy(8)); x.bezierCurveTo(vx(3.0), vy(6.4), vx(5.6), vy(5.2), vx(4.6), vy(3.6)); x.bezierCurveTo(vx(4.1), vy(2.9), vx(4.5), vy(2.3), vx(4.4), vy(2.0)); x.stroke(); }
  x.strokeStyle = '#ffd27a'; x.lineWidth = 8; x.beginPath(); x.moveTo(vx(3.4), vy(8)); x.bezierCurveTo(vx(3.0), vy(6.4), vx(5.6), vy(5.2), vx(4.6), vy(3.6)); x.bezierCurveTo(vx(4.1), vy(2.9), vx(4.5), vy(2.3), vx(4.4), vy(2.0)); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
const BLOCK = new THREE.Group(); scene.add(BLOCK);
{ const side = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 1 }), top = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 1 }), front = new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 6), [side, side, top, side, front, side]); b.position.set(0, -BH / 2, -3); b.receiveShadow = true; BLOCK.add(b);
  const r = mulberry(51); for (let i = 0; i < 9; i++) prop(['rock_smallA', 'rock_smallC', 'stone_largeB'][i % 3], (r() - .5) * 12, 0, -.6 - r() * 4.5, .8 + r() * 1.2, r() * 6, 0x4c403a, BLOCK); }
const LAVA_AT = V3(-2.4, -1.35, .32), STEADY_AT = V3(1.0, -1.0, .32);   // egg spots in the cutaway (1 m down)
function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w + ' ' + n); };
const T = {
  safest: wt('safest'), volcano: wt('volcano'), how: wt('how'), survive: wt('survive'), youd: wt("you'd"), mother: wt('mother'), sits: wt('sits'), cant: wt("can't"),
  imagine: wt('imagine'), two: wt('two'), cars: wt('cars'), so1: wt('so', 1), buries: wt('buries'), metre: wt('metre'), maleo: wt('maleo'), sulawesi: wt('sulawesi'),
  too: wt('too'), lava: wt('lava'), cook: wt('cook'), so2: wt('so', 2), steady: wt('steady'), malleefowl: wt('malleefowl'), thirty: wt('thirty'), degrees: wt('degrees'),
  metre2: wt('metre', 1), breathe: wt('breathe'), thousands: wt('thousands'), pores: wt('pores'), fresh: wt('fresh'), stale: wt('stale'),
  but: wt('but'), traps: wt('traps'), grows: wt('grows'), tooth: wt('tooth'), snout: wt('snout'), crocodile: wt('crocodile'), chips: wt('chips'),
  maleo2: wt('maleo', 1), dig: wt('dig'), alone: wt('alone'), fly: wt('fly'), forest: wt('forest'), no: wt('no'), send: wt('send'), because: wt('because'), volcano2: wt('volcano', 1),
};
const S = { a: 0, b: T.youd - .3, c: T.so1 - .3, d: T.too - .3, e: T.metre2 - .7, f: T.but - .3, g: T.maleo2 - .3, h: T.send - .3 };
S.end = words[words.length - 1].t1 + 1.0;
window.DUR = S.end;

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
function setEgg(E, p, s = 1, ry = 0) { E.g.visible = true; E.g.position.copy(p); E.g.scale.setScalar(EGG_H * s); E.g.rotation.set(0, ry, 0); }
function eggColor(E, cooked) { E.m.color.set(0xc0583a).lerp(new THREE.Color(0x2a1a14), cooked); E.m.emissive.set(0x3a0e04).lerp(new THREE.Color(0x000000), cooked); }
// a jagged crack drawn on screen from a point, growing with p
function crack(cx, cy, p, seed, len = 120) {
  if (p <= 0) return; const x = ov.x, r = mulberry(seed); x.save(); x.strokeStyle = '#1a0c08'; x.lineWidth = 8; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let b = 0; b < 4; b++) { let px = cx, py = cy, a = b * 1.6 + r(); x.beginPath(); x.moveTo(px, py); const n = Math.ceil(6 * p); for (let i = 0; i < n; i++) { a += (r() - .5) * 1.1; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6 * .6; x.lineTo(px, py); } x.stroke(); }
  x.restore();
}
// a little air arrow loop: fresh air (blue) into the egg on the left, stale air (grey) out on the right
function airArrows(c, rpx, t, a) {
  if (a <= 0) return; const x = ov.x; x.save(); x.globalAlpha = a;
  for (let i = 0; i < 3; i++) { const f = (t * .8 + i / 3) % 1, y = c[1] + (i - 1) * rpx * .55, k = Math.sin(Math.PI * f);
    const g = Math.min(110, (W / 2 - rpx) - 24), d = g * .25 * f;
    x.globalAlpha = a * k; O.arrow(ov, c[0] - rpx - g + d, y, c[0] - rpx - 8 + d * .2, y, 1, '#7ec8ff', 12);
    O.arrow(ov, c[0] + rpx + 8, y + rpx * .2, c[0] + rpx + g - g * .25 + d, y + rpx * .2, 1, '#b8b0aa', 12); }
  x.restore();
}

window.render = (t) => {
  texts.length = 0; O.clear(ov);
  sky(0xe8a878, 90, 380); hemi.intensity = 1.5; sun.intensity = 2.8;
  mother.holder.visible = false; baby.holder.visible = false; heroEgg.g.visible = false; for (const e of nestEggs) e.g.visible = false;
  world.visible = true; forest.visible = false; BLOCK.visible = false; BLOCK.children.forEach(c => { c.visible = true; }); ground.visible = true; VOL.visible = true; PORES.visible = false; warm.intensity = 0;
  heroEgg.cap.position.set(0, 0, 0); heroEgg.cap.rotation.set(0, 0, 0); eggColor(heroEgg, 0);
  for (const s of DUST) s.visible = false;
  let after = null, focus = V(0, 0, 0);
  smoke(t);

  const opening = (k, tt) => {
    // the egg on a warm stone nest, the volcano behind, the mother circling over it
    world.visible = true;
    setEgg(heroEgg, V(0, .85, 0), 1, tt * .1); warm.position.set(0, .7, .8); warm.intensity = 6 + Math.sin(tt * 3) * 1.5;
    perch(mother, tt, 1.3, -4.6, -.5, .85);
    cam(V(lerp(.5, -.1, k), 1.05, lerp(3.9, 3.6, k)), V(0, 1.05, -10), 50); focus = V(0, 0, 0);
  };
  if (!opening.rock) { opening.rock = new THREE.Mesh(new THREE.CylinderGeometry(.55, .85, .5, 7), new THREE.MeshStandardMaterial({ color: 0x3e3532, roughness: 1, flatShading: true })); opening.rock.position.y = .25; opening.rock.castShadow = opening.rock.receiveShadow = true; scene.add(opening.rock); }

  if (t < S.b) {
    // 1. hook: the safest nest is inside a volcano
    opening(eio(seg(t, 0, S.b)), t);
    after = () => {
      showChip('SAFEST NEST: A VOLCANO', .15, T.how - .15, t);
      showChip('HOW DOES THE BABY SURVIVE?', T.how - .1, S.b, t);
    };
  } else if (t < S.c) {
    // 2. she can't sit on them: three tonnes, eggs squash
    const drop = t > T.cant - .25 ? eio(seg(t, T.cant - .25, T.cant + .05)) * (1 - eio(seg(t, T.imagine - .4, T.imagine + .2))) : 0;
    const squash = t > T.cant - .05 ? 1 : 0;
    nestEggs.forEach((e, i) => { setEgg(e, V((i - 1) * 1.1, .56, i === 1 ? -.4 : 0), 1.6, i); if (squash) { e.g.scale.set(EGG_H * 2.1, EGG_H * .5, EGG_H * 2.1); e.g.position.y = .17; eggColor(e, .25); } else eggColor(e, 0); });
    perch(mother, t, lerp(.3, .8, drop), -3.6, -.4, 1, drop);
    cam(V(1.0, 1.9, 10), V(-.2, 1.9, 0), 50); focus = V(0, 0, 0);
    dust(0, 0, t, drop * .9, 1.5);
    after = () => {
      showChip('SIT ON THEM?', T.mother - .1, T.cant - .1, t);
      showChip('3 TONNES = CRUSHED', T.cant - .05, T.imagine - .1, t);
      showChip('AS HEAVY AS TWO CARS', T.imagine - .05, S.c, t);
      if (t > T.cant && t < T.imagine - .1) O.mark(ov, W * .5, H * .30, false, seg(t, T.cant, T.cant + .4));
    };
  } else if (t < S.e) {
    // 3-4. the ground cutaway: buried a metre down (maleo); too close to the lava cooks it; keep it steady at ~33 °C (malleefowl)
    BLOCK.visible = true; ground.visible = false; world.visible = false; VOL.visible = true;
    const sinkIn = eio(seg(t, T.buries, T.buries + 1.0));
    let p = new THREE.Vector3().lerpVectors(V(1.0, .5, .32), STEADY_AT, sinkIn), cooked = 0, temp = 0, tempCol = '#5fe07a';
    if (t >= S.d) {
      const toLava = eio(seg(t, S.d, T.lava + .2)), back = eio(seg(t, T.so2, T.steady + .2));
      if (t < T.so2) { p = new THREE.Vector3().lerpVectors(STEADY_AT, LAVA_AT, toLava); cooked = seg(t, T.lava + .3, T.cook + .4); temp = lerp(33, 70, toLava) + cooked * 30; tempCol = temp > 45 ? '#ff4b4b' : '#f5c23a'; }
      else { p = new THREE.Vector3().lerpVectors(LAVA_AT, STEADY_AT, back); cooked = 1 - seg(t, T.so2, T.so2 + .3); temp = lerp(100, 33, eio(seg(t, T.so2, T.thirty + .6))); tempCol = temp > 45 ? '#ff4b4b' : temp > 36 ? '#f5c23a' : '#5fe07a'; }
    }
    setEgg(heroEgg, p, 1.6, t * .2); eggColor(heroEgg, cooked); warm.position.copy(p).add(V(0, 0, .6)); warm.intensity = t >= S.d && t < T.so2 ? 10 : 4;
    const k = seg(t, S.c, S.e);
    cam(V(lerp(.2, -.5, k), -.3, 9.6), V(lerp(0, -.7, k), -1.0, 0), 50); focus = V(0, 0, 0);
    after = () => {
      if (t < S.d) {
        showChip('BURIED IN WARM VOLCANIC GROUND', T.buries - .1, T.metre - .15, t);
        showChip('1 METRE DEEP', T.metre - .1, T.maleo - .15, t);
        showChip('LIKE THE MALEO BIRD (SULAWESI)', T.maleo - .1, S.d, t);
        if (t > T.metre - .2) { const a = toScreen(V(STEADY_AT.x - .9, 0, .32)), b = toScreen(V(STEADY_AT.x - .9, STEADY_AT.y, .32)); O.ruler(ov, a[0], a[1], b[1], seg(t, T.metre - .2, T.metre + .5), '1 M'); }
      } else {
        showChip('TOO CLOSE TO THE LAVA', T.too - .1, T.cook - .1, t);
        showChip('COOKED', T.cook - .05, T.so2 - .1, t);
        showChip('KEEP IT STEADY', T.so2 - .05, T.malleefowl - .15, t);
        showChip('MALLEEFOWL: MOUND ~33 °C', T.malleefowl - .1, S.e, t);
        O.readout(ov, W * .76, H * .29, temp, tempCol, seg(t, S.d + .2, S.d + .5));
        if (t > T.cook && t < T.so2) O.mark(ov, W * .42, H * .29, false, seg(t, T.cook, T.cook + .4));
        if (t > T.degrees) O.mark(ov, W * .42, H * .29, true, seg(t, T.degrees, T.degrees + .4));
      }
    };
  } else if (t < S.g) {
    // 5-6. close on the buried egg: pores for air; then the egg tooth chips it open and the baby breaks out
    BLOCK.visible = true; ground.visible = false; world.visible = false; BLOCK.children.forEach((c, i) => { if (i) c.visible = false; });
    const hatch = t > T.chips ? eo(seg(t, T.chips, T.chips + .7)) : 0;
    setEgg(heroEgg, STEADY_AT, 1, .4 + t * .05 * (t < S.f ? 1 : 0)); PORES.visible = t > T.thousands - .2 && t < S.f + .4;
    PORES.scale.setScalar(clamp(seg(t, T.thousands - .2, T.pores + .2)) * 1 + .0001);
    const shake = t > T.grows && t < T.chips ? Math.sin(t * 40) * .03 * seg(t, T.grows, T.chips) : 0; heroEgg.g.rotation.z = shake;
    heroEgg.cap.position.set(hatch * .5, hatch * 1.2, hatch * .3); heroEgg.cap.rotation.set(0, 0, -hatch * 1.6);
    warm.position.copy(STEADY_AT).add(V(.4, .3, .8)); warm.intensity = 3;
    if (t > T.chips + .1) { baby.holder.visible = true; const up = eo(seg(t, T.chips + .1, T.chips + .9)); place(baby, STEADY_AT.x, STEADY_AT.y + .1 + up * .55, STEADY_AT.z + .1, RIGHT - .7, -.2 * (1 - up), 0, .26 * (.4 + .6 * up)); flap(baby, t * 1.6); }
    const pull = eio(seg(t, T.crocodile, T.chips + .8)), push = eio(seg(t, S.e, S.e + 1.2));
    cam(V(STEADY_AT.x + lerp(.8, .3, push) + pull * .3, STEADY_AT.y + .2 + pull * .3, STEADY_AT.z + lerp(4, 2.3, push) + pull * 1.6), V(STEADY_AT.x, STEADY_AT.y + .05 + pull * .2, STEADY_AT.z), 50);
    focus = STEADY_AT.clone();
    after = () => {
      const c = toScreen(STEADY_AT), e = toScreen(V(STEADY_AT.x + EGG_H * .39, STEADY_AT.y, STEADY_AT.z)), rpx = Math.abs(e[0] - c[0]);
      if (t < S.f) {
        showChip('1 M DOWN: HOW DOES IT BREATHE?', S.e + .2, T.thousands - .15, t);
        showChip('THOUSANDS OF TINY PORES', T.thousands - .1, T.fresh - .1, t);
        showChip('FRESH AIR IN · STALE AIR OUT', T.fresh - .05, S.f, t);
        airArrows(c, rpx, t, seg(t, T.fresh - .1, T.fresh + .3));
      } else {
        showChip('THE HARD SHELL TRAPS IT', T.but - .05, T.grows - .1, t);
        showChip('AN EGG TOOTH ON ITS SNOUT', T.grows - .05, T.crocodile - .1, t);
        showChip('LIKE A BABY CROCODILE', T.crocodile - .05, T.chips - .05, t);
        showChip('CHIP, CHIP... OUT!', T.chips - .05, S.g, t);
        const top = toScreen(V(STEADY_AT.x, STEADY_AT.y + EGG_H * .17, STEADY_AT.z + EGG_H * .3));
        if (t < T.chips) { crack(top[0], top[1], seg(t, T.grows, T.chips), 9, rpx * 1.3); O.ring(ov, top[0], top[1], rpx * .35, seg(t, T.tooth - .2, T.tooth + .3)); }
      }
    };
  } else if (t < S.h) {
    // 7. the chick digs itself out alone and flies off into the forest
    forest.visible = true; world.visible = false;
    const out = eo(seg(t, T.dig, T.dig + .8)), go = seg(t, T.fly - .1, S.h + .3);
    baby.holder.visible = true;
    const bx = lerp(0, 5.5, eio(go)), by = lerp(-.05, .6, out) + go * 3.0, bz = -.5 - go * 3, yaw = RIGHT - .4 * (1 - go), BS = .45, F = 2.4 * BS;   // F: the mesh sits ahead of the holder along its heading
    place(baby, bx - Math.sin(yaw) * F, by, bz - Math.cos(yaw) * F, yaw, go * -.1, 0, BS); flap(baby, t * 1.6);
    dust(0, -.5, t, Math.max(.35 * seg(t, S.g, S.g + .4), out) * (1 - seg(t, T.fly, T.fly + .8)) * .9, .8);
    const lc = V(bx * .9, lerp(.55, by - .35, seg(t, T.fly - .2, T.fly + .6)), bz); cam(V(lc.x - .8, lc.y + .7, lc.z + 6), lc, 50); focus = V(bx, 0, bz);
    after = () => {
      showChip('MALEO CHICKS DIG OUT ALONE', T.maleo2 - .05, T.fly - .1, t);
      showChip('...AND FLY OFF INTO THE FOREST', T.fly - .05, T.no - .1, t);
      showChip('NO MOTHER NEEDED', T.no - .05, S.h, t);
    };
  } else {
    // 8. payoff: the volcano does the sitting; ends on the opening shot, so the loop is seamless
    opening(eio(seg(t, S.h, S.end + (S.b - 0))) * 0, t);
    const k = eio(seg(t, S.h, S.end));
    perch(mother, t, 1.3, -4.6, -.5, .85);
    cam(V(lerp(1.0, .5, k), 1.05, lerp(4.4, 3.9, k)), V(0, 1.05, -10), 50);
    after = () => {
      showChip('THE VOLCANO DOES THE SITTING', S.h + .1, S.end, t);
      if (t > T.volcano2) O.mark(ov, W * .5, H * .30, true, seg(t, T.volcano2, T.volcano2 + .4));
    };
  }
  opening.rock.visible = (t < S.b || t >= S.h);
  sun.position.set(-12, 14, 12).add(focus); sun.target.position.copy(focus);
  ground.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'rumble' }, { t: T.how, type: 'blip' }, { t: T.cant, type: 'crack' }, { t: T.cant + .02, type: 'thud' }, { t: T.two, type: 'blip' },
  { t: T.buries, type: 'thud' }, { t: T.metre, type: 'blip' }, { t: T.lava, type: 'rumble' }, { t: T.cook, type: 'buzz' }, { t: T.degrees, type: 'ding' },
  { t: T.pores, type: 'pop' }, { t: T.fresh, type: 'wind' }, { t: T.tooth, type: 'blip' }, { t: T.chips - .5, type: 'crack' }, { t: T.chips, type: 'crack' },
  { t: T.chips + .1, type: 'pop' }, { t: T.dig, type: 'thud' }, { t: T.fly, type: 'flaps' }, { t: T.volcano2, type: 'swell' }];
for (const k of ['b', 'c', 'e', 'g', 'h']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
