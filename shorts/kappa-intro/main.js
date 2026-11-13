// Meet the Kappa (Japanese folklore): picture = render(t)
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import { makeKappa, makePerson, makeHorse, makeTurtle, makeCucumber, makeValley, makeSign, bankH } from './world.js';
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
const person = makePerson(); scene.add(person.group);
const horse = makeHorse(); scene.add(horse.group);
const turtle = makeTurtle(); scene.add(turtle.group);
const cuke = makeCucumber(); scene.add(cuke);
const sign = makeSign(); scene.add(sign);
const SIGN = new THREE.Vector3(-1.5, bankH(-1.5, -7.4), -7.4); sign.position.copy(SIGN); sign.rotation.y = .35;

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  signs: wt('signs'), not: wt('not'), floods: wt('floods'), kappa: wt('kappa'), river: wt('river'), size: wt('size'), turtle: wt('turtle'),
  webbed: wt('webbed'), beak: wt('beak'), hides: wt('hides'), drags: wt('drags'), people: wt('people'), strangest: wt('strangest'), dish: wt('dish'),
  power: wt('power'), spills: wt('spills'), weak: wt('weak'), beat: wt('beat'), bow: wt('bow'), polite: wt('polite'), bows: wt('bows'), pours: wt('pours'),
  offer: wt('offer'), cucumber: wt('cucumber'), favorite: wt('favorite'), real: wt('real'), edo: wt('edo-period'), softshell: wt('softshell'),
  shares: wt('shares'), name: wt('name'), could: wt('could'), find: wt('find'),
};
const last = words[words.length - 1].t1;
const S = { a: 0, b: wt('in', 1) - .05, c: wt('it') - .05, d: wt('but') - .05, e: wt('so') - .05, f: wt('or') - .05, g: wt('real') - .3, h: wt('in', 3) - .05, i: wt('so', 2) - .05, end: last + 1.6 };
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
  valley.waterM.color.set(0x3f8f8a); fill.intensity = 0; fill.distance = 6;
}
const ripple = (x, z, t0, a = .06) => valley.ripples.push({ x, z, t0, a });

window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov); day(); valley.ripples.length = 0;
  kappa.group.visible = true; person.group.visible = false; horse.group.visible = false; turtle.group.visible = false; cuke.visible = false; sign.visible = false;
  kappa.setWater(1); kappa.pose({ bob: Math.sin(t * 2.2) * .01 });
  let after = null;

  if (t < S.b) {
    // 1. a warning sign by a Japanese river; then a kappa's head breaks the surface
    sign.visible = true;
    const k = eo(seg(t, T.kappa - .5, T.kappa + .9));
    const KP = V(.45, lerp(-1.3, -.72, k), -5.75); placeKappa(KP, -.2); kappa.pose({ tilt: -.15 });
    ripple(KP.x, KP.z, T.kappa - .4, .09); ripple(KP.x, KP.z, T.kappa + .4, .05);
    const p = seg(t, S.a, S.b);
    cam(V(lerp(1.4, 1.0, eio(p)), lerp(.75, .6, p), lerp(-.6, -1.4, eio(p))), V(-.35, .42, -6.6), 44);
    after = () => {
      showChip('JAPAN · FOLKLORE', S.a, T.signs - .35, t);
      showChip('WARNING SIGNS', T.signs - .3, T.kappa - .45, t);
      showChip('BEWARE THE KAPPA', T.kappa - .4, S.b, t);
      O.mark(ov, W * .78, H * .33, false, seg(t, T.floods, T.floods + .4) * (t < T.kappa - .3 ? 1 : 0));
    };
  } else if (t < S.c) {
    // 2. the kappa on the bank: child-sized, shell, webbed hands, beak
    placeKappa(HERO, 0);
    const p = seg(t, S.b, S.c), sh = eio(seg(t, T.turtle - .3, T.turtle + .5)) - eio(seg(t, T.webbed - .4, T.webbed + .3));
    const hand = eo(seg(t, T.webbed - .2, T.webbed + .4)) * (1 - seg(t, T.beak - .1, T.beak + .3));
    kappa.pose({ armR: hand * 1.5, armOut: .15 + hand * .3, look: sh * .3, bob: Math.sin(t * 2.2) * .01 });
    const ang = lerp(-.45, .35, eio(p)) + sh * 1.9;
    const d = 3.5 - .6 * eo(seg(t, T.beak - .2, T.beak + .6));
    const ly = lerp(.97, 1.05, seg(t, T.beak - .2, T.beak + .6));
    cam(V(Math.sin(ang) * d, 1.15, HERO.z + Math.cos(ang) * d), V(0, ly, HERO.z), 42);
    after = () => {
      showChip('RIVER CREATURE', T.river - .2, T.size - .2, t);
      showChip('SIZE OF A CHILD', T.size - .15, T.turtle - .3, t);
      showChip('TURTLE SHELL', T.turtle - .25, T.webbed - .3, t);
      showChip('WEBBED HANDS', T.webbed - .25, T.beak - .25, t);
      showChip('BEAK', T.beak - .2, S.c, t);
      if (t > T.webbed && t < T.beak - .2) { kappa.arms[1].updateWorldMatrix(true, true); const hp = kappa.arms[1].localToWorld(V(.07, -.4, .04)); const [hx, hy] = toScreen(hp); O.ring(ov, hx, hy, 70, seg(t, T.webbed + .1, T.webbed + .6)); }
      if (t > T.beak) { kappa.head.updateWorldMatrix(true, false); const bp = kappa.head.localToWorld(V(0, -.07, .33)); const [bx, by] = toScreen(bp); O.arrow(ov, bx + 230, by + 120, bx + 40, by + 20, seg(t, T.beak, T.beak + .45), '#f5c23a', 14); }
    };
  } else if (t < S.d) {
    // 3. it hides in the river, then grabs a horse on the bank and drags it towards the water
    horse.group.visible = true;
    const grab = seg(t, T.drags - .3, T.drags + .3), k = eio(seg(t, T.drags + .1, S.d - .1));
    const HZ = lerp(-8.5, -7.0, k), HX = -.2;
    horse.group.position.set(HX, bankH(HX, HZ) - .05 * k, HZ); horse.group.rotation.set(.32 * k, 0, 0); horse.pose(t, k > 0 ? 1 : 0);
    const KZ = -6.0, KX = .75, rise = eo(grab);
    placeKappa(V(KX, lerp(-1.75, bankH(KX, KZ) + .05, rise), KZ), Math.PI + .1);
    kappa.pose({ armL: rise * 1.35, armR: rise * 1.45, armOut: .25, bow: -.05 * rise + .25 * k });
    ripple(KX, KZ, T.hides - .3, .05); ripple(KX, KZ, T.drags - .2, .1); ripple(KX, KZ - .6, T.drags + 1.2, .08);
    splash(V(KX, 0, KZ), T.drags - .25, t, 45, .9); splash(V(KX - .3, 0, KZ - .7), T.people, t, 30, .7);
    const p = seg(t, S.c, S.d);
    cam(V(lerp(3.6, 3.2, p), lerp(2.0, 1.85, p), lerp(-1.6, -1.3, p)), V(.25, .5, -7.0), 50);
    after = () => {
      showChip('HIDES IN RIVERS', T.hides - .2, T.drags - .35, t);
      showChip('DRAGS HORSES IN', T.drags - .3, T.people - .1, t);
      showChip('…AND PEOPLE', T.people - .1, S.d, t);
      const a = toScreen(V(HX - .3, 1.3, HZ - .2)), b = toScreen(V(HX - .1, .5, HZ + 1.4));
      O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.drags + .1, T.drags + .6), '#ff6b5b', 16);
    };
  } else if (t < S.e) {
    // 4. the dish of water on its head: its power. Spill it and it goes weak
    placeKappa(HERO, 0);
    const spillK = eio(seg(t, T.spills - .15, T.spills + .45)), weak = eio(seg(t, T.spills + .2, T.weak + .5));
    kappa.pose({ tilt: .55 * spillK - .25 * seg(t, T.dish - .5, T.dish), bow: .25 * spillK + .12 * weak, armOut: .1, bob: -.04 * weak });
    kappa.setWater(1 - eio(seg(t, T.spills + .1, T.spills + 1.2)));
    const dw = kappa.dishWorld();
    if (t > T.spills) pour(dw.clone().add(V(0, 0, .12)), V(0, 0, .5), T.spills + .05, t, 1.4, .05);
    const glowK = seg(t, T.power - .2, T.power + .3) * (1 - seg(t, T.spills, T.spills + .5));
    kappa.group.traverse(o => { if (o.material && o.material.emissive && o.material.color.getHex() === 0x7fd8ff) o.material.emissiveIntensity = .55 + 1.2 * glowK * (.8 + .2 * Math.sin(t * 8)); });
    fill.position.copy(dw).add(V(.3, .6, .8)); fill.intensity = 3;
    const p = eio(seg(t, S.d, T.dish)), q = eio(seg(t, T.spills - .4, T.spills + .3));
    const pos = V(lerp(1.6, .4, p), lerp(1.3, HERO.y + 1.95, p) - .05 * q, lerp(HERO.z + 3.2, HERO.z + 1.25, p) + .3 * q);
    const look = V(0, lerp(1.0, HERO.y + 1.0, p) - .32 * q, HERO.z + .02);
    cam(pos, look, lerp(42, 44, p));
    after = () => {
      showChip('THE STRANGEST PART', T.strangest - .3, T.dish - .45, t);
      showChip('A DISH OF WATER', T.dish - .4, T.power - .45, t);
      showChip('ITS POWER', T.power - .4, T.spills - .3, t);
      showChip('SPILLED = WEAK', T.spills - .25, S.e, t);
      if (t > T.dish - .2 && t < T.spills) { const [dx, dy] = toScreen(dw); O.ring(ov, dx, dy, W * .2, seg(t, T.dish, T.dish + .6)); }
      if (t > T.power - .3) { const v = lerp(1, .1, eio(seg(t, T.spills + .1, T.weak + .4))); O.meter(ov, W * .86, H * .40, H * .2, v, 'STRENGTH', seg(t, T.power - .3, T.power + .1)); }
      O.mark(ov, W * .14, H * .40, false, seg(t, T.weak, T.weak + .4));
    };
  } else if (t < S.f) {
    // 5. you bow; the polite kappa bows back and the water pours out
    person.group.visible = true;
    const PZ = -7.8, PX = -.7, KX = .62;
    person.group.position.set(PX, bankH(PX, PZ), PZ); person.group.rotation.y = Math.PI / 2;
    person.pose(eio(seg(t, T.bow - .1, T.bow + .6)) - eio(seg(t, T.pours, T.pours + .7)));
    placeKappa(V(KX, bankH(KX, PZ), PZ), -Math.PI / 2);
    const kb = eio(seg(t, T.bows - .1, T.bows + .6));
    kappa.pose({ bow: kb * .95, tilt: kb * .35, armOut: .1 });
    kappa.setWater(1 - eio(seg(t, T.bows + .35, T.pours + .9)));
    const dw = kappa.dishWorld();
    if (t > T.bows + .3) pour(dw.clone().add(V(-.12, 0, 0)), V(-.6, 0, 0), T.bows + .3, t, 1.8, .05);
    const p = seg(t, S.e, S.f);
    cam(V(lerp(-.1, .1, p), 1.25, lerp(-2.3, -2.6, p)), V(0, .95, PZ), 46);
    after = () => {
      showChip('HOW TO BEAT ONE?', T.beat - .5, T.bow - .3, t);
      showChip('BOW', T.bow - .25, T.polite - .4, t);
      showChip('IT BOWS BACK', T.polite - .35, T.pours - .45, t);
      showChip('WATER POURS OUT', T.pours - .4, S.f, t);
      O.mark(ov, W * .5, H * .3, true, seg(t, T.pours + .3, T.pours + .7));
    };
  } else if (t < S.g) {
    // 6. or offer a cucumber, its favourite food
    placeKappa(HERO, 0); cuke.visible = true;
    const k = eo(seg(t, T.offer, T.cucumber + .35));
    const hands = V(0, HERO.y + .62, HERO.z + .3);
    const from = V(-1.6, HERO.y + 1.6, HERO.z + 1.2);
    const cp = from.clone().lerp(hands, k); cp.y += Math.sin(k * Math.PI) * .6;
    cuke.position.copy(cp); cuke.rotation.set(0, 0, k < 1 ? t * 7 : .05);
    const catchK = eo(seg(t, T.cucumber - .2, T.cucumber + .3));
    kappa.pose({ armL: catchK * 1.15, armR: catchK * 1.15, armOut: .02 - .12 * catchK, look: (1 - catchK) * -.5, bob: Math.sin(t * 6) * .02 * seg(t, T.favorite, T.favorite + .3) });
    const p = seg(t, S.f, S.g);
    cam(V(lerp(-.9, -.5, eio(p)), 1.05, HERO.z + lerp(2.6, 2.2, eio(p))), V(0, .95, HERO.z), 42);
    after = () => {
      showChip('CUCUMBER', T.cucumber - .2, T.favorite - .2, t);
      showChip('FAVORITE FOOD', T.favorite - .2, S.g, t);
    };
  } else if (t < S.i) {
    // 7–8. the real animal: a softshell turtle at the water's edge; then side by side with the kappa
    turtle.group.visible = true;
    const TP = V(.75, 0, -6.15); TP.y = Math.max(bankH(TP.x, TP.z), -.02); turtle.group.position.copy(TP); turtle.group.rotation.y = .5; turtle.pose(t);
    placeKappa(HERO, -.2);
    kappa.pose({ look: -.4 + .4 * seg(t, S.h, S.h + .6), bob: Math.sin(t * 2.2) * .01 });
    if (t < T.edo - .1) {   // the question, on the kappa
      const p = seg(t, S.g, T.edo);
      cam(V(.9, 1.15, HERO.z + lerp(3.0, 2.6, p)), V(.2, .95, HERO.z), 42);
    } else if (t < S.h) {   // the turtle, close
      const p = seg(t, T.edo, S.h);
      cam(V(TP.x + lerp(1.3, 1.0, p), TP.y + lerp(.75, .55, p), TP.z + lerp(1.6, 1.2, p)), V(TP.x, TP.y + .12, TP.z), 42);
    } else {                 // both, side by side
      const p = seg(t, S.h, S.i);
      cam(V(lerp(1.6, 1.9, p), 1.1, HERO.z + lerp(3.6, 4.0, p)), V(.35, .65, -6.9), 42);
    }
    after = () => {
      showChip('THE REAL ANIMAL?', T.real - .3, T.edo - .2, t);
      showChip('EDO-PERIOD DRAWING', T.edo - .15, T.softshell - .3, t);
      showChip('SOFTSHELL TURTLE', T.softshell - .25, S.h, t);
      showChip('SAME LOCAL NAME', T.shares - .3, S.i, t);
      if (t > S.h + .2) {
        turtle.group.updateWorldMatrix(true, false); kappa.head.updateWorldMatrix(true, false);
        const a = toScreen(TP.clone().add(V(0, .35, 0))), b = toScreen(kappa.head.localToWorld(V(.3, -.1, 0)));
        O.arrow(ov, a[0], a[1], b[0] + 30, b[1] + 40, seg(t, T.shares, T.shares + .6), '#f5c23a', 13);
      }
    };
  } else {
    // 9. dusk: the kappa slips back into the river until only the dish glints. Could it actually work?
    skyU.top.value.set(0x2a3a78); skyU.hor.value.set(0xf0a070); skyU.low.value.set(0x6a5a5a); fog.color.set(0xd89a80); fog.near = 20; fog.far = 120;
    hemi.color.set(0xffc8a0); hemi.intensity = 1.25; fill.position.set(1.2, 1.4, -4); fill.intensity = 4; fill.distance = 8; sun.color.set(0xffa060); sun.intensity = 2.0; sun.position.set(-20, 6, -10);
    valley.waterM.color.set(0x3f6f88); fog.near = 35; fog.far = 140;
    const k = eio(seg(t, S.i + .2, S.end - .2));
    const z = lerp(-6.6, -5.0, k), KP = V(.3, lerp(bankH(.3, -6.6), -.82, k), z);
    placeKappa(KP, .25); kappa.pose({ bob: Math.sin(t * 2) * .01, look: -.2 });
    ripple(KP.x, KP.z, T.could, .06); ripple(KP.x, KP.z, T.find, .05);
    for (let i = 0; i < fireflies.length; i++) { const r = mulberry(70 + i), s = fireflies[i]; s.visible = true;
      s.position.set((r() - .5) * 8, .4 + r() * 1.6 + Math.sin(t * (1 + r()) + i) * .15, -6.5 - r() * 4); s.scale.setScalar(.05 + r() * .04); s.material.opacity = .5 + .5 * Math.sin(t * 3 + i * 2); }
    const p = seg(t, S.i, S.end);
    cam(V(lerp(1.9, 1.5, p), lerp(1.05, .9, p), lerp(-1.6, -2.0, p)), V(.1, .5, -6.4), 44);
    after = () => {
      showChip('COULD IT WORK?', T.could - .2, T.find - .3, t);
      showChip('NEXT: THE PHYSICS', T.find - .25, S.end + 1, t);
    };
  }

  valley.update(t);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};
window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'river' }, { t: T.floods, type: 'buzz' }, { t: T.kappa - .3, type: 'splash' }, { t: T.webbed, type: 'pop' },
  { t: T.hides - .2, type: 'splash' }, { t: T.drags - .25, type: 'splash' }, { t: T.drags + .2, type: 'neigh' }, { t: T.people, type: 'splash' },
  { t: T.dish, type: 'shimmer' }, { t: T.power, type: 'swell' }, { t: T.spills + .05, type: 'pour' }, { t: T.weak, type: 'buzz' },
  { t: T.bow, type: 'chime' }, { t: T.bows, type: 'chime' }, { t: T.pours + .1, type: 'pour' }, { t: T.pours + .3, type: 'ding' },
  { t: T.offer, type: 'toss' }, { t: T.cucumber + .3, type: 'crunch' }, { t: T.softshell, type: 'pop' }, { t: T.shares, type: 'ding' },
  { t: T.could, type: 'splash' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
EV.push({ t: T.edo - .1, type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
