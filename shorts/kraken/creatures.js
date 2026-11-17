// The kraken (a giant squid), a sperm whale, a ship hull and the sea. All built in code.
import * as THREE from 'three';
import { mulberry, lerp, clamp } from '/core/lib.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- a tapered tube whose path is rewritten every frame
function tube(nSeg, nRad, mat) {
  const g = new THREE.BufferGeometry(), n = (nSeg + 1) * (nRad + 1);
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const idx = [];
  for (let i = 0; i < nSeg; i++) for (let j = 0; j < nRad; j++) {
    const a = i * (nRad + 1) + j, b = a + nRad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.castShadow = true;
  return { mesh: m, nSeg, nRad };
}
const _t = V(0, 0, 0), _n = V(0, 0, 0), _b = V(0, 0, 0), UP = V(0, 0, 1), SIDE = V(1, 0, 0);
function setTube(tb, pts, rFn) {
  const p = tb.mesh.geometry.attributes.position, { nSeg, nRad } = tb;
  for (let i = 0; i <= nSeg; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(nSeg, i + 1)];
    _t.subVectors(b, a).normalize();
    _n.crossVectors(_t, Math.abs(_t.z) < .9 ? UP : SIDE).normalize(); _b.crossVectors(_t, _n);
    const r = rFn(i / nSeg);
    for (let j = 0; j <= nRad; j++) {
      const ang = j / nRad * Math.PI * 2, c = Math.cos(ang) * r, s = Math.sin(ang) * r, k = i * (nRad + 1) + j;
      p.setXYZ(k, pts[i].x + _n.x * c + _b.x * s, pts[i].y + _n.y * c + _b.y * s, pts[i].z + _n.z * c + _b.z * s);
    }
  }
  p.needsUpdate = true; tb.mesh.geometry.computeVertexNormals(); tb.mesh.geometry.computeBoundingSphere();
}

function skinTexture(base, spot, belly, seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, base); g.addColorStop(.5, belly); g.addColorStop(1, base);
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const r = mulberry(seed);
  for (let i = 0; i < 2600; i++) { x.fillStyle = spot; x.globalAlpha = .15 + r() * .45; x.beginPath(); x.arc(r() * 512, r() * 512, 1 + r() * 4.5, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// ---------------------------------------------------------------- the squid. Local axes: +Y = mantle tip, arms hang towards -Y, eyes on ±Z.
export function makeSquid(clip) {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const skin = skinTexture('#8e2a24', '#3a0d0b', '#c4584a', 5);
  const mantleR = y => y < 0 ? 0 : y > 6 ? 0 : (y < 1.2 ? lerp(.82, 1.08, Math.sin(y / 1.2 * Math.PI / 2)) : 1.08 * Math.pow(1 - (y - 1.2) / 4.8, .75) + .02);
  const pts = []; for (let i = 0; i <= 50; i++) { const y = i / 50 * 6; pts.push(new THREE.Vector2(Math.max(.001, mantleR(y)), y)); }
  const lathe = new THREE.LatheGeometry(pts, 48);
  const outer = new THREE.MeshStandardMaterial({ map: skin, roughness: .5, clippingPlanes: [clip], clipShadows: true });
  const inner = new THREE.MeshStandardMaterial({ color: 0xe8a596, roughness: .8, side: THREE.BackSide, clippingPlanes: [clip] });
  const mantle = new THREE.Mesh(lathe, outer), mInner = new THREE.Mesh(lathe, inner); mantle.castShadow = true;
  body.add(mantle, mInner);
  // fins at the tip
  const finM = new THREE.MeshStandardMaterial({ map: skin, roughness: .55, side: THREE.DoubleSide, clippingPlanes: [clip] });
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(1.9 * s, .4, 1.4 * s, 1.5); sh.lineTo(0, 2.3); sh.closePath();
    const f = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), finM); f.position.set(0, 3.6, 0); body.add(f);
  }
  // head and eyes
  const headM = new THREE.MeshStandardMaterial({ map: skin, roughness: .5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(.85, 32, 20), headM); head.scale.set(.95, 1.0, 1.05); head.position.y = -.45; body.add(head);
  const eyes = [];
  const scleraM = new THREE.MeshStandardMaterial({ color: 0xd8d0bd, roughness: .25 }), irisM = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: .15, metalness: .1 });
  const ringM = new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: .3, emissive: 0x3a2a08 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(0, -.4, .72 * s); e.rotation.y = s > 0 ? 0 : Math.PI;
    const sc = new THREE.Mesh(new THREE.SphereGeometry(.4, 32, 20), scleraM); sc.scale.z = .7; e.add(sc);
    const ring = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 16), ringM); ring.scale.z = .6; ring.position.z = .12; e.add(ring);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.22, 32, 16), irisM); iris.scale.z = .6; iris.position.z = .19; e.add(iris);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); hi.position.set(.08, .09, .32); e.add(hi);
    body.add(e); eyes.push(e);
  }
  // 8 arms + 2 long feeding tentacles
  const armM = new THREE.MeshStandardMaterial({ map: skin, roughness: .5 });
  const arms = [];
  for (let k = 0; k < 10; k++) {
    const tent = k >= 8, a = tent ? (k === 8 ? .55 : Math.PI + .55) : k / 8 * Math.PI * 2;
    const tb = tube(40, 10, armM); body.add(tb.mesh);
    arms.push({ tb, a, tent, L: tent ? 8.5 : 4.6, seed: k * 1.7 });
  }
  // ammonia cells inside the mantle (scene 2)
  const cellG = new THREE.SphereGeometry(.2, 12, 8);
  const cellM = new THREE.MeshStandardMaterial({ color: 0x7dffa0, emissive: 0x22b04a, emissiveIntensity: 1.1, roughness: .3, transparent: true, opacity: .92 });
  const NC = 90, cells = new THREE.InstancedMesh(cellG, cellM, NC), cellP = [];
  { const r = mulberry(12);
    for (let i = 0; i < NC; i++) { const y = .5 + r() * 4.6, rr = mantleR(y) * .78 * Math.sqrt(r()), ang = r() * Math.PI * 2;
      cellP.push({ p: V(Math.cos(ang) * rr, y, Math.sin(ang) * rr), s: .6 + r() * .9, d: r() }); } }
  cells.frustumCulled = false; body.add(cells);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), sv = V(1, 1, 1);
  function setCells(k) {
    cells.visible = k > 0;
    for (let i = 0; i < NC; i++) { const c = cellP[i], s = clamp((k - c.d * .6) / .4) * c.s; sv.setScalar(Math.max(.0001, s)); m4.compose(c.p, q0, sv); cells.setMatrixAt(i, m4); }
    cells.instanceMatrix.needsUpdate = true;
  }
  setCells(0);

  // pose: t = time, mode: 'trail' (swimming, arms behind), 'reach' (spread, curling up), 'limp'
  const P = []; for (let i = 0; i <= 40; i++) P.push(V(0, 0, 0));
  function pose(t, mode = 'trail', amt = 1) {
    for (const arm of arms) {
      const ca = Math.cos(arm.a), sa = Math.sin(arm.a), base = V(ca * .42, -1.15, sa * .42);
      for (let i = 0; i <= 40; i++) {
        const s = i / 40, L = arm.L, ph = t * (mode === 'limp' ? .7 : 2.2) - s * 4 + arm.seed;
        let out, down, curl = 0;
        if (mode === 'reach') { out = Math.sin(s * 1.6) * L * .45; down = s * L * .85; curl = Math.pow(s, 2) * L * .5; }
        else if (mode === 'limp') { out = s * L * .18; down = s * L * .95; }
        else { out = s * L * .12; down = s * L; }
        const wave = Math.sin(ph) * .35 * s * amt * (arm.tent ? 1.4 : 1);
        P[i].set(base.x + ca * (out - curl * .6) + -sa * wave, base.y - down + curl * .9, base.z + sa * (out - curl * .6) + ca * wave);
      }
      setTube(arm.tb, P, arm.tent ? s => s > .82 ? .12 + .07 * Math.sin((s - .82) / .18 * Math.PI) : .17 * (1 - s) + .045 : s => .26 * Math.pow(1 - s, .9) + .03);
    }
    // a slow pulse of the mantle (jet swimming)
    const pulse = mode === 'limp' ? 0 : Math.sin(t * 2.2) * .03 * amt;
    mantle.scale.set(1 + pulse, 1, 1 + pulse); mInner.scale.copy(mantle.scale);
  }
  function eyeScale(s) { for (const e of eyes) e.scale.setScalar(s); }
  pose(0);
  return { group, body, eyes, pose, eyeScale, setCells, mantle, skinMats: [outer, finM, headM, armM] };
}

// ---------------------------------------------------------------- sperm whale, head towards +Z
export function makeWhale() {
  const group = new THREE.Group();
  const prof = [[-9, .05], [-8.6, .3], [-7, .55], [-4, 1.0], [-1, 1.25], [2.5, 1.32], [5.2, 1.3], [6.2, 1.22], [6.7, 1.0], [6.95, .55], [7.0, .001]];
  const pts = prof.map(([y, r]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(60).map(p => new THREE.Vector2(Math.max(.001, p.x), p.y)), 40);
  g.rotateX(Math.PI / 2);
  const skin = skinTexture('#5d646e', '#33383f', '#737a84', 8);
  const m = new THREE.MeshStandardMaterial({ map: skin, roughness: .75 });
  const body = new THREE.Mesh(g, m); body.scale.set(1, 1.15, 1); group.add(body);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, 4.2), m); jaw.position.set(0, -1.2, 4.6); group.add(jaw);
  const fluke = new THREE.Group(); fluke.position.z = -8.8; group.add(fluke);
  const sh = new THREE.Shape(); sh.moveTo(0, .3); sh.quadraticCurveTo(1.6, .2, 3.0, -1.4); sh.quadraticCurveTo(1.4, -.7, 0, -.4); sh.quadraticCurveTo(-1.4, -.7, -3.0, -1.4); sh.quadraticCurveTo(-1.6, .2, 0, .3);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false }); fg.rotateX(-Math.PI / 2);
  fluke.add(new THREE.Mesh(fg, m));
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), m); f.scale.set(1.1, .1, .5); f.position.set(1.3 * s, -.7, 3.2); f.rotation.y = -.5 * s; group.add(f); }
  function swim(t) { fluke.rotation.x = Math.sin(t * 1.6) * .35; body.rotation.x = Math.sin(t * 1.6 + 1) * .03; }
  return { group, swim };
}

// ---------------------------------------------------------------- a wooden sailing ship's hull, waterline at y = 0, bow towards +X
export function makeShip() {
  const group = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(-11, 1.5); sh.lineTo(11.5, 1.5); sh.quadraticCurveTo(10, -1.5, 7, -3.2); sh.lineTo(-8, -3.2); sh.quadraticCurveTo(-10.5, -2, -11, 1.5);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: true, bevelSize: .6, bevelThickness: 1.2, bevelSegments: 3 }); g.translate(0, 0, -3);
  const m = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: .9 });
  group.add(new THREE.Mesh(g, m));
  const keel = new THREE.Mesh(new THREE.BoxGeometry(18, .6, .5), m); keel.position.y = -3.6; group.add(keel);
  for (const x of [-5, 1.5, 7]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, 22, 8), m); mast.position.set(x, 12, 0); group.add(mast); }
  return group;
}

// ---------------------------------------------------------------- the sea surface seen from below, light shafts, marine snow
export function makeSea(scene) {
  const surfM = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(0x9fe6ee) }, op: { value: .95 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float time, op; uniform vec3 tint; varying vec2 vU;
      void main(){ vec2 p = vU * .09; float a = sin(p.x * 3.1 + time * .9) * sin(p.y * 2.7 - time * .7) + .5 * sin((p.x + p.y) * 5.3 + time * 1.3);
        float c = smoothstep(.6, 1.3, a); float d = length(vU) / 260.; vec3 col = mix(tint, vec3(1.), c * .6) * (1. - d * .55);
        gl_FragColor = vec4(col, op * (1. - smoothstep(.7, 1., d))); }`,
  });
  const g = new THREE.PlaneGeometry(520, 520, 1, 1); g.rotateX(-Math.PI / 2);
  const surface = new THREE.Mesh(g, surfM); scene.add(surface);
  // light shafts
  const rc = document.createElement('canvas'); rc.width = 64; rc.height = 256; const rx = rc.getContext('2d');
  const gr = rx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  rx.fillStyle = gr; rx.fillRect(0, 0, 64, 256);
  const hg = rx.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(.5, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,1)');
  rx.globalCompositeOperation = 'destination-out'; rx.fillStyle = hg; rx.fillRect(0, 0, 64, 256);
  const rt = new THREE.CanvasTexture(rc);
  const rays = new THREE.Group(); scene.add(rays);
  const r = mulberry(21);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3 + r() * 5, 70), new THREE.MeshBasicMaterial({ map: rt, color: 0xc8f4ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set((r() - .5) * 60, -35, (r() - .5) * 40); m.rotation.z = (r() - .5) * .25; m.userData.ph = r() * 6; rays.add(m);
  }
  return { surface, surfM, rays };
}
