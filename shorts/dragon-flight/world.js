// The two sets: the volcanic slope (outdoor) and the ground cutaway (cross-section of the strata).
import * as THREE from 'three';
import { mulberry, lerp, clamp } from '/core/lib.js';

const rnd = mulberry(7);
function noise2(x, z) {   // cheap smooth value noise, deterministic
  const s = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(s(xi, zi), s(xi + 1, zi), u), lerp(s(xi, zi + 1), s(xi + 1, zi + 1), u), v);
}
export function fbm(x, z) { let a = 0, f = 1, w = .5; for (let i = 0; i < 4; i++) { a += w * noise2(x * f, z * f); f *= 2.1; w *= .5; } return a; }

// ground height on the slope; the nest site around the origin is kept fairly flat
export function groundH(x, z) {
  const hills = (fbm(x * .05, z * .05) - .5) * 6 + Math.max(0, -z - 20) * .12;
  const flat = Math.exp(-(x * x + z * z) / 60);
  return lerp(hills, (fbm(x * .3, z * .3) - .5) * .25, flat);
}

export function makeSky(scene) {
  const g = new THREE.SphereGeometry(500, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x6f8296) }, hor: { value: new THREE.Color(0xd9b08c) }, low: { value: new THREE.Color(0x5a4a44) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, hor, low; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0. ? mix(hor, top, pow(clamp(y*1.6,0.,1.), .7)) : mix(hor, low, clamp(-y*4.,0.,1.)); gl_FragColor = vec4(c,1.); }',
  });
  const sky = new THREE.Mesh(g, m); scene.add(sky); return sky;
}

function speckleTexture(base, spots, n, size = 512, seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) { x.fillStyle = spots[i % spots.length]; x.globalAlpha = .25 + r() * .5; x.beginPath(); x.arc(r() * size, r() * size, .6 + r() * 2.4, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeSlope() {
  const group = new THREE.Group();
  // terrain
  const geo = new THREE.PlaneGeometry(260, 260, 180, 180); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = groundH(x, z); pos.setY(i, y);
    const ash = fbm(x * .12 + 9, z * .12), k = .55 + ash * .5;
    const c = new THREE.Color().setRGB(.20 * k + .05, .18 * k + .04, .17 * k + .04);
    if (ash > .62) c.lerp(new THREE.Color(.42, .40, .38), (ash - .62) * 2.5);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  const tex = speckleTexture('#9a948e', ['#2a2522', '#5e5650', '#c9c2b8'], 5000); tex.repeat.set(40, 40);
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: .95 }));
  ground.receiveShadow = true; group.add(ground);

  // volcano with a glowing crater and a lava trickle
  const vg = new THREE.CylinderGeometry(9, 48, 46, 96, 24, true); const vp = vg.attributes.position;
  for (let i = 0; i < vp.count; i++) {
    const x = vp.getX(i), y = vp.getY(i), z = vp.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
    const k = 1 + (fbm(a * 3 + 5, y * .08) - .5) * .25; vp.setX(i, x * k); vp.setZ(i, z * k);
    if (y > 20) { const s = clamp((y - 20) / 3); vp.setX(i, lerp(x * k, x * k * 1.0, s)); }
  }
  vg.computeVertexNormals();
  const vtex = speckleTexture('#4a403b', ['#1d1916', '#6b5f57'], 6000, 512, 9); vtex.repeat.set(6, 3);
  const volcano = new THREE.Mesh(vg, new THREE.MeshStandardMaterial({ map: vtex, roughness: 1, flatShading: true }));
  volcano.position.set(-30, 14, -150); group.add(volcano);
  const crater = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 8, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  crater.position.set(-30, 36.6, -150); group.add(crater);
  const glow = new THREE.PointLight(0xff6a10, 600, 120, 1.6); glow.position.set(-30, 45, -150); group.add(glow);

  // pines on the far hills (the low-poly forest look)
  const pineM = new THREE.MeshStandardMaterial({ color: 0x2c3a2c, roughness: 1, flatShading: true });
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 });
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, d = 26 + rnd() * 70;
    const x = Math.cos(a) * d + 10, z = Math.sin(a) * d * .7 - 30;
    if (Math.abs(x + 30) < 40 && z < -100) continue;
    const s = .8 + rnd() * 1.1, tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, 1.2, 6), trunkM); trunk.position.y = .6; tree.add(trunk);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.3 - k * .25, 1.6, 7), pineM); c.position.y = 1.4 + k * .9; c.castShadow = true; tree.add(c); }
    tree.scale.setScalar(s * 1.6); tree.position.set(x, groundH(x, z) - .1, z); tree.rotation.y = rnd() * 6; group.add(tree);
  }
  // rocks
  const rockM = new THREE.MeshStandardMaterial({ color: 0x3b3531, roughness: 1, flatShading: true });
  for (let i = 0; i < 60; i++) {
    const x = (rnd() - .5) * 60, z = (rnd() - .5) * 50 - 6; if (x * x + z * z < 14) continue;
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(.2 + rnd() * .9, 0), rockM);
    r.position.set(x, groundH(x, z) + .1, z); r.rotation.set(rnd() * 3, rnd() * 3, 0); r.scale.y = .6; r.castShadow = r.receiveShadow = true; group.add(r);
  }
  // steam vent near the nest site
  const vent = new THREE.Mesh(new THREE.CircleGeometry(.6, 20), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
  vent.rotation.x = -Math.PI / 2; vent.position.set(7, groundH(7, -3) + .05, -3); group.add(vent);
  // heat stripe (scene 4): a decal on the ground from the vent towards the nest, hot to cool
  const sc = document.createElement('canvas'); sc.width = 512; sc.height = 16; const sx = sc.getContext('2d');
  const gr = sx.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, '#ff2a10'); gr.addColorStop(.35, '#ff9a20'); gr.addColorStop(.6, '#ffe050'); gr.addColorStop(.8, '#70e070'); gr.addColorStop(1, '#3aa0ff');
  sx.fillStyle = gr; sx.fillRect(0, 0, 512, 16);
  const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ map: stex, transparent: true, opacity: 0, depthWrite: false }));
  stripe.rotation.x = -Math.PI / 2; stripe.rotation.z = Math.PI; stripe.position.set(2.5, .08, -2.2); group.add(stripe);
  // a nest mound of ash (scenes 4 and 9)
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8c857e, map: speckleTexture('#8c857e', ['#5a544e', '#b8b0a6'], 3000, 256, 5), roughness: 1 }));
  mound.scale.y = .45; mound.position.set(-1.6, groundH(-1.6, -2.2) - .05, -2.2); mound.receiveShadow = true; group.add(mound);
  return { group, ground, stripe, mound, vent, crater };
}

// ---------------------------------------------------------------- cutaway: a block of ground cut open at the front
export const CUT = { w: 16, h: 12, d: 8, x: 1000 };
export function makeCutaway() {
  const group = new THREE.Group(); group.position.set(CUT.x, 0, 0);
  const W = 2048, H = 1536, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = W; e.height = H; const ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const r = mulberry(11);
  const yOf = m => (-m / CUT.h) * H;          // metres below the surface → canvas y
  const band = (y0, y1, top, bot, wob, seed) => {
    x.beginPath(); x.moveTo(0, yOf(y0));
    for (let i = 0; i <= 64; i++) x.lineTo(i / 64 * W, yOf(y0) + (fbm(i * .2, seed) - .5) * wob * 2);
    for (let i = 64; i >= 0; i--) x.lineTo(i / 64 * W, yOf(y1) + (fbm(i * .2, seed + 3) - .5) * wob * 2);
    const g = x.createLinearGradient(0, yOf(y0), 0, yOf(y1)); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fill();
  };
  band(0, -.5, '#3a302a', '#4a3e36', 10, 1);           // topsoil and rubble
  band(-.5, -3.2, '#8f8a84', '#a29b93', 16, 2);        // grey ash
  band(-3.2, -6.0, '#a8907a', '#c0784a', 16, 3);       // warm ash (heated from below)
  band(-6.0, -12, '#3b302c', '#2a211d', 14, 4);        // basalt
  // speckles and pebbles everywhere
  for (let i = 0; i < 30000; i++) { const px = r() * W, py = r() * H; x.fillStyle = r() < .5 ? 'rgba(20,16,14,.3)' : 'rgba(230,220,205,.22)'; x.beginPath(); x.arc(px, py, .6 + r() * 1.6, 0, 7); x.fill(); }
  for (let i = 0; i < 90; i++) { const px = r() * W, py = yOf(-6.2) + r() * (H - yOf(-6.2)); x.fillStyle = '#4c403a'; x.beginPath(); x.ellipse(px, py, 12 + r() * 36, 8 + r() * 20, r() * 3, 0, 7); x.fill(); }
  // the lava vein on the left, rising from the bottom: drawn on the colour map and the glow map
  const vein = (ctx, glow) => {
    ctx.beginPath(); ctx.moveTo(80, H);
    for (let i = 0; i <= 40; i++) { const t = i / 40, yy = lerp(H, yOf(-5.2), t), xx = 120 + Math.sin(t * 5) * 40 + t * 60; ctx.lineTo((xx - lerp(70, 18, t)) * 2, yy); }
    for (let i = 40; i >= 0; i--) { const t = i / 40, yy = lerp(H, yOf(-5.2), t), xx = 120 + Math.sin(t * 5) * 40 + t * 60; ctx.lineTo((xx + lerp(70, 18, t)) * 2, yy); }
    const g = ctx.createLinearGradient(0, H, 0, yOf(-5.2)); g.addColorStop(0, glow ? '#ff8a20' : '#ff6a10'); g.addColorStop(1, glow ? '#ffd060' : '#ffb030');
    ctx.fillStyle = g; ctx.fill();
  };
  vein(x, false); vein(ex, true);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const emap = new THREE.CanvasTexture(e); emap.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(CUT.w, CUT.h), new THREE.MeshStandardMaterial({ map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: .8, roughness: 1 }));
  front.position.set(0, -CUT.h / 2, CUT.d / 2); front.receiveShadow = true; group.add(front);
  const sideM = new THREE.MeshStandardMaterial({ color: 0x4a3e36, roughness: 1 });
  const left = new THREE.Mesh(new THREE.PlaneGeometry(CUT.d, CUT.h), sideM); left.rotation.y = -Math.PI / 2; left.position.set(-CUT.w / 2, -CUT.h / 2, 0); group.add(left);
  const right = left.clone(); right.rotation.y = Math.PI / 2; right.position.x = CUT.w / 2; group.add(right);
  // top surface, a little bumpy, extending back into a wider ground
  const tg = new THREE.PlaneGeometry(60, 60, 80, 80); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const px = tp.getX(i), pz = tp.getZ(i); tp.setY(i, (fbm(px * .3, pz * .3) - .5) * .35 * Math.min(1, (30 - pz) / 3)); }
  tg.computeVertexNormals();
  const ttex = speckleTexture('#5a504a', ['#2a2420', '#8a827a'], 6000, 512, 21); ttex.repeat.set(12, 12);
  const top = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: ttex, roughness: 1 })); top.receiveShadow = true; top.position.z = CUT.d / 2 - 30; group.add(top);
  const lavaLight = new THREE.PointLight(0xff7020, 60, 12, 1.5); lavaLight.position.set(-5.5, -8, CUT.d / 2 + 1.5); group.add(lavaLight);
  return { group, front };
}

// ---------------------------------------------------------------- the egg
export function makeEggMaterial() {
  const S = 1024, c = document.createElement('canvas'); c.width = S; c.height = S / 2; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, S / 2); g.addColorStop(0, '#d8cdb6'); g.addColorStop(1, '#c4b294'); x.fillStyle = g; x.fillRect(0, 0, S, S / 2);
  const r = mulberry(4);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${90 + r() * 40},${55 + r() * 25},${30 + r() * 20},${.25 + r() * .5})`; x.beginPath(); x.ellipse(r() * S, r() * S / 2, 2 + r() * 9, 2 + r() * 6, r() * 3, 0, 7); x.fill(); }
  const pores = document.createElement('canvas'); pores.width = S; pores.height = S / 2; const px = pores.getContext('2d');
  px.drawImage(c, 0, 0);
  for (let i = 0; i < 5000; i++) { px.fillStyle = 'rgba(40,28,20,.8)'; px.beginPath(); px.arc(r() * S, r() * S / 2, 1.6 + r() * 1.8, 0, 7); px.fill(); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const poreMap = new THREE.CanvasTexture(pores); poreMap.colorSpace = THREE.SRGBColorSpace;
  // cracks are drawn into their own canvas, redrawn when the crack amount changes
  const cc = document.createElement('canvas'); cc.width = S; cc.height = S / 2;
  const crackTex = new THREE.CanvasTexture(cc); crackTex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: .55, metalness: 0 });
  return { mat, map, poreMap, crackCanvas: cc, crackTex };
}

// draw crack lines (amount 0..1) radiating from one point onto the egg texture
export function drawCracks(egg, amount, seed = 2) {
  const base = egg.map.image, c = egg.crackCanvas, x = c.getContext('2d');
  x.drawImage(base, 0, 0);
  if (amount > 0) {
    const r = mulberry(seed), S = c.width;
    x.strokeStyle = 'rgba(35,22,14,.95)'; x.lineCap = 'round';
    const branches = 14;
    for (let b = 0; b < branches; b++) {
      const len = amount * (120 + r() * 220); let px = S * .25, py = S * .14, a = r() * Math.PI * 2;
      x.lineWidth = 3.2; x.beginPath(); x.moveTo(px, py);
      for (let d = 0; d < len; d += 12) { a += (r() - .5) * .9; px += Math.cos(a) * 12; py += Math.sin(a) * 6; x.lineTo(px, py); }
      x.stroke();
    }
  }
  egg.crackTex.needsUpdate = true;
}
