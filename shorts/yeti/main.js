// Could a Yeti Actually Live in the Himalayas?: picture = render(t)
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import { makeBeast, makeHare, makeYak, makeWorld } from './creatures.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 600);
const bg = new THREE.Color(0xa8c8e6), fog = new THREE.Fog(0xa8c8e6, 25, 130); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xdcecff, 0x9aa8b8, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); sun.position.set(10, 22, 14); scene.add(sun); scene.add(sun.target);

const world = makeWorld(scene);
const beast = makeBeast(); scene.add(beast.group);
const hare = makeHare(); scene.add(hare.group);
const yak = makeYak(); scene.add(yak.group);
const den = new THREE.Group(); scene.add(den);
{ const m = new THREE.MeshStandardMaterial({ color: 0x6d7078, roughness: .9, flatShading: true });
  const mk = (g, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); den.add(o); return o; };
  mk(new THREE.IcosahedronGeometry(1, 1), -1.7, 1.2, -.4, 1.4, 2.2, 1.6); mk(new THREE.IcosahedronGeometry(1, 1), 1.9, 1.1, -.4, 1.4, 2.0, 1.6);
  mk(new THREE.IcosahedronGeometry(1, 1), 0, 2.7, -.5, 3.2, 1.0, 1.8); mk(new THREE.IcosahedronGeometry(1, 1), 0, 1.2, -1.6, 3.4, 2.4, 1.0); }

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  sherpa: wt('sherpa'), huge: wt('huge'), sinks: wt('sinks'), grow: wt('grow'), hare: wt('hare'), spread: wt('spread'), top: wt('top'),
  thin: wt('thin'), tune: wt('tune'), yak: wt('yak'), altitude: wt('altitude'), winter: wt('winter'), eat: wt('eat'), sleep: wt('sleep'), bear: wt('bear'),
  stored: wt('stored'), months: wt('months'), built: wt('built', 1), furry: wt('furry', 1), bear2: wt('bear', 1), nine: wt('nine'), dog: wt('dog'),
  eight: wt('eight'), asian: wt('asian'), name: wt('name'), rock: wt('rock'), bear3: wt('bear', 2), legend: wt('legend'), real: wt('real'),
};
const S = { a: 0, b: 9.5, c: 17.9, d: 25.8, e: 34.2, f: 38.0, g: 45.8, end: 53.5 };
window.DUR = S.end;

// ---------------------------------------------------------------- snow particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
const flakes = []; for (let i = 0; i < 220; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffffff, transparent: true, depthWrite: false, fog: false })); s.visible = false; scene.add(s); flakes.push(s); }
const FL = (() => { const r = mulberry(31), a = []; for (let i = 0; i < 220; i++) a.push([r(), r(), r(), r()]); return a; })();
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
function place(o, x, y, z, ry = 0, s = 1) { o.group.position.set(x, y, z); o.group.rotation.y = ry; o.group.scale.setScalar(s); }
const DAY = 0xa8c8e6;

window.render = (t) => {
  texts.length = 0; O.clear(ov);
  hare.group.visible = false; yak.group.visible = false; den.visible = false;
  sky(DAY, 30, 140); hemi.color.set(0xdcecff); hemi.intensity = 1.5; sun.color.set(0xfff2dc); sun.intensity = 2.4; sun.position.set(10, 22, 14); sun.target.position.set(0, 0, 0);
  beast.setColor(0); world.peaks.visible = true; world.mounds.visible = true; world.rocks.visible = true;
  let after = null, snowAt = V(0, 0, 0), dens = .25;

  if (t < S.b) {
    // 1. a yeti walks along a snowy ridge below the big peaks
    const p = seg(t, S.a, S.b);
    place(beast, lerp(-.9, .5, p), 0, lerp(1.5, .6, p), lerp(.7, .3, p), 1.0); beast.pose({ stand: 1, walk: 1, t: t * 1.1 });
    { const bx = lerp(-.9, .5, p); cam(V(bx + 1.2, 1.9, 8.6), V(bx, .4, 0), 50); }
    snowAt = V(0, 0, 0); dens = .3;
    after = () => {
      showChip('HIMALAYA · FOLKLORE', .2, T.sherpa + .3, t);
      showChip('SHERPA & TIBETAN STORIES', T.sherpa + .35, T.huge - .1, t);
      showChip('HUGE · HAIRY · HIGH SNOW', T.huge - .05, S.b, t);
    };
  } else if (t < S.c) {
    // 2. deep snow: small feet sink, wide furry feet float, like a snowshoe hare
    const sink = ei(seg(t, T.sinks, T.sinks + .7)) * .95 * (1 - eo(seg(t, T.grow + .2, T.grow + 1.4)));
    const fe = 1 + 1.45 * eo(seg(t, T.grow + .2, T.grow + 1.4));
    place(beast, -1.2, -sink, 0, .5, 1.05); beast.pose({ stand: 1, feet: fe, walk: t > T.grow + 1.4 ? 1 : 0, t, look: .2 });
    hare.group.visible = t > T.hare - .3; const hk = seg(t, T.hare - .3, T.hare + .5);
    place(hare, lerp(4.0, 1.4, eo(hk)), Math.abs(Math.sin(t * 5)) * (t > T.hare + .8 ? .12 : 0), 1.0, -.5, 1.6);
    cam(V(.4, 2.0, 8.4), V(.2, .45, 0), 52); snowAt = V(0, 0, 0); dens = .4;
    const sx = toScreen(V(-1.1, 0, 0));
    after = () => {
      showChip('BIG BODY SINKS', T.sinks - .2, T.grow - .15, t);
      showChip('WIDE FURRY FEET', T.grow - .1, T.hare - .1, t);
      showChip('SNOWSHOE HARE: BIG HIND FEET', T.hare - .05, T.top + .3, t);
      if (t < T.grow) O.mark(ov, W * .5, H * .40, false, seg(t, T.sinks + .5, T.sinks + .9));
      else O.mark(ov, W * .5, H * .40, true, seg(t, T.top - .3, T.top + .1));
    };
  } else if (t < S.d) {
    // 3. thin air: the oxygen gauge drops, then the yak shows how it is done
    sky(0x7fa6d4, 30, 150);
    place(beast, -.8, 0, 0, .5, 1.0); beast.pose({ stand: 1, walk: 0, t, look: .3 });
    yak.group.visible = t > T.yak - .5; const yk = eo(seg(t, T.yak - .5, T.yak + .6));
    place(yak, lerp(6, .95, yk), 0, .8, -1.15, .8);
    cam(V(.3, 2.2, 9.0), V(0, .5, 0), 54); snowAt = V(0, 0, 0); dens = .2;
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
    // 4. winter, nothing to eat: it sleeps in a den on stored fat, like a brown bear
    sky(0x8d9fb5, 8, 60); hemi.intensity = 1.1; sun.intensity = 1.3;
    den.visible = true; den.position.set(0, 0, 0);
    const lie = eio(seg(t, T.sleep - .2, T.sleep + 1.2));
    place(beast, lerp(-2.6, 0, eio(seg(t, S.d, T.sleep))), 0, lerp(2, .4, eio(seg(t, S.d, T.sleep))), lerp(.6, 0, eio(seg(t, S.d, T.sleep))), 1.0);
    beast.setColor(0); beast.pose({ stand: 1 - lie, lie, walk: t < T.sleep ? 1 : 0, t });
    cam(V(0, 2.2, 7.4), V(0, .9, 0), 54); snowAt = V(0, 0, 0); dens = 1;
    const fat = lerp(.95, .22, eio(seg(t, T.stored, S.e + .3)));
    after = () => {
      showChip('WINTER: NOTHING TO EAT', T.winter - .1, T.sleep - .2, t);
      showChip('SLEEP ON STORED FAT', T.sleep - .15, T.bear - .1, t);
      showChip('BROWN BEAR: HIBERNATION', T.bear - .05, S.e, t);
      O.meter(ov, W * .87, H * .40, H * .2, fat, 'FAT', seg(t, T.sleep, T.sleep + .4));
    };
  } else if (t < S.f) {
    // 5. look at what you built: the yeti drops onto four legs and its fur turns brown
    const k = eio(seg(t, T.furry, T.bear2 + .5));
    beast.setColor(k); place(beast, lerp(-.2, .1, k), 0, 0, lerp(.35, .5, k), lerp(1.05, 1.2, k)); beast.pose({ stand: 1 - k, walk: k > .1 && k < .95 ? 1 : 0, feet: 1, t, look: .15 });
    cam(V(1.8, 1.9, 8.2), V(0, lerp(.45, .3, k), 0), 52); snowAt = V(0, 0, 0); dens = .3;
    after = () => {
      showChip('NOW LOOK AT WHAT YOU BUILT', T.built - .1, T.furry - .1, t);
      showChip('A BIG, FURRY BEAR', T.furry - .05, S.f, t);
    };
  } else if (t < S.g) {
    // 6. nine yeti samples tested: one dog, eight Asian bears
    beast.setColor(1); place(beast, 0, 0, 1, .55, 1.1); beast.pose({ stand: 0, walk: 0, feet: 1, t, look: .2 });
    cam(V(1.8, 1.7, 7.4), V(0, .1, 0), 52); snowAt = V(0, 0, 0); dens = .3;
    after = () => {
      showChip('2017 DNA TEST: 9 YETI SAMPLES', T.nine - 1.4, T.dog - .1, t);
      showChip('ONE WAS A DOG', T.dog - .05, T.eight - .2, t);
      showChip('EIGHT WERE ASIAN BEARS', T.eight - .15, S.g, t);
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
    sky(0xe8b890, 25, 120); hemi.color.set(0xffe6c8); hemi.intensity = 1.3; sun.color.set(0xffc890); sun.intensity = 2.6; sun.position.set(-12, 8, 10);
    beast.setColor(1); const k = seg(t, S.g, S.end);
    place(beast, lerp(-1.4, 1.0, k), 0, lerp(1.2, .4, k), lerp(.7, .2, k), 1.1); beast.pose({ stand: 0, walk: 1, feet: 1, t: t * .7, look: 0 });
    cam(V(lerp(0, 1.5, eio(k)), 1.8, lerp(7.2, 6.6, eio(k))), V(lerp(-.6, .4, k), .3, 0), 52); snowAt = V(0, 0, 0); dens = .15;
    after = () => {
      showChip('YETI = TIBETAN "ROCK BEAR"', T.name - .1, T.legend - .15, t);
      showChip('THE LEGEND GREW FROM A REAL ANIMAL', T.legend - .1, S.end, t);
    };
  }
  snowfall(V(camera.position.x, 0, 0), t, dens);
  world.ground.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: .1, type: 'wind' }, { t: T.sinks, type: 'thud' }, { t: T.grow + .3, type: 'pop' }, { t: T.top, type: 'ding' }, { t: T.thin, type: 'buzz' },
  { t: T.altitude + .1, type: 'ding' }, { t: T.winter, type: 'wind' }, { t: T.sleep, type: 'snore' }, { t: T.furry, type: 'swell' }, { t: T.nine, type: 'blip' },
  { t: T.dog, type: 'buzz' }, { t: T.eight, type: 'blip' }, { t: T.rock, type: 'ding' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
