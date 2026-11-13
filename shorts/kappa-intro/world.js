// Meet the Kappa: the kappa, a person, a horse, a softshell turtle, a cucumber and a Japanese river valley. All built in code, low-poly.
import * as THREE from 'three';
import { mulberry, lerp, clamp } from '/core/lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, flatShading: true, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };

// a tapered tube along points (limbs, neck, tail)
function tubeAlong(pts, r0, r1, mat, seg = 12, rad = 7) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const ctr = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const k = lerp(r0, r1, i / seg); for (let j = 0; j <= rad; j++) { const id = i * (rad + 1) + j, c = ctr[i];
    p.setXYZ(id, c.x + (p.getX(id) - c.x) * k, c.y + (p.getY(id) - c.y) * k, c.z + (p.getZ(id) - c.z) * k); } }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
// a webbed hand or foot: a flat fan of three toes joined by a thin web
function webbed(mat, webM, s = 1) {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(-.07, 0); sh.lineTo(-.12, .16); sh.lineTo(-.04, .13); sh.lineTo(0, .19); sh.lineTo(.04, .13); sh.lineTo(.12, .16); sh.lineTo(.07, 0); sh.closePath();
  const web = new THREE.Mesh(new THREE.ShapeGeometry(sh), webM); g.add(web);
  for (const a of [-.55, 0, .55]) { const t = mesh(new THREE.ConeGeometry(.022, .19, 4), mat); t.position.set(Math.sin(a) * .1, Math.cos(a) * .1, .004); t.rotation.z = -a; g.add(t); }
  g.scale.setScalar(s); return g;
}

// ---------------------------------------------------------------- the kappa. Feet at y = 0, about 1.2 tall, faces +Z.
export function makeKappa() {
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = .42; root.add(hips);
  const skin = flat(0x5f9a3c), belly = flat(0xc9c46a), shellM = flat(0x4a5a2a), rimM = flat(0x6e7a3a), beakM = flat(0xe0a52a), hair = flat(0x1c2a14);
  const webM = new THREE.MeshStandardMaterial({ color: 0x7fb85a, roughness: .7, side: THREE.DoubleSide, flatShading: true });
  // legs (fixed to the hips' parent so a bow only bends the body)
  for (const s of [-1, 1]) {
    root.add(tubeAlong([V(.13 * s, .44, 0), V(.16 * s, .24, .03), V(.15 * s, .05, 0)], .085, .06, skin));
    const f = webbed(skin, webM, 1.3); f.rotation.x = -Math.PI / 2; f.position.set(.15 * s, .012, .02); root.add(f);
  }
  const torso = new THREE.Group(); hips.add(torso);
  const body = mesh(new THREE.IcosahedronGeometry(.3, 1), skin, 0, .2, 0); body.scale.set(1, 1.15, .82); torso.add(body);
  const plast = mesh(new THREE.IcosahedronGeometry(.26, 1), belly, 0, .2, .08); plast.scale.set(.9, 1.1, .7); torso.add(plast);
  // shell: a domed carapace with plate seams, on the back (-Z)
  const shell = mesh(new THREE.SphereGeometry(.36, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), shellM, 0, .22, -.12); shell.rotation.x = -Math.PI / 2; shell.scale.set(1, .7, 1.2); torso.add(shell);
  const rim = mesh(new THREE.TorusGeometry(.355, .035, 5, 14), rimM, 0, .22, -.12); rim.scale.set(1, 1.2, 1); torso.add(rim);
  { const r = mulberry(4); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = i ? .17 : 0;
      const p = mesh(new THREE.CylinderGeometry(.075, .085, .03, 6), rimM); p.rotation.x = Math.PI / 2;
      p.position.set(Math.cos(a) * rr * (i ? 1 : 0), .22 + Math.sin(a) * rr * 1.2 * (i ? 1 : 0), -.12 - .245 + (i ? .045 : 0) - .005 * r()); torso.add(p); } }
  // head
  const head = new THREE.Group(); head.position.set(0, .56, .02); torso.add(head);
  const skull = mesh(new THREE.IcosahedronGeometry(.25, 1), skin); skull.scale.set(1, .95, .95); head.add(skull);
  const beak = mesh(new THREE.ConeGeometry(.09, .22, 5), beakM, 0, -.06, .25); beak.rotation.x = Math.PI / 2 + .25; head.add(beak);
  const beak2 = mesh(new THREE.ConeGeometry(.07, .16, 5), beakM, 0, -.11, .22); beak2.rotation.x = Math.PI / 2 + .45; head.add(beak2);
  const eyeW = new THREE.MeshStandardMaterial({ color: 0xf4eed0, roughness: .3 }), eyeB = new THREE.MeshBasicMaterial({ color: 0x0c0c0c });
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(.065, 12, 8), eyeW, .1 * s, .05, .19));
    head.add(mesh(new THREE.SphereGeometry(.035, 10, 8), eyeB, .11 * s, .055, .245));
  }
  // the dish (sara) on top, ringed by a fringe of hair, holding water
  const dish = mesh(new THREE.CylinderGeometry(.15, .12, .05, 14, 1, true), flat(0xd8cfa8, { side: THREE.DoubleSide }), 0, .22, 0); head.add(dish);
  const dishBase = mesh(new THREE.CircleGeometry(.12, 14), flat(0xbfb48a), 0, .2, 0); dishBase.rotation.x = -Math.PI / 2; head.add(dishBase);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x7fd8ff, emissive: 0x2a8ac0, emissiveIntensity: .55, roughness: .05, metalness: .2, transparent: true, opacity: .92 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(.14, 16), waterM); water.rotation.x = -Math.PI / 2; water.position.y = .235; head.add(water);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const h = mesh(new THREE.ConeGeometry(.05, .16, 4), hair, Math.cos(a) * .18, .14, Math.sin(a) * .18);
    h.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); head.add(h); }
  // arms: shoulder pivots, so poses can swing them
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(.27 * s, .36, .02); torso.add(sh);
    sh.add(tubeAlong([V(0, 0, 0), V(.05 * s, -.17, .02), V(.07 * s, -.34, .04)], .06, .045, skin));
    const hand = webbed(skin, webM, 1.25); hand.position.set(.07 * s, -.34, .04); hand.rotation.set(0, 0, Math.PI); sh.add(hand);
    arms.push(sh);
  }
  const drops = [];
  // pose: bow 0..1 (forward), arms: [left, right] raise angles, bob
  function pose({ bow = 0, armL = 0, armR = 0, armOut = .15, bob = 0, tilt = 0, look = 0 } = {}) {
    torso.rotation.x = bow * 1.15; head.rotation.x = bow * .25 + tilt; head.rotation.y = look;
    arms[0].rotation.set(-armL, 0, -armOut); arms[1].rotation.set(-armR, 0, armOut);
    hips.position.y = .42 + bob;
  }
  function setWater(k) { water.visible = k > .02; water.scale.setScalar(Math.max(.01, k)); water.position.y = .205 + .03 * k; }
  function dishWorld() { water.updateWorldMatrix(true, false); return water.getWorldPosition(V(0, 0, 0)); }
  pose();
  return { group: root, pose, setWater, dishWorld, head, arms, torso };
}

// ---------------------------------------------------------------- a villager in a simple kimono, faces +Z, about 1.65 tall
export function makePerson() {
  const root = new THREE.Group(), torso = new THREE.Group(); torso.position.y = .85; root.add(torso);
  const cloth = flat(0x2f4f86), sash = flat(0xc8a24a), skin = flat(0xe2b48c), hairM = flat(0x161210);
  root.add(mesh(new THREE.CylinderGeometry(.2, .27, .86, 8), cloth, 0, .43, 0));
  torso.add(mesh(new THREE.CylinderGeometry(.19, .2, .52, 8), cloth, 0, .26, 0));
  torso.add(mesh(new THREE.CylinderGeometry(.205, .205, .1, 8), sash, 0, .04, 0));
  torso.add(mesh(new THREE.CylinderGeometry(.05, .06, .12, 6), skin, 0, .56, 0));
  const head = mesh(new THREE.IcosahedronGeometry(.13, 1), skin, 0, .66, .01); torso.add(head);
  torso.add(mesh(new THREE.IcosahedronGeometry(.135, 1), hairM, 0, .7, -.03));
  torso.add(mesh(new THREE.IcosahedronGeometry(.07, 0), hairM, 0, .8, -.1));
  for (const s of [-1, 1]) { const a = tubeAlong([V(.2 * s, .48, 0), V(.23 * s, .28, .06), V(.17 * s, .1, .14)], .07, .05, cloth); torso.add(a);
    torso.add(mesh(new THREE.IcosahedronGeometry(.045, 0), skin, .16 * s, .08, .17)); }
  return { group: root, pose: (bow = 0) => { torso.rotation.x = bow * .9; } };
}

// ---------------------------------------------------------------- a horse, faces +X, about 1.6 at the withers
export function makeHorse() {
  const root = new THREE.Group(), coat = flat(0x7a4a2a), dark = flat(0x2a1a10);
  const body = mesh(new THREE.IcosahedronGeometry(.55, 1), coat, 0, 1.2, 0); body.scale.set(1.75, .85, .8); root.add(body);
  root.add(tubeAlong([V(.75, 1.35, 0), V(1.0, 1.7, 0), V(1.12, 1.95, 0)], .26, .17, coat));
  const head = mesh(new THREE.IcosahedronGeometry(.2, 1), coat, 1.32, 1.92, 0); head.scale.set(1.9, .8, .75); head.rotation.z = -.6; root.add(head);
  root.add(tubeAlong([V(.82, 1.5, 0), V(1.0, 1.9, 0), V(1.08, 2.1, 0)], .07, .04, dark));
  for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(.05, .15, 4), coat, 1.1, 2.12, .08 * s); root.add(e); }
  const legs = [];
  for (const [x, z] of [[.6, .22], [.6, -.22], [-.6, .22], [-.6, -.22]]) {
    const L = new THREE.Group(); L.position.set(x, 1.05, z); root.add(L);
    L.add(tubeAlong([V(0, 0, 0), V(0, -.5, 0), V(0, -1.0, 0)], .11, .07, coat));
    L.add(mesh(new THREE.CylinderGeometry(.08, .09, .08, 6), dark, 0, -1.01, 0)); legs.push(L);
  }
  root.add(tubeAlong([V(-.92, 1.35, 0), V(-1.1, 1.05, 0), V(-1.1, .65, 0)], .09, .05, dark));
  function pose(t, strain = 0) {   // strain: legs braced, leaning back
    legs.forEach((L, i) => { L.rotation.z = (i < 2 ? -1 : 1) * .25 * strain + Math.sin(t * 9 + i * 1.7) * .12 * strain; });
  }
  return { group: root, pose };
}

// ---------------------------------------------------------------- a softshell turtle: flat leathery disc, long snorkel snout. Faces +Z, ~0.6 long
export function makeTurtle() {
  const root = new THREE.Group(), leather = flat(0x7b7a48, { roughness: .6 }), skin = flat(0x8a8a5a), under = flat(0xd8d0b0);
  const disc = mesh(new THREE.SphereGeometry(.32, 12, 6), leather, 0, .08, 0); disc.scale.set(1, .22, 1.25); root.add(disc);
  const und = mesh(new THREE.SphereGeometry(.3, 12, 6), under, 0, .06, 0); und.scale.set(.95, .14, 1.2); root.add(und);
  { const r = mulberry(17), dm = flat(0x55542e); for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * .24;
      const d = mesh(new THREE.CircleGeometry(.025 + r() * .02, 6), dm, Math.cos(a) * rr, .152, Math.sin(a) * rr * 1.2); d.rotation.x = -Math.PI / 2; root.add(d); } }
  const neck = new THREE.Group(); neck.position.set(0, .08, .36); root.add(neck);
  neck.add(tubeAlong([V(0, 0, 0), V(0, .05, .12), V(0, .07, .22)], .07, .055, skin));
  const head = mesh(new THREE.IcosahedronGeometry(.07, 1), skin, 0, .075, .26); head.scale.set(.9, .8, 1.3); neck.add(head);
  const snout = mesh(new THREE.ConeGeometry(.022, .1, 5), skin, 0, .08, .36); snout.rotation.x = Math.PI / 2; neck.add(snout);
  for (const s of [-1, 1]) neck.add(mesh(new THREE.SphereGeometry(.014, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }), .04 * s, .1, .3));
  const feet = [];
  for (const [x, z] of [[.27, .2], [-.27, .2], [.25, -.24], [-.25, -.24]]) { const f = mesh(new THREE.IcosahedronGeometry(.08, 0), skin, x, .04, z); f.scale.set(1.3, .35, .9); root.add(f); feet.push(f); }
  return { group: root, pose: (t) => { neck.position.z = .36 + Math.sin(t * 1.3) * .03; feet.forEach((f, i) => f.rotation.y = Math.sin(t * 2 + i) * .3); } };
}

export function makeCucumber() {
  const g = new THREE.Group(), m = flat(0x2e7a2a), dm = flat(0x1f5a1c);
  const b = mesh(new THREE.CapsuleGeometry(.05, .26, 3, 8), m); b.rotation.z = Math.PI / 2; g.add(b);
  const r = mulberry(8); for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, x = (r() - .5) * .28;
    g.add(mesh(new THREE.IcosahedronGeometry(.012, 0), dm, x, Math.cos(a) * .05, Math.sin(a) * .05)); }
  return g;
}

// ---------------------------------------------------------------- the valley: a river along X (water y = 0, |z| < ~5.5), banks at y ≈ .3, hills behind
export const bankH = (x, z) => {
  const az = Math.abs(z + 0), bed = -1.1, bank = .3;
  const k = clamp((az - 5) / 2.2); let y = lerp(bed, bank, k * k * (3 - 2 * k));
  if (z < -12) y += Math.pow((-z - 12) / 18, 1.6) * 9 * (1 + .35 * Math.sin(x * .09 + 1) + .25 * Math.sin(x * .23));
  if (z > 12) y += Math.pow((z - 12) / 18, 1.4) * 4;
  return y + (az > 7 ? .12 * Math.sin(x * .7) * Math.cos(z * .9) : 0);
};
export function makeValley(scene) {
  const g = new THREE.PlaneGeometry(160, 120, 160, 120); g.rotateX(-Math.PI / 2); const p = g.attributes.position, col = [];
  const grass = new THREE.Color(0x6fa04a), grass2 = new THREE.Color(0x4f8a3e), sand = new THREE.Color(0xc8b88a), mud = new THREE.Color(0x6a5a3e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = bankH(x, z); p.setY(i, y);
    if (y < -.3) c.copy(mud); else if (y < .22) c.copy(sand); else c.copy(grass).lerp(grass2, .5 + .5 * Math.sin(x * .31 + z * .17)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); ground.receiveShadow = true; scene.add(ground);
  // water: a low-poly sheet whose vertices move every frame
  const wg = new THREE.PlaneGeometry(160, 14, 80, 14); wg.rotateX(-Math.PI / 2);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x3f8f8a, roughness: .15, metalness: .15, flatShading: true, transparent: true, opacity: .88 });
  const water = new THREE.Mesh(wg, waterM); scene.add(water);
  const base = Float32Array.from(wg.attributes.position.array);
  const ripples = [];   // [{x, z, t0}]
  function update(t) {
    const a = wg.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = base[i * 3], z = base[i * 3 + 2];
      let y = .035 * Math.sin(x * .9 + t * 1.4) * Math.cos(z * 1.3 - t * 1.1) + .02 * Math.sin((x + z) * 2.1 + t * 2);
      for (const r of ripples) { const age = t - r.t0; if (age < 0 || age > 3) continue; const d = Math.hypot(x - r.x, z - r.z), w = d - age * 1.6;
        y += r.a * Math.exp(-w * w * 4) * (1 - age / 3) * Math.cos(w * 6); }
      a.setY(i, y); }
    a.needsUpdate = true; wg.computeVertexNormals();
  }
  // props: rocks, reeds, bamboo, pines, distant hills
  const props = new THREE.Group(); scene.add(props);
  const r = mulberry(23), rockM = flat(0x8a8a80), rock2 = flat(0x6f6f66), reedM = flat(0x7a9a3a), bambooM = flat(0x8fb04a), leafM = flat(0x4f8a2e), pineM = flat(0x2f5a32), trunkM = flat(0x5a3e2a);
  for (let i = 0; i < 46; i++) { const x = (r() - .5) * 90, side = r() < .5 ? -1 : 1, z = side * (4.6 + r() * 3.5), s = .2 + r() * .7; if (Math.abs(x) < 4.5 && side < 0) continue;
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), r() < .5 ? rockM : rock2, x, bankH(x, z) + s * .3, z); m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.y = .6; props.add(m); }
  for (let i = 0; i < 120; i++) { const x = (r() - .5) * 90, side = r() < .5 ? -1 : 1, z = side * (5.2 + r() * 1.8); if (Math.abs(x) < 3.5 && side < 0) continue;
    const h = .5 + r() * .8, m = mesh(new THREE.ConeGeometry(.03, h, 3), reedM, x, bankH(x, z) + h / 2 - .05, z); m.rotation.z = (r() - .5) * .3; props.add(m); }
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 80, z = -10.5 - r() * 9; if (Math.abs(x) < 2) continue;
    const h = 4 + r() * 4, y0 = bankH(x, z); const st = mesh(new THREE.CylinderGeometry(.07, .09, h, 5), bambooM, x, y0 + h / 2, z); st.rotation.z = (r() - .5) * .12; props.add(st);
    for (let k = 0; k < 3; k++) { const l = mesh(new THREE.IcosahedronGeometry(.5 + r() * .4, 0), leafM, x + (r() - .5), y0 + h - k * .7, z + (r() - .5)); l.scale.y = .5; props.add(l); } }
  for (let i = 0; i < 60; i++) { const x = (r() - .5) * 150, z = -22 - r() * 30, y0 = bankH(x, z), h = 3 + r() * 3;
    props.add(mesh(new THREE.CylinderGeometry(.12, .18, h * .4, 5), trunkM, x, y0 + h * .2, z));
    for (let k = 0; k < 3; k++) props.add(mesh(new THREE.ConeGeometry(1.4 - k * .35, 1.6, 6), pineM, x, y0 + h * .35 + k * .9, z)); }
  for (let i = 0; i < 40; i++) { const x = (r() - .5) * 150, z = 13 + r() * 30, y0 = bankH(x, z), h = 3 + r() * 3;
    for (let k = 0; k < 3; k++) props.add(mesh(new THREE.ConeGeometry(1.4 - k * .35, 1.6, 6), pineM, x, y0 + h * .35 + k * .9, z)); }
  // far mountains
  const mtM = flat(0x7b97a8);
  for (let i = 0; i < 9; i++) { const x = -120 + i * 30 + r() * 10, h = 25 + r() * 25; const m = mesh(new THREE.ConeGeometry(18 + r() * 10, h, 6), mtM, x, h / 2 - 2, -110 - r() * 20); props.add(m); }
  return { ground, water, waterM, update, ripples };
}

// ---------------------------------------------------------------- the warning sign: a wooden post and board with a painted kappa pictogram (no words)
export function makeSign() {
  const g = new THREE.Group(), wood = flat(0x8a6038);
  g.add(mesh(new THREE.BoxGeometry(.12, 1.6, .12), wood, 0, .8, 0));
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#f4e9c8'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#f2c230'; x.strokeStyle = '#c0261e'; x.lineWidth = 34; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(256, 50); x.lineTo(470, 440); x.lineTo(42, 440); x.closePath(); x.fill(); x.stroke();
  // waves
  x.strokeStyle = '#1f5f8a'; x.lineWidth = 16; x.lineCap = 'round';
  for (const yy of [372, 404]) { x.beginPath(); for (let i = 0; i <= 12; i++) { const xx = 120 + i * 23; x.lineTo(xx, yy + Math.sin(i * 1.4) * 9); } x.stroke(); }
  // kappa head and hands rising out of the waves
  x.fillStyle = '#1c2a14';
  x.beginPath(); x.ellipse(256, 290, 62, 58, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(256, 300); x.lineTo(296, 330); x.lineTo(256, 334); x.fill();
  x.fillStyle = '#f4e9c8'; x.beginPath(); x.ellipse(256, 238, 40, 13, 0, 0, 7); x.fill();
  x.fillStyle = '#1c2a14';
  for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; x.beginPath(); x.moveTo(256 + Math.cos(a) * 62, 252 + Math.sin(a) * 18); x.lineTo(256 + Math.cos(a) * 74, 236 + Math.sin(a) * 26); x.lineTo(256 + Math.cos(a + .2) * 60, 252 + Math.sin(a + .2) * 18); x.fill(); }
  x.fillStyle = '#f4e9c8'; x.beginPath(); x.arc(234, 284, 11, 0, 7); x.arc(278, 284, 11, 0, 7); x.fill();
  x.fillStyle = '#1c2a14'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(256 + s * 120, 360); x.lineTo(256 + s * 150, 300); x.lineTo(256 + s * 132, 296); x.lineTo(256 + s * 102, 356); x.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .06), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: .8 }), wood]);
  board.position.set(0, 1.45, .07); board.castShadow = true; g.add(board);
  return g;
}
