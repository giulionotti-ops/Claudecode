// Why Nobody Has Ever Seen a Kraken: picture = render(t)
import * as THREE from 'three';
import { clamp, lerp, seg, eio, eo, ei, mulberry } from '/core/lib.js';
import { makeSquid, makeWhale, makeShip, makeSea } from './creatures.js';
import * as O from './overlay.js';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.localClippingEnabled = true; renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);
const ov = O.makeOverlay(W, H);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 900);
const bg = new THREE.Color(), fog = new THREE.Fog(0x1f6f86, 10, 90); scene.fog = fog; scene.background = bg;
const hemi = new THREE.HemisphereLight(0xbfefff, 0x0a1a24, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xdff6ff, 2.2); sun.position.set(6, 40, 10); scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x7fc8ff, 0); rim.position.set(-10, 5, -20); scene.add(rim); scene.add(rim.target);
const key = new THREE.PointLight(0x9fd8ff, 0, 20, 1.5); scene.add(key);

const sea = makeSea(scene);
const ship = makeShip(); scene.add(ship);
const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e4);
const squid = makeSquid(clip); scene.add(squid.group);
const whale = makeWhale(); scene.add(whale.group);

// ---------------------------------------------------------------- timings from the voice
const words = await (await fetch('voice/words.json')).json();
const clean = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const wt = (w, n = 0) => { let k = 0; for (const x of words) if (clean(x.w) === w && k++ === n) return x.t0; throw new Error('word ' + w); };
const T = {
  hundred: wt('hundred'), sinks: wt('sinks'), ammonia: wt('ammonia'), lighter: wt('lighter'), float: wt('float'),
  burns: wt('burns'), terrible: wt('terrible'), deep: wt('deep'), cold: wt('cold'), better: wt('better'), pitch: wt('pitch'),
  grow: wt('grow'), dinner: wt('dinner'), colossal: wt('colossal'), biggest: wt('biggest', 1), hunts: wt('hunts'), sperm: wt('sperm'),
  glow: wt('glow'), hundred2: wt('hundred', 1), nobody: wt('nobody'), hiding: wt('hiding'), warm: wt('warm'), breathe: wt('breathe'),
};
const S = { a: 0, b: 7.9, c: 15.3, d: 20.2, e: 25.75, f: 28.4, g: 34.6, h: 38.55, i: 44.4, end: 52.4 };
window.DUR = S.end;

// ---------------------------------------------------------------- particles
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c); })();
function pool(n, color, add = false) { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, fog: !add, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.visible = false; scene.add(s); a.push(s); } return a; }
const snow = pool(140, 0xdfeff2), glow = pool(160, 0x6ff6ff, true), bubbles = pool(40, 0xe8fbff);
const SNOW = (() => { const r = mulberry(31), a = []; for (let i = 0; i < 140; i++) a.push([r(), r(), r(), r()]); return a; })();
const GLOW = (() => { const r = mulberry(41), a = []; for (let i = 0; i < 160; i++) a.push({ s: r(), dx: (r() - .5) * 2, dy: (r() - .5) * 2, dz: (r() - .5) * 2, k: .5 + r() }); return a; })();
function hideAll() { for (const p of [snow, glow, bubbles]) for (const s of p) s.visible = false; }
function marineSnow(center, t, op = .35, R = 22) {
  for (let i = 0; i < snow.length; i++) { const [a, b, c, d] = SNOW[i], s = snow[i];
    s.visible = true; const y = ((b - t * .015 * (1 + d)) % 1 + 1) % 1;
    s.position.set(center.x + (a - .5) * R * 2, center.y + (y - .5) * R * 1.6, center.z + (c - .5) * R * 2);
    s.scale.setScalar(.08 + d * .12); s.material.opacity = op * (.4 + d * .6); }
}
function bubbleRise(origin, t0, t, n = 30) {
  const age = t - t0; if (age < 0) return; const r = mulberry(55);
  for (let i = 0; i < Math.min(n, bubbles.length); i++) { const s = bubbles[i], st = r() * 2.2, a = age - st; if (a < 0 || a > 3) continue;
    s.visible = true; s.position.set(origin.x + (r() - .5) * 3 + Math.sin(a * 5 + i) * .15, origin.y + a * 3.2, origin.z + (r() - .5) * 2);
    s.scale.setScalar(.12 + r() * .18); s.material.opacity = .7 * (1 - a / 3); }
}

// ---------------------------------------------------------------- helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function cam(pos, look, fov = 50) { camera.position.copy(pos); camera.lookAt(look); camera.fov = fov; camera.updateProjectionMatrix(); }
function toScreen(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }
const texts = [];
function wordAt(t) { let w = null; for (const x of words) { if (x.t0 <= t + .02) w = x; else break; } if (!w) return null; const next = words[words.indexOf(w) + 1]; if (t > w.t1 + .5 && (!next || next.t0 > t + .02)) return null; return w; }
function showChip(text, a, b, t, y) { const box = O.chip(ov, text, t - a, Math.min(1, (b - t) / .2), y); if (box) texts.push({ id: 'chip:' + text, text, ...box }); }
function water(colorHex, near, far) { bg.set(colorHex); fog.color.copy(bg); fog.near = near; fog.far = far; }
function placeSquid(pos, rotZ, scale = 1, rotY = 0) { const g = squid.group; g.position.copy(pos); g.rotation.set(0, rotY, rotZ, 'YXZ'); g.scale.setScalar(scale); }
function eyeWorld() { const e = squid.eyes[1]; e.updateWorldMatrix(true, false); return e.getWorldPosition(V(0, 0, 0)); }
const WARM = new THREE.Color(0x3f8f86), TEAL = new THREE.Color(0x2a8496), DEEP = new THREE.Color(0x061826);

window.render = (t) => {
  texts.length = 0; hideAll(); O.clear(ov);
  clip.constant = 1e4; squid.setCells(0); squid.eyeScale(1);
  ship.visible = false; whale.group.visible = false; sea.surface.visible = true; sea.rays.visible = true;
  sea.surfM.uniforms.time.value = t; sea.surfM.uniforms.tint.value.set(0x9fe6ee);
  hemi.intensity = 1.2; hemi.color.set(0xbfefff); sun.intensity = 2.2; rim.intensity = 0; key.intensity = 0;
  for (const m of sea.rays.children) { m.material.opacity = .22 * (.7 + .3 * Math.sin(t * .6 + m.userData.ph)); }
  let after = null;

  if (t < S.b) {
    // 1. a kraken under a ship; then it sinks like a stone
    water(0x1f6f86, 12, 110); ship.visible = true; ship.position.set(0, 0, 0); ship.rotation.y = .5;
    const k = ei(seg(t, T.sinks, S.b + .4)), y = -15 - 30 * k;
    placeSquid(V(1, y, 0), Math.PI, 2.2, .3); squid.pose(t, k > 0 ? 'trail' : 'reach', 1);
    const p = seg(t, S.a, S.b);
    cam(V(lerp(6, 3, eio(p)), -24 - 6 * k, lerp(40, 34, eio(p))), V(0, -8 - 10 * k, 0), 56);
    marineSnow(V(0, -14, 10), t, .3);
    after = () => {
      showChip('100× THE BIGGEST SQUID', T.hundred - .1, T.sinks - .5, t);
      showChip('SINKS', T.sinks - .1, S.b, t);
      const a = toScreen(V(14, -10 - 10 * k, 0)), b = toScreen(V(14, -24 - 10 * k, 0));
      O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.sinks, T.sinks + .5), '#ff6b5b', 16);
    };
  } else if (t < S.c) {
    // 2. cut open: ammonia cells fill the body, and it floats
    water(0x0f2a3a, 30, 120); sea.surface.visible = false; sea.rays.visible = false;
    const up = eo(seg(t, T.float, T.float + 1.2)) * 2.0 + Math.sin(t * 1.3) * .08;
    const P0 = V(-1000, up, 0);
    placeSquid(P0, -Math.PI / 2, 1, 0); squid.pose(t, 'trail', .6);
    clip.constant = lerp(5, .25, eio(seg(t, T.ammonia - .5, T.ammonia + .3)));
    squid.setCells(seg(t, T.ammonia, T.ammonia + 2.2));
    hemi.intensity = .9; sun.intensity = 2.0; sun.position.set(-1000 + 4, 12, 14); sun.target.position.copy(P0);
    key.position.set(-1000 + 2, 2 + up, 6); key.intensity = 30;
    const p = seg(t, S.b, S.c);
    cam(V(-1000 + lerp(1.2, 2.2, p), .6 + up * .7, lerp(15, 13.5, p)), V(-1000 + 2.0, up * .8, 0), 50);
    marineSnow(V(-1000, 0, 0), t, .18, 14);
    after = () => {
      showChip('AMMONIA', T.ammonia - .1, T.lighter - .25, t);
      showChip('LIGHTER THAN SEAWATER', T.lighter - .1, T.float - .1, t);
      showChip('FLOATS FOR FREE', T.float - .05, S.c, t);
      const a = toScreen(V(-1000 + 4.2, up + 1.2, 0)), b = toScreen(V(-1000 + 4.2, up + 3.0, 0));
      O.arrow(ov, a[0], a[1], b[0], b[1], seg(t, T.float, T.float + .5), '#5fe07a', 15);
      O.mark(ov, W * .80, H * .30, true, seg(t, T.float + .4, T.float + .8));
    };
  } else if (t < S.e) {
    // 3–4. oxygen runs out near the warm surface; it dives to cold water and the gauge refills
    const deep = t >= S.d, dk = deep ? eio(seg(t, S.d, S.e)) : 0;
    const col = deep ? TEAL.clone().lerp(DEEP, dk) : TEAL; water(col.getHex(), 8, lerp(90, 40, dk));
    sea.surface.visible = !deep || dk < .6; sea.rays.visible = !deep || dk < .8;
    sea.surfM.uniforms.op.value = 1 - dk;
    for (const m of sea.rays.children) m.material.opacity *= 1 - dk;
    hemi.intensity = lerp(1.2, .5, dk); sun.intensity = lerp(2.2, .5, dk); sun.position.set(6, 40, 10); sun.target.position.set(0, -20, 0);
    let pos;
    if (!deep) { const k = seg(t, S.c, S.d); pos = V(lerp(6, -4, k), -12 + Math.sin(t) * .3, 0); placeSquid(pos, Math.PI / 2, 1.4, 0); squid.pose(t, 'trail', 1); }
    else { const k = seg(t, S.d, S.e); pos = V(-4, -12 - 26 * eio(k), 0); placeSquid(pos, Math.PI * .92, 1.4, .4); squid.pose(t, 'trail', 1.2); }
    if (!deep) cam(V(pos.x + 2, pos.y + 1, 20), V(pos.x - 1, pos.y + .5, 0), 50);
    else cam(V(pos.x + 5, pos.y - 4, 28), V(pos.x - 1, pos.y + 3, 0), 50);
    marineSnow(pos, t, .3 + .1 * dk, 18);
    if (deep) bubbleRise(pos.clone().add(V(0, 6, 0)), S.d, t, 20);
    const ox = !deep ? lerp(.85, .18, eio(seg(t, T.burns, T.terrible + .6))) : lerp(.18, .92, eio(seg(t, T.cold + .3, T.better + .3)));
    const temp = !deep ? 22 : lerp(22, 4, eio(seg(t, S.d + .2, T.cold + 1.2)));
    after = () => {
      O.meter(ov, W * .85, H * .40, H * .2, ox, 'OXYGEN', 1);
      O.readout(ov, W * .16, H * .30, temp, temp > 12 ? '#ff9a3a' : '#5ab8ff', 1);
      if (!deep) {
        showChip('BURNS OXYGEN', T.burns - .1, T.terrible - .7, t);
        showChip('SQUID BLOOD: WEAK', T.terrible - .6, S.d, t);
        O.mark(ov, W * .5, H * .42, false, seg(t, T.terrible, T.terrible + .4));
      } else {
        showChip('GO DEEP', T.deep - .3, T.cold - .1, t);
        showChip('COLD WATER = MORE OXYGEN', T.cold - .05, S.e, t);
        O.mark(ov, W * .5, H * .42, true, seg(t, T.better, T.better + .4));
      }
    };
  } else if (t < S.f) {
    // 5. pitch black
    water(0x010307, 4, 26); sea.surface.visible = false; sea.rays.visible = false;
    const k = seg(t, S.e, T.pitch + .3);
    hemi.intensity = lerp(.35, .03, k); sun.intensity = lerp(.4, 0, k); rim.intensity = .25; rim.target.position.set(-4, -40, 0);
    const pos = V(-4, -40 - (t - S.e) * .6, 0); placeSquid(pos, Math.PI * .5, 1.4, 0); squid.pose(t, 'trail', .5);
    cam(V(pos.x + 2.5, pos.y + .8, 13), V(pos.x - 1, pos.y + .3, 0), 50);
    marineSnow(pos, t, .12, 14);
    after = () => showChip('PITCH BLACK', T.pitch - .2, S.f, t);
  } else if (t < S.g) {
    // 6. the eye grows to the size of a dinner plate
    water(0x02070d, 4, 30); sea.surface.visible = false; sea.rays.visible = false;
    hemi.intensity = .12; sun.intensity = 0; rim.intensity = .6; rim.target.position.set(0, -40, 0);
    const P = V(0, -40, 0); placeSquid(P, -Math.PI / 2, 1, 0); squid.pose(t, 'trail', .4);
    const g = eo(seg(t, T.grow, T.dinner + .5)); squid.eyeScale(1 + 1.25 * g);
    const e = eyeWorld(); key.position.copy(e).add(V(1.5, 1.5, 3)); key.intensity = 18;
    const p = seg(t, S.f, S.g);
    cam(e.clone().add(V(lerp(2.6, 1.6, eio(p)), lerp(1.0, .4, p), lerp(6.5, 5.2, eio(p)))), e.clone().add(V(.6, -.1, 0)), 46);
    marineSnow(e, t, .14, 8);
    after = () => {
      showChip('DINNER-PLATE EYES', T.grow - .1, T.colossal - .2, t);
      showChip('COLOSSAL SQUID: 27 CM', T.colossal - .15, T.biggest - .2, t);
      showChip('BIGGEST EYES ON EARTH', T.biggest - .15, S.g, t);
      const [ex, ey] = toScreen(e); const r = Math.abs(toScreen(e.clone().add(V(0, .4 * (1 + 1.25 * g), 0)))[1] - ey) * 1.35;
      O.ring(ov, ex, ey, r, seg(t, T.dinner, T.dinner + .6));
    };
  } else {
    // 7–8. a sperm whale out of the dark, lighting up plankton; 9. back up in the warm water
    if (t < S.i) {
      water(0x02060d, 6, 80); sea.surface.visible = false; sea.rays.visible = false;
      hemi.intensity = .4; hemi.color.set(0x6fa8c8); sun.intensity = .5; sun.position.set(0, 10, -10); sun.target.position.set(0, -38, -22); rim.intensity = 2.6; rim.position.set(-10, -20, -60); rim.target.position.set(0, -38, -22);
      const SQ = V(7, -43, 8); placeSquid(SQ, Math.PI / 2, 1, -.25); squid.pose(t, 'trail', .5); squid.eyeScale(2.25);
      whale.group.visible = true;
      const wk = seg(t, S.g, S.i), wp = V(lerp(-22, 16, wk), -37 + Math.sin(t * .4) * 1.2, -22);
      whale.group.position.copy(wp); whale.group.rotation.set(0, Math.PI / 2, 0); whale.group.scale.setScalar(1.25); whale.swim(t);
      // plankton lights up where the whale has just passed
      const lit = t >= S.h;
      for (let i = 0; i < glow.length; i++) { const g = GLOW[i], gx = lerp(-22, 16, g.s); const ahead = wk - g.s - .02;
        if (!lit || ahead < 0) continue; const b = Math.exp(-ahead * 5) * seg(t, S.h, S.h + .8), s = glow[i];
        s.visible = true; s.position.set(gx - 5 + g.dx * 3, wp.y + g.dy * 4, -22 + g.dz * 5); s.scale.setScalar(.8 + g.k * 1.2); s.material.opacity = Math.min(1, b * 1.3); }
      const e = eyeWorld();
      if (t < S.h) cam(SQ.clone().add(V(4, 6.5, 14)), V(-6, -35.5, -22), 54);
      else { const k = seg(t, S.h, S.i); cam(SQ.clone().add(V(4 + k, 6.5, 14)), V(lerp(-4, 8, k), -35.5, -22), 54); }
      marineSnow(SQ.clone().add(V(-6, 0, -10)), t, .1, 24);
      after = () => {
        showChip('SPERM WHALE', T.sperm - .15, S.h, t);
        if (t >= S.h) {
          showChip('WATCH FOR THE GLOW', T.glow - .3, T.hundred2 - .7, t);
          showChip('SEEN FROM 120 M', T.hundred2 - .6, S.i, t);
          const a = toScreen(e), b = toScreen(V(wp.x - 7, wp.y, -22));
          O.arrow(ov, a[0] - 30, a[1] - 20, b[0], b[1], seg(t, T.glow - .2, T.glow + .6), '#6ff6ff', 12, true);
        }
      };
    } else {
      // 9. warm water near the surface: the kraken drifts up, limp. It can't breathe here.
      water(WARM.getHex(), 10, 90); ship.visible = true; ship.position.set(6, 0, -6); ship.rotation.y = -.4;
      sea.surfM.uniforms.tint.value.set(0xffe2b0); sea.surfM.uniforms.op.value = 1;
      hemi.color.set(0xffe6c4); hemi.intensity = 1.25; sun.color.set(0xffe2b8); sun.intensity = 2.4; sun.position.set(6, 40, 10); sun.target.position.set(0, -10, 0);
      for (const m of sea.rays.children) m.material.color.set(0xffe8c0);
      const k = seg(t, S.i, S.end), pos = V(-1 + k * 2, lerp(-16, -9, eo(k)), 0);
      placeSquid(pos, Math.PI * .62 + Math.sin(t * .5) * .05, 1.6, .5 + k * .3); squid.pose(t, 'limp', 1); squid.eyeScale(2.25);
      cam(V(lerp(3, 7, eio(k)), lerp(-22, -24, k), lerp(22, 30, eio(k))), V(1, lerp(-10, -6, k), 0), 54);
      marineSnow(pos, t, .35, 20);
      const ox = lerp(.35, .06, eio(seg(t, T.warm - .2, T.breathe + .3)));
      after = () => {
        showChip('NOBODY SEES ONE', T.nobody - .2, T.hiding - .5, t);
        showChip('NOT HIDING', T.hiding - .45, T.warm - .45, t);
        showChip('TOO WARM TO BREATHE', T.warm - .4, S.end, t);
        if (t > T.warm - .4) { O.meter(ov, W * .85, H * .40, H * .2, ox, 'OXYGEN', seg(t, T.warm - .4, T.warm)); O.readout(ov, W * .16, H * .30, 24, '#ff9a3a', seg(t, T.warm - .4, T.warm)); }
      };
    }
  }
  if (!(t >= S.i)) { sun.color.set(0xdff6ff); for (const m of sea.rays.children) m.material.color.set(0xc8f4ff); }
  if (t < S.b || (t >= S.c && t < S.d)) sea.surfM.uniforms.op.value = .95;

  sea.surface.position.set(camera.position.x, 0, camera.position.z);
  for (const m of sea.rays.children) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
  renderer.render(scene, camera);
  if (after) after();
  const w = wordAt(t);
  if (w) { O.caption(ov, w.w.replace(/[.,:?!]/g, '').toUpperCase(), t - w.t0); texts.push({ id: 'cap', text: w.w, x0: 0, y0: H * .64, x1: W, y1: H * .76, pass: true }); }
};

window.TEXTS = () => texts.slice();
const EV = [{ t: S.a + .1, type: 'rumble' }, { t: T.sinks, type: 'thud' }, { t: T.ammonia + .1, type: 'bubbles' }, { t: T.float, type: 'ding' },
  { t: T.terrible, type: 'buzz' }, { t: S.d, type: 'dive' }, { t: T.better, type: 'ding' }, { t: T.pitch, type: 'drone' },
  { t: T.grow, type: 'swell' }, { t: T.sperm - .4, type: 'whale' }, { t: T.glow, type: 'shimmer' }, { t: T.warm, type: 'buzz' }];
for (const k of ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) EV.push({ t: S[k], type: 'whoosh' });
window.EV = EV.sort((a, b) => a.t - b.t);
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");
window.READY = true;
