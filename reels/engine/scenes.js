// Scene library. Each scene type: make(p, ctx) → { scene, camera, update(t), overlay2d?(g, t) }.
// Times inside p (at, switchAt, ...) are absolute seconds; p._t0 / p._t1 are the scene's own span.
import * as THREE from 'three';
import * as K from './kit.js';
import { PANELS } from './ui.js';
const { box, seg, ease, easeOut, pop, clamp } = K;

const cam = (fov = 40) => new THREE.PerspectiveCamera(fov, 1080 / 1920, .1, 400);
const lookCam = (c, pos, at) => { c.position.set(...pos); c.lookAt(new THREE.Vector3(...at)); };
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const at = (v, d = 1e9) => (typeof v === 'number' ? v : d);

// Characters from the episode cast (ctx.cast.hero / ctx.cast.friend)
const hero = ctx => K.person(ctx.cast.hero);
const friend = ctx => K.person(ctx.cast.friend);

// Badges: [{text, kind, at, out, pos:[x,y,z], scale}] — pop in at `at`, fade at `out`
function addBadges(scene, list = []) {
  const items = list.map(b => { const s = K.badge(b.text, b.kind, b.scale || 1); s.position.set(...(b.pos || [0, 5, 0])); scene.add(s); return [b, s]; });
  return t => items.forEach(([b, s]) => {
    const k = pop(seg(t, at(b.at, -1), at(b.at, -1) + .35)), o = 1 - seg(t, at(b.out), at(b.out) + .25);
    s.visible = k > 0 && o > 0; s.scale.set(s.base[0] * k, s.base[1] * k, 1); s.material.opacity = o;
    s.position.y = (b.pos || [0, 5, 0])[1] + Math.sin(t * 3 + (b.pos?.[0] || 0)) * .05;
  });
}
// Faces: [{at, face}] — the latest one before t wins
const faceAt = (list = [], t, def = 'neutral') => { let f = def; for (const x of list) if (t >= at(x.at, -1)) f = x.face; return f; };
const idle = (P, t, k = 1) => { P.head.rotation.z = Math.sin(t * 1.7) * .03 * k; P.torso.rotation.z = Math.sin(t * 1.3) * .015 * k; P.hips.position.y += Math.sin(t * 3.2) * .01 * k; };

// ---------------- city at night, looking down a street at a billboard ----------------
function city(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2a1f6e'); scene.fog = new THREE.Fog('#3a2a80', 30, 90);
  K.lights(scene, { sky: '#9aa6ff', ground: '#3b2a6a', hemi: 1.4, sunI: .6, sun: '#c9b8ff', dir: [-6, 14, 4] });
  box(14, .1, 200, '#2e2a52', 0, -.05, -60, scene); box(3, .12, 200, '#3a3570', -6, 0, -60, scene); box(3, .12, 200, '#3a3570', 6, 0, -60, scene);
  for (let z = 0; z > -120; z -= 6) box(.3, .02, 2.4, '#e9e3ff', 0, .02, z, scene);
  const facades = [];
  for (let side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const h = 12 + ((i * 7 + (side > 0 ? 3 : 0)) % 5) * 5, w = 8, d = 9, z = 4 - i * 11;
    const tex = K.canvasTex(256, 512, (g, W, H, lit = 0) => {
      g.fillStyle = ['#2a2466', '#332b78', '#3d2f86'][i % 3]; g.fillRect(0, 0, W, H);
      let s = i * 31 + side * 7 + 100; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let y = 20; y < H - 10; y += 40) for (let x = 18; x < W - 20; x += 44) { const v = r(); g.fillStyle = v < .25 + lit * .7 ? ['#ffd45a', '#ffb347', '#ff9de0', '#8ef0ff'][Math.floor(v * 17) % 4] : '#1c1850'; g.fillRect(x, y, 24, 26); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, h / 16);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(side * 12, h / 2, z); m.receiveShadow = true; scene.add(m); facades.push(tex);
    box(w + .4, .6, d + .4, '#4a3f9a', side * 12, h, z, scene);
  }
  // street lamps with light pools
  for (let z = 2; z > -60; z -= 12) for (const side of [-1, 1]) {
    box(.25, 4, .25, '#20204a', side * 6.2, 2, z, scene); box(1.2, .2, .4, '#20204a', side * 5.7, 4, z, scene);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: '#ffe9b0', transparent: true, opacity: .25 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(side * 4.6, .04, z); scene.add(pool);
  }
  const cars = [['#3a6cff', -2.2, 1], ['#ff5ea8', 2.2, -1], ['#8a6bff', -2.2, 1.3]].map(([c, x, v], i) => { const g = new THREE.Group(); box(1.6, .8, 3, c, 0, .6, 0, g); box(1.3, .6, 1.6, '#c9d6ff', 0, 1.2, -.2, g); g.position.set(x, 0, -10 - i * 14); scene.add(g); return [g, v]; });
  // billboard
  const bb = p.billboard || { title: 'GIORNO X', sub: '00:00:00' };
  const bt = K.canvasTex(1024, 640, (g, W, H, t = 0) => PANELS.billboard(g, W, H, t, { ...bb, switchAt: at(p.switchAt) }));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 7.5), new THREE.MeshBasicMaterial({ map: bt }));
  board.position.set(0, 21, -44); scene.add(board);
  box(.6, 16, .6, '#20204a', -4, 8, -44.5, scene); box(.6, 16, .6, '#20204a', 4, 8, -44.5, scene);
  const camera = cam(42);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1));
      lookCam(camera, lerp3([0, 15, 14], [0, 13, 4], k), lerp3([0, 9, -40], [0, 12, -44], k));
      const lit = seg(t, at(p.lightUp), at(p.lightUp) + 1.2); const q = Math.round(lit * 12) / 12;
      if (facades[0].lit !== q) facades.forEach(f => { f.redraw(q); f.lit = q; });
      bt.redraw(t);
      const sw = seg(t, at(p.switchAt), at(p.switchAt) + .3); board.scale.setScalar(1 + .08 * Math.sin(sw * Math.PI));
      cars.forEach(([g, v]) => { g.position.z = -10 - ((t * 6 * v + 400) % 50); g.rotation.y = v > 0 ? 0 : Math.PI; });
    },
  };
}

// ---------------- living room: hero on the sofa, window, calendar, badges ----------------
function room(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.wall || '#6c4bd1');
  K.lights(scene, { sky: '#fff1e0', ground: '#7a5bb0', hemi: 1.5, sunI: 1.5, dir: [4, 10, 9] });
  box(30, 20, .5, p.wall || '#6c4bd1', 0, 10, -3, scene);
  box(30, .3, 20, '#c96f3b', 0, -.15, 6, scene);
  for (let x = -14; x < 15; x += 2) box(.05, .32, 20, '#b05f30', x, -.14, 6, scene);
  box(30, .6, .3, '#5a3cb0', 0, .3, -2.7, scene);
  const cityT = K.cityTexture(1024, 768, { seed: 11 });
  const win = K.windowFrame(cityT, 3.4, 2.6); win.position.set(-1.9, 5.3, -2.7); scene.add(win);
  const cal = p.calendar ? K.calendar(p.calendar) : null; if (cal) { cal.position.set(2.2, 5.4, -2.6); cal.scale.setScalar(1.15); scene.add(cal); }
  const so = K.sofa(p.sofa || '#d93a54'); so.position.set(0, 0, -1.6); scene.add(so);
  const table = new THREE.Group(); box(3.2, .2, 1.4, '#7a4a2a', 0, 1.0, 0, table); for (const x of [-1.4, 1.4]) for (const z of [-.5, .5]) box(.2, 1, .2, '#7a4a2a', x, .5, z, table);
  table.position.set(0, 0, 2.2); scene.add(table);
  box(.5, .4, .5, '#f4f1ea', 1.0, 1.3, 2.2, scene);
  const H = hero(ctx).sit(); H.root.position.set(p.friend ? -1.3 : 0, 0, -1.4); scene.add(H.root);
  let F = null; if (p.friend) { F = friend(ctx).sit(); F.root.position.set(1.4, 0, -1.4); scene.add(F.root); }
  // what the hero holds
  let held = null;
  if (p.hold === 'laptop') { held = new THREE.Group(); box(1.5, .1, 1.0, '#2a2a33', 0, 0, 0, held); const lid = box(1.5, 1.0, .08, '#2a2a33', 0, .5, -.48, held); lid.rotation.x = -.25; held.position.set(0, 1.85, .7); H.root.add(held); }
  if (p.hold === 'phone') { held = K.phoneMesh(K.canvasTex(64, 128, g => { g.fillStyle = '#3ad37a'; g.fillRect(0, 0, 64, 128); }), .5, .9); held.position.set(0, 2.1, .9); held.rotation.x = -.5; H.root.add(held); }
  const greenPhone = K.phoneMesh(K.canvasTex(64, 128, g => { g.fillStyle = '#3ad37a'; g.fillRect(0, 0, 64, 128); }), .5, .9);
  greenPhone.rotation.x = -Math.PI / 2; greenPhone.position.set(-.8, 1.12, 2.2); scene.add(greenPhone);
  const cn = p.coinAt != null ? K.coin('1') : null; if (cn) { cn.position.set(1.6, 3.6, 0); cn.scale.setScalar(0); scene.add(cn); }
  const badges = () => {};
  const presets = { wide: [[0, 4.4, 11], [0, 3.4, 0]], close: [[.2, 3.6, 5.6], [0, 3.0, -1]], duo: [[0, 3.9, 8.6], [0, 3.0, -1]] };
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const a = presets[p.cam || 'wide'], b = presets[p.camTo || p.cam || 'wide'];
      const k = ease(seg(t, p._t0, p._t1)), push = (p.push ?? .35) * k;
      const pos = lerp3(a[0], b[0], k), tg = lerp3(a[1], b[1], k);
      lookCam(camera, [pos[0], pos[1] - push * .3, pos[2] - push * 2], tg);
      H.reset(); H.sit(); idle(H, t);
      H.face(faceAt(p.faces, t, p.face || 'neutral'));
      if (held) { H.armL.s.rotation.x = H.armR.s.rotation.x = -1.0; H.armL.el.rotation.x = H.armR.el.rotation.x = -.5; H.armL.s.rotation.z = -.25; H.armR.s.rotation.z = .25; }
      if (F) { F.reset(); F.sit(); idle(F, t + 1); F.face(faceAt(p.friendFaces, t, 'happy')); F.head.rotation.y = -.35; }
      if (p.lookAtFriend && F && t > at(p.lookAtFriend)) H.head.rotation.y = .35 * ease(seg(t, at(p.lookAtFriend), at(p.lookAtFriend) + .3));
      if (cn) { const c = pop(seg(t, p.coinAt, p.coinAt + .4)); cn.scale.setScalar(c); cn.rotation.y = Math.sin(t * 2) * .4; H.armR.s.rotation.x = -2.2 * ease(seg(t, p.coinAt - .2, p.coinAt + .2)); H.armR.s.rotation.z = .2; }
      cal?.update(t); cityT.redraw(1); badges(t);
    },
  };
}

// ---------------- park: friend hands over an invite code ----------------
function park(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#8fd3ff');
  K.lights(scene, { sky: '#ffffff', ground: '#6fbf5a', hemi: 1.7, sunI: 1.8, dir: [6, 12, 6] });
  box(60, .3, 60, '#66cc4f', 0, -.15, 0, scene); box(5, .32, 60, '#e8d49a', 3, -.14, 0, scene);
  [[-7, -6], [-3, -10], [5, -12], [9, -7], [-9, -1], [10, 0], [-1, -16], [13, -14]].forEach(([x, z], i) => { const tr = K.tree(3 + (i % 3), ['#4fbf4a', '#3fae4a', '#5ccf55'][i % 3]); tr.position.set(x, 0, z); scene.add(tr); });
  for (let i = 0; i < 10; i++) box(4, .8 + (i % 3), 3, ['#f4b183', '#f7d08a', '#e98aa0'][i % 3], -18 + i * 4.2, .5, -24, scene);
  const desk = new THREE.Group(); box(2.4, .2, 1.4, '#a0663a', 0, 1.25, 0, desk); for (const x of [-1.0, 1.0]) box(.2, 1.25, 1.1, '#a0663a', x, .62, 0, desk);
  desk.position.set(-1.1, 0, .7); scene.add(desk);
  const lap = new THREE.Group(); box(1.1, .08, .8, '#2a2a33', 0, 1.4, 0, lap); const lid = box(1.1, .7, .06, '#2a2a33', 0, 1.75, .38, lap); lid.rotation.x = .25; lap.position.set(-1.1, 0, .6); scene.add(lap);
  const A = hero(ctx).sit(); A.root.position.set(-1.1, 0, -.5); A.root.rotation.y = .35; scene.add(A.root);
  box(1.5, 1.0, 1.2, '#7a4a2a', -1.1, .5, -.7, scene);
  const B = friend(ctx); B.root.position.set(1.3, 0, .9); B.root.rotation.y = -.55; scene.add(B.root);
  const cardT = K.canvasTex(256, 160, (g, W, H) => { g.fillStyle = '#ffd23f'; K.rrect(g, 0, 0, W, H, 18); g.fill(); g.fillStyle = '#1d1d1d'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, p.cardText || 'CODICE', 220, 58, 900); g.fillText(p.cardText || 'CODICE', W / 2, 66); g.font = '800 26px Nunito'; g.fillText(p.cardSub || 'INVITO', W / 2, 118); });
  const crd = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .7), new THREE.MeshBasicMaterial({ map: cardT, side: THREE.DoubleSide })); B.armR.hand.add(crd); crd.position.set(0, -.3, .3);
  const badges = () => {};
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([.4, 4.4, 11.5], [.2, 4.0, 9.5], k), [0, 2.4, 0]);
      A.reset(); A.sit(); idle(A, t); B.reset(); idle(B, t + 2, .6);
      const g = ease(seg(t, at(p.give), at(p.give) + .4)); B.armR.s.rotation.x = -1.4 * g; B.armR.el.rotation.x = -.2 * g; crd.visible = g > .05;
      A.armL.s.rotation.x = A.armR.s.rotation.x = -.9; A.head.rotation.y = .5 * ease(seg(t, at(p.give) - .3, at(p.give)));
      A.face(faceAt(p.faces, t, 'neutral')); B.face(faceAt(p.friendFaces, t, 'happy'));
      badges(t);
    },
  };
}

// ---------------- first person: hands holding a phone with a form ----------------
function phone(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#7ee35a');
  K.lights(scene, { hemi: 1.8, sunI: 1.2, dir: [2, 6, 10] });
  box(40, .2, 40, p.ground || '#e9d7a1', 0, -6, -6, scene);
  const sT = K.canvasTex(600, 680, (g, W, H, t = 0) => PANELS.form(g, W, H, t, { ...p.form, code: p.form?.code ?? ctx.brand.code }));
  const ph = K.phoneMesh(sT, 3.0, 3.6); ph.position.set(0, 1.0, 0); scene.add(ph);
  const sleeve = ctx.cast.hero.shirt || '#22a597', skin = ctx.cast.hero.skin || '#f2c39b';
  for (const s of [-1, 1]) { const a = new THREE.Group(); box(1.1, 6, 1.1, sleeve, 0, -3, 0, a); box(1.0, 1.1, .9, skin, 0, .4, .1, a); a.position.set(s * 1.25, -1.2, .4); a.rotation.z = s * .5; a.rotation.x = .3; scene.add(a); }
  const camera = cam(45);
  return {
    scene, camera, update(t) {
      const tl = t - p._t0; lookCam(camera, [Math.sin(tl * 1.2) * .08, 1.0 + Math.sin(tl * 2) * .05, 7.2 - ease(seg(t, p._t0, p._t1)) * .6], [0, .9, 0]);
      ph.rotation.z = Math.sin(tl * 1.5) * .02; sT.redraw(t);
    },
  };
}

// ---------------- over-the-shoulder at a TV/monitor showing a panel ----------------
function screen(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.wall || '#5a3fc0');
  K.lights(scene, { sky: '#e9e0ff', ground: '#4a3a8a', hemi: 1.3, sunI: 1.0, dir: [3, 8, 10] });
  box(30, 20, .5, p.wall || '#5a3fc0', 0, 8, -4, scene);
  const panel = p.panel || { kind: 'store', title: 'TITOLO', price: '0,00€' };
  const tT = K.canvasTex(1024, 640, (g, W, H, t = 0) => PANELS[panel.kind](g, W, H, t, panel));
  box(6.0, 3.9, .3, '#15152a', 0, 6.0, -3.6, scene);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.5), new THREE.MeshBasicMaterial({ map: tT })); tv.position.set(0, 6.0, -3.4); scene.add(tv);
  box(12, .4, 2, '#3b2b7a', 0, 2.2, -3, scene);
  const H = hero(ctx).sit(); H.root.position.set(0, -.2, 2.6); H.root.rotation.y = Math.PI; scene.add(H.root);
  box(5, 1.6, .6, p.sofa || '#d93a54', 0, 1.5, 3.6, scene);
  const cd = p.cardAt != null ? K.card('#141414', '#ffd23f') : null;
  if (cd) { cd.position.set(1.3, 3.3, 1.6); cd.rotation.y = Math.PI; scene.add(cd); }
  const badges = () => {};
  const camera = cam(42);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([.3, 4.6, 9.6], [.15, 5.0, 8.4], k), [0, 5.0, -3]);
      H.reset(); H.sit(); idle(H, t, .5); tT.redraw(t);
      if (cd) { const c = ease(seg(t, p.cardAt, p.cardAt + .4)); cd.visible = c > 0; cd.position.y = 2.4 + c * 1.6; cd.rotation.z = .3 - c * .3; H.armR.s.rotation.x = -1.6 * c; }
      badges(t);
    },
  };
}

// ---------------- end card: skyline + brand card + code (2D on top) ----------------
function end(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1b1550');
  const tex = K.cityTexture(1024, 1820, { seed: 3, sky0: '#140f40', sky1: '#3a2a8a' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 16), new THREE.MeshBasicMaterial({ map: tex })); scene.add(m);
  const camera = cam(40);
  return {
    scene, camera, end: true,
    update(t) { lookCam(camera, [0, 0, 21.9 - ease(seg(t, p._t0, p._t1 + 2)) * .8], [0, 0, 0]); tex.redraw(.6 + .4 * Math.sin(t * 2) ** 2); },
    overlay2d(g, t) { ctx.drawEndCard(g, t, p); },
  };
}

export const SCENES = { city, room, park, phone, screen, end };
