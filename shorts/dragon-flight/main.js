// How a 3-Tonne Dragon Could Actually Fly: picture = render(t)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp, seg, ss, eio, eo, back, mulberry, track } from '/core/lib.js';
import { makeSky, makeSlope, groundH } from './world.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.localClippingEnabled = true; renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 1200);
const HOR = new THREE.Color(0xd9b08c);
const fog = new THREE.Fog(HOR, 30, 260);
const sky = makeSky(scene);
const hemi = new THREE.HemisphereLight(0xbfc9d6, 0x3a2e28, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2c0, 2.4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 }); sun.shadow.bias = -.0005;
scene.add(sun); scene.add(sun.target);

const slope = makeSlope(); scene.add(slope.group);
// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
// ---------------------------------------------------------------- dragons
const gltf = await new GLTFLoader().loadAsync('models/dragon.glb');
const CLIP = n => gltf.animations.find(a => a.name.endsWith(n));
function makeDragon(height, tint) {
  const root = SkeletonUtils.clone(gltf.scene);
  const box = new THREE.Box3().setFromObject(root), h = box.max.y - box.min.y;
  const holder = new THREE.Group(); holder.add(root); root.scale.setScalar(height / h); root.position.y = -box.min.y * height / h;
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = mats.map(m => { const c = m.clone(); if (tint[c.name]) c.color.setRGB(...tint[c.name]); c.roughness = .7; return c; });
    if (o.material.length === 1) o.material = o.material[0]; } });
  const mixer = new THREE.AnimationMixer(root), acts = {};
  for (const n of ['Idle', 'Dragon_Attack2', 'Dragon_Hit', 'Death_A']) { const a = mixer.clipAction(CLIP(n)); a.play(); a.setEffectiveWeight(0); acts[n] = a; }
  const bone = n => root.getObjectByName(n);
  root.updateMatrixWorld(true); const eyes = root.getObjectByName('EyeArmature'); if (eyes) bone('Head').attach(eyes);   // eyes follow the head
  const bones = { neck: bone('Neck'), head: bone('Head'), body: bone('Body'), shL: bone('Shoulder.L'), shR: bone('Shoulder.R'), w1L: bone('Wing1.L'), w1R: bone('Wing1.R'), w2L: bone('Wing2.L'), w2R: bone('Wing2.R'), tail: bone('Tail1'), nose: bone('Nose') };
  scene.add(holder);
  return { holder, root, mixer, acts, bones, height };
}
const mother = makeDragon(9.0, { Main: [.30, .10, .07], Wings: [.20, .07, .06], Belly: [.80, .55, .22] });
// set a pose: main clip at time ta, optionally blended with clip b
function pose(d, a, ta, b = null, tb = 0, wb = 0) {
  for (const k in d.acts) d.acts[k].setEffectiveWeight(0);
  const A = d.acts[a]; A.setEffectiveWeight(1 - wb); A.time = ta % A.getClip().duration;
  if (b) { const B = d.acts[b]; B.setEffectiveWeight(wb); B.time = Math.min(tb, B.getClip().duration - .001); }
  d.mixer.update(0);
}
const eul = new THREE.Euler(), qq = new THREE.Quaternion();
function turn(bone, x, y, z) { if (!bone) return; qq.setFromEuler(eul.set(x, y, z)); bone.quaternion.multiply(qq); }
function flap(d, t, amt = 1, speed = 7) {   // wings up and down
  const s = Math.sin(t * speed) * amt, f = Math.sin(t * speed - .6) * amt;
  turn(d.bones.shL, 0, 0, -.9 * s - .2); turn(d.bones.shR, 0, 0, .9 * s + .2);
  turn(d.bones.w1L, 0, 0, -.5 * f); turn(d.bones.w1R, 0, 0, .5 * f);
  turn(d.bones.w2L, 0, 0, -.3 * f); turn(d.bones.w2R, 0, 0, .3 * f);
}
function headDown(d, k) { turn(d.bones.neck, .55 * k, 0, 0); turn(d.bones.head, .35 * k, 0, 0); }

// ---------------------------------------------------------------- particles (soft sprites)
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
function pool(n, color) { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, fog: false })); s.visible = false; scene.add(s); a.push(s); } return a; }
const dust = pool(70, 0xb5aca2), steam = pool(40, 0xf0ece6), sparks = pool(30, 0xffb040);
function hideAll() { for (const p of [dust, steam, sparks]) for (const s of p) s.visible = false; }
function burst(P, origin, t0, t, seed, n, spread = 2, up = 2, life = 1.6, size = .6) {
  const age = t - t0; if (age < 0 || age > life) return; const r = mulberry(seed);
  for (let i = 0; i < Math.min(n, P.length); i++) { const s = P[i], dx = (r() - .5) * spread, dz = (r() - .5) * spread, dy = r() * up, k = eo(age / life);
    s.visible = true; s.position.set(origin.x + dx * k * 1.6, origin.y + dy * k + .1, origin.z + dz * k * 1.6);
    s.scale.setScalar(size * (.35 + k * .9) * (.6 + r() * .8)); s.material.opacity = (1 - age / life) * .38; }
}
function plume(P, origin, t, seed, n, rise = 2.5, size = .7, op = .5) {   // continuous rising steam
  const r = mulberry(seed);
  for (let i = 0; i < Math.min(n, P.length); i++) { const s = P[i], ph = (t * .45 + r()) % 1;
    s.visible = true; s.position.set(origin.x + (r() - .5) * .5 + Math.sin(ph * 4 + i) * .2 * ph, origin.y + ph * rise, origin.z + (r() - .5) * .5);
    s.scale.setScalar(size * (.4 + ph * 1.6)); s.material.opacity = op * Math.sin(ph * Math.PI); }
}
// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];   // what is on screen this frame, for readcheck
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
const EV = [];
// SCENES
const S = { a: 0, b: 6.6, c: 11.62, d: 16.0, e: 23.6, f: 26.35, g: 30.45, h: 33.3, i: 41.5, end: 48.0 };
window.DUR = S.end;
const T = {
  tonne: wt('three-tonne'), ten: wt('ten'), never: wt('never'), hollow: wt('hollow'), snap: wt('snap'), breaks: wt('breaks'),
  struts: wt('struts'), vulture: wt("vulture's"), light: wt('light'), strong: wt('strong'), still: wt('still'), jump: wt('jump'),
  down: wt('down'), heat: wt('heat'), condor: wt('condor'), five: wt('five'), lift: wt('lift'),
};

// ---------------------------------------------------------------- the bone studio (a long bone, cut open)
const BX = -1000, BONE = V(BX, 1.0, 0);
const studio = new THREE.Group(); scene.add(studio);
{ const c = document.createElement('canvas'); c.width = 8; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#22303c'); g.addColorStop(1, '#0d141b'); x.fillStyle = g; x.fillRect(0, 0, 8, 256);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: tx, fog: false })); back.position.set(BX, 0, -8); studio.add(back); }
const clip = new THREE.Plane(new THREE.Vector3(-.7, 0, -1).normalize(), 2);
const boneOut = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: .55, clippingPlanes: [clip], clipShadows: true });
const boneIn = new THREE.MeshStandardMaterial({ color: 0x6e5446, roughness: .9, side: THREE.BackSide, clippingPlanes: [clip] });
function boneR(y) { const a = Math.abs(y); return .36 + .05 * Math.cos(y * 1.3) + .42 * Math.exp(-Math.pow((a - 2.85) / .38, 2)); }
function boneHalf(y0, y1) {   // lathe of the bone profile between y0 and y1 (closed at the far end)
  const pts = [], n = 40;
  if (Math.abs(y0) > 3) pts.push(new THREE.Vector2(.001, y0));
  for (let i = 0; i <= n; i++) { const y = lerp(y0, y1, i / n); pts.push(new THREE.Vector2(boneR(y), y)); }
  if (Math.abs(y1) > 3) pts.push(new THREE.Vector2(.001, y1));
  const g = new THREE.LatheGeometry(pts, 48), grp = new THREE.Group();
  const o = new THREE.Mesh(g, boneOut), i = new THREE.Mesh(g, boneIn); o.castShadow = true; grp.add(o, i); return grp;
}
const topHalf = boneHalf(0, 3.25), botHalf = boneHalf(-3.25, 0);
const boneGrp = new THREE.Group(); boneGrp.add(topHalf, botHalf); boneGrp.position.copy(BONE); studio.add(boneGrp);
// internal struts: a zigzag truss inside the hollow shaft
const struts = new THREE.Group(); boneGrp.add(struts);
{ const m = new THREE.MeshStandardMaterial({ color: 0xffc04a, emissive: 0xb07010, emissiveIntensity: .8, roughness: .4 });
  const seg3 = (a, b, r) => { const d = b.clone().sub(a), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), m);
    c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); struts.add(c); };
  for (let k = 0; k < 14; k++) { const y0 = -2.4 + k * .35, s = k % 2 ? 1 : -1;
    seg3(V(-.27 * s, y0, -.06), V(.27 * s, y0 + .35, -.06), .028); seg3(V(-.27, y0, -.06), V(.27, y0, -.06), .018); } }

// ---------------------------------------------------------------- volcano geometry
const CR = V(-30, 37.2, -150);    // crater centre
const RIM = V(-30, 37.0, -140.5); // where she stands before the jump

function useSet(name) {
  const st = name === 'studio';
  slope.group.visible = !st; studio.visible = st; mother.holder.visible = !st; scene.fog = st ? null : fog;
  if (st) { sun.position.set(BX + 5, 9, 9); sun.target.position.copy(BONE); sun.intensity = 2.2; hemi.intensity = .8; }
  else { sun.position.set(10, 16, 12); sun.target.position.set(0, 0, 0); sun.intensity = 2.4; hemi.intensity = 1.1; }
}
function aim(d, pos, vel, bank = 0) {   // place a flying dragon, facing its velocity
  d.holder.position.copy(pos);
  d.holder.rotation.set(0, 0, 0, 'YXZ'); d.holder.rotation.order = 'YXZ';
  d.holder.rotation.y = Math.atan2(vel.x, vel.z); d.holder.rotation.x = -Math.atan2(vel.y, Math.hypot(vel.x, vel.z)) * .8; d.holder.rotation.z = bank;
}

window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov);
  mother.holder.rotation.set(0, 0, 0); mother.holder.rotation.order = 'XYZ';
  topHalf.position.set(0, 0, 0); topHalf.rotation.set(0, 0, 0); botHalf.position.set(0, 0, 0); botHalf.rotation.set(0, 0, 0);
  struts.visible = false; clip.constant = 2;
  let after = null;

  if (t < S.b || (t >= S.e && t < S.f)) {
    // 1 / 5. flapping on the slope, going nowhere
    useSet('slope');
    const first = t < S.b, a0 = first ? S.a : S.e, p = seg(t, a0, first ? S.b : S.f);
    const hop = Math.max(0, Math.sin((t - a0) * 7.5)) * .35;
    mother.holder.position.set(1, groundH(1, -2) - .05 + hop, -2); mother.holder.rotation.y = -.35;
    pose(mother, 'Idle', t); flap(mother, t, 1, 15);
    burst(dust, V(1, groundH(1, -2), -2), a0 + .2, t, 3 + (first ? 0 : 5), 40, 9, 1.2, 2.2, 1.4);
    if (first) cam(V(lerp(9, 6.5, eio(p)), lerp(4.5, 3.8, eio(p)), lerp(20, 15.5, eio(p))), V(1, 4.0, -2));
    else cam(V(-5, 2.6, 13), V(.5, 4.2, -2), 50);
    after = () => {
      if (first) { showChip('3 TONNES', T.tonne - .1, T.ten - .1, t); showChip('10× THE BIGGEST FLYER', T.ten, S.b, t);
        const [mx, my] = toScreen(V(1, 4, -2)); O.mark(ov, mx + 170, my - 260, false, seg(t, T.never, T.never + .4)); }
      else showChip('STILL TOO HEAVY', T.still - .1, S.f, t);
    };
  } else if (t < S.e) {
    // 2–4. the bone: hollow, snaps, braced with struts
    useSet('studio');
    const cutK = eio(seg(t, T.hollow - .1, T.hollow + .8)); const C0 = .7 * BX / Math.hypot(.7, 1); clip.constant = lerp(C0 + 2, C0, cutK);
    const p = seg(t, S.b, S.e);
    if (t >= S.c && t < S.d) {
      const k = eo(seg(t, T.snap, T.snap + .35));
      topHalf.rotation.z = -.5 * k; topHalf.position.set(.35 * k, .25 * k, 0); botHalf.rotation.z = .35 * k; botHalf.position.set(-.25 * k, -.15 * k, 0);
      burst(dust, BONE, T.snap, t, 9, 30, 2, 1.2, 1.2, .35); burst(sparks, BONE, T.snap, t, 10, 20, 2.5, 1.5, .6, .2);
    }
    if (t >= S.d) struts.visible = true;
    boneGrp.rotation.y = lerp(-.25, .35, p); boneGrp.rotation.z = -.12;
    const press = t >= S.d ? Math.max(0, Math.sin(seg(t, T.strong, T.strong + .9) * Math.PI)) * .05 : 0;
    boneGrp.scale.set(1 + press, 1 - press, 1 + press);
    cam(V(BX + lerp(.8, -.6, p), 1.4, lerp(10.5, 8.6, p)), V(BX, .8, 0), 50);
    after = () => {
      showChip('HOLLOW BONES', T.hollow - .1, S.c, t);
      if (t >= S.c && t < S.d) { showChip('SNAP!', T.snap - .1, S.d, t); const [bx, by] = toScreen(BONE); O.mark(ov, bx + 230, by - 120, false, seg(t, T.breaks, T.breaks + .4)); }
      if (t >= S.d) {
        showChip('INTERNAL STRUTS', T.struts - .2, T.light - .1, t);
        showChip('LIGHT + STRONG', T.light, S.e, t);
        const [tx, ty] = toScreen(V(BX, 4.9, 0)), [ux, uy] = toScreen(V(BX, 3.7, 0));
        O.arrow(ov, tx, ty - 60, ux, uy, seg(t, T.strong - .1, T.strong + .4), '#f5c23a', 16);
        O.mark(ov, ux + 200, uy + 40, true, seg(t, T.strong + .6, T.strong + 1));
      }
    };
  } else if (t < S.g) {
    // 6. on the volcano rim; she jumps
    useSet('slope');
    const j = seg(t, T.jump, S.g), v = V(0, .4 - j * 1.4, 1);
    if (t < T.jump) { mother.holder.position.copy(RIM); mother.holder.rotation.y = .1; pose(mother, 'Idle', t); flap(mother, t, .25, 3); }
    else { const pos = RIM.clone().add(V(0, 2.2 * Math.sin(j * 2.2) - 3 * j * j, 12 * j)); aim(mother, pos, v); pose(mother, 'Idle', t); flap(mother, -.045, 1, 7); }
    const p = seg(t, S.f, S.g);
    cam(V(-30 + lerp(16, 12, p), 40.5 + p * 1.5, -140.5 + lerp(20, 24, p)), V(-30, 39 + 1.5 * p, -138 + 6 * p), 50);
    plume(steam, CR, t, 4, 30, 7, 3.5, .35);
    after = () => showChip('TOP OF A VOLCANO', T.jump - 1.4, S.g, t);
  } else if (t < S.h) {
    // 7. gliding only goes down
    useSet('slope');
    const k = seg(t, S.g, S.h), start = V(-30, 36, -122), end = V(-18, 18, -96);
    const pos = start.clone().lerp(end, k); aim(mother, pos, end.clone().sub(start)); pose(mother, 'Idle', t); flap(mother, -.045, 1, 7);
    cam(V(-2, 26 - k * 4, -100), V(pos.x, pos.y - 2, pos.z), 50);
    after = () => {
      showChip('ONLY DOWN', T.down - .1, S.h, t);
      const a = toScreen(pos.clone().add(V(0, -2, 3))), b = toScreen(V(-14, groundH(-14, -88) + .5, -88));
      O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.down - .4, T.down + .4), '#ff6b5b', 13, true);
    };
  } else {
    // 8–9. ride the thermal over the crater, then a wide soar
    useSet('slope');
    const u = t - S.h, ang = .55 * u + 1.2, R = 17;
    const pos = CR.clone().add(V(Math.cos(ang) * R, 4 + u * 1.9, Math.sin(ang) * R));
    const vel = V(-Math.sin(ang), .12, Math.cos(ang));
    aim(mother, pos, vel, .35); pose(mother, 'Idle', t); flap(mother, -.045 + Math.sin(t * .8) * .004, 1, 7);
    plume(steam, CR, t, 6, 30, 14, 5, .3); plume(sparks, CR.clone().add(V(0, 2, 0)), t * .7, 8, 24, 18, .5, .7);
    if (t < S.i) { const k = seg(t, S.h, S.i); cam(CR.clone().add(V(24, 10 + u * 1.9, 28)), pos.clone().multiplyScalar(.6).add(CR.clone().add(V(0, 2, 0)).multiplyScalar(.4)), lerp(52, 48, k)); }
    else { const k = eio(seg(t, S.i, S.end)); cam(CR.clone().add(V(lerp(30, 50, k), lerp(14, 22, k) + u * 1.6, lerp(36, 62, k))), pos.clone().multiplyScalar(.5).add(CR.clone().add(V(0, 4 + u * .8, 0)).multiplyScalar(.5)), 50); }
    after = () => {
      if (t < S.i) {
        showChip('RIDE THE HEAT', T.heat - .1, T.condor - .1, t);
        showChip('CONDOR: 5 HOURS, NO FLAPS', T.condor, S.i, t);
        for (let i = 0; i < 5; i++) { const x = -6 + i * 3; const a = toScreen(CR.clone().add(V(x, 1, 0))), b = toScreen(CR.clone().add(V(x * 1.4, 13, 0)));
          O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.heat + i * .1, T.heat + .7 + i * .1), '#ff9a3a', 12); }
      } else showChip('FOR THE LIFT', T.lift - .1, S.end, t);
    };
  }

  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

// ---------------------------------------------------------------- channel art: ?brand=pfp or ?brand=banner (render at t = 0)
const BRAND = new URLSearchParams(location.search).get('brand');
if (BRAND) window.render = () => {
  O.clear(ov); hideAll(); useSet('slope');
  if (BRAND === 'pfp') {
    mother.holder.position.set(0, groundH(0, 0), 0); mother.holder.rotation.set(0, .45, 0); pose(mother, 'Idle', .3);
    cam(V(3.6, 5.4, 7.2), V(.3, 4.3, 0), 40);
  } else {
    mother.holder.position.set(-.4, groundH(-.4, 4), 4); mother.holder.rotation.set(0, .6, 0); pose(mother, 'Idle', .3);
    cam(V(3.5, 4.0, 15.5), V(3.5, 4.4, 0), 44);
    plume(steam, CR, 3, 4, 30, 14, 5, .3);
  }
  for (const c of slope.group.children) if (c.isGroup) c.visible = c.position.distanceTo(camera.position) > 16 && Math.abs(c.position.x - camera.position.x) > 6;
  sky.position.copy(camera.position); renderer.render(scene, camera);
  if (BRAND === 'banner') {
    const x = ov.x; x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.font = `${Math.round(H * .12)}px 'Lilita One', sans-serif`; x.lineWidth = H * .022; x.strokeStyle = 'rgba(10,10,12,.95)';
    x.strokeText('FABLE PHYSICS', W * .6, H * .47); x.fillStyle = '#fff'; x.fillText('FABLE PHYSICS', W * .6, H * .47);
    x.font = `700 ${Math.round(H * .037)}px 'Fredoka', sans-serif`; x.lineWidth = H * .012;
    x.strokeText('how mythical creatures would really work', W * .6, H * .555); x.fillStyle = '#ffd36b'; x.fillText('how mythical creatures would really work', W * .6, H * .555);
    x.restore();
  }
};
window.TEXTS = () => texts.slice();
EV.push({ t: S.a + .2, type: 'flaps' }, { t: T.never, type: 'thud' }, { t: T.hollow, type: 'whoosh' }, { t: T.snap, type: 'crunch' }, { t: T.struts, type: 'tick' },
  { t: T.strong + .1, type: 'thud' }, { t: T.strong + .6, type: 'ding' }, { t: S.e + .2, type: 'flaps' }, { t: T.jump, type: 'whoosh' }, { t: T.down, type: 'whoosh' }, { t: T.heat, type: 'rumble' }, { t: T.lift, type: 'ding' });
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
