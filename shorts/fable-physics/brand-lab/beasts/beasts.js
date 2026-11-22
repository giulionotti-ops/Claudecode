// Channel-art scenes with new creatures, low-poly like the shorts: ?s=phoenix|yeti|hydra[-close]. Renders one still.
import * as THREE from 'three';
import { mulberry, lerp } from '/core/lib.js';

const W = innerWidth, H = innerHeight, Q = new URLSearchParams(location.search).get('s') || 'phoenix';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, W / H, .1, 2000);
const V = (x, y, z) => new THREE.Vector3(x, y, z), r = mulberry(9);
const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, flatShading: true, ...o });
function cam(p, l, f = 42) { camera.position.copy(p); camera.lookAt(l); camera.fov = f; camera.updateProjectionMatrix(); }
function sky(top, hor, low) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(hor) }, low: { value: new THREE.Color(low) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, hor, low; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0. ? mix(hor, top, pow(clamp(y*1.8,0.,1.), .7)) : mix(hor, low, clamp(-y*4.,0.,1.)); gl_FragColor = vec4(c,1.); }' });
  const s = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), m); scene.add(s); return s;
}
const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function sprites(n, color, place, add = true, op = .8) {
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: op }));
    place(s, i); scene.add(s); }
}
function ground(size, hFn, colFn) {
  const g = new THREE.PlaneGeometry(size, size, 140, 140); g.rotateX(-Math.PI / 2); const p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = hFn(x, z); p.setY(i, y); const c = colFn(x, y, z); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.receiveShadow = true; scene.add(m); return m;
}
const n2 = (x, z) => Math.sin(x * .13 + Math.sin(z * .07) * 2) * Math.cos(z * .11 + x * .03);
function lights(hemiTop, hemiLow, hi, sunC, si, sunPos) {
  scene.add(new THREE.HemisphereLight(hemiTop, hemiLow, hi));
  const s = new THREE.DirectionalLight(sunC, si); s.position.copy(sunPos); s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
  Object.assign(s.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 }); scene.add(s); return s;
}
// a tapered tube along points (necks, tails, plumes)
function tubeAlong(pts, r0, r1, mat, seg = 40, rad = 9) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const ctr = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const k = lerp(r0, r1, i / seg); for (let j = 0; j <= rad; j++) { const id = i * (rad + 1) + j, c = ctr[i];
    p.setXYZ(id, c.x + (p.getX(id) - c.x) * k, c.y + (p.getY(id) - c.y) * k, c.z + (p.getZ(id) - c.z) * k); } }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}

// ---------------------------------------------------------------- phoenix: a bird of fire over a dusk desert
function phoenix() {
  const g = new THREE.Group();
  const feather = flat(0xff7a1a, { emissive: 0xff4a00, emissiveIntensity: .9 }), gold = flat(0xffc23a, { emissive: 0xff9a10, emissiveIntensity: 1.1 }), hot = flat(0xfff0a0, { emissive: 0xffd060, emissiveIntensity: 1.4 });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), feather); body.scale.set(.9, .9, 1.6); g.add(body);
  const breast = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), gold); breast.position.set(0, -.25, .55); breast.scale.set(.85, .8, 1.1); g.add(breast);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.55, 1), feather); head.position.set(0, .75, 1.75); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.17, .7, 5), flat(0x3a2412)); beak.rotation.x = Math.PI / 2; beak.position.set(0, .66, 2.35); g.add(beak);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x101010 })); e.position.set(.33 * s, .86, 2.0); g.add(e);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(.08, .9, 4), gold); crest.position.set(.1 * s, 1.35, 1.55); crest.rotation.set(-.6, 0, -.25 * s); g.add(crest); }
  const crest = new THREE.Mesh(new THREE.ConeGeometry(.1, 1.1, 4), hot); crest.position.set(0, 1.45, 1.5); crest.rotation.x = -.7; g.add(crest);
  // wings: fans of long flat feathers, raised in a V
  for (const s of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(.7 * s, .3, .2); wing.rotation.set(0, -.35 * s, 0); g.add(wing);
    for (let k = 0; k < 9; k++) {
      const L = 2.4 + k * .5, sh = new THREE.Shape(); sh.moveTo(0, -.3); sh.lineTo(L * .8, -.45); sh.lineTo(L + .5, 0); sh.lineTo(L * .85, .5); sh.lineTo(0, .3);
      const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), k > 5 ? hot : k > 2 ? gold : feather); f.material.side = THREE.DoubleSide;
      f.rotation.set(0, 0, (s > 0 ? 0 : Math.PI) + s * (1.05 - k * .2)); f.position.z = -k * .04; wing.add(f);
    }
  }
  // tail plumes
  for (let k = 0; k < 5; k++) { const a = (k - 2) * .22;
    g.add(tubeAlong([V(0, 0, -1.4), V(Math.sin(a) * 1.5, -.5, -3.4), V(Math.sin(a) * 3, -1.6 + k * .1, -6), V(Math.sin(a) * 4.2, -3.2, -8.4)], .28, .04, k % 2 ? gold : feather)); }
  return g;
}
// ---------------------------------------------------------------- yeti: a shaggy giant on a snowy ridge
function yeti() {
  const g = new THREE.Group(), fur = flat(0xd4dde8), face = flat(0x6a7a8c), horn = flat(0xd8cba8);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), fur); body.scale.set(1.15, 1.25, .95); body.position.y = 3.2; body.castShadow = true; g.add(body);
  for (let i = 0; i < 26; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(.35, 1.0, 4), fur); const a = r() * Math.PI * 2, y = 2 + r() * 2.6; if (Math.sin(a) > .3 && y > 3.6) continue;
    t.position.set(Math.cos(a) * 2.2, y, Math.sin(a) * 1.8); t.lookAt(V(0, y + 2, 0).add(V(Math.cos(a) * 9, -6, Math.sin(a) * 9))); g.add(t); }
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), fur); head.position.set(0, 5.6, .5); g.add(head);
  const mask = new THREE.Mesh(new THREE.IcosahedronGeometry(.85, 1), face); mask.scale.set(1.05, .9, .6); mask.position.set(0, 5.45, 1.2); g.add(mask);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7fe0ff, emissive: 0x2a9fd0, emissiveIntensity: .8 })); eye.position.set(.33 * s, 5.68, 1.62); g.add(eye);
    const h = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.1, 5), horn); h.position.set(.85 * s, 6.5, .3); h.rotation.z = -.5 * s; g.add(h);
    const arm = tubeAlong([V(1.9 * s, 4.4, .2), V(2.9 * s, 3.2, .6), V(3.2 * s, 1.8, .9)], .75, .55, fur); g.add(arm);
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), face); hand.position.set(3.25 * s, 1.5, .95); g.add(hand);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.7, .8, 1.6, 7), fur); leg.position.set(1.0 * s, .8, 0); g.add(leg);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.7, .14, .2), flat(0x22262c)); mouth.position.set(0, 5.1, 1.7); g.add(mouth);
  for (const s of [-1, 1]) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(.07, .22, 4), flat(0xffffff)); tooth.rotation.x = Math.PI; tooth.position.set(.2 * s, 5.0, 1.78); g.add(tooth); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// ---------------------------------------------------------------- hydra: five heads rising from a misty swamp
function hydra() {
  const g = new THREE.Group(), scale = flat(0x3f8a4a), belly = flat(0xb8c46a), dark = flat(0x1d3a22);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), scale); body.scale.set(1.3, .7, 1.1); body.position.y = .6; g.add(body);
  const heads = [[-3.6, 6.2, 1.2, -.5], [-1.6, 8.0, 1.8, -.2], [0, 9.0, 2.2, 0], [1.8, 7.9, 1.6, .25], [3.7, 6.0, 1.0, .5]];
  for (const [hx, hy, hz, tilt] of heads) {
    const neck = tubeAlong([V(hx * .3, 1.4, 0), V(hx * .55, hy * .45, hz * .2 - .4), V(hx * .9, hy * .8, hz * .6), V(hx, hy, hz)], .85, .45, scale); g.add(neck);
    const h = new THREE.Group(); h.position.set(hx, hy, hz); h.rotation.set(.25, tilt * .6, -tilt * .3); g.add(h);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(.75, 1), scale); skull.scale.set(.9, .75, 1.1); h.add(skull);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.4, 6), scale); snout.rotation.x = Math.PI / 2; snout.position.set(0, -.1, .95); h.add(snout);
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(.38, 1.2, 6), belly); jaw.rotation.x = Math.PI / 2 + .35; jaw.position.set(0, -.45, .8); h.add(jaw);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe25a, emissive: 0xffb000, emissiveIntensity: 1.2 })); eye.position.set(.38 * s, .22, .45); h.add(eye);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.14, .7, 4), dark); spike.position.set(.32 * s, .55, -.25); spike.rotation.x = -.7; h.add(spike);
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- scenes
const close = Q.endsWith('-close'), low = Q.endsWith('-low'), kind = Q.replace('-close', '').replace('-low', '');
if (kind === 'phoenix') {
  sky(0x2a1e3e, 0xff9a5a, 0x5a2a1a); scene.fog = new THREE.Fog(0xe08a5a, 60, 420);
  lights(0xffc89a, 0x40243a, 1.0, 0xffd0a0, 1.8, V(-30, 40, 30));
  ground(900, (x, z) => n2(x, z) * 4 + Math.max(0, -z - 80) * .15, (x, y) => new THREE.Color().setRGB(.55 + y * .02, .32 + y * .01, .2)).position.y = -24;
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(14 + r() * 10, 30 + r() * 20, 5), flat(0x7a3e2a)); m.position.set(-180 + i * 45 + r() * 10, -12, -220 - r() * 60); scene.add(m); }
  const p = phoenix(); p.rotation.set(-.15, .5, .12); scene.add(p);
  const glow = new THREE.PointLight(0xffa040, 80, 40, 1.4); glow.position.set(0, 1, 2); scene.add(glow);
  sprites(70, 0xffa030, (s, i) => { const t = r(); s.position.set((r() - .5) * 2 + Math.sin(i) * t * 4, -1 - t * 5, -2 - t * 8); s.scale.setScalar(.3 + r() * .8); s.material.opacity = .6 * (1 - t); });
  sprites(40, 0xffe080, (s) => { s.position.set((r() - .5) * 14, (r() - .5) * 8, (r() - .5) * 10); s.scale.setScalar(.08 + r() * .12); });
  if (close) cam(V(1.8, .2, 8.5), V(0, 1.2, 1.2), 40); else if (low) cam(V(5, -5, 26), V(0, 6.5, -1), 42); else cam(V(5, -7, 24), V(0, 1.5, -1), 42);
} else if (kind === 'yeti') {
  sky(0x5f8fc4, 0xdfeaf4, 0xbfd0e0); scene.fog = new THREE.Fog(0xd6e4f0, 40, 300);
  lights(0xdfeaf6, 0x6a7f98, .75, 0xfff4e8, 1.5, V(20, 30, 25));
  ground(500, (x, z) => n2(x, z) * 2.5 + Math.max(0, -z - 15) * .35, (x, y) => new THREE.Color().setRGB(.9 + y * .002, .94, .98));
  for (let i = 0; i < 12; i++) { const h = 40 + r() * 50, m = new THREE.Mesh(new THREE.ConeGeometry(h * .55, h, 5), flat(0xf2f6fa)); m.position.set(-200 + i * 36, h / 2 - 10, -170 - r() * 80); scene.add(m);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(h * .56, h * .45, 5), flat(0x6a7686)); rock.position.set(m.position.x, h * .2 - 10, m.position.z + 1); scene.add(rock); }
  for (let i = 0; i < 30; i++) { const x = (r() - .5) * 120, z = -20 - r() * 90; if (Math.abs(x) < 12 && z > -40) continue;
    const t = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.6 - k * .4, 2, 6), flat(k ? 0xf4f8fb : 0x2c4a3a)); c.position.y = 1.2 + k * 1.1; t.add(c); }
    t.scale.setScalar(1.4 + r()); t.position.set(x, n2(x, z) * 2.5 + Math.max(0, -z - 15) * .35, z); scene.add(t); }
  const y = yeti(); y.rotation.y = -.35; scene.add(y);
  sprites(220, 0xffffff, (s) => { s.position.set((r() - .5) * 60, r() * 25, (r() - .5) * 40 + 5); s.scale.setScalar(.08 + r() * .15); }, false, .9);
  if (close) cam(V(.6, 5.7, 7.2), V(0, 5.3, 1), 40); else if (low) cam(V(4, 4.5, 19), V(0, 8.2, 0), 46); else cam(V(5, 4, 15), V(0, 3.6, 0), 46);
} else {
  sky(0x2c3e3a, 0x8fb09a, 0x1c2a22); scene.fog = new THREE.Fog(0x7e9c88, 20, 160);
  lights(0xcfe8d6, 0x1a2a1e, 1.0, 0xe8f0d0, 1.6, V(-20, 30, 20));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x2a4a3a, roughness: .2, metalness: .3 })); water.rotation.x = -Math.PI / 2; water.position.y = .2; scene.add(water);
  for (let i = 0; i < 40; i++) { const x = (r() - .5) * 140, z = -10 - r() * 120; if (Math.abs(x) < 10 && z > -20) continue;
    const tr = new THREE.Group(), trunk = new THREE.Mesh(new THREE.CylinderGeometry(.3, .7, 9, 6), flat(0x3a3026)); trunk.position.y = 4.5; tr.add(trunk);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 + r(), 0), flat(0x2e5a36)); b.position.set((r() - .5) * 3, 8 + r() * 2, (r() - .5) * 3); tr.add(b); }
    tr.scale.setScalar(1 + r()); tr.position.set(x, 0, z); scene.add(tr); }
  const h = hydra(); h.rotation.y = .1; scene.add(h);
  sprites(60, 0xdfeee4, (s) => { s.position.set((r() - .5) * 80, 1 + r() * 3, (r() - .5) * 60 - 10); s.scale.setScalar(6 + r() * 10); }, false, .14);
  sprites(30, 0xd8ff7a, (s) => { s.position.set((r() - .5) * 30, 1 + r() * 8, (r() - .5) * 20); s.scale.setScalar(.12 + r() * .1); });
  if (close) cam(V(2, 8.4, 9), V(0, 8, 1.5), 38); else if (low) cam(V(4, 6, 30), V(0, 11.5, 0), 44); else cam(V(4, 5.5, 26), V(0, 5, 0), 44);
}
window.render = () => renderer.render(scene, camera);
window.DUR = 1; window.EV = []; window.READY = true;
