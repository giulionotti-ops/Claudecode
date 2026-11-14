// The yeti / Himalayan bear (one model that stands up or drops onto four legs), a snowshoe hare, a yak and the mountains. All built in code, low-poly.
import * as THREE from 'three';
import { mulberry, lerp, clamp } from '/core/lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };

// a shaggy blob: an icosahedron with jittered vertices, so the fur looks tufted
function shaggy(r, seed, jit = .12, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, rnd = mulberry(seed);
  for (let i = 0; i < p.count; i++) { const k = 1 + (rnd() - .5) * jit * 2; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- the beast. Feet at y = 0 (when standing), faces +Z.
// pose({stand 0..1, walk, feet 1..3, lie 0..1, look}) ; setColor(k) 0 = pale yeti fur, 1 = brown bear fur
export function makeBeast() {
  const root = new THREE.Group(), fur = flat(0xe4e2da), furD = flat(0xb9b6ac), skinM = flat(0x2a2220), toothM = flat(0xf2ecd8);
  const pale = new THREE.Color(0xe4e2da), brown = new THREE.Color(0x6a4630), paleD = new THREE.Color(0xb9b6ac), brownD = new THREE.Color(0x4a3020);
  const hips = new THREE.Group(); root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const body = mesh(shaggy(.52, 3, .09), fur, 0, .62, 0); body.scale.set(1, 1.3, .8); torso.add(body);
  const belly = mesh(shaggy(.4, 5, .08), furD, 0, .45, .08); belly.scale.set(1, 1.1, .8); torso.add(belly);
  const hump = mesh(shaggy(.34, 7, .1), fur, 0, 1.12, -.1); torso.add(hump);
  const head = new THREE.Group(); head.position.set(0, 1.42, .1); torso.add(head);
  const skull = mesh(shaggy(.3, 9, .07), fur); skull.scale.set(1.05, .95, 1); head.add(skull);
  const snout = mesh(new THREE.ConeGeometry(.16, .3, 6), furD, 0, -.07, .3); snout.rotation.x = Math.PI / 2; head.add(snout);
  head.add(mesh(new THREE.IcosahedronGeometry(.055, 0), skinM, 0, -.04, .46));
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x120c08 });
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(.045, 8, 6), eyeM, .13 * s, .07, .26));
    head.add(mesh(new THREE.IcosahedronGeometry(.09, 0), fur, .2 * s, .26, -.02));
    const brow = mesh(new THREE.BoxGeometry(.13, .03, .05), skinM, .13 * s, .15, .27); brow.rotation.z = -.35 * s; head.add(brow);
  }
  const fang = mesh(new THREE.ConeGeometry(.02, .08, 4), toothM, .06, -.17, .38); fang.rotation.x = Math.PI; head.add(fang);
  // limbs hang from pivots; legs from the hips, arms from the shoulders. Each has a paw (scaled for the snowshoe fix).
  function limb(len, r0, r1, px, py, parent) {
    const piv = new THREE.Group(); piv.position.set(px, py, 0); parent.add(piv);
    const geo = new THREE.CylinderGeometry(r0, r1, 1, 7); geo.translate(0, -.5, 0);
    const tube = mesh(geo, fur); tube.scale.y = len; piv.add(tube);
    const paw = mesh(shaggy(.13, 11, .06, 1), fur); paw.position.y = -len; piv.add(paw);
    return { piv, tube, paw, len };
  }
  const legs = [-1, 1].map(s => limb(.95, .25, .19, .26 * s, 0, hips));
  const arms = [-1, 1].map(s => limb(1.05, .21, .16, .5 * s, .88, torso));
  for (const a of arms) { for (const k of [-1, 0, 1]) { const c = mesh(new THREE.ConeGeometry(.016, .07, 4), toothM, .05 * k, 0, .13); c.rotation.x = Math.PI / 2; a.paw.add(c); a.paw.userData.claws = true; } }
  const fs = { v: 1 };
  function setColor(k) { fur.color.copy(pale).lerp(brown, k); furD.color.copy(paleD).lerp(brownD, k); }
  function pose({ stand = 1, walk = 0, feet = 1, lie = 0, look = 0, t = 0 } = {}) {
    const r = lerp(1.42, 0, stand);                       // torso lean
    const hy = lerp(lerp(.72, .95, stand), .42, lie);
    hips.position.set(0, hy, lerp(-.5, 0, stand) * (1 - lie * .5)); torso.rotation.set(r + lie * .25, 0, 0);
    torso.position.y = 0;
    const sw = Math.sin(t * 5) * walk;
    for (let i = 0; i < 2; i++) {
      const L = legs[i], A = arms[i], s = i ? 1 : -1;
      L.len = lerp(hy, .45, lie); L.tube.scale.y = L.len; L.paw.position.y = -L.len; L.piv.rotation.set(-torso.rotation.x + sw * .5 * s, 0, 0);
      const shY = hy + .88 * Math.cos(torso.rotation.x) - .0 * Math.sin(torso.rotation.x);
      A.len = lerp(lerp(Math.max(.4, shY - .02), .5, lie), 1.05, stand); A.tube.scale.y = A.len; A.paw.position.y = -A.len;
      A.piv.rotation.set(-torso.rotation.x - sw * .5 * s, 0, s * lerp(.12, 0, 1 - stand));
      for (const p of [L.paw, A.paw]) p.scale.set(feet, lerp(1, .55, clamp((feet - 1) / 1.4)), feet * 1.5);
    }
    head.rotation.set(-torso.rotation.x * .75 + lie * .3, look, 0);
  }
  pose();
  return { group: root, pose, setColor, head };
}

// ---------------------------------------------------------------- a snowshoe hare: big hind feet
export function makeHare() {
  const g = new THREE.Group(), f = flat(0xf2f1ea), d = flat(0xd9d6cc), dark = flat(0x2a2220);
  const body = mesh(shaggy(.3, 21, .06), f, 0, .32, 0); body.scale.set(1, .85, 1.35); g.add(body);
  const head = new THREE.Group(); head.position.set(0, .5, .38); g.add(head);
  head.add(mesh(shaggy(.17, 22, .05), f)); { const sn = mesh(new THREE.ConeGeometry(.08, .14, 5), d, 0, -.04, .16); sn.rotation.x = Math.PI / 2; head.add(sn); }
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(.055, .4, 5), f, .07 * s, .28, -.02); e.rotation.z = -.15 * s; head.add(e);
    head.add(mesh(new THREE.SphereGeometry(.028, 6, 5), dark, .09 * s, .06, .11));
    const hf = mesh(shaggy(.1, 23, .04), f, .17 * s, .06, .12); hf.scale.set(.9, .35, 3.2); g.add(hf);   // the big hind foot
    const fl = mesh(shaggy(.07, 24, .04), f, .1 * s, .05, .5); fl.scale.set(.8, .6, 1.2); g.add(fl);
  }
  g.add(mesh(new THREE.IcosahedronGeometry(.07, 0), f, 0, .36, -.4));
  return { group: g, head };
}

// ---------------------------------------------------------------- a yak: shaggy skirt, horns, hump
export function makeYak() {
  const g = new THREE.Group(), f = flat(0x3a2a22), f2 = flat(0x2a1d18), horn = flat(0xd8cfb0), dark = flat(0x120c08);
  const body = mesh(shaggy(.7, 31, .1), f, 0, 1.0, 0); body.scale.set(1, .85, 1.55); g.add(body);
  const skirt = mesh(shaggy(.62, 32, .14), f2, 0, .62, 0); skirt.scale.set(1.05, .6, 1.5); g.add(skirt);
  const hump = mesh(shaggy(.4, 33, .1), f, 0, 1.55, .35); g.add(hump);
  const head = new THREE.Group(); head.position.set(0, 1.05, 1.15); g.add(head);
  head.add(mesh(shaggy(.3, 34, .08), f)); { const sn = mesh(new THREE.ConeGeometry(.2, .35, 6), f2, 0, -.18, .28); sn.rotation.x = Math.PI / 2 + .35; head.add(sn); }
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(.04, 6, 5), dark, .18 * s, .06, .2));
    const h1 = mesh(new THREE.ConeGeometry(.07, .6, 6), horn, .3 * s, .24, 0); h1.rotation.z = -1.0 * s; head.add(h1);
    const h2 = mesh(new THREE.ConeGeometry(.05, .3, 6), horn, .62 * s, .46, 0); h2.rotation.z = -.3 * s; head.add(h2);
  }
  for (const [x, z] of [[-.4, .8], [.4, .8], [-.4, -.7], [.4, -.7]]) { g.add(mesh(new THREE.CylinderGeometry(.14, .12, .55, 6), f2, x, .28, z)); g.add(mesh(new THREE.CylinderGeometry(.1, .12, .15, 6), dark, x, .08, z)); }
  { const tl = mesh(new THREE.ConeGeometry(.12, .7, 5), f2, 0, .75, -1.05); tl.rotation.x = -2.6; g.add(tl); }
  return { group: g, head };
}

// ---------------------------------------------------------------- mountains, snow, rocks
export function makeWorld(scene) {
  const snowM = flat(0xf4f8fc), rockM = flat(0x7d8088), iceM = flat(0xdde9f2), darkM = flat(0x55585f);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xf0f5fa, roughness: .95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const r = mulberry(77), peaks = new THREE.Group(); scene.add(peaks);
  for (let i = 0; i < 16; i++) {
    const h = 22 + r() * 36, w = 12 + r() * 14, x = -70 + i * 9.5 + r() * 5, z = -48 - r() * 24;
    const m = mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(r() * 3)), i % 3 ? snowM : rockM, x, h / 2 - 2, z); m.rotation.y = r() * 3; peaks.add(m);
    const cap = mesh(new THREE.ConeGeometry(w * .45, h * .38, 5), snowM, x, h * .8 - 2, z); cap.rotation.y = m.rotation.y; peaks.add(cap);
  }
  const mounds = new THREE.Group(); scene.add(mounds);
  for (let i = 0; i < 40; i++) { const m = mesh(new THREE.IcosahedronGeometry(1, 1), snowM, (r() - .5) * 60, 0, -4 - r() * 26); m.scale.set(1.5 + r() * 3, .25 + r() * .5, 1.5 + r() * 3); mounds.add(m); }
  const rocks = new THREE.Group(); scene.add(rocks);
  for (let i = 0; i < 24; i++) { const m = mesh(new THREE.IcosahedronGeometry(.3 + r() * .7, 0), i % 2 ? rockM : darkM, (r() - .5) * 26, .1, -3 - r() * 12); m.scale.y = .6; rocks.add(m); }
  return { ground, peaks, mounds, rocks, snowM };
}
