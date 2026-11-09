// How a Dragon Would Hatch Its Eggs in a Volcano: picture = render(t)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { clamp, lerp, seg, ss, eio, eo, back, mulberry, track } from '/core/lib.js';
import { makeSky, makeSlope, makeCutaway, makeEggMaterial, drawCracks, groundH, CUT } from './world.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
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
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sun.shadow.bias = -.0005;
scene.add(sun); scene.add(sun.target);

const slope = makeSlope(); scene.add(slope.group);
const cut = makeCutaway(); scene.add(cut.group);

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const S = { s1: 0, s2: 6.3, s3: 12.3, s4: 18.2, s5: 25.6, s6: 30.8, s7: 36.8, s8: 41.3, s9a: 47.2, s9b: 49.8, s9c: 52.8, end: 57.0 };
window.DUR = S.end;
const T = {
  months: wt('months'), ton: wt('three-ton'), crush: wt('crushes'), bury: wt('bury'), warm: wt('warm'), maleo: wt('maleo'),
  thousand: wt('thousand'), bury2: wt('bury', 1), cooked: wt('cooked'), test: wt('test'), mallee: wt('malleefowl'), perfect: wt('perfect'),
  t34: wt('thirty-four'), metre: wt('metre'), how: wt('how'), pores: wt('pores'), thousands: wt('thousands'), air: wt('air'), stale: wt('stale'),
  stone: wt('stone'), trapped: wt('trapped'), tooth: wt('tooth'), chips: wt('chips'), out: wt('out', 1), never: wt('never'), digs: wt('digs'), flies: wt('flies'),
};

// ---------------------------------------------------------------- the egg (one mesh, moved between sets)
const eggM = makeEggMaterial(); drawCracks(eggM, 0); eggM.mat.map = eggM.crackTex;
const eggGeo = new THREE.SphereGeometry(.5, 48, 32); eggGeo.scale(1, 1.3, 1);
const egg = new THREE.Mesh(eggGeo, eggM.mat); egg.castShadow = egg.receiveShadow = true; scene.add(egg);
const egg2 = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({ map: eggM.map, roughness: .6, emissive: 0x000000 })); scene.add(egg2);   // the one buried too close to the lava
// shell fragments for the hatch
const shards = [];
{ const r = mulberry(31); const sm = new THREE.MeshStandardMaterial({ map: eggM.map, roughness: .6, side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) { const g = new THREE.SphereGeometry(.5, 6, 4, r() * 6, .7 + r() * .6, r() * 2.4, .6 + r() * .5); g.scale(1, 1.3, 1);
    const m = new THREE.Mesh(g, sm); m.userData = { dir: new THREE.Vector3(r() - .5, r() * .9 + .2, r() - .5).normalize(), sp: 2 + r() * 3, rot: new THREE.Vector3(r() * 8, r() * 8, r() * 8) }; m.visible = false; scene.add(m); shards.push(m); } }

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
const mother = makeDragon(4.2, { Main: [.30, .10, .07], Wings: [.20, .07, .06], Belly: [.80, .55, .22] });
const baby = makeDragon(.9, { Main: [.62, .28, .12], Wings: [.48, .20, .10], Belly: [.95, .75, .40] });

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
function useSet(name) {
  const isCut = name === 'cut';
  slope.group.visible = !isCut; cut.group.visible = isCut;
  scene.fog = isCut ? null : fog;
  if (isCut) { sun.position.set(CUT.x + 6, 12, 16); sun.target.position.set(CUT.x, -4, 4); sun.intensity = 2.0; hemi.intensity = 1.0; }
  else { sun.position.set(10, 16, 12); sun.target.position.set(0, 0, 0); sun.intensity = 2.4; hemi.intensity = 1.1; }
}
const NEST = V(0, groundH(0, .6) + .65, .6);
const cx = CUT.x, FACE = CUT.d / 2;
const EGG_DEEP = V(cx + 1, -4.4, FACE + .45);

let crackDrawn = -1;
function setCracks(a) { const q = Math.round(a * 20) / 20; if (q !== crackDrawn) { drawCracks(eggM, q); crackDrawn = q; } }
function shellXray(k) {   // 0 = normal egg, 1 = see-through
  const m = eggM.mat; if (m.transparent !== (k > 0)) m.needsUpdate = true; m.transparent = k > 0; m.opacity = 1 - .8 * k; m.depthWrite = k < .5;
  m.emissive.setRGB(.15 * k, .45 * k, .55 * k); m.color.setRGB(1 - .3 * k, 1 - .05 * k, 1);
}

const texts = [];   // what is on screen this frame, for readcheck
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
const EV = [];

// ---------------------------------------------------------------- the frame
window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov);
  for (const s of shards) s.visible = false;
  egg.visible = true; egg.castShadow = true; egg2.visible = false; egg.scale.set(1, 1, 1); egg.rotation.set(0, 0, 0); shellXray(0); eggM.mat.map = eggM.crackTex; setCracks(0);
  mother.holder.visible = true; baby.holder.visible = false; mother.holder.rotation.set(0, 0, 0); baby.holder.rotation.set(0, 0, 0);
  slope.stripe.material.opacity = 0;
  let after = null;   // overlay drawn after the 3D frame (needs the camera)

  if (t < S.s2) {
    // 1. the mother and her egg on the slope; she sits and crushes it
    useSet('slope');
    const p = seg(t, 0, S.s2);
    cam(V(lerp(5.2, 3.0, eio(p)), lerp(2.6, 2.0, eio(p)), lerp(9.5, 6.4, eio(p))), V(.7, 1.5, -.3));
    egg.position.copy(NEST);
    const sit = eio(seg(t, T.ton + .2, T.crush - .05));
    mother.holder.position.set(lerp(2.6, .35, sit), groundH(1, -1) - .05 - .55 * sit, lerp(-1.4, -.35, sit)); mother.holder.rotation.y = lerp(-.5, -.15, sit);
    pose(mother, 'Idle', t * .9);
    const c = seg(t, T.crush, T.crush + .15);
    if (c > 0) { egg.scale.set(1 + .45 * c, 1 - .62 * c, 1 + .45 * c); egg.position.y = NEST.y - .4 * c; setCracks(c); }
    burst(dust, V(NEST.x, NEST.y - .5, NEST.z + .3), T.crush, t, 3, 26, 3, .8, 1.4, .5);
    after = () => {
      showChip('3 MONTHS', T.months - .4, T.ton - .15, t);
      showChip('≈ 3 TONNES', T.ton, S.s2, t);
      const top = toScreen(V(.6, 4.6, -.4)), low = toScreen(V(.5, 2.6, -.3));
      O.arrow(ov, top[0], top[1], low[0], low[1], seg(t, T.ton + .1, T.ton + .6) * (t < T.crush + .3 ? 1 : 0));
      const e = toScreen(NEST); O.mark(ov, e[0] + 120, e[1] - 160, false, seg(t, T.crush + .2, T.crush + .6));
    };
  } else if (t < S.s4) {
    // 2–3. the cutaway: bury it in warm ash; the lava vein next door
    useSet('cut'); mother.holder.visible = t < S.s3;
    const sink = eio(seg(t, T.bury - .1, T.bury + 2.6));
    egg.position.set(EGG_DEEP.x, lerp(.9, EGG_DEEP.y, sink), EGG_DEEP.z); egg.rotation.z = sink * .4;
    mother.holder.position.set(cx - 2.8, 0, 1.2); mother.holder.rotation.y = .5; pose(mother, 'Idle', t);
    if (t < S.s3) {
      const p = seg(t, S.s2, S.s3);
      cam(V(cx + .6, lerp(-1.2, -2.6, eio(p)), 17.5), V(cx + .4, lerp(-2.6, -3.6, eio(p)), FACE));
      after = () => {
        showChip('MALEO BIRD', T.maleo - .1, S.s3, t);
        for (let i = 0; i < 4; i++) { const a = toScreen(V(cx - .5 + i * .5 + .25, -7.2, FACE + .2)), b = toScreen(V(cx - .5 + i * .5 + .25, -5.6, FACE + .2));
          O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.warm + i * .12, T.warm + .6 + i * .12), '#ff9a3a', 11); }
      };
    } else {
      const p = seg(t, S.s3, S.s4);
      cam(V(cx + lerp(.6, -3.6, eio(p)), lerp(-3.6, -5.8, eio(p)), lerp(17, 10.5, eio(p))), V(cx + lerp(.2, -4.2, eio(p)), lerp(-3.9, -6.4, eio(p)), FACE));
      const k = seg(t, T.bury2, T.bury2 + .6), cook = seg(t, T.cooked - .4, T.cooked + .5);
      egg2.visible = k > 0; egg2.scale.setScalar(.95 * back(k)); egg2.position.set(cx - 4.4, -6.3, FACE + .45); egg2.rotation.z = -.3;
      egg2.material.emissive.setRGB(.9 * cook, .18 * cook, .02 * cook); egg2.material.color.setRGB(1 - .75 * cook, 1 - .82 * cook, 1 - .85 * cook);
      if (cook > .2) plume(steam, V(cx - 4.4, -5.8, FACE + .6), t, 5, 16, 2.2, .6, .55 * cook);
      after = () => {
        showChip('1,000°C+', T.thousand - .1, S.s4, t);
        const e = toScreen(V(cx - 4.4, -6.3, FACE)); O.mark(ov, e[0] + 150, e[1] - 150, false, seg(t, T.cooked + .2, T.cooked + .6));
      };
    }
  } else if (t < S.s5) {
    // 4. testing the ground with her snout, from hot (by the vent) to just right (34 °C)
    useSet('slope'); egg.visible = false;
    const p = seg(t, S.s4, S.s5), walk = eio(seg(t, T.test + .3, T.t34 + .2));
    const hx = lerp(6.0, -1.0, walk);
    mother.holder.position.set(hx + 2.0, groundH(hx, -2.4) - .05, -2.6); mother.holder.rotation.y = -Math.PI / 2 + .35;
    pose(mother, 'Idle', t * .8); headDown(mother, ss(seg(t, T.test, T.test + .8)));
    slope.stripe.material.opacity = .75 * ss(seg(t, T.test + .2, T.test + 1));
    plume(steam, V(7, groundH(7, -3), -3), t, 9, 24, 3.5, .9, .45);
    cam(V(lerp(4.4, .6, eio(p)), .8, 4.6), V(lerp(4.4, .2, eio(p)), 1.0, -2.4), 50);
    const temp = lerp(85, 34, walk);
    after = () => {
      showChip('LIKE A MALLEEFOWL', T.mallee - .1, T.t34 - .5, t);
      showChip('PERFECT SPOT', T.t34, S.s5, t);
      const hue = temp > 60 ? '#ff4b2b' : temp > 40 ? '#ffb43a' : '#5fe07a';
      O.readout(ov, W / 2, H * .30, temp, hue, ss(seg(t, T.test + .3, T.test + .8)));
      O.mark(ov, W / 2 + 120, H * .30, true, seg(t, T.t34 + .2, T.t34 + .6));
    };
  } else if (t < S.s6) {
    // 5. buried a metre deep: how does it breathe?
    useSet('cut'); mother.holder.visible = false;
    egg.position.copy(EGG_DEEP); egg.rotation.z = .4;
    const p = seg(t, S.s5, S.s6);
    cam(V(cx + 2.2, lerp(.4, -3.0, eio(p)), 12.5), V(cx + 1.2, lerp(-.6, -3.6, eio(p)), FACE));
    after = () => {
      const a = toScreen(V(cx + 2.6, 0, FACE + .3)), b = toScreen(V(cx + 2.6, EGG_DEEP.y + .65, FACE + .3));
      O.ruler(ov, a[0], a[1], b[1], seg(t, T.metre - .2, T.metre + .9), '1 m');
      showChip('1 METRE DEEP', T.metre, T.how - .1, t);
      showChip('HOW DOES IT BREATHE?', T.how, S.s6, t);
    };
  } else if (t < S.s7) {
    // 6. thousands of pores: air in, stale air out
    useSet('cut'); mother.holder.visible = false;
    egg.position.copy(EGG_DEEP); egg.rotation.z = .4; eggM.mat.map = eggM.poreMap;
    const p = seg(t, S.s6, S.s7);
    cam(V(cx + 1 + lerp(.9, .5, eio(p)), EGG_DEEP.y + .2, FACE + lerp(3.2, 2.2, eio(p))), V(EGG_DEEP.x, EGG_DEEP.y, FACE), 46);
    after = () => {
      showChip('THOUSANDS OF PORES', T.thousands - .1, S.s7, t);
      const [ex, ey] = toScreen(EGG_DEEP);
      for (let i = 0; i < 6; i++) {
        const a = -2.6 + i * .55, inn = i % 2 === 0;
        const r0 = W * (inn ? .44 : .30), r1 = W * (inn ? .31 : .45);
        const start = inn ? T.air : T.stale;
        O.arrow(ov, ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * 1.15, ex + Math.cos(a) * r1, ey + Math.sin(a) * r1 * 1.15, seg(t, start + i * .06, start + .5 + i * .06), inn ? '#59b8ff' : '#c8c8c8', 12);
      }
      ov.x.save(); ov.x.font = `700 ${Math.round(W * .04)}px 'Fredoka', sans-serif`; ov.x.textAlign = 'center'; ov.x.lineWidth = 10; ov.x.strokeStyle = 'rgba(0,0,0,.8)';
      const lab = (s, x, y, c, a) => { if (a <= 0) return; ov.x.globalAlpha = a; ov.x.strokeText(s, x, y); ov.x.fillStyle = c; ov.x.fillText(s, x, y); };
      lab('AIR IN', ex - W * .3, ey - H * .2, '#59b8ff', seg(t, T.air, T.air + .3)); lab('STALE AIR OUT', ex + W * .2, ey + H * .22, '#e0e0e0', seg(t, T.stale, T.stale + .3));
      ov.x.restore();
    };
  } else if (t < S.s9a) {
    // 7–8. X-ray: the baby is trapped; it grows an egg tooth, chips, and bursts out
    useSet('cut'); mother.holder.visible = false; baby.holder.visible = true;
    egg.position.copy(EGG_DEEP); egg.rotation.z = .4;
    const xr = t < S.s8 + 2.2 ? 1 : 1 - seg(t, S.s8 + 2.2, S.s8 + 2.7);
    const crack = seg(t, T.chips - .3, T.out);
    const taps = Math.floor(seg(t, T.chips - .3, T.out) * 6), tapAge = ((t - (T.chips - .3)) / ((T.out - T.chips + .3) / 6)) % 1;
    const wob = t > T.chips - .3 && t < T.out ? Math.sin(tapAge * Math.PI) * .06 : 0;
    egg.rotation.z = .4 + wob; setCracks(crack); shellXray(xr); egg.castShadow = xr < .5;
    const hatched = t >= T.out + .05;
    baby.holder.position.set(EGG_DEEP.x - .05, EGG_DEEP.y - .5, EGG_DEEP.z - .05);
    if (!hatched) { baby.holder.rotation.set(.25, -.7, 0); baby.holder.scale.setScalar(.95); pose(baby, 'Idle', t * .5); headDown(baby, .8); turn(baby.bones.shL, 0, 0, .5); turn(baby.bones.shR, 0, 0, -.5); }
    else { baby.holder.rotation.set(0, .3, 0); baby.holder.scale.setScalar(1); pose(baby, 'Dragon_Hit', (t - T.out) * 1.1, 'Idle', t, .3); }
    egg.visible = !hatched;
    if (hatched) { const age = t - T.out; for (const s of shards) { s.visible = true; s.position.copy(EGG_DEEP).addScaledVector(s.userData.dir, s.userData.sp * age * (1 - age * .25)); s.position.y -= 2.5 * age * age; s.rotation.set(s.userData.rot.x * age, s.userData.rot.y * age, s.userData.rot.z * age); } burst(dust, EGG_DEEP, T.out, t, 7, 16, 2, .8, 1.0, .3); }
    const p = seg(t, S.s7, S.s9a), orbit = lerp(-.5, .45, eio(seg(t, S.s7, S.s8 + 2)));
    const dist = lerp(3.4, 2.5, eio(seg(t, S.s8, T.out))) + (hatched ? eo(seg(t, T.out, T.out + .5)) * 1.0 : 0);
    cam(V(EGG_DEEP.x + Math.sin(orbit) * dist, EGG_DEEP.y + .25, FACE + Math.cos(orbit) * dist), V(EGG_DEEP.x, EGG_DEEP.y - .05, FACE), 46);
    after = () => {
      if (xr > .3 && t < S.s8 + 2.6) { ov.x.save(); const g = ov.x.createRadialGradient(W / 2, H * .45, W * .25, W / 2, H * .45, W * .9); g.addColorStop(0, 'rgba(0,10,20,0)'); g.addColorStop(1, `rgba(0,10,20,${.55 * xr})`); ov.x.fillStyle = g; ov.x.fillRect(0, 0, W, H); ov.x.restore(); }
      showChip('HARD AS STONE', T.stone - .1, S.s8 + .2, t);
      if (t > S.s8 - .2) {
        showChip('EGG TOOTH', T.tooth - .1, T.out + .4, t);
        const nose = new THREE.Vector3(); baby.bones.nose.getWorldPosition(nose); const [nx, ny] = toScreen(nose);
        O.ring(ov, nx, ny, W * .07, seg(t, T.tooth, T.tooth + .4) * (t < T.chips ? 1 : 0));
      }
      if (t < S.s8) { const [ex, ey] = toScreen(EGG_DEEP); O.mark(ov, ex + W * .27, ey - H * .1, false, seg(t, T.trapped, T.trapped + .4)); }
    };
  } else if (t < S.s9b) {
    // 9a. the mother leaves
    useSet('slope'); egg.visible = false;
    const k = seg(t, S.s9a, S.s9b), lift = eio(seg(t, S.s9a + .2, S.s9b));
    mother.holder.position.set(lerp(1.5, -6, lift), groundH(1.5, -1.5) + lift * 9, lerp(-1.5, -26, lift)); mother.holder.rotation.y = Math.PI + .3; mother.holder.rotation.x = -.25 * lift;
    pose(mother, 'Idle', t); flap(mother, t, .9 * ss(seg(t, S.s9a, S.s9a + .3)), 8);
    cam(V(-2.5, 1.6, 6.5), V(lerp(0, -3, k), lerp(1.4, 4, k), -4), 50);
    burst(dust, V(1.5, groundH(1.5, -1.5), -1.5), S.s9a + .2, t, 12, 24, 4, .6, 1.4, .6);
  } else if (t < S.s9c) {
    // 9b. the chick digs up through the ash, alone
    useSet('cut'); mother.holder.visible = false; egg.visible = false; baby.holder.visible = true;
    const k = eio(seg(t, S.s9b, S.s9c - .1));
    baby.holder.position.set(EGG_DEEP.x + Math.sin(t * 9) * .05, lerp(EGG_DEEP.y - .4, -.35, k), FACE + .5); baby.holder.rotation.set(-.5, .2 + Math.sin(t * 6) * .25, 0);
    pose(baby, 'Dragon_Attack2', t * 1.4);
    plume(dust, V(baby.holder.position.x, baby.holder.position.y + .9, FACE + .6), t * 3, 21, 10, .6, .25, .35);
    cam(V(cx + 2.4, lerp(-3.4, -.6, k), 8.5), V(cx + 1, lerp(-3.8, -1.0, k), FACE), 50);
  } else {
    // 9c. it bursts out of the ash and flies on its very first day
    useSet('slope'); egg.visible = false; mother.holder.visible = false; baby.holder.visible = true;
    const pop = seg(t, S.s9c, S.s9c + .5), fly = eio(seg(t, T.flies - .3, S.end));
    const m = slope.mound.position;
    baby.holder.position.set(m.x + fly * 1.5, m.y - .5 + back(pop) * .75 + fly * 6.5, m.z + fly * 2.2); baby.holder.rotation.y = .35; baby.holder.rotation.x = -.35 * fly;
    pose(baby, 'Idle', t * 1.2); if (t > T.flies - .6) flap(baby, t, ss(seg(t, T.flies - .6, T.flies)), 11);
    burst(dust, V(m.x, m.y + .2, m.z), S.s9c, t, 17, 30, 3, 1.4, 1.4, .5);
    cam(V(lerp(.6, 3.0, fly), lerp(.8, 4.2, fly), lerp(2.6, 6.5, fly)), V(m.x + fly * 1.5, m.y + .5 + fly * 6.2, m.z + fly * 2.2), 50);
    after = () => showChip('FLIES ON DAY 1', T.flies - .1, S.end, t);
  }

  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
// sound cues for the mixer
EV.push({ t: T.crush, type: 'crunch' }, { t: T.bury + .2, type: 'sink' }, { t: T.bury2, type: 'pop' }, { t: T.cooked - .3, type: 'sizzle' },
  { t: T.test + .4, type: 'sniff' }, { t: T.t34, type: 'ding' }, { t: T.metre, type: 'tick' }, { t: T.air, type: 'airin' }, { t: T.stale, type: 'airout' },
  { t: T.trapped, type: 'thud' }, { t: T.tooth, type: 'ding' }, { t: T.out, type: 'burst' }, { t: S.s9a + .2, type: 'flaps' }, { t: S.s9b, type: 'dig' }, { t: S.s9c, type: 'pop' }, { t: T.flies - .5, type: 'flaps' });
for (const k of ['s2', 's3', 's4', 's5', 's6', 's7', 's8', 's9a', 's9b', 's9c']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
