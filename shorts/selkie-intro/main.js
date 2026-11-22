// Meet the Selkie (Scottish / Orcadian / Shetland / Faroese folklore): picture = render(t)
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import { makeSeal, makeSkin, makePerson, makeShore, shoreH } from './world.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, W / H, .03, 1200);
const fog = new THREE.Fog(0xb8c8d0, 25, 150); scene.fog = fog;
const skyU = { top: { value: new THREE.Color(0x5a7ea0) }, hor: { value: new THREE.Color(0xd0dce0) }, low: { value: new THREE.Color(0x6a7a70) } };
scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: 'uniform vec3 top, hor, low; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0. ? mix(hor, top, pow(clamp(y*1.8,0.,1.), .7)) : mix(hor, low, clamp(-y*4.,0.,1.)); gl_FragColor = vec4(c,1.); }' })));
const hemi = new THREE.HemisphereLight(0xe0ecff, 0x4a5a4a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.3); sun.position.set(10, 18, 8); scene.add(sun); scene.add(sun.target);

const shore = makeShore(scene);
const seal = makeSeal(); scene.add(seal.group);
const skin = makeSkin(); scene.add(skin);
const woman = makePerson(); scene.add(woman.group);
const man = makePerson({ cloth: 0x6a4a2a, hair: 0x2a1a10, long: false, skinC: 0xd8a888 }); scene.add(man.group);

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  seem: wt('seem'), orkney: wt('orkney'), shetland: wt('shetland'), selkies: wt('selkies'), sea: wt('sea', 0), seal: wt('seal'), land: wt('land'), sheds: wt('sheds'), person: wt('person'),
  catch_: wt('catch'), sealskin: wt('sealskin', 0), home: wt('home'), someone: wt('someone'), steals: wt('steals'), stuck: wt('stuck'),
  forgets: wt('forgets'), finds: wt('finds'), puts: wt('puts'), returns: wt('returns'), waves: wt('waves'),
  kin: wt('kin'), seven: wt('seven'), tears: wt('tears'), real: wt('real'), hauls: wt('hauls'), rocky: wt('rocky'), theory: wt('theory'), kayaks: wt('kayaks'), mistaken: wt('mistaken'), folk: wt('seal-folk'),
  sealR: wt('seal', 1), could: wt('could'), find: wt('find'),
};
const last = words[words.length - 1].t1;
const S = { a: 0, b: wt('in', 0) - .05, c: wt('in', 1) - .05, d: wt('but', 0) - .05, e: wt('here\'s') - .05, f: wt('but', 1) - .05, g: wt('to') - .05, h: wt('the', 3) - .05, i: wt('one') - .05, j: wt('so') - .05, end: last + 1.6 };
S.h = wt('real') - .35;
window.DUR = S.end;

// ---------------------------------------------------------------- particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
function pool(n, color, add = false) { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); a.push(s); } return a; }
const sparks = pool(50, 0xcfe8ff, true), spray = pool(40, 0xffffff), tearP = pool(8, 0xbfeaff), stars = pool(30, 0xfff0a0, true);
function hideAll() { for (const p of [sparks, spray, tearP, stars]) for (const s of p) s.visible = false; }
function burst(o, t0, t, n = 40, R = 1) {
  const age = t - t0; if (age < 0 || age > 1.3) return; const r = mulberry(11);
  for (let i = 0; i < n && i < sparks.length; i++) { const s = sparks[i], a = r() * Math.PI * 2, v = (.4 + r()) * R, up = (.6 + r() * 1.4) * R;
    s.visible = true; s.position.set(o.x + Math.cos(a) * v * age, o.y + up * age - .8 * age * age, o.z + Math.sin(a) * v * age); s.scale.setScalar(.07 + r() * .08); s.material.opacity = 1 - age / 1.3; }
}
function splash(o, t0, t, n = 30, R = 1) {
  const age = t - t0; if (age < 0 || age > 1.4) return; const r = mulberry(9);
  for (let i = 0; i < n && i < spray.length; i++) { const s = spray[i], a = r() * Math.PI * 2, v = (.4 + r()) * R, up = (1.5 + r() * 2) * R;
    s.visible = true; s.position.set(o.x + Math.cos(a) * v * age, o.y + up * age - 4.9 * age * age, o.z + Math.sin(a) * v * age);
    s.scale.setScalar(.06 + r() * .08); s.material.opacity = .85 * (1 - age / 1.4); if (s.position.y < -.05) s.visible = false; }
}

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 42) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
const ripple = (x, z, t0, a = .06) => shore.ripples.push({ x, z, t0, a });
const HZ = -7.3, HX = 0, HY = shoreH(0, HZ);
const ground = (x, z) => Math.max(shoreH(x, z), -.05);
function day() {
  skyU.top.value.set(0x5a7ea0); skyU.hor.value.set(0xd0dce0); skyU.low.value.set(0x6a7a70); fog.color.set(0xb8c8d0); fog.near = 25; fog.far = 150;
  hemi.color.set(0xe0ecff); hemi.intensity = 1.25; sun.color.set(0xfff0d8); sun.intensity = 2.3; sun.position.set(10, 18, 8); sun.target.position.set(0, 0, -7);
  shore.waterM.color.set(0x2f5f70);
}
const place = (o, x, z, ry = 0, y) => { o.group.position.set(x, y ?? ground(x, z), z); o.group.rotation.set(0, ry, 0); };
const setS = (o, k) => { o.group.scale.setScalar(Math.max(.001, k)); o.group.visible = k > .01; };
let KEY = 0;   // each shape-shift

window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov); day(); shore.ripples.length = 0;
  seal.group.visible = false; woman.group.visible = false; man.group.visible = false; skin.visible = false; seal.group.scale.setScalar(1); woman.group.scale.setScalar(1);
  seal.pose({ bob: Math.sin(t * 1.6) * .01 }); woman.pose(0, 0); man.pose(0, 0);
  let after = null;

  if (t < S.b) {
    // 1. a grey seal rises from the sea off a Scottish shore
    seal.group.visible = true;
    const k = eo(seg(t, .2, 2.0));
    place(seal, -.2, lerp(-2.6, -3.4, k), .25, lerp(-.95, -.28, k)); seal.pose({ lift: .6 * k, look: Math.sin(t * 1.1) * .25 });
    ripple(-.2, -3.0, .3, .09); ripple(-.2, -3.3, 1.7, .06);
    const p = seg(t, S.a, S.b);
    cam(V(lerp(1.4, 1.0, eio(p)), lerp(.7, .55, p), lerp(-.2, -.8, eio(p))), V(-.15, .2, -3.2), 44);
    after = () => {
      showChip('SCOTLAND · FOLKLORE', S.a, T.seem - 1.2, t);
      showChip('NOT WHAT THEY SEEM', T.seem - 1.15, S.b, t);
    };
  } else if (t < S.c) {
    // 2. Orkney and Shetland: a seal hauled out on the rocks; they are called selkies
    seal.group.visible = true; place(seal, HX, HZ, .3); seal.pose({ lift: .35, look: Math.sin(t * .9) * .3 });
    const p = seg(t, S.b, S.c);
    cam(V(lerp(-1.6, -.9, eio(p)), lerp(.85, .7, p), HZ + lerp(2.9, 2.3, eio(p))), V(0, HY + .4, HZ), 42);
    after = () => {
      showChip('ORKNEY', T.orkney - .2, T.shetland - .25, t);
      showChip('SHETLAND', T.shetland - .2, T.selkies - .3, t);
      showChip('SELKIES', T.selkies - .25, S.c, t);
    };
  } else if (t < S.d) {
    // 3–4. in the sea a selkie is a seal; on land it sheds its skin and walks as a person
    const sh = eio(seg(t, T.sheds - .05, T.sheds + .75));
    if (t < T.land - .2) {   // in the sea
      seal.group.visible = true; place(seal, -.1, -3.6, -.3, -.3); seal.pose({ lift: .7, look: Math.sin(t * 1.3) * .4 });
      ripple(-.1, -3.6, T.sea - .3, .08);
      const p = seg(t, S.c, T.land);
      cam(V(lerp(1.0, .6, p), .55, -1.0), V(-.1, .15, -3.6), 44);
    } else {                // on land: the seal slips out of its skin
      place(seal, HX, HZ, .2); setS(seal, 1 - sh); seal.group.visible = sh < .98;
      place(woman, HX + .25, HZ + .3, Math.PI * .9 - .5); setS(woman, sh); woman.pose(0, 0);
      skin.visible = sh > .3; skin.position.set(HX - .9, ground(HX - .9, HZ) + .02, HZ + .2); skin.rotation.y = .6;
      burst(V(HX, HY + .6, HZ), T.sheds, t, 40, 1);
      const p = seg(t, T.land - .2, S.d);
      cam(V(lerp(-1.0, .9, eio(p)), lerp(1.0, 1.25, p), HZ + lerp(3.4, 3.9, p)), V(0, HY + .85, HZ), 42);
    }
    after = () => {
      showChip('IN THE SEA: A SEAL', T.sea - .3, T.land - .3, t);
      showChip('ON LAND…', T.land - .25, T.sheds - .15, t);
      showChip('SHEDS ITS SKIN', T.sheds - .1, T.person - .45, t);
      showChip('WALKS AS A PERSON', T.person - .4, S.d, t);
    };
  } else if (t < S.f) {
    // 5. the catch: someone steals the sealskin; the selkie is stuck on land
    const mk = eio(seg(t, T.someone - .3, T.steals + .1)), away = eio(seg(t, T.steals + .5, T.stuck + .6));
    place(woman, HX + 1.0, HZ + .5, -.9); woman.group.visible = true; woman.pose(0, 0);
    man.group.visible = true; const mx = lerp(4.2, 1.9, mk) + 3 * away, mz = HZ + .6; place(man, mx, mz, -Math.PI / 2 + Math.PI * .1);
    const grab = seg(t, T.steals - .1, T.steals + .4); man.pose(.25 * grab, grab * .7);
    skin.visible = true;
    if (grab < 1 || away < .01) skin.position.set(HX - .1, ground(HX - .1, HZ) + .02, HZ + .3), skin.rotation.y = .6;
    if (grab >= .9) { skin.position.set(mx - .35, 1.0, mz); skin.rotation.set(0, 1.0, 1.2); }
    const p = seg(t, S.d, S.f);
    cam(V(lerp(1.0, .6, p), 1.2, HZ + lerp(4.4, 3.8, p)), V(1.2, HY + .85, HZ), 46);
    after = () => {
      showChip('HERE\'S THE CATCH', T.catch_ - .6, T.sealskin - .3, t);
      showChip('SEALSKIN = WAY HOME', T.sealskin - .25, T.someone - .3, t);
      showChip('STOLEN', T.someone - .25, T.stuck - .3, t);
      showChip('STUCK ON LAND', T.stuck - .25, S.f, t);
      if (t > T.sealskin && t < T.someone - .2) { skin.updateWorldMatrix(true, false); const [sx, sy] = toScreen(skin.position.clone().add(V(0, .2, 0))); O.ring(ov, sx, sy, W * .2, seg(t, T.sealskin, T.sealskin + .5)); }
      O.mark(ov, W * .82, H * .36, false, seg(t, T.stuck + .2, T.stuck + .6));
    };
  } else if (t < S.g) {
    // 6. she finds her skin, puts it on, and goes back to the waves
    const walk = eio(seg(t, S.f, T.finds)), tr = eio(seg(t, T.puts - .05, T.puts + .7)), go = eio(seg(t, T.returns - .1, T.waves + .4));
    const sx = -.4, wx = lerp(-1.9, sx + .5, walk);
    skin.visible = tr < .5; skin.position.set(sx, ground(sx, HZ) + .02, HZ); skin.rotation.y = .3;
    place(woman, wx, HZ + .1, Math.PI / 2 + .6); setS(woman, 1 - tr); woman.pose(.2 * seg(t, T.finds - .3, T.finds + .3), 0);
    const sz = lerp(HZ, -4.6, go);
    place(seal, lerp(sx, -.4, go), sz, .1, go > 0 ? ground(sx, sz) - go * .35 : undefined); setS(seal, tr); seal.pose({ lift: .15 * (1 - go) });
    if (go > .8) ripple(-.4, -4.8, T.waves, .09);
    splash(V(-.4, 0, -5.0), T.waves + .1, t, 24, .8); burst(V(sx, HY + .6, HZ), T.puts, t, 36, 1);
    const p = seg(t, S.f, S.g);
    cam(V(lerp(-.6, .4, eio(p)), lerp(1.2, 1.0, p), lerp(-3.6, -3.2, p)), V(-.3, .5, HZ), 48);
    after = () => {
      showChip('NEVER FORGETS THE SEA', T.forgets - .35, T.finds - .3, t);
      showChip('FINDS HER SKIN', T.finds - .25, T.returns - .35, t);
      showChip('BACK TO THE WAVES', T.returns - .3, S.g, t);
      O.mark(ov, W * .82, H * .36, true, seg(t, T.puts + .5, T.puts + .9));
    };
  } else if (t < S.h) {
    // 7. seven tears into the sea call her kin
    place(woman, 0, -5.35, Math.PI * .5 + Math.PI * .5 * 0, ground(0, -5.35)); woman.group.rotation.y = 0; woman.group.visible = true; woman.pose(.65, 0);
    const n = Math.floor(clamp(seg(t, T.seven - .1, T.tears + .6)) * 7.99), age = t - (T.seven - .1);
    for (let i = 0; i < 7; i++) { const t0 = T.seven + i * .2, a = t - t0; if (a < 0) continue;
      if (a < .55) { const s = tearP[i]; s.visible = true; s.position.set(.04 * (i % 2 ? 1 : -1), 1.2 - 4.9 * a * a, -4.85); s.scale.setScalar(.06); s.material.opacity = 1; }
      ripple(.04, -4.85, t0 + .5, .07); }
    if (t > T.sea + .6 && t < S.h) {}
    const sealIn = eo(seg(t, T.tears + .4, T.tears + 1.3));
    if (sealIn > 0) { seal.group.visible = true; place(seal, 1.1, -3.9, -.9, lerp(-.95, -.3, sealIn)); seal.pose({ lift: .6 * sealIn }); ripple(1.1, -3.9, T.tears + .4, .08); }
    const p = seg(t, S.g, S.h);
    cam(V(lerp(-2.2, -1.8, p), 1.0, lerp(-2.4, -2.2, p)), V(.1, .5, -5.0), 48);
    after = () => {
      showChip('CALLING HER KIN', T.kin - .3, T.seven - .3, t);
      showChip(n >= 1 ? 'TEARS: ' + Math.min(7, n) + ' / 7' : '7 TEARS', T.seven - .25, S.h, t);
    };
  } else if (t < S.i) {
    // 8. the real animal: a seal hauled out on the rocks
    seal.group.visible = true; place(seal, HX, HZ, .3); seal.pose({ lift: .3, look: Math.sin(t * .8) * .35 });
    const p = seg(t, S.h, S.i);
    cam(V(lerp(1.4, .7, eio(p)), lerp(.8, .55, p), HZ + lerp(3.6, 3.0, eio(p))), V(0, HY + .35, HZ), 42);
    after = () => {
      showChip('THE REAL ANIMAL?', T.real - .35, T.sealR - .1, t);
      showChip('THE SEAL', T.sealR - .05, T.hauls - .2, t);
      showChip('HAULS OUT ON ROCKS', T.hauls - .15, S.i, t);
      if (t > T.hauls) { seal.group.updateWorldMatrix(true, true); const [bx, by] = toScreen(seal.group.localToWorld(V(0, .6, .1))); O.arrow(ov, bx + 260, by - 200, bx + 40, by - 40, seg(t, T.hauls, T.hauls + .5), '#f5c23a', 14); }
    };
  } else if (t < S.j) {
    // 9. one theory: people in sealskin kayaks, mistaken for seal-folk
    seal.group.visible = true; place(seal, .9, HZ, -.4); seal.pose({ lift: .25 });
    place(man, -.8, HZ + .2, .6); man.group.visible = true; man.pose(0, 0);
    skin.visible = true; skin.position.set(-.1, ground(-.1, HZ + .5) + .02, HZ + .5); skin.rotation.y = .9; skin.scale.setScalar(1);
    const p = seg(t, S.i, S.j);
    cam(V(lerp(-.2, .1, eio(p)), lerp(1.3, 1.1, p), HZ + lerp(5.4, 5.0, p)), V(.1, HY + .6, HZ), 48);
    after = () => {
      showChip('ONE THEORY', T.theory - .3, T.kayaks - .4, t);
      showChip('SEALSKIN KAYAKS', T.kayaks - .35, T.mistaken - .3, t);
      showChip('MISTAKEN FOR SEAL-FOLK', T.mistaken - .25, S.j, t);
      const a = toScreen(V(-.8, 1.1, HZ)), b = toScreen(V(.9, .55, HZ));
      O.arrow(ov, a[0] + 40, a[1], b[0] - 60, b[1], seg(t, T.mistaken, T.mistaken + .6), '#f5c23a', 13);
    };
  } else {
    // 10. dusk: a seal head watches from the swell. Could it actually work?
    skyU.top.value.set(0x2a3a70); skyU.hor.value.set(0xf0a070); skyU.low.value.set(0x5a5060); fog.color.set(0xd09080); fog.near = 20; fog.far = 120;
    hemi.color.set(0xffc8a0); hemi.intensity = 1.15; sun.color.set(0xffa060); sun.intensity = 2.0; sun.position.set(-20, 5, -30); shore.waterM.color.set(0x3f5f78);
    const k = eio(seg(t, S.j + .2, S.end - .2));
    seal.group.visible = true; place(seal, 0, lerp(-3.4, -4.4, k), .2, lerp(-.5, -.9, k) - .0); seal.pose({ lift: .8 * (1 - k * .5), look: -.3 });
    ripple(0, -3.6, T.could, .06); ripple(0, -4.0, T.find, .05);
    for (let i = 0; i < stars.length; i++) { const r = mulberry(70 + i), s = stars[i]; s.visible = true; s.position.set((r() - .5) * 8, .3 + r() * .5, -2 - r() * 6); s.scale.setScalar(.05 + r() * .04); s.material.opacity = .4 + .4 * Math.sin(t * 2 + i * 2); }
    const p = seg(t, S.j, S.end);
    cam(V(lerp(1.3, 1.0, p), lerp(.55, .4, p), lerp(-.8, -1.2, p)), V(0, .1, -3.8), 44);
    after = () => {
      showChip('COULD IT WORK?', T.could - .2, T.find - .3, t);
      showChip('NEXT: THE PHYSICS', T.find - .25, S.end + 1, t);
    };
  }

  shore.update(t);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};
window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'river' }, { t: .5, type: 'splash' }, { t: T.sheds + .1, type: 'shimmer' }, { t: T.someone, type: 'buzz' }, { t: T.steals, type: 'pop' }, { t: T.stuck, type: 'buzz' },
  { t: T.puts, type: 'shimmer' }, { t: T.waves, type: 'splash' }, { t: T.seven, type: 'ding' }, { t: T.seven + .2, type: 'ding' }, { t: T.seven + .4, type: 'ding' }, { t: T.seven + .6, type: 'ding' },
  { t: T.seven + .8, type: 'ding' }, { t: T.seven + 1.0, type: 'ding' }, { t: T.seven + 1.2, type: 'ding' }, { t: T.tears + .5, type: 'splash' }, { t: T.hauls, type: 'pop' }, { t: T.mistaken, type: 'swell' }, { t: T.could, type: 'chime' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
