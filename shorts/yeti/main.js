// Could a Yeti Actually Live in the Himalayas?: picture = render(t)
// Rebrand look: animated game 3D models (GLB) on a snowy set of Kenney CC0 props. Mixers are driven from the frame time only.
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
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 800);
const bg = new THREE.Color(0xa8c8e6), fog = new THREE.Fog(0xa8c8e6, 60, 230); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xdcecff, 0x9aa8b8, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.position.set(10, 22, 14); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 70 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const [gYeti, gBear, gHare, gYak] = await Promise.all(['yeti', 'bear', 'hare', 'yak'].map(load));
const PROPS = {};
await Promise.all(['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'rock_smallA', 'rock_smallC', 'stone_largeB', 'cliff_large_rock', 'tree_pineTallA', 'tree_pineTallC', 'tree_pineSmallB', 'tree_pineRoundA', 'log', 'campfire_logs']
  .map(async n => { PROPS[n] = (await load(n)).scene; }));

// ---------------------------------------------------------------- actors: model + mixer, posed from the frame time
function makeActor(g, height, { tint = {}, yawFix = 0, base = 'idle' } = {}) {
  const root = SkeletonUtils.clone(g.scene);
  const acts = {}, mixer = new THREE.AnimationMixer(root);
  const holder = new THREE.Group(), fix = new THREE.Group(); fix.rotation.y = yawFix; holder.add(fix); fix.add(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const nm = ms.map(m => { const c = m.clone(); if (tint.color) c.color.multiply(tint.color.isColor ? tint.color : new THREE.Color(tint.color)); if (tint.rough != null) c.roughness = tint.rough; return c; });
    o.material = nm.length === 1 ? nm[0] : nm; } });
  const clip = n => g.animations.find(a => a.name.trim() === n.trim()) || g.animations.find(a => a.name.trim().endsWith('|' + n.trim()));
  const a0 = clip(base) || g.animations[0]; const act0 = mixer.clipAction(a0); act0.play(); mixer.update(0);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true), h = box.max.y - box.min.y, k = height / h;
  root.scale.multiplyScalar(k); root.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
  const A = { holder, root, mixer, acts, g, clip, height, k };
  A.feet = []; root.traverse(o => { if (o.isBone && /foot/i.test(o.name) && !/steps|toe/i.test(o.name)) A.feet.push(o); });
  scene.add(holder); return A;
}
// pose: clip a at time ta (looping), optionally blended with clip b
function pose(A, a, ta, b = null, tb = 0, wb = 0) {
  for (const n in A.acts) A.acts[n].setEffectiveWeight(0);
  const get = n => { if (!A.acts[n]) { const c = A.clip(n); if (!c) throw new Error('clip ' + n); const x = A.mixer.clipAction(c); x.play(); A.acts[n] = x; } return A.acts[n]; };
  const X = get(a), d = X.getClip().duration; X.setEffectiveWeight(1 - wb); X.time = ((ta % d) + d) % d;
  if (b) { const Y = get(b), e = Y.getClip().duration; Y.setEffectiveWeight(wb); Y.time = ((tb % e) + e) % e; }
  A.mixer.update(0);
  if (A.hide) for (const b of A.hide) b.scale.setScalar(.0001);   // drop the held shield / weapon pieces
  if (A.center) { A.holder.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(A.holder, true); A.holder.position.x += A.tx - (bx.min.x + bx.max.x) / 2; A.holder.position.z += A.tz - (bx.min.z + bx.max.z) / 2; }   // cancel root motion: hold the model on its mark
}
function place(A, x, y, z, ry = 0, s = 1) { A.tx = x; A.tz = z; A.holder.position.set(x, y, z); A.holder.rotation.y = ry; A.holder.scale.setScalar(s); }
function feetScale(A, s) { for (const f of A.feet) f.scale.multiplyScalar(s); }

const yeti = makeActor(gYeti, 2.8, { yawFix: Math.PI, base: 'IDLE 1', tint: { color: new THREE.Color(2.3, 2.35, 2.6), rough: 1 } });
const bear = makeActor(gBear, 1.25, { base: 'Stand_Idle_01' });
const hare = makeActor(gHare, .62, { base: 'Idle' });
const yak = makeActor(gYak, 1.9, { tint: { color: 0x6a4a36, rough: .95 }, base: 'ArmatureAction' });
yeti.center = bear.center = true;
yeti.hide = []; yeti.root.traverse(o => { if (o.isBone && /Shield|Weapon_[LR]_\d/.test(o.name)) yeti.hide.push(o); });
bear.holder.visible = hare.holder.visible = yak.holder.visible = false;

// ---------------------------------------------------------------- the set: snow, Kenney rocks and pines
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: .95 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), snowMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
const tintCache = new Map();
function tinted(src, hex, mix) {
  const root = SkeletonUtils.clone(src);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const key = m.uuid + hex + mix; if (!tintCache.has(key)) { const c = m.clone(); if (mix > 0) { c.map = null; c.color.set(hex).lerp(new THREE.Color(0xffffff), .12); } c.roughness = .95; tintCache.set(key, c); } return tintCache.get(key); });
    if (o.material.length === 1) o.material = o.material[0]; } });
  return root;
}
function prop(name, x, y, z, s, ry, hex = 0xe4ecf8, mix = .6, parent = world) {
  const o = tinted(PROPS[name], hex, mix); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
{
  const r = mulberry(7), rocks = ['rock_largeA', 'rock_largeC', 'rock_tallB', 'rock_tallE', 'stone_largeB', 'rock_smallA', 'rock_smallC'];
  for (let i = 0; i < 46; i++) {           // rocks and boulders across the slope, kept off the actors' lane
    const x = (r() - .5) * 70, z = -4 - r() * 42; prop(rocks[Math.floor(r() * rocks.length)], x, 0, z, 2.2 + r() * 3.2, r() * 6.28, 0xdfe8f6, .62);
  }
  for (let i = 0; i < 26; i++) {           // pines, snow-dusted
    const x = (r() - .5) * 80, z = -10 - r() * 38; prop(['tree_pineTallA', 'tree_pineTallC', 'tree_pineSmallB', 'tree_pineRoundA'][i % 4], x, 0, z, 3.2 + r() * 2.4, r() * 6.28, 0xdcebe2, 0);
  }
  // far peaks: jagged cones, grey rock below, snow above
  { const rr = mulberry(5); for (let i = 0; i < 9; i++) { const rad = 22 + rr() * 16, hgt = 34 + rr() * 26, g = new THREE.ConeGeometry(rad, hgt, 7, 6); const pa = g.attributes.position, col = [];
      for (let j = 0; j < pa.count; j++) { const y = pa.getY(j), f = (y + hgt / 2) / hgt, jx = (rr() - .5) * 3.2 * (1 - f); pa.setX(j, pa.getX(j) + jx); pa.setZ(j, pa.getZ(j) + (rr() - .5) * 3.2 * (1 - f));
        const c = new THREE.Color().set(f > .45 ? 0xf4f8ff : 0x7e8794).lerp(new THREE.Color(0xe6eefb), f > .45 ? 0 : f * .6); col.push(c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.position.set(-100 + i * 25 + rr() * 8, hgt / 2 - 6, -75 - rr() * 30); world.add(m); } }
  for (const [x, z, s] of [[-6.5, 1.2, 1.6], [6.8, 1.6, 1.9], [-8.5, -1.5, 2.6], [9.5, -1.8, 2.2]]) prop('rock_smallA', x, 0, z, s, x, 0xdfe8f6, .62);   // framing rocks at the edge
  for (const [x, z, s] of [[-11, -3, 4.6], [12, -4, 5.2]]) prop('tree_pineTallA', x, 0, z, s, x, 0xdcebe2, 0);
}
// drifts of snow (squashed spheres) so the ground is not a flat sheet
{ const r = mulberry(19); const g = new THREE.SphereGeometry(1, 20, 12);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(g, snowMat); const s = 1.5 + r() * 3; m.scale.set(s * 1.6, s * .22, s); m.position.set((r() - .5) * 60, -.04, -6 - r() * 30); m.receiveShadow = true; world.add(m); } }

// the den: rock arch with a dark cave behind it (winter scene)
const den = new THREE.Group(); scene.add(den);
{ const dark = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x141a26 })); dark.scale.set(1.9, 1.5, 1.3); dark.position.set(0, 0, -1.3); den.add(dark);
  prop('rock_tallE', -2.5, 0, -1.0, 2.2, 1.2, 0xdfe8f6, .55, den); prop('rock_tallB', 2.6, 0, -1.0, 2.3, 0.4, 0xdfe8f6, .55, den);
  prop('rock_largeA', -1.9, 0, -1.7, 2.8, 0.7, 0xdfe8f6, .55, den); prop('rock_largeA', 2.0, 0, -1.7, 2.9, 2.2, 0xdfe8f6, .55, den); prop('rock_largeC', 0, 0, -3.2, 4.2, 1.5, 0xdfe8f6, .55, den); 
  prop('rock_largeA', -4.8, 0, -.6, 2.4, 2, 0xdfe8f6, .6, den); prop('rock_largeA', 4.9, 0, -.4, 2.1, 4, 0xdfe8f6, .6, den); }

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  sherpa: wt('sherpa'), huge: wt('huge'), sinks: wt('sinks'), grow: wt('grow'), hare: wt('hare'), spread: wt('spread'), top: wt('top'),
  thin: wt('thin'), tune: wt('tune'), yak: wt('yak'), altitude: wt('altitude'), winter: wt('winter'), eat: wt('eat'), sleep: wt('sleep'), bear: wt('bear'),
  stored: wt('stored'), months: wt('months'), now: wt('now'), built: wt('built', 1), furry: wt('furry', 1), bear2: wt('bear', 1), nine: wt('nine'), dog: wt('dog'),
  eight: wt('eight'), asian: wt('asian'), name: wt('name'), rock: wt('rock'), bear3: wt('bear', 2), legend: wt('legend'), real: wt('real'),
};
const S = { a: 0, b: wt('but', 0) - .5, c: wt('but', 1) - .5, d: wt('but', 2) - .5, e: wt('now') - .5, f: T.furry - .6, g: wt('twenty') - .6, h: wt('and', 2) - .5 };
S.end = words[words.length - 1].t1 + 1.3;
window.DUR = S.end;

// ---------------------------------------------------------------- snow particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
const flakes = []; for (let i = 0; i < 260; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffffff, transparent: true, depthWrite: false, fog: false })); s.visible = false; scene.add(s); flakes.push(s); }
const FL = (() => { const r = mulberry(31), a = []; for (let i = 0; i < 260; i++) a.push([r(), r(), r(), r()]); return a; })();
function snowfall(center, t, density = 1, wind = .4, R = 9) {
  const n = Math.floor(flakes.length * density);
  for (let i = 0; i < flakes.length; i++) { const s = flakes[i]; if (i >= n) { s.visible = false; continue; }
    const [a, b, c, d] = FL[i]; s.visible = true; const y = ((b - t * (.12 + d * .1)) % 1 + 1) % 1;
    s.position.set(center.x + (a - .5) * R * 2 + Math.sin(t * .8 + i) * .3 + t * wind % 1, center.y + y * R * .9, center.z + (c - .5) * R * 1.2 - 1);
    s.scale.setScalar(.07 + d * .09); s.material.opacity = .85; }
}

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
const DAY = 0xa8c8e6;
const RIGHT = Math.PI / 2;      // facing +x (profile to a camera on +z)

window.render = (t) => {
  texts.length = 0; O.clear(ov);
  bear.holder.visible = hare.holder.visible = yak.holder.visible = den.visible = false; yeti.holder.visible = true; world.visible = true;
  sky(DAY, 60, 230); hemi.color.set(0xdcecff); hemi.intensity = 1.6; sun.color.set(0xfff2dc); sun.intensity = 2.6; sun.position.set(10, 22, 14);
  for (const f of yeti.feet) f.scale.set(1, 1, 1);
  let after = null, dens = .3, flash = 0, focus = V(0, 0, 0);

  if (t < S.b) {
    // 1. a yeti walks along a snowy ridge below the big peaks
    const p = seg(t, S.a, S.b), x = lerp(-1.6, 1.6, p);
    place(yeti, x, 0, 0, RIGHT - .35, 1); pose(yeti, 'WALK (BIGFOOT)', t * .9);
    cam(V(x + 1.3, 1.9, 8.4), V(x, 1.5, 0), 50); focus = V(x, 0, 0); dens = .35;
    after = () => {
      showChip('HIMALAYA · FOLKLORE', .2, T.sherpa + .3, t);
      showChip('SHERPA & TIBETAN STORIES', T.sherpa + .35, T.huge - .1, t);
      showChip('HUGE · HAIRY · HIGH SNOW', T.huge - .05, S.b, t);
    };
  } else if (t < S.c) {
    // 2. deep snow: small feet sink, wide furry feet float, like a snowshoe hare
    const sinkK = ei(seg(t, T.sinks, T.sinks + .8)), growK = eo(seg(t, T.grow + .2, T.grow + 1.5)), sink = sinkK * 1.05 * (1 - growK);
    const wide = t >= T.grow + .2;
    place(yeti, -.9, -sink, 0, RIGHT - .4, 1);
    if (t < T.sinks) pose(yeti, 'WALK (BIGFOOT)', t * .9); else if (!wide) pose(yeti, 'WALK', t * .7); else pose(yeti, 'WALK (BIGFOOT)', t * .9);
    if (growK > 0) feetScale(yeti, 1 + 1.6 * growK);
    hare.holder.visible = t > T.hare - .5; const hk = eo(seg(t, T.hare - .5, T.hare + .6));
    place(hare, lerp(4.2, 1.6, hk), 0, 1.4, -RIGHT - .5, 1.8);
    if (hk < 1) pose(hare, 'run', t * 1.2); else pose(hare, 'Idle', t);
    cam(V(.6, 1.7, 8.0), V(.5, 1.3, 0), 52); focus = V(0, 0, 0); dens = .45;
    after = () => {
      showChip('BIG BODY SINKS', T.sinks - .2, T.grow - .15, t);
      showChip('WIDE FURRY FEET', T.grow - .1, T.hare - .1, t);
      showChip('SNOWSHOE HARE: BIG HIND FEET', T.hare - .05, T.top + .3, t);
      const hp = toScreen(V(1.6, .15, 1.4)), yp = toScreen(V(-.7, .15 - sink, 0));
      if (t < T.grow) O.mark(ov, W * .5, H * .40, false, seg(t, T.sinks + .5, T.sinks + .9));
      else { O.arrow(ov, yp[0] - W * .12, yp[1] - H * .09, yp[0] - W * .02, yp[1] - H * .01, seg(t, T.grow + .5, T.grow + 1.0)); O.mark(ov, W * .5, H * .40, true, seg(t, T.top - .3, T.top + .1)); }
      if (t > T.hare + .3) O.arrow(ov, hp[0] + W * .1, hp[1] - H * .1, hp[0] + W * .02, hp[1] - H * .015, seg(t, T.hare + .3, T.hare + .8));
    };
  } else if (t < S.d) {
    // 3. thin air: the oxygen gauge drops, then the yak shows how it is done
    sky(0x7fa6d4, 60, 230);
    place(yeti, -.4, 0, 0, RIGHT - .5, 1);
    pose(yeti, 'WALK (BIGFOOT)', t * .5);
    yak.holder.visible = t > T.yak - .6; const yk = eo(seg(t, T.yak - .6, T.yak + .9));
    place(yak, lerp(6.5, 2.1, yk), 0, .6, -RIGHT - .15, 1);
    pose(yak, 'ArmatureAction', yk < 1 ? t * .9 : (t - T.yak) * .25);
    cam(V(.3, 1.8, 8.4), V(.3, 1.3, 0), 54); focus = V(0, 0, 0); dens = .2;
    const ox = t < T.tune ? lerp(.85, .25, eio(seg(t, T.thin, T.tune))) : lerp(.25, .9, eio(seg(t, T.yak, T.altitude + .3)));
    after = () => {
      O.meter(ov, W * .075, H * .36, H * .17, ox, 'OXYGEN', 1);
      showChip('THIN AIR', T.thin - .15, T.tune - .1, t);
      showChip('TUNED FOR LOW OXYGEN', T.tune - .05, T.yak - .1, t);
      showChip('YAK GENES: HIGH ALTITUDE', T.yak - .05, S.d, t);
      if (t < T.tune + 1.2) O.mark(ov, W * .52, H * .33, false, seg(t, T.thin + .3, T.thin + .7));
      else O.mark(ov, W * .52, H * .33, true, seg(t, T.altitude + .2, T.altitude + .6));
    };
  } else if (t < S.e) {
    // 4. winter, nothing to eat: a brown bear sleeps in its den on stored fat
    sky(0x8d9fb5, 8, 60); hemi.intensity = 1.2; sun.intensity = 1.4;
    den.visible = true; world.visible = true;
    if (t < T.sleep - .3) {
      place(yeti, lerp(-1.7, -.5, eio(seg(t, S.d, T.sleep - .4))), 0, 1.4, RIGHT - .3, .65); pose(yeti, 'WALK (BIGFOOT)', t * .8);
    } else {
      yeti.holder.visible = false; bear.holder.visible = true; const k = seg(t, T.sleep - .3, T.sleep + .5);
      place(bear, 0, 0, .3, RIGHT - .6, 1.5 * (.85 + .15 * eo(k))); pose(bear, 'Lying_Idle_01', t - T.sleep + .3);
    }
    cam(V(0, 2.0, 6.0), V(0, .9, 0), 54); focus = V(0, 0, 0); dens = 1;
    const fat = lerp(.95, .22, eio(seg(t, T.stored, S.e + .3)));
    after = () => {
      showChip('WINTER: NOTHING TO EAT', T.winter - .1, T.sleep - .2, t);
      showChip('SLEEP ON STORED FAT', T.sleep - .15, T.bear - .1, t);
      showChip('BROWN BEAR: HIBERNATION', T.bear - .05, S.e, t);
      O.meter(ov, W * .87, H * .40, H * .2, fat, 'FAT', seg(t, T.sleep, T.sleep + .4));
      if (t > T.sleep + .3) { const z = Math.floor((t * 1.4) % 3); const zp = toScreen(V(-.5 - z * .2, 1.3 + z * .35, .2)); ov.x.save(); ov.x.font = `${Math.round(W * .07 + z * W * .015)}px 'Lilita One'`; ov.x.fillStyle = '#fff'; ov.x.strokeStyle = '#141a22'; ov.x.lineWidth = 6; ov.x.strokeText('Z', zp[0], zp[1]); ov.x.fillText('Z', zp[0], zp[1]); ov.x.restore(); }
    };
  } else if (t < S.f) {
    // 5. now look at what you built: the yeti rears and roars
    const k = seg(t, S.e, S.f);
    place(yeti, 0, 0, 0, RIGHT - .55, 1); pose(yeti, t < T.built ? 'WALK (BIGFOOT)' : 'AGRESSIVE', t < T.built ? t * .5 : t - T.built + .3);
    cam(V(2.0, 1.9, 7.6), V(0, 1.5, 0), 52); dens = .3;
    after = () => {
      showChip('NOW LOOK AT WHAT YOU BUILT', T.now - .1, T.furry - .3, t);
      showChip('A BIG, FURRY BEAR', T.furry - .35, S.f + .6, t);
    };
  } else if (t < S.g) {
    // 5b. the yeti turns into a bear (flash and swap), then it drops to four legs
    const sw = T.bear2 - .15;
    flash = Math.max(0, 1 - Math.abs(t - sw) / .22);
    if (t < sw) { place(yeti, 0, 0, 0, RIGHT - .55, 1); pose(yeti, 'AGRESSIVE', t - T.built + .3); }
    else { yeti.holder.visible = false; bear.holder.visible = true; const k = seg(t, sw, sw + 1.2);
      place(bear, 0, 0, 0, RIGHT - .55, 1.5); pose(bear, 'StandHind_Idle_01', t - sw, 'Walk', t - sw, eio(seg(t, sw + .6, sw + 1.6))); }
    cam(V(2.0, 1.8, 7.0), V(0, 1.3, 0), 52); dens = .3;
    after = () => {
      showChip('NOW LOOK AT WHAT YOU BUILT', T.now - .1, T.furry - .3, t);
      showChip('A BIG, FURRY BEAR', T.furry - .35, S.g, t);
    };
  } else if (t < S.h) {
    // 6. nine yeti samples tested: one dog, eight Asian bears
    bear.holder.visible = true; yeti.holder.visible = false;
    place(bear, 0, 0, 1, RIGHT - .55, 1.5); pose(bear, 'WalkSlow', t * .8);
    cam(V(1.8, 1.9, 7.4), V(0, 1.0, 0), 52); dens = .3;
    after = () => {
      showChip('2017 DNA TEST: 9 YETI SAMPLES', T.nine - 1.4, T.dog - .1, t);
      showChip('ONE WAS A DOG', T.dog - .05, T.eight - .2, t);
      showChip('EIGHT WERE ASIAN BEARS', T.eight - .15, S.h, t);
      const x = ov.x, n = 9, tw = W * .085, gap = W * .014, x0 = (W - (n * tw + (n - 1) * gap)) / 2, ty = H * .255, th = tw * 1.1;
      const kind = ['b', 'b', 'b', 'd', 'b', 'b', 'b', 'b', 'b'];
      for (let i = 0; i < n; i++) {
        const at = i < 3 ? T.nine + .25 * i : i === 3 ? T.dog : T.eight - .2 + (i - 4) * .22;
        const a = clamp((t - (at - .1)) / .3); if (a <= 0) continue; const dog = kind[i] === 'd';
        x.save(); x.translate(x0 + i * (tw + gap) + tw / 2, ty); const sc = .6 + .4 * Math.min(1.2, a * 1.3); x.scale(sc, sc); x.globalAlpha = a;
        x.beginPath(); x.roundRect(-tw / 2, -th / 2, tw, th, tw * .2); x.fillStyle = dog ? '#7a2a2a' : '#3a2a1e'; x.fill(); x.lineWidth = 4; x.strokeStyle = dog ? '#ff6b5b' : '#e9b949'; x.stroke();
        x.fillStyle = '#fff'; x.font = `700 ${Math.round(tw * .3)}px 'Fredoka', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(dog ? 'DOG' : 'BEAR', 0, 0); x.restore();
      }
      texts.push({ id: 'tiles', text: '9 tiles', x0: x0, y0: ty - th / 2, x1: W - x0, y1: ty + th / 2, pass: true });
    };
  } else {
    // 7. the name: yeti comes from Tibetan words meaning "rock bear"; the legend grew from a real animal
    sky(0xe8b890, 25, 120); hemi.color.set(0xffe6c8); hemi.intensity = 1.4; sun.color.set(0xffc890); sun.intensity = 2.8; sun.position.set(-12, 8, 10);
    yeti.holder.visible = false; bear.holder.visible = true; const k = seg(t, S.h, S.end), x = lerp(-1.6, 1.4, k);
    place(bear, x, 0, .3, RIGHT - .3, 1.5); pose(bear, 'Walk', t * .8);
    cam(V(x + 1.6, 1.8, 7.0), V(x, 1.0, 0), 52); focus = V(x, 0, 0); dens = .15;
    after = () => {
      showChip('YETI = TIBETAN "ROCK BEAR"', T.name - .1, T.legend - .15, t);
      showChip('THE LEGEND GREW FROM A REAL ANIMAL', T.legend - .1, S.end, t);
    };
  }
  sun.position.add(focus); sun.target.position.copy(focus);
  snowfall(V(camera.position.x, 0, 0), t, dens);
  ground.position.set(camera.position.x, 0, 0);
  renderer.render(scene, camera);
  if (after) after();
  if (flash > 0) { ov.x.save(); ov.x.globalAlpha = flash * .9; ov.x.fillStyle = '#fff'; ov.x.fillRect(0, 0, W, H); ov.x.restore(); }
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'wind' }, { t: T.sinks, type: 'thud' }, { t: T.grow + .3, type: 'pop' }, { t: T.top, type: 'ding' }, { t: T.thin, type: 'buzz' },
  { t: T.altitude + .1, type: 'ding' }, { t: T.winter, type: 'wind' }, { t: T.sleep, type: 'snore' }, { t: T.furry, type: 'swell' }, { t: T.nine, type: 'blip' },
  { t: T.dog, type: 'buzz' }, { t: T.eight, type: 'blip' }, { t: T.rock, type: 'ding' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
