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
  box(30, .3, 20, p.floor || '#c96f3b', 0, -.15, 6, scene);
  for (let x = -14; x < 15; x += 2) box(.05, .32, 20, new THREE.Color(p.floor || '#c96f3b').offsetHSL(0, 0, -.06).getStyle(), x, -.14, 6, scene);
  box(30, .6, .3, new THREE.Color(p.wall || '#6c4bd1').offsetHSL(0, 0, -.12).getStyle(), 0, .3, -2.7, scene);
  const cityT = p.day ? K.cityTexture(1024, 768, { seed: 11, sky0: '#7cc8ff', sky1: '#d6f1ff', moon: false }) : K.cityTexture(1024, 768, { seed: 11 });
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
  const cn = p.coinAt != null ? K.coin('1', p.coinRot ?? -Math.PI / 2) : null; if (cn) { cn.position.set(.95, 3.8, .3); cn.scale.setScalar(0); scene.add(cn); }
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
      if (cn) { const c = pop(seg(t, p.coinAt, p.coinAt + .4)); cn.scale.setScalar(c * .7); cn.rotation.y = Math.sin(t * 2) * .4; H.armR.s.rotation.x = -2.2 * ease(seg(t, p.coinAt - .2, p.coinAt + .2)); H.armR.s.rotation.z = .2; }
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
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.sky0 || '#1b1550');
  const tex = K.cityTexture(1024, 1820, { seed: p.seed || 3, sky0: p.sky0 || '#140f40', sky1: p.sky1 || '#3a2a8a' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 16), new THREE.MeshBasicMaterial({ map: tex })); scene.add(m);
  const camera = cam(40);
  return {
    scene, camera, end: true,
    update(t) { lookCam(camera, [0, 0, 21.9 - ease(seg(t, p._t0, p._t1 + 2)) * .8], [0, 0, 0]); tex.redraw(.6 + .4 * Math.sin(t * 2) ** 2); },
    overlay2d(g, t) { ctx.drawEndCard(g, t, p); },
  };
}

// ---------------- gaming desk: hero at a big monitor, LED strip, posters ----------------
function desk(p, ctx) {
  const wall = p.wall || '#1f2a5a', led = p.led || '#ff3d8b';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(wall);
  K.lights(scene, { sky: '#e6e9ff', ground: '#3a2f6a', hemi: 1.35, sunI: 1.1, dir: [6, 9, 8] });
  box(30, 20, .5, wall, 0, 10, -3, scene);
  box(30, .3, 20, p.floor || '#3b3f6b', 0, -.15, 6, scene);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(30, .12, .1), new THREE.MeshBasicMaterial({ color: led })); strip.position.set(0, 8.6, -2.7); scene.add(strip);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), new THREE.MeshBasicMaterial({ color: led, transparent: true, opacity: .18 })); glow.position.set(0, 8.2, -2.74); scene.add(glow);
  [['#ffd23f', -4.2, 6.2, 1.8, 2.4], ['#33c26b', 4.4, 6.6, 1.6, 2.2], ['#8ef0ff', 3.2, 4.4, 1.2, 1.2]].forEach(([c, x, y, w, h]) => { box(w, h, .08, c, x, y, -2.7, scene); box(w * .6, h * .3, .1, new THREE.Color(c).offsetHSL(0, 0, -.25).getStyle(), x, y, -2.66, scene); });
  box(3, .15, .8, '#5a3a24', -4, 3.6, -2.4, scene); [['#ff5ea8', -4.8], ['#3a6cff', -4.2], ['#ffd23f', -3.5]].forEach(([c, x], i) => box(.4, .6 + i * .15, .4, c, x, 4.0 + i * .07, -2.4, scene));
  // desk + monitor
  box(7, .25, 2.6, '#26283f', 0, 2.3, -1.2, scene); for (const x of [-3.2, 3.2]) box(.25, 2.3, 2.2, '#1b1c2c', x, 1.15, -1.2, scene);
  const panel = p.panel || { kind: 'poster', text: '' };
  const mT = K.canvasTex(1024, 640, (g, W, H, t = 0) => PANELS[panel.kind](g, W, H, t, panel));
  box(5.2, 3.3, .2, '#0e0f18', -.4, 4.55, -2.1, scene); box(.3, 1.2, .3, '#0e0f18', -.4, 2.9, -2.1, scene);
  const mon = new THREE.Mesh(new THREE.PlaneGeometry(4.95, 3.05), new THREE.MeshBasicMaterial({ map: mT })); mon.position.set(-.4, 4.55, -1.99); scene.add(mon);
  const kb = box(2.2, .1, .7, '#15161f', -.4, 2.48, -.5, scene);
  const kbL = new THREE.Mesh(new THREE.BoxGeometry(2.1, .03, .6), new THREE.MeshBasicMaterial({ color: led })); kbL.position.set(-.4, 2.54, -.5); scene.add(kbL);
  // chair + hero (3/4 from behind-right, head turns to camera)
  const H = hero(ctx).sit(); H.root.position.set(2.0, .35, 1.4); H.root.rotation.y = -1.25; scene.add(H.root);
  box(1.7, .3, 1.7, p.chair || '#e8384f', 2.0, 1.25, 1.45, scene); box(.3, 1.1, .3, '#222', 2.0, .55, 1.45, scene); box(.35, 2.2, 1.7, p.chair || '#e8384f', 2.85, 2.5, 1.45, scene);
  const cn = p.coinAt != null ? K.coin('1', -Math.PI / 2) : null; if (cn) { cn.position.set(2.1, 4.9, 1.6); scene.add(cn); }
  const cd = p.cardAt != null ? K.card('#141414', '#ffd23f') : null; if (cd) { cd.position.set(.6, 3.4, .8); scene.add(cd); }
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([4.2, 5.1, 11.2], [3.6, 4.9, 10.0], k), [.25, 3.9, -.8]);
      H.reset(); H.sit(); idle(H, t, .6); mT.redraw(t);
      const turn = ease(seg(t, at(p.turn, p._t0 + .4), at(p.turn, p._t0 + .4) + .3)); H.head.rotation.y = .3 + 1.0 * turn; H.torso.rotation.y = .3 * turn;
      H.face(faceAt(p.faces, t, p.face || 'neutral'));
      H.armL.s.rotation.x = H.armR.s.rotation.x = -1.1; H.armL.el.rotation.x = H.armR.el.rotation.x = -.3;
      if (cn) { const c = pop(seg(t, p.coinAt, p.coinAt + .4)); cn.scale.setScalar(c * .6); cn.rotation.y = .3 + Math.sin(t * 2) * .3; }
      if (cd) { const c = ease(seg(t, p.cardAt, p.cardAt + .4)); cd.visible = c > 0; cd.position.y = 2.8 + c * 1.3; cd.rotation.y = -.6; }
      kbL.material.color.setHSL((t * .15) % 1, .9, .6);
    },
  };
}

// ---------------- giant wall calendar: pages [{day, month, label, at}], red circle at markAt ----------------
function bigcal(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.wall || '#2b8cff');
  K.lights(scene, { hemi: 1.6, sunI: 1.2, dir: [3, 6, 10] });
  box(30, 30, .4, p.wall || '#2b8cff', 0, 0, -.6, scene);
  for (let i = 0; i < 12; i++) box(.6, .6, .1, '#ffffff', -6 + (i % 4) * 4 + (i > 3 ? 2 : 0), -7 + Math.floor(i / 4) * 7, -.35, scene).material = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: .15 });
  const pages = p.pages || [{ day: '16', month: 'NOVEMBRE' }];
  const meshes = pages.map((pg, i) => {
    const tex = K.canvasTex(512, 640, (g, W, H, t = 0) => {
      g.fillStyle = '#fff'; K.rrect(g, 0, 0, W, H, 30); g.fill();
      g.fillStyle = pg.color || '#e8384f'; g.fillRect(0, 0, W, 130); g.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 5; k++) g.fillRect(60 + k * 88, 16, 26, 60);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, pg.month, 440, 64, 900); g.fillText(pg.month, W / 2, 96);
      g.fillStyle = '#1d1d1d'; K.fitText(g, pg.day, 460, 300, 900); g.fillText(pg.day, W / 2, 360);
      if (pg.label) { g.fillStyle = '#555'; K.fitText(g, pg.label, 440, 56, 900); g.fillText(pg.label, W / 2, 570); }
      const m = seg(t, at(pg.markAt), at(pg.markAt) + .5);
      if (m > 0) { g.strokeStyle = '#e8384f'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.ellipse(W / 2, 360, 200, 165, -.15, -1.9, -1.9 + m * 6.7); g.stroke(); }
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(5.12, 6.4, .08), [K.mat('#ddd'), K.mat('#ddd'), K.mat('#ddd'), K.mat('#ddd'), new THREE.MeshLambertMaterial({ map: tex }), K.mat('#ddd')]);
    const pivot = new THREE.Group(); pivot.position.set(0, 3.2, .05 * (pages.length - i)); mesh.position.y = -3.2; pivot.add(mesh); scene.add(pivot); mesh.castShadow = true;
    return { pivot, tex };
  });
  box(5.6, .5, .5, '#b71f35', 0, 3.35, .3, scene);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, [0, -.6, 18.5 - k * 1.5], [0, -.9, 0]);
      meshes.forEach((m, i) => {
        const nx = pages[i + 1]; const f = nx ? ease(seg(t, at(nx.at), at(nx.at) + .4)) : 0;
        m.pivot.rotation.x = f * 2.6; m.pivot.visible = f < .98; m.tex.redraw(t);
      });
    },
  };
}

// ---------------- hook: spinning rays, orbiting coins, hero jumps; huge stacked title in 2D ----------------
// p.title: [{text, at, color}] — each line slams in at its time; p.shake = time of the big word
function hook(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#ff3b5c');
  K.lights(scene, { hemi: 1.8, sunI: 1.3, dir: [3, 8, 10] });
  const rays = K.canvasTex(1024, 1024, (g, W) => { const n = 18; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? (p.ray1 || '#ff6b81') : (p.ray2 || '#ff3b5c'); g.beginPath(); g.moveTo(W / 2, W / 2); g.arc(W / 2, W / 2, W, i / n * 6.283, (i + 1) / n * 6.283); g.fill(); } });
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: rays })); rp.position.set(0, 3, -6); scene.add(rp);
  const H = hero(ctx); H.root.position.set(0, 0, 0); scene.add(H.root);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; scene.add(floor);
  const coins = Array.from({ length: 8 }, (_, i) => { const c = K.coin('€', -Math.PI / 2); c.scale.setScalar(.55); scene.add(c); return c; });
  const lastAt = Math.max(...(p.title || []).map(l => at(l.at, 0)));
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const sh = at(p.shake, lastAt), q = Math.max(0, 1 - (t - sh) / .35) * (t > sh ? 1 : 0);
      lookCam(camera, [Math.sin(t * 50) * .12 * q, 3.2 + Math.cos(t * 43) * .1 * q, 13], [0, 3.4, 0]);
      rp.rotation.z = t * .35;
      H.reset();
      let j = 0; for (const l of p.title || []) { const d = t - at(l.at, 1e9); if (d > 0 && d < .45) j = Math.max(j, Math.sin(d / .45 * Math.PI)); }
      H.root.position.y = j * .9; H.legL.s.rotation.x = -.3 * j; H.legR.s.rotation.x = .3 * j;
      const up = ease(seg(t, sh - .1, sh + .15)); H.armL.s.rotation.z = -2.6 * up - .2; H.armR.s.rotation.z = 2.6 * up + .2;
      H.face(t >= sh ? 'happy' : faceAt(p.faces, t, 'surprised')); idle(H, t);
      coins.forEach((c, i) => { const a = i / coins.length * 6.283 + t * 1.4; c.position.set(Math.cos(a) * 3.4, 3.4 + Math.sin(a * 2 + t) * 1.2, Math.sin(a) * 1.5); c.rotation.y = t * 3 + i; c.visible = t > (p._t0 + .1); });
    },
    overlay2d(g, t) {
      let y = p.y || 260;
      for (const l of p.title || []) {
        const big = !!l.big, k = pop(seg(t, at(l.at, 1e9), at(l.at, 1e9) + .25)); const size = big ? 300 : 170;
        if (k > 0) {
          g.save(); g.translate(540, y + size / 2); g.rotate(big ? -.06 + Math.sin(t * 6) * .015 : -.03); const pulse = big ? 1 + .04 * Math.sin(t * 8) : 1; g.scale(k * pulse, k * pulse);
          const s = K.fitText(g, l.text, 980, size, 800, 'Baloo'); g.font = `800 ${s}px Baloo`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
          g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.shadowOffsetY = 10; g.strokeStyle = '#1d0b0b'; g.lineWidth = s * .2; g.strokeText(l.text, 0, 0); g.shadowColor = 'transparent';
          g.fillStyle = l.color || '#ffffff'; g.fillText(l.text, 0, 0); g.restore();
        }
        y += (big ? 300 : 170) * .9;
      }
    },
  };
}

// ---------------- home cinema: beanbag, popcorn, fairy lights, big screen with a panel ----------------
function cinema(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.wall || '#160d2e');
  K.lights(scene, { sky: '#d9d0ff', ground: '#2a1d4a', hemi: 1.2, sunI: .9, dir: [6, 9, 8] });
  box(30, 20, .5, p.wall || '#160d2e', 0, 10, -3, scene); box(30, .3, 20, p.floor || '#2a1d4a', 0, -.15, 6, scene);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3, 40), K.mat(p.rug || '#ff3b5c')); rug.rotation.x = -Math.PI / 2; rug.position.set(2.2, .02, .8); scene.add(rug);
  const bulbs = Array.from({ length: 16 }, (_, i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); b.position.set(-7 + i * .95, 8.3 - Math.sin(i / 15 * Math.PI) * .7, -2.6); scene.add(b); return b; });
  const panel = p.panel || { kind: 'poster', text: '' };
  const sT = K.canvasTex(1024, 576, (g, W, H, t = 0) => PANELS[panel.kind](g, W, H, t, panel));
  box(6.6, 3.9, .15, '#0b0b12', -.8, 5.0, -2.75, scene);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: sT })); scr.position.set(-.8, 5.0, -2.66); scene.add(scr);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), new THREE.MeshBasicMaterial({ color: p.glow || '#7a6bff', transparent: true, opacity: .12 })); glow.rotation.x = -Math.PI / 2; glow.position.set(-.8, .03, -.5); scene.add(glow);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 16), K.mat(p.bag || '#ffd23f')); bag.scale.set(1.1, .6, 1.1); bag.position.set(2.4, .7, .7); bag.castShadow = bag.receiveShadow = true; scene.add(bag);
  const H = hero(ctx).sit(); H.root.position.set(2.4, .15, .7); H.root.rotation.y = -1.25; scene.add(H.root);
  const pc = new THREE.Group(); const stripe = K.canvasTex(128, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#e8384f'; g.fillRect(i * 16, 0, 16, 64); } });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.42, .3, .9, 16, 1, true), new THREE.MeshLambertMaterial({ map: stripe, side: THREE.DoubleSide })); cup.position.y = .45; pc.add(cup);
  for (let i = 0; i < 14; i++) box(.16, .16, .16, '#fff6d5', Math.sin(i * 2.3) * .28, .95 + (i % 3) * .1, Math.cos(i * 1.7) * .28, pc);
  pc.position.set(3.9, 0, 1.4); scene.add(pc);
  const cd = p.cardAt != null ? K.card('#141414', '#ffd23f') : null; if (cd) { cd.position.set(1.4, 3.0, 2.2); scene.add(cd); }
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([4.6, 5.0, 13.4], [4.0, 4.8, 12.2], k), [.5, 4.0, -.8]);
      H.reset(); H.sit(); idle(H, t, .6); sT.redraw(t);
      const turn = ease(seg(t, at(p.turn, p._t0 + .4), at(p.turn, p._t0 + .4) + .3)); H.head.rotation.y = .3 + 1.0 * turn; H.torso.rotation.y = .3 * turn;
      H.face(faceAt(p.faces, t, p.face || 'neutral'));
      H.armR.s.rotation.x = -.9; H.armR.el.rotation.x = -.6;
      bulbs.forEach((b, i) => b.material.color.setHSL(((i * .07 + t * .2) % 1), .9, .62));
      if (cd) { const c = ease(seg(t, p.cardAt, p.cardAt + .4)); cd.visible = c > 0; cd.position.y = 2.6 + c * 1.4; cd.rotation.y = -.5; }
    },
  };
}

// ---------------- money rain: banknotes fall on a cheering hero from p.rainAt ----------------
function money(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#12a150');
  K.lights(scene, { hemi: 1.7, sunI: 1.3, dir: [3, 9, 8] });
  box(30, 20, .5, p.bg || '#12a150', 0, 10, -3, scene); box(30, .3, 20, p.floor || '#0e7a3d', 0, -.15, 6, scene);
  const H = hero(ctx); scene.add(H.root);
  const billT = K.canvasTex(256, 128, (g, W, Hh) => { g.fillStyle = '#7bd389'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#2f8f46'; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, Hh - 16); g.fillStyle = '#2f8f46'; g.beginPath(); g.arc(W / 2, Hh / 2, 34, 0, 7); g.fill(); g.fillStyle = '#7bd389'; g.font = '900 52px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('€', W / 2, Hh / 2 + 3); });
  const bm = new THREE.MeshLambertMaterial({ map: billT, side: THREE.DoubleSide });
  const bills = Array.from({ length: 46 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .5), bm); m.userData = { x: ((i * 37) % 100) / 100 * 9 - 4.5, z: ((i * 53) % 100) / 100 * 3 - 1.5, d: (i * 0.071) % 1.6, sp: 2.2 + (i % 5) * .35, r: i }; scene.add(m); return m; });
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, [0, 3.5, 9.6 - k * 1.0], [0, 3.1, 0]);
      H.reset(); idle(H, t);
      const r0 = at(p.rainAt), up = ease(seg(t, r0 - .1, r0 + .2));
      H.armL.s.rotation.z = -2.5 * up - .15; H.armR.s.rotation.z = 2.5 * up + .15; H.root.position.y = up * Math.abs(Math.sin((t - r0) * 7)) * .35;
      H.face(t >= r0 ? 'happy' : faceAt(p.faces, t, 'neutral'));
      bills.forEach(b => { const u = b.userData, d = t - r0 - u.d; b.visible = d > 0; if (d <= 0) return; const y = 11 - d * u.sp; b.position.set(u.x + Math.sin(d * 2 + u.r) * .6, Math.max(.05, y), u.z); b.rotation.set(y > .05 ? d * 2 + u.r : -Math.PI / 2, d * 1.3 + u.r, y > .05 ? Math.sin(d * 3) : 0); });
    },
  };
}

// ---------------- portrait for profile pictures: hero head-and-shoulders on a flat colour ----------------
function portrait(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#ffd23f');
  K.lights(scene, { hemi: 1.7, sunI: 1.4, dir: [4, 8, 10] });
  const H = hero(ctx); scene.add(H.root); H.face(p.face || 'happy');
  const cn = K.coin(p.coinLabel || '€', p.coinRot ?? -Math.PI / 2); cn.position.set(1.3, 3.75, .9); cn.rotation.y = Math.PI - .35; cn.scale.setScalar(.7); scene.add(cn);
  H.armR.s.rotation.x = -2.3; H.armR.s.rotation.z = .25; H.armR.el.rotation.x = -.4;
  H.head.rotation.y = -.12; H.head.rotation.z = .05;
  const camera = cam(30);
  return { scene, camera, update() { lookCam(camera, [.5, 3.4, 12.5], [.35, 3.2, 0]); } };
}

export const SCENES = { city, room, park, phone, screen, end, portrait, desk, bigcal, hook, cinema, money };
