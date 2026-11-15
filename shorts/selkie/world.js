// Meet the Selkie: a grey seal, a sealskin, a woman, a man, a Scottish shore. All built in code, low-poly.
import * as THREE from 'three';
import { mulberry, lerp, clamp } from '/core/lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, flatShading: true, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
function tubeAlong(pts, r0, r1, mat, seg = 12, rad = 7) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const ctr = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) { const k = lerp(r0, r1, i / seg); for (let j = 0; j <= rad; j++) { const id = i * (rad + 1) + j, c = ctr[i];
    p.setXYZ(id, c.x + (p.getX(id) - c.x) * k, c.y + (p.getY(id) - c.y) * k, c.z + (p.getZ(id) - c.z) * k); } }
  g.computeVertexNormals(); return new THREE.Mesh(g, mat);
}
const spots = (base, dark, seed, n = 90) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256); x.fillStyle = dark; const r = mulberry(seed);
  for (let i = 0; i < n; i++) { x.beginPath(); x.ellipse(r() * 256, r() * 256, 4 + r() * 12, 3 + r() * 8, r() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

// ---------------------------------------------------------------- a grey seal. Faces +Z, about 1.5 long, resting on its belly (y = 0 under it)
export function makeSeal() {
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = .27; root.add(body);
  const coat = new THREE.MeshStandardMaterial({ map: spots('#8c8f8e', '#4f5354', 3), roughness: .6, flatShading: true });
  const belly = flat(0xc8c6b8), dark = flat(0x1a1a1a), nose = flat(0x2a2626);
  const torso = mesh(new THREE.IcosahedronGeometry(.4, 2), coat); torso.scale.set(.85, .72, 1.6); body.add(torso);
  const under = mesh(new THREE.IcosahedronGeometry(.34, 1), belly, 0, -.07, .05); under.scale.set(.85, .55, 1.5); body.add(under);
  const head = new THREE.Group(); head.position.set(0, .12, .62); body.add(head);
  const skull = mesh(new THREE.IcosahedronGeometry(.23, 2), coat); skull.scale.set(.95, .9, 1.05); head.add(skull);
  const snout = mesh(new THREE.IcosahedronGeometry(.13, 1), coat, 0, -.05, .2); snout.scale.set(.85, .75, 1.35); head.add(snout);
  head.add(mesh(new THREE.IcosahedronGeometry(.045, 1), nose, 0, -.01, .35));
  const eyeW = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: .1, metalness: .3 });
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(.058, 12, 8), eyeW, .11 * s, .06, .17));
    head.add(mesh(new THREE.SphereGeometry(.014, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), .125 * s, .085, .215));
    for (let k = 0; k < 3; k++) { const w = tubeAlong([V(.06 * s, -.07, .29), V(.17 * s, -.06 + (k - 1) * .02, .3), V(.26 * s, -.08 + (k - 1) * .045, .26)], .006, .003, flat(0xe8e8e0), 4, 3); head.add(w); }
  }
  const fl = [];
  for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(.1, .4, 4), coat, .3 * s, -.1, .3); f.rotation.set(Math.PI / 2 + .3, 0, -.9 * s); f.scale.set(1, 1, .35); body.add(f); fl.push(f); }
  const tail = new THREE.Group(); tail.position.set(0, -.02, -.65); body.add(tail);
  for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(.1, .38, 4), coat, .1 * s, 0, -.12); f.rotation.set(-Math.PI / 2, 0, .5 * s + Math.PI); f.scale.set(1, 1, .3); tail.add(f); }
  function pose({ lift = 0, look = 0, bob = 0 } = {}) { head.rotation.x = -lift * .6; head.rotation.y = look; head.position.y = .12 + lift * .12; body.rotation.x = -lift * .25; body.position.y = .27 + bob; }
  pose();
  return { group: root, pose, head };
}
// the sealskin: a spotted grey pelt lying flat, with little flipper tabs
export function makeSkin() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ map: spots('#8c8f8e', '#4f5354', 3), roughness: .7, flatShading: true, side: THREE.DoubleSide });
  const sh = new THREE.Shape(); sh.moveTo(0, .75); sh.bezierCurveTo(.22, .7, .3, .35, .34, .1); sh.lineTo(.6, .05); sh.lineTo(.36, -.12); sh.bezierCurveTo(.3, -.45, .2, -.7, .1, -.8);
  sh.lineTo(.2, -1); sh.lineTo(0, -.9); sh.lineTo(-.2, -1); sh.lineTo(-.1, -.8); sh.bezierCurveTo(-.2, -.7, -.3, -.45, -.36, -.12); sh.lineTo(-.6, .05); sh.lineTo(-.34, .1); sh.bezierCurveTo(-.3, .35, -.22, .7, 0, .75);
  const geo = new THREE.ShapeGeometry(sh, 8), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, .03 * Math.sin(p.getX(i) * 9) * Math.cos(p.getY(i) * 7));
  geo.computeVertexNormals();
  const pelt = new THREE.Mesh(geo, m); pelt.rotation.x = -Math.PI / 2; pelt.position.y = .03; pelt.scale.setScalar(.75); g.add(pelt);
  return g;
}
// ---------------------------------------------------------------- people: faces +Z, about 1.65 tall
export function makePerson({ cloth = 0x2f6f6a, hair = 0x6a2a1a, long = true, skinC = 0xe8c4a4 } = {}) {
  const root = new THREE.Group(), torso = new THREE.Group(); torso.position.y = .85; root.add(torso);
  const clothM = flat(cloth), skin = flat(skinC), hairM = flat(hair);
  root.add(mesh(new THREE.CylinderGeometry(.2, .3, .86, 8), clothM, 0, .43, 0));
  torso.add(mesh(new THREE.CylinderGeometry(.19, .2, .52, 8), clothM, 0, .26, 0));
  torso.add(mesh(new THREE.CylinderGeometry(.05, .06, .12, 6), skin, 0, .56, 0));
  const head = mesh(new THREE.IcosahedronGeometry(.13, 1), skin, 0, .66, .01); torso.add(head);
  torso.add(mesh(new THREE.IcosahedronGeometry(.14, 1), hairM, 0, .7, -.03));
  if (long) torso.add(tubeAlong([V(0, .68, -.1), V(0, .4, -.17), V(0, .08, -.15)], .12, .07, hairM));
  const eyeB = new THREE.MeshBasicMaterial({ color: 0x151515 });
  for (const s of [-1, 1]) torso.add(mesh(new THREE.SphereGeometry(.02, 6, 4), eyeB, .05 * s, .67, .13));
  const arms = [];
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(.2 * s, .48, 0); torso.add(sh);
    sh.add(tubeAlong([V(0, 0, 0), V(.03 * s, -.2, .06), V(-.03 * s, -.38, .14)], .07, .05, clothM)); sh.add(mesh(new THREE.IcosahedronGeometry(.045, 0), skin, -.03 * s, -.4, .15)); arms.push(sh); }
  return { group: root, arms, pose: (bow = 0, reach = 0) => { torso.rotation.x = bow * .9; arms[0].rotation.x = -reach; arms[1].rotation.x = -reach; } };
}
// ---------------------------------------------------------------- the shore: sea for z > -6 (water y = 0), rocky beach behind, cliffs and hills
export const shoreH = (x, z) => {
  let y;
  if (z > -6) y = lerp(.25, -1.6, clamp((z + 6) / 5));
  else y = .25 + clamp((-z - 6) / 3) * .25;
  if (z < -12) y += Math.pow((-z - 12) / 16, 1.5) * 8 * (1 + .4 * Math.sin(x * .1 + 1) + .25 * Math.sin(x * .27));
  return y + (z < -6 ? .1 * Math.sin(x * .8) * Math.cos(z * .9) : 0);
};
export function makeShore(scene) {
  const g = new THREE.PlaneGeometry(200, 140, 170, 120); g.translate(0, 0, -20); g.rotateX(-Math.PI / 2); const p = g.attributes.position, col = [];
  const grass = new THREE.Color(0x6f8a4a), grass2 = new THREE.Color(0x56733f), sand = new THREE.Color(0xa89c82), pebble = new THREE.Color(0x7f7a6f), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = shoreH(x, z); p.setY(i, y);
    if (y < .05) c.copy(sand); else if (y < .45) c.copy(pebble); else c.copy(grass).lerp(grass2, .5 + .5 * Math.sin(x * .31 + z * .17)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); scene.add(ground);
  const wg = new THREE.PlaneGeometry(260, 110, 110, 40); wg.translate(0, 0, 50); wg.rotateX(-Math.PI / 2);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x2f5f70, roughness: .15, metalness: .2, flatShading: true, transparent: true, opacity: .92 });
  const water = new THREE.Mesh(wg, waterM); water.position.z = -6; scene.add(water);
  const base = Float32Array.from(wg.attributes.position.array), ripples = [];
  function update(t) {
    const a = wg.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = base[i * 3], z = base[i * 3 + 2] - 6;
      let y = .05 * Math.sin(x * .7 + t * 1.3) * Math.cos(z * .9 - t) + .03 * Math.sin((x + z) * 1.9 + t * 1.8);
      for (const r of ripples) { const age = t - r.t0; if (age < 0 || age > 3) continue; const d = Math.hypot(x - r.x, z - r.z), w = d - age * 1.5;
        y += r.a * Math.exp(-w * w * 4) * (1 - age / 3) * Math.cos(w * 6); }
      a.setY(i, y); }
    a.needsUpdate = true; wg.computeVertexNormals();
  }
  const props = new THREE.Group(); scene.add(props); const r = mulberry(41);
  const rockM = flat(0x6c6e6a), rock2 = flat(0x55585a), kelp = flat(0x5a4a2a), heather = flat(0x7a4a6a), grassM = flat(0x8a9a4a);
  for (let i = 0; i < 70; i++) { const x = (r() - .5) * 80, z = -6 - r() * 5, s = .2 + r() * .8; if (Math.abs(x) < 3.2) continue;
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), r() < .5 ? rockM : rock2, x, shoreH(x, z) + s * .3, z); m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.y = .6; props.add(m); }
  for (let i = 0; i < 28; i++) { const x = (r() - .5) * 60, z = -2 - r() * 18, s = .5 + r() * 1.4; if (Math.abs(x) < 4 && z > -9) continue;   // rock stacks out in the water
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), rockM, x, s * .2, z); m.scale.set(1, .9 + r(), 1); m.rotation.y = r() * 3; props.add(m); }
  for (let i = 0; i < 160; i++) { const x = (r() - .5) * 100, z = -9 - r() * 14, y0 = shoreH(x, z), h = .15 + r() * .3;
    const m = mesh(new THREE.ConeGeometry(.05, h, 3), r() < .4 ? heather : grassM, x, y0 + h / 2, z); m.rotation.z = (r() - .5) * .4; props.add(m); }
  const hillM = flat(0x5a6a58);
  for (let i = 0; i < 8; i++) { const x = -110 + i * 30 + r() * 10, h = 14 + r() * 14; props.add(mesh(new THREE.ConeGeometry(20 + r() * 8, h, 6), hillM, x, h / 2 - 2, -95 - r() * 20)); }
  // a little croft cottage far off, a lighthouse-free horizon
  const stone = flat(0x8a8478), roof = flat(0x5a4a3a);
  const cot = new THREE.Group(); cot.add(mesh(new THREE.BoxGeometry(2.2, 1.1, 1.5), stone, 0, .55, 0)); const rf = mesh(new THREE.ConeGeometry(1.5, .9, 4), roof, 0, 1.55, 0); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, .75); cot.add(rf);
  cot.position.set(-6.5, shoreH(-6.5, -16), -16); cot.rotation.y = .3; props.add(cot);
  return { ground, water, waterM, update, ripples };
}
