// Meet the Mapinguari (intro short): picture = render(t)
// Rebrand look: animated game 3D models (GLB) on a jungle set of Kenney CC0 props. Mixers are driven from the frame time only.
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
const bg = new THREE.Color(0xa9d6b4), fog = new THREE.Fog(0xa9d6b4, 25, 110); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xdcecff, 0x9aa8b8, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6); sun.position.set(10, 22, 14); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 70 }); sun.shadow.bias = -.0006;
scene.add(sun); scene.add(sun.target);

// ---------------------------------------------------------------- loading
const gl = new GLTFLoader();
const load = n => gl.loadAsync('models/' + n + '.glb');
const gSloth = await load('megatherium');
const PROPS = {};
const NAMES = ['tree_palmTall', 'tree_palmDetailedTall', 'tree_palmBend', 'tree_fat', 'tree_oak', 'plant_bushLarge', 'plant_bushDetailed', 'plant_bush', 'plant_bushLargeTriangle', 'log', 'log_large', 'stump_old', 'lily_large', 'rock_largeA', 'rock_smallA', 'stone_largeB', 'flower_redA', 'flower_yellowA', 'grass_large', 'mushroom_redGroup'];
await Promise.all(NAMES.map(async n => { PROPS[n] = (await load(n)).scene; }));

// ---------------------------------------------------------------- actors: model + mixer, posed from the frame time
function makeActor(g, height, { tint = {}, yawFix = 0, base = 'idle', cullRe = null, pin = null } = {}) {
  const root = SkeletonUtils.clone(g.scene);
  const acts = {}, mixer = new THREE.AnimationMixer(root);
  const holder = new THREE.Group(), fix = new THREE.Group(); fix.rotation.y = yawFix; holder.add(fix); fix.add(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const nm = ms.map(m => { const c = m.clone(); if (tint.color) c.color.multiply(tint.color.isColor ? tint.color : new THREE.Color(tint.color)); if (tint.rough != null) c.roughness = tint.rough; if (tint.cutout) { c.transparent = false; c.depthWrite = true; c.alphaTest = tint.cutout; } return c; });
    o.material = nm.length === 1 ? nm[0] : nm; } });
  if (cullRe) root.traverse(o => { if (o.isSkinnedMesh) {   // drop the stray flat shoulder sheet: faces whose three vertices all belong to the clavicle bones
    const names = o.skeleton.bones.map(b => cullRe.test(b.name)), si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
    const dom = i => { let b = 0, bw = -1; for (let c = 0; c < 4; c++) if (sw.getComponent(i, c) > bw) { bw = sw.getComponent(i, c); b = si.getComponent(i, c); } return names[b]; };
    const ix = o.geometry.index.array, keep = []; for (let f = 0; f < ix.length; f += 3) if (!(dom(ix[f]) || dom(ix[f + 1]) || dom(ix[f + 2]))) keep.push(ix[f], ix[f + 1], ix[f + 2]);
    o.geometry = o.geometry.clone(); o.geometry.setIndex(keep); } });
  const clip = n => g.animations.find(a => a.name.trim() === n.trim()) || g.animations.find(a => a.name.trim().endsWith('|' + n.trim()));
  const a0 = clip(base) || g.animations[0]; const act0 = mixer.clipAction(a0); act0.play(); acts[base] = act0; mixer.update(0);   // register it so pose() can turn it off (otherwise it blends 50/50 into every move)
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true), h = box.max.y - box.min.y, k = height / h;
  root.scale.multiplyScalar(k); root.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
  const A = { holder, root, mixer, acts, g, clip, height, k };
  A.feet = []; root.traverse(o => { if (o.isBone && /foot/i.test(o.name) && !/steps|toe/i.test(o.name)) A.feet.push(o); });
  A.pin = []; if (pin) root.traverse(o => { if (o.isBone) for (const [re, v] of pin) if (re.test(o.name)) A.pin.push([o, new THREE.Vector3(...v)]); });   // bones whose rest offset is broken and that no clip moves
  scene.add(holder); return A;
}
// pose: clip a at time ta (looping), optionally blended with clip b
function pose(A, a, ta, b = null, tb = 0, wb = 0) {
  for (const n in A.acts) A.acts[n].setEffectiveWeight(0);
  const get = n => { if (!A.acts[n]) { const c = A.clip(n); if (!c) throw new Error('clip ' + n); const x = A.mixer.clipAction(c); x.play(); A.acts[n] = x; } return A.acts[n]; };
  const X = get(a), d = X.getClip().duration; X.setEffectiveWeight(1 - wb); X.time = ((ta % d) + d) % d;
  if (b) { const Y = get(b), e = Y.getClip().duration; Y.setEffectiveWeight(wb); Y.time = ((tb % e) + e) % e; }
  A.mixer.update(0);
  for (const [b, v] of A.pin) b.position.copy(v);
  if (A.hide) for (const b of A.hide) b.scale.setScalar(.0001);   // drop the held shield / weapon pieces
  if (A.center) { A.holder.updateMatrixWorld(true); const bx = new THREE.Box3().setFromObject(A.holder, true); A.holder.position.x += A.tx - (bx.min.x + bx.max.x) / 2; A.holder.position.z += A.tz - (bx.min.z + bx.max.z) / 2; }   // cancel root motion: hold the model on its mark
}
function place(A, x, y, z, ry = 0, s = 1) { A.tx = x; A.tz = z; A.holder.position.set(x, y, z); A.holder.rotation.y = ry; A.holder.scale.setScalar(s); }

const sloth = makeActor(gSloth, 2.3, { base: 'ArmatureAction' });
sloth.center = true;
const SLOTH_YAW = 0;            // set after the first still: which way the model faces

// ---------------------------------------------------------------- the set: jungle floor, Kenney palms, bushes, logs
const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7a35, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), grassMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const world = new THREE.Group(); scene.add(world);
const tintCache = new Map();
function tinted(src, hex, mix) {
  const root = SkeletonUtils.clone(src);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const key = m.uuid + hex + mix; if (!tintCache.has(key)) { const c = m.clone(); if (mix > 0) { c.map = null; c.color.set(hex).lerp(new THREE.Color(0xffffff), .12); } c.roughness = .95; tintCache.set(key, c); } return tintCache.get(key); });
    if (o.material.length === 1) o.material = o.material[0]; } });
  return root;
}
function prop(name, x, y, z, s, ry, hex = 0x4f8a34, mix = 0, parent = world) {
  const o = tinted(PROPS[name], hex, mix); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = ry; parent.add(o); return o;
}
const GREEN = [0x3f7a2c, 0x4f8a34, 0x356b2a];
{
  const r = mulberry(11), trees = ['tree_palmTall', 'tree_palmDetailedTall', 'tree_palmBend', 'tree_fat', 'tree_oak'], bush = ['plant_bushLarge', 'plant_bushDetailed', 'plant_bush', 'plant_bushLargeTriangle'];
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 90, z = -6 - r() * 50; prop(trees[i % 5], x, 0, z, 3.4 + r() * 2.6, r() * 6.28); }
  for (let i = 0; i < 60; i++) { const x = (r() - .5) * 60, z = -3 - r() * 30; prop(bush[i % 4], x, 0, z, 1.6 + r() * 1.6, r() * 6.28); }
  for (let i = 0; i < 14; i++) prop(['log', 'log_large', 'stump_old', 'rock_smallA', 'mushroom_redGroup'][i % 5], (r() - .5) * 50, 0, -2 - r() * 14, 1.6 + r() * 1.2, r() * 6.28);
  for (let i = 0; i < 30; i++) prop(['flower_redA', 'flower_yellowA', 'grass_large'][i % 3], (r() - .5) * 50, 0, 1 - r() * 12, 1.8 + r() * .8, r() * 6.28, 0xffffff, 0);
  for (const [x, z, s] of [[-7, .6, 2.2], [7.5, .2, 2.4], [-9, -2, 3.0], [10, -2, 2.8]]) prop('plant_bushLarge', x, 0, z, s, x);   // framing bushes at the edge
  for (const [x, z, s] of [[-11, -3, 6], [12, -4, 6.4]]) prop('tree_palmTall', x, 0, z, s, x);
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
const S = { a: 0, b: wt('meet') - .3, c: wt('in') - .3, d: wt('bullets') - .3, e: wt('some') - .3, f: wt('others') - .3, g: wt('now') - .3, h: wt('its', 3) - .3, i: wt('they') - .3 };
S.end = words[words.length - 1].t1 + 1.3;
window.DUR = S.end;

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.position.copy(pos); camera.lookAt(look.x, look.y + .35, look.z); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function sky(hex, near, far) { bg.set(hex); fog.color.copy(bg); fog.near = near; fog.far = far; }
const DAY = 0xa9d6b4;
const WALK_V = .55;             // ground speed (m/s) of the walk clip at 1x (checked in the stills)
const RIGHT = Math.PI / 2;      // facing +x (profile to a camera on +z)
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const motes = []; for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff4b0, transparent: true, depthWrite: false, fog: false })); s.visible = false; scene.add(s); motes.push(s); }
const MR = (() => { const r = mulberry(31), a = []; for (let i = 0; i < 90; i++) a.push([r(), r(), r(), r()]); return a; })();
function fireflies(c, t, on) { for (let i = 0; i < motes.length; i++) { const s = motes[i]; s.visible = on > 0; if (!s.visible) continue; const [a, b, cc, d] = MR[i];
  s.position.set(c.x + (a - .5) * 14 + Math.sin(t * .7 + i) * .5, .4 + b * 4.5 + Math.sin(t * .9 + i * 2) * .3, c.z + (cc - .5) * 8 - 1); s.scale.setScalar(.08 + d * .1); s.material.opacity = .8 * on * (.5 + .5 * Math.sin(t * 2 + i)); } }
// stink: green wavy lines rising off the beast
function stink(x, a) {
  const c = ov.x; c.save(); c.lineWidth = 9; c.lineCap = 'round'; c.strokeStyle = `rgba(150,220,90,${.85 * a})`;
  for (let k = 0; k < 4; k++) { const bx = ov.W * (.33 + k * .1), t = (x * 1.2 + k * .5) % 1; c.beginPath();
    for (let j = 0; j <= 16; j++) { const u = j / 16, px = bx + Math.sin(u * 7 + x * 3 + k) * ov.W * .018, py = ov.H * (.47 - u * .17 - t * .02); j ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
  c.restore();
}

window.render = (t) => {
  texts.length = 0; O.clear(ov);
  world.visible = true;
  world.position.x = 8 - WALK_V * t;
  sky(DAY, 25, 110); hemi.color.set(0xe6ffe0); hemi.intensity = 1.5; sun.color.set(0xfff0c8); sun.intensity = 2.4; sun.position.set(10, 22, 14);
  let after = null, flash = 0, focus = V(0, 0, 0), fly = 0;
  const walk = k => pose(sloth, 'ArmatureAction', t * k);

  if (t < S.b) {
    // 1. hook: a huge shape walks through the rainforest
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW, 1); walk(1);
    cam(V(1.5, 1.8, 11), V(0, 1.2, 0), 50);
    after = () => { showChip('BRAZIL · FOLKLORE', .2, S.b, t); };
  } else if (t < S.c) {
    // 2. the name
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .35, 1); walk(1);
    cam(V(1.6, 1.5, 7.2), V(0, 1.1, 0), 50);
    after = () => {
      showChip('MEET THE MAPINGUARI', T.meet - .2, S.c, t);
      O.ring(ov, W * .5, H * .43, W * .32, seg(t, T.mapinguari, T.mapinguari + .4));
    };
  } else if (t < S.d) {
    // 3. huge, hairy, smelly
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .15, 1); walk(1);
    cam(V(1.8, 1.7, 7.6), V(0, 1.2, 0), 50);
    after = () => {
      showChip('AMAZON RAINFOREST', T.amazon - .1, T.huge - .1, t);
      showChip('HUGE · HAIRY', T.huge - .05, T.smell - .1, t);
      showChip('A TERRIBLE SMELL', T.smell - .05, S.d, t);
      if (t > T.smell) stink(t, eo(seg(t, T.smell, T.smell + .5)));
    };
  } else if (t < S.e) {
    // 4. bullets bounce off its skin
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .1, 1); walk(1);
    cam(V(1.8, 1.7, 7.4), V(0, 1.2, 0), 50);
    after = () => {
      showChip('BULLETPROOF SKIN', T.bounce - .5, S.e, t);
      const hit = [W * .46, H * .46], dt = t - (T.bounce - .35);
      for (let k = 0; k < 3; k++) { const a = dt - k * .22; if (a < 0 || a > .9) continue;
        const inc = Math.min(1, a / .22), out = a > .22 ? (a - .22) / .6 : 0, x0 = W * .05, y0 = H * (.38 + k * .06) ;
        const px = a < .22 ? x0 + (hit[0] - x0) * inc : hit[0] - out * W * .22, py = a < .22 ? y0 + (hit[1] + k * 22 - y0) * inc : hit[1] + k * 22 - out * H * .09 + out * out * H * .12;
        ov.x.save(); ov.x.fillStyle = '#ffd34a'; ov.x.strokeStyle = '#2a2a2a'; ov.x.lineWidth = 3; ov.x.beginPath(); ov.x.arc(px, py, 12, 0, 6.3); ov.x.fill(); ov.x.stroke(); ov.x.restore();
        if (a > .2 && a < .5) O.ring(ov, hit[0], hit[1] + k * 22, W * .06 * (a - .2) / .3, 1, '#ffffff'); }
      if (t > T.bounce + .5) O.mark(ov, W * .5, H * .33, false, seg(t, T.bounce + .5, T.bounce + .9));
    };
  } else if (t < S.f) {
    // 5. one eye, a mouth on the belly
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .5, 1); walk(1);
    cam(V(2.2, 1.6, 6.4), V(0, 1.2, 0), 50);
    after = () => {
      showChip('SOME TELLINGS: ONE BIG EYE', T.eye - .8, T.mouth - .1, t);
      showChip('A MOUTH ON ITS BELLY', T.mouth - .05, S.f, t);
      const head = toScreen(V(1.0, 1.9, 0)), belly = toScreen(V(0, .9, 0.2));
      if (t < T.mouth - .1) { O.ring(ov, head[0], head[1], W * .09, seg(t, T.eye - .3, T.eye + .1)); }
      else { O.arrow(ov, W * .8, H * .50, belly[0] + W * .08, belly[1], seg(t, T.mouth, T.mouth + .5)); }
    };
  } else if (t < S.g) {
    // 6. feet point backwards: the tracks fool the tracker
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .2, 1); walk(1);
    cam(V(1.8, 1.7, 7.6), V(0, 1.1, 0), 50);
    after = () => {
      showChip('OTHERS: FEET POINT BACKWARDS', T.feet - .5, S.g, t);
      const f = toScreen(V(.2, .1, 0.6));
      O.arrow(ov, f[0] - W * .22, f[1] + H * .02, f[0] - W * .02, f[1] + H * .02, seg(t, T.feet, T.feet + .5), '#ff6b5b');
      if (t > T.back) O.mark(ov, W * .5, H * .33, false, seg(t, T.back, T.back + .4));
    };
  } else if (t < S.h) {
    // 7. the real mystery: giants, ground sloths, Megatherium measured
    sky(0xc4e6c0, 30, 120); sun.color.set(0xffe2a8);
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .05, 1.15); walk(1);
    cam(V(0, 1.6, 9.2), V(0, 1.2, 0), 50);
    after = () => {
      showChip('THE REAL MYSTERY', T.mystery - .1, T.ground - .1, t);
      showChip('GIANT GROUND SLOTHS', T.ground - .05, T.mega - .1, t);
      showChip('MEGATHERIUM: 6 M · 4 TONNES', T.mega - .05, S.h, t);
      const a = toScreen(V(-1.9, -.05, 0.3)), b = toScreen(V(1.9, -.05, 0.3));
      if (t > T.six) { const p = eo(seg(t, T.six - .1, T.six + .6)); O.arrow(ov, W * .5, a[1] + H * .045, W * .06, a[1] + H * .045, p, '#f5c23a', 10); O.arrow(ov, W * .5, a[1] + H * .045, W * .94, a[1] + H * .045, p, '#f5c23a', 10); }
      if (t > T.tonnes - .3) O.mark(ov, W * .5, H * .33, true, seg(t, T.tonnes - .3, T.tonnes + .1));
    };
  } else if (t < S.i) {
    // 8. Mylodon: bony plates inside the skin (cutaway panel)
    sky(0xc4e6c0, 30, 120);
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .05, 1); walk(1);
    cam(V(0, 1.3, 8.4), V(0, 1.1, 0), 50);
    after = () => {
      showChip('ITS COUSIN MYLODON', T.mylodon - .1, T.plates - .15, t);
      showChip('BONY PLATES IN THE SKIN', T.plates - .1, S.i, t);
      const k = eo(seg(t, T.plates - .1, T.plates + .5)), x = ov.x, pw = W * .62, ph = H * .13, px = W / 2 - pw / 2, py = H * .24;
      x.save(); x.globalAlpha = k; x.beginPath(); x.roundRect(px, py, pw, ph, 22); x.fillStyle = 'rgba(14,20,24,.82)'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#e9b949'; x.stroke(); x.clip();
      x.fillStyle = '#7a4f34'; x.fillRect(px, py + ph * .2, pw, ph * .3);   // hide
      x.fillStyle = '#b8895c'; x.fillRect(px, py + ph * .5, pw, ph * .5);    // flesh
      const n = 9; for (let i = 0; i < n; i++) { const bx = px + pw * (i + .5) / n; x.beginPath(); x.ellipse(bx, py + ph * .36, pw * .04, ph * .1, 0, 0, 6.3); x.fillStyle = '#f2ead6'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3a2a1e'; x.stroke(); }
      x.restore();
      texts.push({ id: 'panel', text: 'skin cutaway', x0: px, y0: py, x1: px + pw, y1: py + ph, pass: true });
    };
  } else {
    // 9. gone 12,000 years ago... could one hide in the forest? dusk
    sky(0xe8b078, 12, 70); hemi.color.set(0xffd8b0); hemi.intensity = 1.1; sun.color.set(0xffa860); sun.intensity = 2.2; sun.position.set(-12, 7, 10);
    const k = seg(t, S.i, S.end);
    place(sloth, 0, 0, 0, RIGHT + SLOTH_YAW - .25, 1); walk(.8);
    cam(V(2.0, 1.6, 8.0), V(0, 1.1, 0), 50); fly = eo(seg(t, S.i + 1, S.i + 3));
    after = () => {
      showChip('GONE ~12,000 YEARS AGO', T.vanished - .1, T.hidden - .6, t);
      showChip('COULD ONE HAVE HIDDEN?', T.hidden - .5, S.end, t);
    };
  }
  sun.position.add(focus); sun.target.position.copy(focus);
  fireflies(V(camera.position.x * 0, 0, 0), t, fly);
  ground.position.set(camera.position.x, 0, 0);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'wind' }, { t: T.mapinguari, type: 'swell' }, { t: T.smell, type: 'buzz' }, { t: T.bounce, type: 'thud' }, { t: T.bounce + .2, type: 'thud' }, { t: T.bounce + .4, type: 'thud' },
  { t: T.eye, type: 'blip' }, { t: T.mouth, type: 'blip' }, { t: T.back, type: 'buzz' }, { t: T.mega, type: 'ding' }, { t: T.tonnes, type: 'ding' }, { t: T.plates, type: 'pop' }, { t: T.hidden, type: 'swell' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
