// Could a kappa actually work? (physics short): picture = render(t)
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import { makeKappa, makeHorse, makeTurtle, makeCroc, makeFrog, makeValley, bankH } from './world.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, .03, 1200);
const fog = new THREE.Fog(0xcfe3ea, 30, 160); scene.fog = fog;
const skyU = { top: { value: new THREE.Color(0x5f9fd8) }, hor: { value: new THREE.Color(0xd8ecf0) }, low: { value: new THREE.Color(0x9fb8a0) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, hor, low; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0. ? mix(hor, top, pow(clamp(y*1.8,0.,1.), .7)) : mix(hor, low, clamp(-y*4.,0.,1.)); gl_FragColor = vec4(c,1.); }' }));
scene.add(sky);
const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x4a5a3a, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 2.6); sun.position.set(12, 20, 14); scene.add(sun); scene.add(sun.target);
const fill = new THREE.PointLight(0xffffff, 0, 6, 1.5); scene.add(fill);

const valley = makeValley(scene);
const kappa = makeKappa(); scene.add(kappa.group);
const horse = makeHorse(); scene.add(horse.group);
const turtle = makeTurtle(); scene.add(turtle.group);

const croc = makeCroc(); scene.add(croc.group);
const frog = makeFrog(); scene.add(frog.group);

// ---------------------------------------------------------------- timings from the voice (word index -> start time)
const words = await (await fetch('voice/words.json')).json();
const W_ = i => words[i].t0;
const S = { a: 0, b: W_(11) - .05, c: W_(33) - .05, d: W_(53) - .05, e: W_(62) - .05, f: W_(74) - .05, g: W_(84) - .05, h: W_(96) - .05, i: W_(108) - .05, end: words[words.length - 1].t1 + 2.6 };
window.DUR = S.end;
// ---------------------------------------------------------------- particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
function pool(n, color, add = false) { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); a.push(s); } return a; }
const drops = pool(60, 0xbfeaff), spray = pool(60, 0xffffff), fireflies = pool(30, 0xfff0a0, true);
function hideAll() { for (const p of [drops, spray, fireflies]) for (const s of p) s.visible = false; }
// water pouring out of the dish: drops leave the front rim and fall
function pour(origin, dir, t0, t, dur = 1.6, size = .035) {
  const age = t - t0; if (age < 0) return; const r = mulberry(5);
  for (let i = 0; i < drops.length; i++) { const s = drops[i], st = r() * dur * .7, a = age - st; if (a < 0 || a > .9) continue;
    s.visible = true; s.position.set(origin.x + dir.x * a * 1.2 + (r() - .5) * .05, origin.y + .5 * a - 4.9 * a * a, origin.z + dir.z * a * 1.2 + (r() - .5) * .05);
    s.scale.setScalar(size * (.7 + r() * .6)); s.material.opacity = .9 * (1 - a / .9); }
}
function splash(origin, t0, t, n = 40, R = 1) {
  const age = t - t0; if (age < 0 || age > 1.4) return; const r = mulberry(9);
  for (let i = 0; i < Math.min(n, spray.length); i++) { const s = spray[i], a = r() * Math.PI * 2, v = (.5 + r()) * R, up = (1.5 + r() * 2) * R;
    s.visible = true; s.position.set(origin.x + Math.cos(a) * v * age, origin.y + up * age - 4.9 * age * age, origin.z + Math.sin(a) * v * age);
    s.scale.setScalar(.06 + r() * .08); s.material.opacity = .85 * (1 - age / 1.4); if (s.position.y < -.05) s.visible = false; }
}

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 42) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
const HERO = V(0, bankH(0, -7.6), -7.6);
function placeKappa(p, rotY = 0) { kappa.group.position.copy(p); kappa.group.rotation.set(0, rotY, 0); }
function day() {
  skyU.top.value.set(0x5f9fd8); skyU.hor.value.set(0xd8ecf0); skyU.low.value.set(0x9fb8a0); fog.color.set(0xcfe3ea); fog.near = 30; fog.far = 160;
  hemi.color.set(0xe8f4ff); hemi.intensity = 1.3; sun.color.set(0xfff2d8); sun.intensity = 2.6; sun.position.set(12, 20, 14); sun.target.position.set(0, 0, -7);
  valley.waterM.color.set(0x3f8f8a); valley.waterM.opacity = .88; fill.intensity = 0; fill.distance = 6;
}
const ripple = (x, z, t0, a = .06) => valley.ripples.push({ x, z, t0, a });


const bubbles = pool(40, 0xd8f4ff);

function bub(origin, t, n = 25, rate = 1) {
  const r = mulberry(31);
  for (let i = 0; i < Math.min(n, bubbles.length); i++) { const s = bubbles[i], ph = (t * .6 * rate + r()) % 1;
    s.visible = true; s.position.set(origin.x + (r() - .5) * .35 + Math.sin(t * 3 + i) * .03, origin.y + ph * 1.1, origin.z + (r() - .5) * .35);
    s.scale.setScalar(.03 + r() * .03); s.material.opacity = .8 * (1 - ph); }
}
const WATERLINE = -4.2;   // z of the kappa's river spot
window.render = (t) => {
  texts.length = 0; hideAll(); for (const s of bubbles) s.visible = false; O.clear(ov); day(); valley.ripples.length = 0;
  kappa.group.visible = true; horse.group.visible = false; turtle.group.visible = false; croc.group.visible = false; frog.group.visible = false;
  kappa.setWater(1); kappa.pose({ bob: Math.sin(t * 2.2) * .01 });
  let after = null;

  if (t < S.b) {
    // 1. last time: the kappa on the bank. Could one actually work?
    placeKappa(HERO, -.15);
    const p = seg(t, S.a, S.b);
    cam(V(lerp(-1.4, -.8, eio(p)), 1.1, HERO.z + lerp(3.3, 2.7, eio(p))), V(0, .95, HERO.z), 42);
    after = () => { showChip('LAST TIME: THE KAPPA', S.a, W_(6) - .3, t); showChip('COULD ONE WORK?', W_(6) - .25, S.b, t); };
  } else if (t < S.c) {
    // 2. problem: child-sized, but it drags horses. It pulls and the horse does not budge
    horse.group.visible = true;
    const HX = -.3, HZ = -7.6; horse.group.position.set(HX, bankH(HX, HZ), HZ); horse.group.rotation.set(0, 0, 0);
    horse.pose(t, seg(t, W_(21) - .2, W_(21) + .5));
    placeKappa(V(1.3, bankH(1.3, HZ), HZ - .3), -Math.PI / 2 - .3);
    const pull = eio(seg(t, W_(21) - .3, W_(21) + .4));
    kappa.pose({ bow: .35 * pull, armL: -.4 * pull, armR: -.4 * pull, armOut: .05, bob: Math.sin(t * 9) * .012 * pull });
    const p = seg(t, S.b, S.c);
    cam(V(lerp(3.2, 3.6, p), 1.5, lerp(-4.6, -4.8, p)), V(.6, .85, HZ - .2), 48);
    after = () => {
      showChip('SIZE OF A CHILD', W_(12) - .1, W_(17) - .25, t);
      showChip('DRAGS HORSES', W_(17) - .2, W_(25) - .3, t);
      showChip('TUG OF WAR: LOST', W_(25) - .25, S.c, t);
      const a = toScreen(V(HX + .8, 1.5, HZ)); O.mark(ov, W * .5, H * .3, false, seg(t, W_(31), W_(31) + .4));
      void a;
    };
  } else if (t < S.d) {
    // 3. fix: do what a crocodile does: grab from the water, drag prey in where it can't plant its feet
    horse.group.visible = true; croc.group.visible = true;
    const HX = 0, HZ0 = -7.4;
    const drag = eio(seg(t, W_(44) - .1, W_(52) + .2));
    const HZ = lerp(HZ0, -6.75, drag);
    horse.group.position.set(HX, bankH(HX, HZ) - .05 * drag, HZ); horse.group.rotation.set(.3 * drag, 0, 0); horse.pose(t, 1);
    const cm = eo(seg(t, W_(37) - .5, W_(37) + .5)) * (1 - seg(t, W_(39) + .6, W_(39) + 1.0));
    croc.group.visible = cm > .01; croc.group.position.set(lerp(-1.4, .1, eo(seg(t, W_(36), W_(38)))), -.05, -5.2); croc.group.rotation.y = Math.PI / 2; croc.pose(.3 * Math.sin(t * 4) + .3);
    const KZ = -6.25, rise = eo(seg(t, W_(39) - .1, W_(40) + .4));
    placeKappa(V(.5, lerp(-1.5, bankH(.5, KZ) - .05, rise), KZ), .25);
    kappa.group.visible = rise > .02; kappa.pose({ armL: 1.4 * rise, armR: 1.4 * rise, armOut: .25, bow: .1 * drag });
    ripple(.5, KZ, W_(39), .08); ripple(-.9, -5.0, W_(37), .05); splash(V(.5, 0, KZ), W_(39) + .1, t, 35, .8);
    const p = seg(t, S.c, S.d);
    cam(V(lerp(3.4, 3.0, p), lerp(1.6, 1.8, p), lerp(-3.0, -3.4, p)), V(.1, .5, -6.0), 50);
    after = () => {
      showChip('A CROCODILE\'S TRICK', W_(35) - .1, W_(39) - .3, t);
      showChip('GRAB FROM THE WATER', W_(39) - .25, W_(47) - .2, t);
      showChip('NO FOOTING', W_(47) - .15, S.d, t);
      const a = toScreen(V(0, 1.7, HZ0 - .3)), b = toScreen(V(0, 1.1, -6.2)); O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, W_(44), W_(46)), '#f5c23a', 16);
      O.mark(ov, W * .5, H * .31, true, seg(t, W_(52) + .2, W_(52) + .6));
    };
  } else if (t < S.e) {
    // 4. problem: drowning takes time, and a kappa needs air. Its oxygen runs out underwater
    const sub = eo(seg(t, S.d, S.d + .8));
    valley.waterM.opacity = .4; placeKappa(V(0, lerp(-.6, -1.0, sub), WATERLINE), .6); kappa.pose({ armL: .6, armR: .6, armOut: .2, bob: 0 });
    bub(V(0, -.6, WATERLINE), t, 18, 1.2);
    const p = seg(t, S.d, S.e);
    cam(V(lerp(2.2, 1.8, p), lerp(2.0, 1.8, p), WATERLINE + lerp(2.4, 2.0, p)), V(.4, -.45, WATERLINE), 46);
    const v = lerp(1, .12, eio(seg(t, W_(57), W_(61) + .5)));
    after = () => {
      showChip('DROWNING TAKES TIME', W_(54) - .2, W_(57) - .2, t);
      showChip('IT NEEDS AIR', W_(57) - .15, S.e, t);
      O.meter(ov, W * .86, H * .36, H * .2, v, 'OXYGEN', seg(t, W_(55), W_(55) + .3));
      O.mark(ov, W * .14, H * .36, false, seg(t, W_(61), W_(61) + .4));
    };
  } else if (t < S.f) {
    // 5. fix: breathe like a softshell turtle: mouth lining and skin pull oxygen from the water
    valley.waterM.opacity = .4; turtle.group.visible = true;
    const TP = V(.5, -1.02, WATERLINE + .3); turtle.group.position.copy(TP); turtle.group.rotation.y = 1.1 + .15 * Math.sin(t); turtle.pose(t);
    placeKappa(V(-.9, -1.05, WATERLINE - .8), .8); kappa.pose({ armL: .5, armR: .5, armOut: .2 });
    bub(V(.5, -.9, WATERLINE + .3), t, 12, .5);
    const p = seg(t, S.e, S.f);
    cam(V(lerp(1.4, .5, eio(p)), lerp(1.7, 1.3, p), WATERLINE + lerp(2.2, 1.5, eio(p))), V(.5, -.8, WATERLINE + .3), 46);
    const v = lerp(.12, .95, eio(seg(t, W_(70), W_(73) + .4)));
    after = () => {
      showChip('SOFTSHELL TURTLE', W_(65) - .25, W_(70) - .3, t);
      showChip('MOUTH LINING', W_(70) - .25, W_(72) - .15, t);
      showChip('…AND SKIN', W_(72) - .1, S.f, t);
      O.meter(ov, W * .86, H * .36, H * .2, v, 'OXYGEN', seg(t, S.e, S.e + .3));
      if (t > W_(70)) { turtle.group.updateWorldMatrix(true, true); const m = toScreen(TP.clone().add(V(.1, .2, .3))); O.ring(ov, m[0], m[1], 80, seg(t, W_(70) - .1, W_(70) + .4)); }
      O.mark(ov, W * .14, H * .36, true, seg(t, W_(73), W_(73) + .4));
    };
  } else if (t < S.g) {
    // 6. problem: it has to climb out, and wet skin dries fast
    const out = eo(seg(t, S.f, W_(78) + .2));
    const KZ = lerp(-4.2, -6.4, out); placeKappa(V(.3, lerp(-.7, bankH(.3, KZ), out), KZ), Math.PI * .98 + .1);
    kappa.pose({ bob: Math.sin(t * 3) * .01, look: .3 * Math.sin(t) });
    ripple(.3, -4.4, S.f, .08); splash(V(.3, 0, -4.7), S.f + .1, t, 25, .7);
    sun.intensity = 4.2; sun.color.set(0xfff0c0); hemi.intensity = 1.6;
    const p = seg(t, S.f, S.g);
    cam(V(lerp(2.8, 2.4, p), 1.2, lerp(-3.4, -4.4, p)), V(.2, .75, -6.2), 46);
    const v = lerp(1, .15, eio(seg(t, W_(79), W_(83) + .5)));
    after = () => {
      showChip('CLIMBS OUT', W_(77) - .2, W_(80) - .2, t);
      showChip('WET SKIN DRIES FAST', W_(80) - .15, S.g, t);
      O.meter(ov, W * .86, H * .36, H * .2, v, 'SKIN WATER', seg(t, W_(77), W_(77) + .3));
      O.mark(ov, W * .14, H * .36, false, seg(t, W_(83), W_(83) + .4));
    };
  } else if (t < S.h) {
    // 7. fix: store water like the water-holding frog: bladder and skin swell
    frog.group.visible = true;
    const FP = V(.4, bankH(.4, -7.6) + .02, -7.6); frog.group.position.copy(FP); frog.group.rotation.y = -.9;
    const fat = eio(seg(t, W_(91) - .3, W_(95) + .4)); frog.pose(fat);
    placeKappa(V(-3.2, bankH(-3.2, -8.5), -8.5), .5); kappa.pose({ look: .5, bob: Math.sin(t * 2) * .01 });
    const p = seg(t, S.g, S.h);
    cam(V(FP.x + lerp(1.5, 1.0, eio(p)), FP.y + lerp(.7, .5, p), FP.z + lerp(1.7, 1.3, eio(p))), V(FP.x, FP.y + .15, FP.z), 44);
    after = () => {
      showChip('WATER-HOLDING FROG', W_(85) - .25, W_(91) - .3, t);
      showChip('BLADDER', W_(91) - .25, W_(94) - .25, t);
      showChip('…AND SKIN', W_(94) - .2, S.h, t);
      if (t > W_(92)) { const m = toScreen(FP.clone().add(V(0, .16, 0))); O.ring(ov, m[0], m[1], 120, seg(t, W_(92), W_(93) + .2)); }
      O.mark(ov, W * .5, H * .3, true, seg(t, W_(95), W_(95) + .4));
    };
  } else if (t < S.i) {
    // 8. problem: the kappa keeps its water in a dish, on top, where it spills
    placeKappa(HERO, 0);
    const p = eio(seg(t, S.h, W_(104) + .3));
    const tip = eio(seg(t, W_(105), W_(107) + .3));
    kappa.pose({ tilt: .0 + .4 * tip, bow: .12 * tip });
    const dw = kappa.dishWorld();
    const pos = V(lerp(1.4, .5, p), lerp(1.3, HERO.y + 1.95, p), lerp(HERO.z + 3.0, HERO.z + 1.3, p)), look = V(0, lerp(1.0, HERO.y + 1.05, p), HERO.z);
    cam(pos, look, 44);
    fill.position.copy(dw).add(V(.3, .6, .8)); fill.intensity = 3;
    after = () => {
      showChip('THE KAPPA\'S WAY', W_(96) - .1, W_(102) - .3, t);
      showChip('WATER IN A DISH', W_(102) - .25, W_(105) - .2, t);
      showChip('ON TOP. IT SPILLS.', W_(105) - .15, S.i, t);
      if (t > W_(103) - .2) { const [dx, dy] = toScreen(dw); O.ring(ov, dx, dy, W * .2, seg(t, W_(103), W_(103) + .6)); }
      O.mark(ov, W * .5, H * .3, false, seg(t, W_(107) + .1, W_(107) + .5));
    };
  } else {
    // 9. twist: a creature built on stored water can't afford to spill it. Bow, it bows back, it loses everything
    placeKappa(HERO, 0);
    const kb = eio(seg(t, W_(128) - .15, W_(128) + .6));
    kappa.pose({ bow: kb * .95, tilt: kb * .35, armOut: .1 });
    kappa.setWater(1 - eio(seg(t, W_(128) + .35, W_(132) + .2)));
    const dw = kappa.dishWorld();
    if (t > W_(128) + .3) pour(dw.clone().add(V(0, 0, .12)), V(0, 0, .5), W_(128) + .3, t, 1.8, .05);
    fill.position.copy(dw).add(V(.3, .6, .8)); fill.intensity = 3;
    const p = seg(t, S.i, S.end);
    cam(V(lerp(.4, 1.0, p), lerp(HERO.y + 1.5, HERO.y + 1.3, p), lerp(HERO.z + 2.4, HERO.z + 2.9, p)), V(0, HERO.y + lerp(.9, .8, p), HERO.z), 44);
    const v = lerp(1, .05, eio(seg(t, W_(128) + .35, W_(132) + .3)));
    after = () => {
      showChip('THE TWIST', W_(108) - .1, W_(111) - .1, t);
      showChip('STORED WATER = LIFE', W_(111) - .1, W_(122) - .2, t);
      showChip('BOW = LOSE IT ALL', W_(122) - .15, S.end + 1, t);
      O.meter(ov, W * .86, H * .36, H * .2, v, 'WATER', seg(t, W_(111), W_(111) + .3));
    };
  }

  valley.update(t);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};
window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'river' }, { t: W_(21), type: 'neigh' }, { t: W_(31), type: 'buzz' }, { t: W_(37), type: 'splash' }, { t: W_(39) + .1, type: 'splash' }, { t: W_(46), type: 'whoosh' },
  { t: W_(55), type: 'swell' }, { t: W_(61), type: 'buzz' }, { t: W_(66), type: 'pop' }, { t: W_(70), type: 'shimmer' }, { t: W_(73), type: 'ding' },
  { t: S.f + .1, type: 'splash' }, { t: W_(83), type: 'buzz' }, { t: W_(93), type: 'pop' }, { t: W_(95), type: 'ding' },
  { t: W_(104), type: 'shimmer' }, { t: W_(107) + .1, type: 'buzz' }, { t: W_(128), type: 'chime' }, { t: W_(128) + .4, type: 'pour' }, { t: W_(132), type: 'splash' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
