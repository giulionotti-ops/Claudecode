// Selkie physics (Scottish / Orcadian / Shetland / Faroese folklore): picture = render(t)
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
const T = { minute: wt('minute', 0), seven: wt('seven'), gasps: wt('gasps'), helpless: wt('helpless'), hypo: wt('hypothermia'), fat: wt('fat'), harbour: wt('harbour'), blubber: wt('blubber'),
  hunt: wt('hunt'), breath: wt('breath'), grey: wt('grey', 0), seventy: wt('seventy'), slow: wt('slow'), heart: wt('heart'), four: wt('four'), weighs: wt('weighs'), kilos: wt('kilos'),
  where: wt('where'), person: wt('person', 1), fix: wt('fix'), twist: wt('twist'), shed: wt('shed'), molt: wt('molt'), maybe: wt('maybe'), coat: wt('coat'), could: wt('could') };
const last = words[words.length - 1].t1;
const S = { a: 0, b: wt('last') - .05, c: wt('a', 0) - .05, d: wt('so', 0) - .05, e: wt('but', 0) - .05, f: wt('so', 2) - .05, g: wt('but', 1) - .05, h: wt('no') - .05, i: wt('real') - .05, j: wt('so', 3) - .05, end: last + .9 };
window.DUR = S.end;

// ---------------------------------------------------------------- particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
function pool(n, color, add = false) { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); a.push(s); } return a; }
const sparks = pool(50, 0xcfe8ff, true), spray = pool(40, 0xffffff), flakes = pool(30, 0x8a8d8c), bubs = pool(24, 0xe8f6ff);
function hideAll() { for (const p of [sparks, spray, flakes, bubs]) for (const s of p) s.visible = false; }
function burst(o, t0, t, n = 40, R = 1) {
  const age = t - t0; if (age < 0 || age > 1.3) return; const r = mulberry(11);
  for (let i = 0; i < n && i < sparks.length; i++) { const s = sparks[i], a = r() * Math.PI * 2, v = (.4 + r()) * R, up = (.6 + r() * 1.4) * R;
    s.visible = true; s.position.set(o.x + Math.cos(a) * v * age, o.y + up * age - .8 * age * age, o.z + Math.sin(a) * v * age); s.scale.setScalar(.07 + r() * .08); s.material.opacity = 1 - age / 1.3; }
}
function bubbles(o, t, n = 24) { const r = mulberry(5); for (let i = 0; i < n && i < bubs.length; i++) { const s = bubs[i], ph = (t * .5 + r()) % 1; s.visible = true; s.position.set(o.x + (r() - .5) * .5, o.y + ph * 1.4, o.z + (r() - .5) * .4); s.scale.setScalar(.05 + r() * .05); s.material.opacity = .7 * (1 - ph); } }
function shedding(o, t, n = 30) { const r = mulberry(17); for (let i = 0; i < n && i < flakes.length; i++) { const s = flakes[i], ph = (t * .45 + r()) % 1; s.visible = true; s.position.set(o.x + (r() - .5) * .9 + ph * .3, o.y + .55 - ph * .55, o.z + (r() - .5) * .8); s.scale.setScalar(.06 + r() * .05); s.material.opacity = .9 * (1 - ph * .6); } }

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
  shore.waterM.color.set(0x2f5f70); shore.waterM.opacity = .92;
}
const place = (o, x, z, ry = 0, y) => { o.group.position.set(x, y ?? ground(x, z), z); o.group.rotation.set(0, ry, 0); };
const setS = (o, k) => { o.group.scale.setScalar(Math.max(.001, k)); o.group.visible = k > .01; };
// a blubber layer: a warm translucent shell around the seal's torso
const blub = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 2), new THREE.MeshStandardMaterial({ color: 0xf2c14a, transparent: true, opacity: 0, roughness: .5, flatShading: true }));
blub.scale.set(.97, .83, 1.78); blub.position.y = .27; seal.group.add(blub);
function heart(cx, cy, k, a) { const x = ov.x; x.save(); x.globalAlpha = a; x.translate(cx, cy); x.scale(k, k); x.fillStyle = '#ff4b6a'; x.strokeStyle = '#fff'; x.lineWidth = 8; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(0, 70); x.bezierCurveTo(-110, -10, -60, -90, 0, -35); x.bezierCurveTo(60, -90, 110, -10, 0, 70); x.fill(); x.stroke(); x.restore(); }
function qmark(cx, cy, a) { const x = ov.x; x.save(); x.globalAlpha = a; x.font = `700 ${Math.round(W * .2)}px 'Lilita One', sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 18; x.strokeStyle = '#1a1a1a'; x.lineJoin = 'round'; x.strokeText('?', cx, cy); x.fillStyle = '#f5c23a'; x.fillText('?', cx, cy); x.restore(); }

window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov); day(); shore.ripples.length = 0;
  seal.group.visible = false; woman.group.visible = false; skin.visible = false; man.group.visible = false; seal.group.scale.setScalar(1); woman.group.scale.setScalar(1); blub.material.opacity = 0;
  seal.pose({ bob: Math.sin(t * 1.6) * .01 }); woman.pose(0, 0);
  let after = null;

  if (t < S.b) {
    // 1. a person wades into the winter sea
    const w = eio(seg(t, .3, T.minute + .3)), z = lerp(-6.6, -3.4, w);
    woman.group.visible = true; place(woman, -.2, z, 0, shoreH(-.2, z) - .05 - Math.max(0, w - .5) * .2); woman.pose(0, .3 * w);
    ripple(-.2, z + .3, t, .05);
    const p = seg(t, S.a, S.b);
    cam(V(lerp(2.2, 1.6, p), lerp(1.2, 1.0, p), lerp(-1.0, -1.2, p)), V(-.2, .5, -5.0), 46);
    after = () => {
      showChip('ORKNEY · WINTER SEA', S.a, T.minute - .4, t);
      showChip('ABOUT ONE MINUTE', T.minute - .35, S.b, t);
    };
  } else if (t < S.c) {
    // 2. last time: the selkie. Could one work? The water is seven degrees
    seal.group.visible = true; place(seal, -.1, -3.6, -.3, -.3); seal.pose({ lift: .7, look: Math.sin(t * 1.3) * .4 }); ripple(-.1, -3.6, S.b, .08);
    const p = seg(t, S.b, S.c);
    cam(V(lerp(1.0, .6, p), .55, -1.0), V(-.1, .15, -3.6), 44);
    after = () => {
      showChip('LAST TIME: THE SELKIE', S.b, T.could - .3, t);
      showChip('COULD ONE WORK?', T.could - .25, T.seven - .3, t);
      showChip('SEA: 7 °C', T.seven - .25, S.c, t);
      O.readout(ov, W * .84, H * .3, 7, '#7fd4ff', seg(t, T.seven - .1, T.seven + .3));
    };
  } else if (t < S.d) {
    // 3. problem: a person in cold water
    const flail = Math.sin(t * 7) * .15;
    woman.group.visible = true; place(woman, -.2, -3.6, 0, -.55 - seg(t, T.helpless, T.hypo + 1) * .15); woman.pose(.1, .5 + flail);
    ripple(-.2, -3.3, t - .1, .07); ripple(-.2, -3.3, t + .6 - ((t * 1.7) % 1), .05);
    const p = seg(t, S.c, S.d);
    cam(V(lerp(1.6, 1.2, p), 1.0, -1.2), V(-.2, .35, -3.6), 46);
    after = () => {
      showChip('1 MIN: GASPING', T.gasps - .3, T.helpless - .3, t);
      showChip('10 MIN: HELPLESS', T.helpless - .25, T.hypo - .3, t);
      showChip('1 HOUR: HYPOTHERMIA', T.hypo - .25, S.d, t);
      O.mark(ov, W * .84, H * .3, false, seg(t, T.hypo + .3, T.hypo + .7));
    };
  } else if (t < S.e) {
    // 4. fix: wear fat like a harbour seal (blubber)
    seal.group.visible = true; place(seal, HX, HZ, .3); seal.pose({ lift: .35, look: Math.sin(t * .9) * .3 });
    blub.material.opacity = .55 * seg(t, T.blubber - .2, T.blubber + .5);
    const p = seg(t, S.d, S.e);
    cam(V(lerp(1.5, .9, eio(p)), lerp(.85, .7, p), HZ + lerp(3.2, 2.6, eio(p))), V(0, HY + .35, HZ), 42);
    after = () => {
      showChip('SO: WEAR FAT', S.d, T.harbour - .3, t);
      showChip('HARBOUR SEAL', T.harbour - .25, T.blubber - .3, t);
      showChip('BLUBBER = WARM', T.blubber - .25, S.e, t);
      seal.group.updateWorldMatrix(true, true); const [bx, by] = toScreen(seal.group.localToWorld(V(0, .6, .1)));
      O.arrow(ov, bx + 250, by - 210, bx + 40, by - 50, seg(t, T.blubber, T.blubber + .5), '#f5c23a', 14);
      O.mark(ov, W * .84, H * .3, true, seg(t, T.blubber + 1.0, T.blubber + 1.4));
    };
  } else if (t < S.f) {
    // 5. problem: hunting means holding your breath. Grey seal feeds 70 m down
    shore.waterM.opacity = .5;
    const d = eio(seg(t, T.hunt, T.seventy + .5)), z = -2.4;
    seal.group.visible = true; place(seal, 0, z, -.3, lerp(-.3, -1.0, d)); seal.pose({ lift: lerp(.5, -.4, d) });
    bubbles(V(0, -1.0, z), t, 18 * d | 0);
    const p = seg(t, S.e, S.f);
    cam(V(lerp(1.8, 1.4, p), 1.5, 0), V(0, -.3, z), 46);
    after = () => {
      showChip('HUNTING = HOLD YOUR BREATH', S.e, T.grey - .3, t);
      showChip('GREY SEAL', T.grey - .25, T.seventy - .3, t);
      showChip('FEEDS 70 M DEEP', T.seventy - .25, S.f, t);
      O.ruler(ov, W * .86, H * .22, H * .5, seg(t, T.seventy - .3, T.seventy + .8), '70 M');
    };
  } else if (t < S.g) {
    // 6. fix: slow the heart, like a grey seal
    shore.waterM.opacity = .5;
    seal.group.visible = true; place(seal, 0, -2.4, -.3, -1.0); seal.pose({ lift: -.4 }); bubbles(V(0, -1.0, -2.4), t, 6);
    const p = seg(t, S.f, S.g);
    cam(V(lerp(1.4, 1.0, p), 1.5, 0), V(0, -.3, -2.4), 46);
    const beats = [T.slow + .2, T.four - .3, T.four + 1.4]; let k = 1;
    for (const b of beats) { const a = t - b; if (a > 0 && a < .5) k = 1 + .3 * Math.sin(a / .5 * Math.PI); }
    after = () => {
      showChip('SO: SLOW YOUR HEART', S.f, T.four - .5, t);
      showChip('4 BEATS / MIN', T.four - .45, S.g, t);
      heart(W * .5, H * .34, k * 1.1, seg(t, T.heart - .3, T.heart + .2));
    };
  } else if (t < S.h) {
    // 7. problem: 155 kg of seal has to go somewhere when she turns into a person
    const sh = eio(seg(t, T.person - .3, T.person + .5));
    place(seal, HX, HZ, .3); setS(seal, 1 - sh); seal.pose({ lift: .3 });
    place(woman, HX + .5, HZ + .4, -.5); setS(woman, sh); woman.pose(0, 0);
    burst(V(HX, HY + .6, HZ), T.person - .3, t, 40, 1);
    const p = seg(t, S.g, S.h);
    cam(V(lerp(1.4, .9, eio(p)), lerp(.95, 1.1, p), HZ + lerp(3.4, 3.8, p)), V(.2, HY + .6, HZ), 44);
    after = () => {
      showChip('FEMALE GREY SEAL', S.g, T.kilos - .5, t);
      showChip('155 KG', T.kilos - .45, T.where - .3, t);
      showChip('WHERE DOES IT GO?', T.where - .25, S.h, t);
      qmark(W * .5, H * .34, seg(t, T.where, T.where + .4));
    };
  } else if (t < S.i) {
    // 8. no fix
    place(woman, HX + .3, HZ + .3, -.4); woman.group.visible = true; woman.pose(0, 0);
    skin.visible = true; skin.position.set(HX - .9, ground(HX - .9, HZ) + .02, HZ + .3); skin.rotation.y = .6;
    const p = seg(t, S.h, S.i);
    cam(V(lerp(-.6, .3, p), 1.2, HZ + 3.9), V(0, HY + .85, HZ), 46);
    after = () => {
      showChip('NO FIX', T.fix - .4, T.twist - .3, t);
      showChip('BUT A TWIST…', T.twist - .35, S.i, t);
      O.mark(ov, W * .16, H * .3, false, seg(t, T.fix, T.fix + .4));
    };
  } else if (t < S.j) {
    // 9. real seals shed: a harbour seal on a rock, moulting
    seal.group.visible = true; place(seal, HX, HZ, .3); seal.pose({ lift: .3, look: Math.sin(t * .8) * .35 });
    shedding(V(HX, HY, HZ), t, 30 * seg(t, T.shed - .3, T.shed + .5) | 0);
    skin.visible = t > T.shed; skin.position.set(HX + 1.1, ground(HX + 1.1, HZ + .2) + .02, HZ + .2); skin.rotation.y = -.5; skin.scale.setScalar(.6);
    const p = seg(t, S.i, S.j);
    cam(V(lerp(1.4, .7, eio(p)), lerp(.8, .55, p), HZ + lerp(3.6, 3.0, eio(p))), V(.2, HY + .35, HZ), 42);
    after = () => {
      showChip('REAL SEALS DO SHED', S.i, T.molt - .6, t);
      showChip('HARBOUR SEAL MOLT', T.molt - .55, S.j, t);
    };
  } else {
    // 10. dusk: a seal on a rock, losing its coat. Maybe that's where it began
    skyU.top.value.set(0x2a3a70); skyU.hor.value.set(0xf0a070); skyU.low.value.set(0x5a5060); fog.color.set(0xd09080); fog.near = 20; fog.far = 120;
    hemi.color.set(0xffc8a0); hemi.intensity = 1.15; sun.color.set(0xffa060); sun.intensity = 2.0; sun.position.set(-20, 5, -30); shore.waterM.color.set(0x3f5f78);
    seal.group.visible = true; place(seal, HX, HZ, .3); seal.pose({ lift: .3, look: -.3 });
    shedding(V(HX, HY, HZ), t, 14);
    skin.visible = true; skin.position.set(HX + 1.1, ground(HX + 1.1, HZ + .2) + .02, HZ + .2); skin.rotation.y = -.5; skin.scale.setScalar(.6);
    const p = seg(t, S.j, S.end);
    cam(V(lerp(1.3, .9, p), lerp(.8, .6, p), HZ + lerp(3.4, 2.9, p)), V(.2, HY + .35, HZ), 42);
    after = () => {
      showChip('MAYBE THE LEGEND…', T.maybe - .3, T.coat - .4, t);
      showChip('A SEAL LOSING ITS COAT', T.coat - .35, S.end + 1, t);
    };
  }

  shore.update(t);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!…]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};
window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'river' }, { t: .8, type: 'splash' }, { t: T.seven, type: 'chime' }, { t: T.hypo, type: 'buzz' }, { t: T.blubber, type: 'shimmer' }, { t: T.seventy, type: 'swell' },
  { t: T.four - .3, type: 'ding' }, { t: T.person - .3, type: 'pop' }, { t: T.fix, type: 'buzz' }, { t: T.shed, type: 'shimmer' }, { t: T.coat, type: 'splash' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
