// How a 3-tonne dragon could fly (remake, new style): picture = render(t)
// Animated game dragon (GLB, one "Flying" clip) over a volcanic set of Kenney CC0 rocks; volcano, bone cutaway, heat arrows built in code.
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
const gDragon = await load('dragon');
const PROPS = {};
await Promise.all(['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'rock_smallA', 'rock_smallC', 'stone_largeB', 'cliff_large_rock', 'stump_old', 'log']
  .map(async n => { PROPS[n] = (await load(n)).scene; }));

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
// place: position, heading (0 = +z), pitch (+ = nose down), bank, scale
function place(A, x, y, z, yaw = 0, pitch = 0, bank = 0, s = 1) { A.holder.position.set(x, y, z); A.holder.rotation.set(pitch, yaw, bank); A.holder.scale.setScalar(s); }

const dragon = makeActor(gDragon, 3.2, { base: 'Flying' });
const FLAP = 13.125 / 4;          // one wingbeat of the clip (s at 1x)
const GLIDE = 2.6;                // clip time where the wings sit level: frozen, it reads as a glide
const RIGHT = Math.PI / 2, LEFT = -Math.PI / 2;
const flap = (A, t, rate = 1) => pose(A, 'Flying', t * rate);
const glide = (A, t) => pose(A, 'Flying', GLIDE + Math.sin(t * 1.3) * .05);

// ---------------------------------------------------------------- the set: dark volcanic plain, Kenney rocks, a volcano built in code
const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
const tintCache = new Map();
function prop(name, x, y, z, s, ry, hex = 0x4a403c, parent = world) {
  const o = SkeletonUtils.clone(PROPS[name]);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true;
    m.material = (Array.isArray(m.material) ? m.material : [m.material]).map(src => { const key = src.uuid + hex; if (!tintCache.has(key)) { const c = src.clone(); c.map = null; c.color.set(hex); c.roughness = .95; tintCache.set(key, c); } return tintCache.get(key); });
    if (m.material.length === 1) m.material = m.material[0]; } });
  o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
{ const r = mulberry(11), rocks = ['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'stone_largeB', 'rock_smallA', 'rock_smallC'];
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 120, z = 4 - r() * 60; if (Math.abs(x) < 5 && z > -6) continue;
    prop(rocks[Math.floor(r() * rocks.length)], x, 0, z, 1.8 + r() * 3.4, r() * 6.28, [0x3e3532, 0x4c403a, 0x34302e][i % 3]); }
  for (let i = 0; i < 10; i++) prop(i % 2 ? 'stump_old' : 'log', (r() - .5) * 60, 0, -4 - r() * 30, 2 + r() * 2, r() * 6.28, 0x2a2220);
}
// volcano: lathe profile with a crater, vertex colours (dark rock, glowing lip), lava pool, glow and smoke
const VOL = new THREE.Group(); scene.add(VOL); VOL.position.set(0, 0, -130);
const VR = 7, VH = 30;            // crater radius, rim height
{ const pts = []; for (let i = 0; i <= 24; i++) { const f = i / 24; pts.push(new THREE.Vector2(lerp(38, VR, Math.pow(f, .8)), VH * (1 - Math.pow(1 - f, 1.6)))); }
  pts.push(new THREE.Vector2(VR - 1.2, VH - .4), new THREE.Vector2(VR - 2.2, VH - 3.2)); pts.reverse();
  const g = new THREE.LatheGeometry(pts, 48), pa = g.attributes.position, col = [], rr = mulberry(3);
  for (let j = 0; j < pa.count; j++) { const y = pa.getY(j), f = y / VH, n = (rr() - .5) * .9; pa.setX(j, pa.getX(j) + n); pa.setZ(j, pa.getZ(j) + n);
    const c = new THREE.Color(0x4a3e38).lerp(new THREE.Color(0x231c1a), f); if (f > .93) c.lerp(new THREE.Color(0xff5a1e), (f - .93) * 9); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })); m.receiveShadow = true; VOL.add(m);
  // lava streaks down the flank
  for (let k = 0; k < 4; k++) { const a = -.5 + k * .35, crv = new THREE.CatmullRomCurve3([...Array(8)].map((_, i) => { const f = i / 7, rad = lerp(VR + .4, 24, f), y = VH * (1 - Math.pow(f, .9)) * .985; return new THREE.Vector3(Math.sin(a + Math.sin(f * 5 + k) * .06) * rad, y + .3, Math.cos(a + Math.sin(f * 5 + k) * .06) * rad); }));
    VOL.add(new THREE.Mesh(new THREE.TubeGeometry(crv, 40, .55 - k * .06, 6), new THREE.MeshBasicMaterial({ color: 0xff7a24, fog: true }))); }
  const lava = new THREE.Mesh(new THREE.CircleGeometry(VR - 1.6, 32), new THREE.MeshBasicMaterial({ color: 0xffa040 })); lava.rotation.x = -Math.PI / 2; lava.position.y = VH - 2.6; VOL.add(lava);
}
const LAVA = new THREE.PointLight(0xff6a2a, 900, 70, 1.6); LAVA.position.set(0, VH + 3, 0); VOL.add(LAVA);
// far peaks, dark
{ const rr = mulberry(5); for (let i = 0; i < 9; i++) { const rad = 30 + rr() * 20, hgt = 26 + rr() * 22, g = new THREE.ConeGeometry(rad, hgt, 7, 4); const pa = g.attributes.position;
    for (let j = 0; j < pa.count; j++) { const f = (pa.getY(j) + hgt / 2) / hgt; pa.setX(j, pa.getX(j) + (rr() - .5) * 4 * (1 - f)); pa.setZ(j, pa.getZ(j) + (rr() - .5) * 4 * (1 - f)); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x5a4648, roughness: 1, flatShading: true })); m.position.set(-170 + i * 42 + rr() * 10, hgt / 2 - 4, -230 - rr() * 40); scene.add(m); } }

// a cliff for the vault (scene 5): top at CLIFF_TOP, its right edge at x = 1
const CLIFF_TOP = 4.2, CLIFF = new THREE.Group(); scene.add(CLIFF);
{ const c = prop('rock_tallE', 0, 0, 0, 1, .3, 0x6a5a50, CLIFF); c.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(c), k = CLIFF_TOP / (b.max.y - b.min.y);
  c.scale.setScalar(k); c.position.set(-(b.min.x + b.max.x) / 2 * k - .2, -b.min.y * k, -(b.min.z + b.max.z) / 2 * k);
  prop('rock_largeA', -2.6, 0, -1.2, 2.6, .9, 0x5a4a44, CLIFF); prop('rock_tallB', -4.2, 0, -3, 3.4, 2.1, 0x4c403a, CLIFF); }
// soft round sprite for smoke, dust and glow
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xff7a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 })); glow.scale.set(34, 18, 1); glow.position.set(0, VH + 2, 0); VOL.add(glow);
const SMOKE = []; { const r = mulberry(17); for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x6a5c58, transparent: true, depthWrite: false })); VOL.add(s); SMOKE.push([s, r(), r(), r()]); } }
function smoke(t) { for (const [s, a, b, c] of SMOKE) { const f = ((t * .05 + a) % 1); s.position.set((b - .5) * 6 + f * 14, VH + 1 + f * 40, (c - .5) * 6); s.scale.setScalar(5 + f * 18); s.material.opacity = .55 * Math.sin(Math.PI * f); } }
const DUST = []; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0x9a8a80, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); DUST.push(s); }
function dust(cx, t, amt) { for (let i = 0; i < DUST.length; i++) { const s = DUST[i], f = ((t * .9 + i / DUST.length) % 1), a = i * 2.4; s.visible = amt > 0; s.position.set(cx + Math.cos(a) * (1 + f * 3.5), .2 + f * 1.2, Math.sin(a) * (1 + f * 2.5)); s.scale.setScalar(.8 + f * 2.2); s.material.opacity = amt * .6 * (1 - f); } }

// the bone cutaway: a half shell (open to the camera), a solid core that empties, a crack, gold criss-cross struts
const BONE = new THREE.Group(); scene.add(BONE);
const boneMat = new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: .7, side: THREE.DoubleSide });
const BL = 5.2, BRAD = .62;
const halves = [new THREE.Group(), new THREE.Group()]; BONE.add(halves[0], halves[1]);
const cores = [], struts = [];
for (let h = 0; h < 2; h++) {
  const sgn = h ? 1 : -1, G = halves[h];
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(BRAD, BRAD, BL / 2, 32, 1, true, Math.PI / 2, Math.PI), boneMat); shell.rotation.z = Math.PI / 2; shell.position.x = sgn * BL / 4; G.add(shell);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(BRAD * .82, BRAD * .82, BL / 2, 32, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a6a58, roughness: .9, side: THREE.DoubleSide })); inner.rotation.z = Math.PI / 2; inner.position.x = sgn * BL / 4; G.add(inner);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(BRAD * 1.45, 24, 16), boneMat); knob.scale.set(.8, 1, .9); knob.position.x = sgn * (BL / 2 + .25); G.add(knob);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(BRAD * .8, BRAD * .8, BL / 2, 24), new THREE.MeshStandardMaterial({ color: 0xd8c09a, roughness: .9 })); core.rotation.z = Math.PI / 2; core.position.x = sgn * BL / 4; G.add(core); cores.push(core);
  // Warren-truss struts: zig-zag gold bars inside the open half
  for (let i = 0; i < 6; i++) { const x0 = sgn * (i * BL / 12), x1 = sgn * ((i + 1) * BL / 12), up = i % 2 ? 1 : -1;
    const a = new THREE.Vector3(x0, up * BRAD * .72, -.1), b = new THREE.Vector3(x1, -up * BRAD * .72, -.1);
    const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, len, 8), new THREE.MeshStandardMaterial({ color: 0xe9b949, emissive: 0x6a4a10, roughness: .4, metalness: .3 }));
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); G.add(m); struts.push([m, i]); }
}

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w + ' ' + n); };
const T = {
  legend: wt('legend'), volcano: wt('volcano'), fire: wt('fire'), three: wt('three'), fly: wt('fly'), wings: wt('wings'), stop: wt('stop'),
  imagine: wt('imagine'), wall: wt('wall'), dragon2: wt('dragon', 2), biggest: wt('biggest'), quetz: wt('quetzalcoatlus'), two: wt('two'), fifteen: wt('fifteen'),
  first: wt('first'), hollow: wt('hollow'), but0: wt('but'), snap: wt('snap'), brace: wt('brace'), struts: wt('struts'), light: wt('light'), bridge: wt('bridge'),
  still: wt('still'), up: wt('up'), vault: wt('vault'), quetz2: wt('quetzalcoatlus', 1), glide: wt('glide'), but1: wt('but', 1), down: wt('down'), ride: wt('ride'),
  twenty: wt('twenty'), condors: wt('condors'), flapped: wt('flapped'), one: wt('one'), one2: wt('one', 1), hours: wt('hours'), warm2: wt('warm', 1), hot: wt('hot'),
  hottest: wt('hottest'), volcano2: wt('volcano', 1), send: wt('send'), because: wt('because'),
};
const S = { a: 0, b: wt('it', 1) - .35, c: T.imagine - .35, d: wt('so', 1) - .3, e: T.still - .3, f: T.but1 - .3, g: T.warm2 - .3, h: T.send - .3 };
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
const DUSK = 0xe8a878;
// rising heat: orange arrows climbing a column above a point (world space)
function heat(base, t, n = 4, h = 6, spread = 2.4, wdt = 12) {
  for (let i = 0; i < n; i++) { const f = (t * .45 + i / n) % 1, x = base.x + (i - (n - 1) / 2) * spread, a = toScreen(V(x, base.y + f * h, base.z)), b = toScreen(V(x, base.y + f * h + h * .3, base.z));
    ov.x.save(); ov.x.globalAlpha = Math.sin(Math.PI * f); O.arrow(ov, a[0], a[1], b[0], b[1], 1, '#ff8a3a', wdt); ov.x.restore(); }
}
// a two-bar weight chart, left of the dragon
function bars(t) {
  const x = ov.x, base = H * .58, top = H * .30, bw = W * .13, x1 = W * .07, x2 = W * .25;
  const qa = seg(t, T.biggest - .2, T.biggest + .4), da = seg(t, T.fifteen - .3, T.fifteen + .7);
  if (qa <= 0) return;
  x.save(); x.globalAlpha = qa;
  x.fillStyle = 'rgba(14,20,24,.8)'; x.beginPath(); x.roundRect(x1 - W * .03, top - H * .05, x2 + bw - x1 + W * .06, base - top + H * .1, 24); x.fill(); x.lineWidth = 4; x.strokeStyle = '#e9b949'; x.stroke();
  const hq = (base - top) * (200 / 3000) * eo(seg(t, T.two - .2, T.two + .6)) + 4, hd = (base - top) * eo(da);
  x.fillStyle = '#7ec8ff'; x.fillRect(x1, base - hq, bw, hq); x.fillStyle = '#ff6a3a'; if (da > 0) x.fillRect(x2, base - hd, bw, hd);
  x.font = `700 ${Math.round(W * .03)}px 'Fredoka', sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'top';
  x.fillText('200 KG', x1 + bw / 2, base + 10); if (da > 0) x.fillText('3,000 KG', x2 + bw / 2, base + 10);
  x.restore();
  texts.push({ id: 'bars', text: 'bars', x0: x1 - W * .03, y0: top - H * .05, x1: x2 + bw + W * .03, y1: base + H * .05, pass: true });
}

window.render = (t) => {
  texts.length = 0; O.clear(ov);
  dragon.holder.visible = true; BONE.visible = false; CLIFF.visible = false; world.visible = true; VOL.visible = true;
  sky(DUSK, 90, 380); hemi.intensity = 1.5; sun.intensity = 2.8;
  for (const s of DUST) s.visible = false;
  let after = null, focus = V(0, 0, 0);
  smoke(t);

  if (t < S.b) {
    // 1. a dragon beats its wings above the volcano at dusk
    const k = eio(seg(t, 0, S.b));
    place(dragon, lerp(.6, 1.4, k), 9.5 + Math.sin(t * 1.9) * .25, -6, RIGHT - .35, .05, 0, 1.25); flap(dragon, t + 1);
    cam(V(lerp(5, 4, k), lerp(4.5, 5.5, k), lerp(16, 12, k)), V(0, 11, -14), 52); focus = V(0, 9, -6);
    after = () => {
      showChip('EVERY LEGEND: A VOLCANO', .15, T.three - .15, t);
      showChip('3 TONNES · CAN IT FLY?', T.three - .1, S.b, t);
    };
  } else if (t < S.c) {
    // 2. close: bigger wings? no. stop flapping
    const fast = t < T.stop ? 1.8 : 1;
    place(dragon, -1.4, 3.6 + Math.sin(t * 3) * .2, 0, RIGHT - .5, 0, 0, 1); flap(dragon, t * fast);
    cam(V(2.2, 3.8, 13), V(-.4, 3.0, 0), 50); focus = V(0, 3, 0);
    after = () => {
      showChip('BIGGER WINGS?', T.wings - .9, T.stop - .2, t);
      showChip('STOP FLAPPING', T.stop - .15, S.c, t);
      if (t < T.stop - .2) O.mark(ov, W * .5, H * .30, false, seg(t, T.wings, T.wings + .4));
      else O.mark(ov, W * .5, H * .30, true, seg(t, T.stop + .2, T.stop + .6));
    };
  } else if (t < S.d) {
    // 3. flapping like mad, sinking to the ground; the weight chart
    const sink = eio(seg(t, T.wall, T.dragon2 + .6));
    place(dragon, 1.6, lerp(3.8, 1.55, sink) + Math.sin(t * 6) * .12 * (1 - sink), 0, RIGHT - .8, 0, 0, 1); flap(dragon, t * 2.2);
    const k = seg(t, S.c, S.d);
    cam(V(2.8, 3.6, 16), V(.2, lerp(2.6, 1.3, sink), 0), 52); focus = V(1, 0, 0);
    dust(1.6, t, sink * (1 - seg(t, T.biggest + 2, T.biggest + 3)) * .9 + .2 * sink);
    after = () => {
      showChip('FLAP, FLAP... STILL DOWN', T.imagine - .1, T.biggest - .2, t);
      showChip('QUETZALCOATLUS: BIGGEST FLYER', T.biggest - .15, T.two - .1, t);
      showChip('~200 KG · 10–11 M WINGS', T.two - .05, T.fifteen - .3, t);
      showChip('DRAGON: 15× HEAVIER', T.fifteen - .25, S.d, t);
      bars(t);
    };
  } else if (t < S.e) {
    // 4. the bone: solid -> hollow -> snaps -> braced with criss-cross struts
    BONE.visible = true; world.visible = true;
    const crack = t > T.snap - .1 && t < T.brace + .3, open = crack ? eo(seg(t, T.snap - .1, T.snap + .3)) : 0, close = seg(t, T.brace - .1, T.brace + .3);
    halves[0].position.set(-open * .5 * (1 - close), -open * .25 * (1 - close), 0); halves[0].rotation.z = open * .25 * (1 - close);
    halves[1].position.set(open * .5 * (1 - close), -open * .25 * (1 - close), 0); halves[1].rotation.z = -open * .25 * (1 - close);
    const hollow = eio(seg(t, T.hollow, T.hollow + .6));
    for (const c of cores) { c.visible = hollow < 1; c.scale.set(1 - hollow * .99, 1, 1 - hollow * .99); }
    for (const [m, i] of struts) { const a = seg(t, T.brace + .2 + i % 6 * .18, T.brace + .5 + i % 6 * .18); m.visible = a > 0; m.scale.set(1, Math.max(.001, a), 1); }
    const k = seg(t, S.d, S.e);
    BONE.position.set(0, 3.3, 2); BONE.scale.setScalar(.85); BONE.rotation.set(.45, -.2 + k * .15, .32);
    place(dragon, lerp(-5, 4, k), 8.4, -6, RIGHT - .2, 0, 0, 1); flap(dragon, t);
    cam(V(0, 4.6, 17), V(0, 3.9, 0), 50); focus = V(0, 2, 0);
    after = () => {
      showChip('HOLLOW BONES, LIKE A BIRD\'S', T.hollow - .1, T.but0 - .1, t);
      showChip('HOLLOW = SNAPS', T.but0 - .05, T.brace - .15, t);
      showChip('CRISS-CROSS STRUTS INSIDE', T.brace - .1, T.light - .1, t);
      showChip('LIGHT AS A STRAW · STRONG AS A BRIDGE', T.light - .05, S.e, t);
      if (crack && open > .3 && t < T.brace - .1) O.mark(ov, W * .5, H * .53, false, seg(t, T.snap + .1, T.snap + .5));
      if (t > T.bridge) O.mark(ov, W * .5, H * .53, true, seg(t, T.bridge, T.bridge + .4));
    };
  } else if (t < S.f) {
    // 5. on a cliff top: too heavy to flap up, so it vaults off its arms and glides
    const cliffTop = CLIFF_TOP; CLIFF.visible = true;
    const hop = eo(seg(t, T.vault, T.vault + .8)), go = seg(t, T.glide - .2, S.f + .4);
    let x = lerp(0, 5, go), y = cliffTop + 1.5 + hop * 2.2 - go * 1.0;
    if (t < T.vault) { place(dragon, 0, cliffTop + 1.5 + Math.sin(t * 6) * .1, 0, RIGHT - .3, 0, 0, 1); flap(dragon, t * 2.2); }
    else if (t < T.glide - .2) { place(dragon, 0, y, 0, RIGHT - .3, -.15 * hop, 0, 1); pose(dragon, 'Flying', lerp(1.3, 2.0, seg(t, T.vault, T.vault + .5))); }
    else { place(dragon, x, y, 0, RIGHT - .2, .1, 0, 1); glide(dragon, t); }
    cam(V(x * .6 + 2.2, y + .8, 16.5), V(x * .7 + 1.0, y - 1.6, 0), 52); focus = V(x, 3, 0);
    after = () => {
      showChip('STILL TOO HEAVY TO FLAP UP', T.still - .1, T.vault - .1, t);
      showChip('VAULT OFF THE ARMS', T.vault - .05, T.quetz2 - .1, t);
      showChip('LIKE QUETZALCOATLUS (HABIB, 2008)', T.quetz2 - .05, T.glide - .1, t);
      showChip('...AND GLIDE', T.glide - .05, S.f, t);
      if (t > T.vault && t < T.glide) { const p = toScreen(V(0, cliffTop, 0)), q = toScreen(V(0, cliffTop + 3.2, 0)); O.arrow(ov, p[0] - W * .27, p[1], q[0] - W * .27, q[1], seg(t, T.vault, T.vault + .4)); }
    };
  } else if (t < S.g) {
    // 6. a glide only goes down; ride the warm air: circle up a thermal like a condor
    const down = seg(t, S.f, T.ride), up = seg(t, T.ride, S.g);
    let x, y, z, yaw, bank;
    if (t < T.ride) { x = lerp(-3, 3, down); y = lerp(7, 3.2, down); z = 0; yaw = RIGHT; bank = 0; }
    else { const a = (t - T.ride) * .9; x = Math.sin(a) * 2.6; z = -Math.cos(a) * 2.6 - 1.5; y = 3.2 + up * 6; yaw = a + RIGHT * 0 + Math.PI / 2; bank = .35; }
    place(dragon, x, y, z, yaw, t < T.ride ? .18 : 0, bank, 1); glide(dragon, t);
    if (t > T.hours - .3 && t < T.hours + 1.2) { /* still gliding: no flap */ }
    const cy = t < T.ride ? 5.2 : 3.6 + up * 6;
    cam(V(1, cy + .3, 15.5), V(0, cy - 2.2, 0), 54); focus = V(x, 0, z);
    after = () => {
      showChip('A GLIDE ONLY GOES DOWN', T.but1 - .05, T.ride - .15, t);
      showChip('RIDE RISING WARM AIR', T.ride - .1, T.twenty - .1, t);
      showChip('2020 STUDY: ANDEAN CONDORS', T.twenty - .05, T.flapped - .15, t);
      showChip('FLAPPING: 1% OF THE TIME', T.flapped - .1, T.one2 - .1, t);
      showChip('ONE BIRD: 5+ HOURS, NO FLAP', T.one2 - .05, S.g, t);
      if (t < T.ride + .2) { const a = toScreen(V(-3, 6.2, 0)), b = toScreen(V(3.5, 2.2, 0)); O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, S.f + .2, T.down + .3), '#ffffff', 12, true); }
      else heat(V(0, 0, 1), t, 4, 9, 2.2);
      if (t > T.flapped - .1) O.meter(ov, W * .87, H * .40, H * .2, lerp(1, .01, eio(seg(t, T.one - .2, T.one + .8))), 'FLAPPING', seg(t, T.flapped - .1, T.flapped + .3));
      if (t > T.one2) { const x = ov.x, cx = W * .13, cy = H * .40, r = W * .075, hrs = 5 * eio(seg(t, T.one2, T.hours + .8));
        x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = 'rgba(14,20,24,.88)'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#e9b949'; x.stroke();
        x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r * .8, -Math.PI / 2, -Math.PI / 2 + hrs / 12 * Math.PI * 2); x.closePath(); x.fillStyle = '#5fe07a'; x.fill();
        x.font = `700 ${Math.round(W * .034)}px 'Fredoka', sans-serif`; x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = 8; x.strokeStyle = 'rgba(10,10,12,.9)';
        const lab = Math.floor(hrs) + ' HRS'; x.strokeText(lab, cx, cy + r + 14); x.fillText(lab, cx, cy + r + 14); x.restore(); }
    };
  } else if (t < S.h) {
    // 7. warm air rises over hot ground; the hottest ground there is: the volcano
    const k = seg(t, S.g, S.h), a = t * .5;
    const P = VOL.position, c = V(P.x, VH + 14, P.z);
    place(dragon, c.x + Math.sin(a) * 6, c.y + k * 3, c.z + Math.cos(a) * 6, a + Math.PI / 2, 0, .3, 2.2); glide(dragon, t);
    cam(V(P.x + lerp(10, 4, k), lerp(20, 26, k), P.z + lerp(58, 52, k)), V(P.x, VH + 9, P.z), 50); focus = V(P.x, VH, P.z);
    after = () => {
      showChip('WARM AIR RISES OVER HOT GROUND', T.warm2 - .05, T.hottest - .15, t);
      showChip('HOTTEST GROUND: A VOLCANO', T.hottest - .1, S.h, t);
      heat(V(VOL.position.x, VH, VOL.position.z), t, 5, 26, 4.5, 14);
      if (t > T.volcano2) O.mark(ov, W * .5, H * .52, true, seg(t, T.volcano2, T.volcano2 + .4));
    };
  } else {
    // 8. payoff: not the fire, the lift. Ends on the opening shot, so the loop is seamless
    const k = eio(seg(t, S.h, S.end));
    place(dragon, lerp(-1.2, .6, k), 9.5 + Math.sin(t * 1.9) * .25, -6, RIGHT - .35, .05, 0, 1.25);
    if (t < T.because) glide(dragon, t); else flap(dragon, 1 + (t - S.end) + 0);
    cam(V(lerp(7, 5, k), lerp(4, 4.5, k), lerp(19, 16, k)), V(0, 11, -14), 52); focus = V(0, 9, -6);
    after = () => {
      showChip('NOT FOR THE FIRE. FOR THE LIFT.', S.h + .1, S.end, t);
      heat(V(VOL.position.x, VH, VOL.position.z), t, 3, 26, 5, 12);
    };
  }
  sun.position.set(-12, 14, 12).add(focus); sun.target.position.copy(focus);
  ground.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'rumble' }, { t: T.three, type: 'thud' }, { t: T.wings, type: 'buzz' }, { t: T.stop, type: 'ding' }, { t: T.wall, type: 'flaps' },
  { t: T.dragon2 + .5, type: 'thud' }, { t: T.two, type: 'blip' }, { t: T.fifteen, type: 'thud' }, { t: T.hollow, type: 'pop' }, { t: T.snap, type: 'crack' },
  { t: T.brace + .2, type: 'blip' }, { t: T.bridge, type: 'ding' }, { t: T.vault, type: 'flaps' }, { t: T.glide, type: 'wind' }, { t: T.ride, type: 'wind' },
  { t: T.flapped, type: 'blip' }, { t: T.hours, type: 'ding' }, { t: T.warm2, type: 'rumble' }, { t: T.volcano2, type: 'swell' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
