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
  const sT = K.canvasTex(600, 680, (g, W, H, t = 0) => p.chat ? PANELS.chat(g, W, H, t, p.chat) : PANELS.form(g, W, H, t, { ...p.form, code: p.form?.code ?? ctx.brand.code }));
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

// Big stacked 2D title lines (used by hook and mystery). p.title: [{text, at, big, color, strikeAt}], p.y = top
function drawTitles(g, t, p) {
      let y = p.y || 260;
      for (const l of p.title || []) {
        const big = !!l.big, k = pop(seg(t, at(l.at, 1e9), at(l.at, 1e9) + .25)); const size = big ? 300 : 170;
        if (k > 0) {
          g.save(); g.translate(540, y + size / 2); g.rotate(big ? -.06 + Math.sin(t * 6) * .015 : -.03); const pulse = big ? 1 + .04 * Math.sin(t * 8) : 1; g.scale(k * pulse, k * pulse);
          const s = K.fitText(g, l.text, 980, size, 800, 'Baloo'); g.font = `800 ${s}px Baloo`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
          g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.shadowOffsetY = 10; g.strokeStyle = '#1d0b0b'; g.lineWidth = s * .2; g.strokeText(l.text, 0, 0); g.shadowColor = 'transparent';
          g.fillStyle = l.color || '#ffffff'; g.fillText(l.text, 0, 0);
          const st = seg(t, at(l.strikeAt), at(l.strikeAt) + .25);   // red strike-through, e.g. 80€ → 50€
          if (st > 0) { const w = g.measureText(l.text).width / 2 + 20; g.strokeStyle = '#ff2d2d'; g.lineCap = 'round'; g.lineWidth = s * .12; g.beginPath(); g.moveTo(-w, s * .18); g.lineTo(-w + 2 * w * st, -s * .18); g.stroke(); }
          g.restore();
        }
        y += (big ? 300 : 170) * .9;
      }
}

// ---------------- hook: spinning rays, orbiting coins, hero jumps; huge stacked title in 2D ----------------
// p.title: [{text, at, color}] — each line slams in at its time; p.shake = time of the big word
function hook(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#ff3b5c');
  K.lights(scene, { hemi: 1.8, sunI: 1.3, dir: [3, 8, 10] });
  const rays = K.canvasTex(1024, 1024, (g, W) => { const n = 18; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? (p.ray1 || '#ff6b81') : (p.ray2 || '#ff3b5c'); g.beginPath(); g.moveTo(W / 2, W / 2); g.arc(W / 2, W / 2, W, i / n * 6.283, (i + 1) / n * 6.283); g.fill(); } });
  const rp = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: rays })); rp.position.set(0, 3, -6); scene.add(rp);
  const H = hero(ctx); H.root.position.set(0, 0, 0); scene.add(H.root);
  if (p.holdGame) { const gb = gameBox(p.holdGame); gb.scale.setScalar(1.6); H.armR.hand.add(gb); gb.position.set(0, -.6, 0); gb.rotation.set(2.4 - Math.PI, Math.PI, Math.PI); }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; scene.add(floor);
  const coins = Array.from({ length: 8 }, (_, i) => { const c = K.coin('€', -Math.PI / 2); c.scale.setScalar(.55); scene.add(c); return c; });
  const lastAt = Math.max(...(p.title || []).map(l => at(l.at, 0)));
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const sh = at(p.shake, lastAt), q = Math.max(0, 1 - (t - sh) / .35) * (t > sh ? 1 : 0);
      const lift = p.camLift || 0; lookCam(camera, [Math.sin(t * 50) * .12 * q, 3.2 + lift + Math.cos(t * 43) * .1 * q, 13], [0, 3.4 + lift, 0]);
      rp.rotation.z = t * .35;
      H.reset();
      let j = 0; for (const l of p.title || []) { const d = t - at(l.at, 1e9); if (d > 0 && d < .45) j = Math.max(j, Math.sin(d / .45 * Math.PI)); }
      if (p.react === 'shock' && t >= sh) j = 0; H.root.position.y = j * .9; H.legL.s.rotation.x = -.3 * j; H.legR.s.rotation.x = .3 * j;
      const up = ease(seg(t, sh - .1, sh + .15));
      if (p.react === 'shock') { H.armL.s.rotation.x = H.armR.s.rotation.x = -2.9 * up; H.armL.s.rotation.z = -.5 * up; H.armR.s.rotation.z = .5 * up; H.armL.el.rotation.x = H.armR.el.rotation.x = -.9 * up; }   // hands on head
      else { H.armL.s.rotation.z = -2.6 * up - .2; H.armR.s.rotation.z = 2.6 * up + .2; }
      H.face(t >= sh ? (p.react === 'shock' ? 'surprised' : 'happy') : faceAt(p.faces, t, 'surprised')); idle(H, t);
      if (p.holdGame) { H.armR.s.rotation.x = -2.4; H.armR.s.rotation.z = .15; H.armR.el.rotation.x = -.2; }   // show the game box up high
      coins.forEach((c, i) => { const a = i / coins.length * 6.283 + t * 1.4; c.position.set(Math.cos(a) * 3.4, 3.4 + Math.sin(a * 2 + t) * 1.2, Math.sin(a) * 1.5);
        if (p.react === 'shock' && t >= sh) { const d = t - sh; c.position.set(Math.cos(i * .8) * 3.6, Math.max(.3, 3.4 + Math.sin(i * 2) - d * d * 14), Math.sin(i * .8) * 1.5); c.rotation.set(d > .4 ? Math.PI / 2 : 0, 0, 0); }   // coins drop: the bonus shrinks
        else c.rotation.y = t * 3 + i;
        c.visible = t > (p._t0 + .1); });
    },
    overlay2d(g, t) { drawTitles(g, t, p); },
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
  box(6.6, 3.9, .15, '#0b0b12', -.3, 5.0, -2.75, scene);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ map: sT })); scr.position.set(-.3, 5.0, -2.66); scene.add(scr);
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

// game box prop with a cover label
function gameBox(label = 'GTA 6', col = '#1d1d1d') {
  const t = K.canvasTex(128, 160, (g, W, H) => { g.fillStyle = col; g.fillRect(0, 0, W, H); g.fillStyle = '#ff3d8b'; g.fillRect(0, H * .62, W, H * .2); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, label, 110, 44, 900); g.fillText(label, W / 2, H * .35); g.font = '800 18px Nunito'; g.fillText('19 · 11', W / 2, H * .72); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.0, .12), [K.mat('#111'), K.mat('#111'), K.mat('#111'), K.mat('#111'), new THREE.MeshLambertMaterial({ map: t }), K.mat('#111')]); m.castShadow = true; return m;
}
function bill(label = '10€') {
  const t = K.canvasTex(256, 128, (g, W, H) => { g.fillStyle = '#7bd389'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2f8f46'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16); g.fillStyle = '#1f6b34'; g.font = '900 70px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H / 2 + 4); });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.5, .75), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
}
const walk = (P, t, k = 1) => { const a = Math.sin(t * 7) * .55 * k; P.legL.s.rotation.x = a; P.legR.s.rotation.x = -a; P.armL.s.rotation.x = -a * .8; P.armR.s.rotation.x = a * .8; P.hips.position.y = 1.2 + Math.abs(Math.cos(t * 7)) * .08 * k; };

// ---------------- street: hero walks toward camera between pastel buildings; friends carry game boxes ----------------
function street(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.sky || '#9fd8ff');
  K.lights(scene, { hemi: 1.7, sunI: 1.5, dir: [6, 12, 6] });
  box(6, .2, 400, '#b9b4c9', 0, -.1, -150, scene); box(4, .25, 400, '#e7e3ef', -5, -.05, -150, scene); box(4, .25, 400, '#e7e3ef', 5, -.05, -150, scene);
  const world = new THREE.Group(); scene.add(world);
  const cols = p.cols || ['#ff8fb1', '#ffb3c7', '#ffd1dc', '#c9b6ff'];
  for (let i = 0; i < 24; i++) for (const s of [-1, 1]) {
    const h = 8 + ((i * 5 + (s > 0 ? 2 : 0)) % 4) * 3, z = 6 - i * 7;
    box(6, h, 6.5, cols[(i + (s > 0 ? 1 : 0)) % cols.length], s * 10, h / 2, z, world);
    for (let r = 0; r < Math.floor(h / 2.5); r++) box(.1, 1.1, 1.4, '#7fb2ff', s * 6.95, 2 + r * 2.4, z - 1.5, world), box(.1, 1.1, 1.4, '#7fb2ff', s * 6.95, 2 + r * 2.4, z + 1.5, world);
    if (i % 3 === 0) { const tr = K.tree(2.5, '#5ccf55'); tr.position.set(s * 6.2, 0, z + 3); world.add(tr); }
  }
  const H = hero(ctx); scene.add(H.root);
  const others = (p.friends ?? 2) ? [friend(ctx), K.person({ skin: '#f2c39b', hair: '#d9a066', shirt: '#9b5de5', pants: '#22223b' })].slice(0, p.friends ?? 2) : [];
  others.forEach((o, i) => { o.root.position.set(i ? -2.0 : 2.0, 0, -2.2 - i * .6); scene.add(o.root); const gb = gameBox(); o.armR.hand.add(gb); gb.position.set(0, -.3, .35); });
  const b = bill(p.billLabel || '10€'); b.visible = false; scene.add(b);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const tl = t - p._t0; lookCam(camera, [.6 + Math.sin(tl * .8) * .3, 3.9, 10.2], [0, 3.1, -.6]);
      world.position.z = -((tl * 3.2) % 7);   // hero walks toward camera, so the street slides away from it
      H.reset(); walk(H, t); H.face(faceAt(p.faces, t, 'neutral'));
      others.forEach((o, i) => { o.reset(); walk(o, t + i * .4); o.armR.s.rotation.x = -1.3; o.armR.el.rotation.x = -.4; o.face('happy'); o.head.rotation.y = i ? .3 : -.3; });
      const sb = ease(seg(t, at(p.billAt), at(p.billAt) + .3));
      b.visible = sb > 0; if (sb > 0) { H.armR.s.rotation.x = -2.6 * sb; H.armR.el.rotation.x = -.3; b.position.set(.9, 3.5 + sb * .6, .9); b.rotation.set(0, -.2, Math.sin(t * 6) * .08); }
    },
  };
}

// ---------------- sandwich kiosk: awning, sign, vendor; hero pays and gets a sandwich at buyAt ----------------
function shop(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#b8a6ff');
  K.lights(scene, { hemi: 1.7, sunI: 1.4, dir: [5, 10, 8] });
  box(30, .3, 20, p.floor || '#e9e4ff', 0, -.15, 4, scene);
  const k0 = new THREE.Group(); k0.position.set(-1.4, 0, -1.2); scene.add(k0);
  box(4.4, 2.0, 1.6, '#ffffff', 0, 1.0, 0, k0); box(4.6, .2, 1.8, '#f4b183', 0, 2.05, 0, k0);
  for (const x of [-2.1, 2.1]) box(.25, 3.6, .25, '#ffffff', x, 3.8, -.6, k0);
  const aw = K.canvasTex(256, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#ff4d6d'; g.fillRect(i * 32, 0, 32, 64); } });
  const awn = new THREE.Mesh(new THREE.BoxGeometry(4.8, .2, 2.2), new THREE.MeshLambertMaterial({ map: aw })); awn.position.set(0, 5.6, .2); awn.rotation.x = .25; k0.add(awn);
  const signT = K.canvasTex(512, 160, (g, W, Hh) => { g.fillStyle = '#ffd23f'; K.rrect(g, 0, 0, W, Hh, 30); g.fill(); g.fillStyle = '#1d1d1d'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, p.sign || 'PANINI', 460, 110, 900); g.fillText(p.sign || 'PANINI', W / 2, Hh / 2 + 6); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), new THREE.MeshBasicMaterial({ map: signT, transparent: true })); sign.position.set(0, 6.6, .6); k0.add(sign);
  for (let i = 0; i < 3; i++) { const sw = new THREE.Group(); box(.9, .2, .6, '#e2b36b', 0, 0, 0, sw); box(.95, .08, .62, '#5ccf55', 0, .13, 0, sw); box(.9, .2, .6, '#e2b36b', 0, .26, 0, sw); sw.position.set(-1.2 + i * 1.2, 2.3, .3); k0.add(sw); }
  const V = friend(ctx); V.root.position.set(-1.4, .3, -2.2); scene.add(V.root);
  const H = hero(ctx); H.root.position.set(1.5, 0, 1.1); H.root.rotation.y = -.9; scene.add(H.root);
  const sand = new THREE.Group(); box(.8, .2, .55, '#e2b36b', 0, 0, 0, sand); box(.85, .08, .58, '#5ccf55', 0, .13, 0, sand); box(.8, .2, .55, '#e2b36b', 0, .26, 0, sand); sand.visible = false; H.armL.hand.add(sand); sand.position.set(0, -.25, .35);
  const b = bill('10€'); b.scale.setScalar(.6); H.armR.hand.add(b); b.position.set(0, -.3, .4);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([1.4, 4.8, 13.5], [1.1, 4.6, 12.5], k), [-.2, 3.8, -.8]);
      H.reset(); idle(H, t); V.reset(); idle(V, t + 1, .6); V.face('happy');
      const buy = at(p.buyAt), pay = ease(seg(t, buy - .5, buy - .2)), got = t >= buy;
      b.visible = !got; H.armR.s.rotation.x = -1.3 * pay * (got ? 0 : 1);
      sand.visible = got; H.armL.s.rotation.x = got ? -1.6 : 0;
      const turn = ease(seg(t, at(p.turn, buy), at(p.turn, buy) + .3)); H.head.rotation.y = .9 * turn;
      H.face(faceAt(p.faces, t, 'neutral'));
    },
  };
}

// ---------------- bank: hero walks up to a bank building; sign over the door ----------------
function bank(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#a99bff');
  K.lights(scene, { hemi: 1.8, sunI: 1.3, dir: [4, 10, 8] });
  box(40, .3, 30, '#f5f2ff', 0, -.15, 0, scene);
  const b = new THREE.Group(); b.position.set(1.2, 0, -3); scene.add(b);
  box(7, .5, 4, '#e8e4f7', 0, .25, 0, b); box(6.4, 4.2, 3.4, '#ffffff', 0, 2.6, -.2, b);
  for (let i = 0; i < 4; i++) box(.55, 4, .55, '#f0edfa', -2.4 + i * 1.6, 2.6, 1.6, b);
  box(7.2, .6, 4, '#ffd36b', 0, 4.95, 0, b); box(5, 1.1, 3.6, '#ffd36b', 0, 5.7, 0, b);
  const sT = K.canvasTex(512, 128, (g, W, Hh) => { g.fillStyle = '#ffd36b'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#1d1d1d'; g.font = '900 96px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.sign || 'BANCA', W / 2, Hh / 2 + 6); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: sT })); sg.position.set(0, 5.72, 1.82); b.add(sg);
  box(1.6, 2.6, .2, '#5b4bd6', 0, 1.8, 1.45, b);
  const H = hero(ctx); scene.add(H.root);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([0, 5, 17], [0, 4.6, 14.5], k), [.4, 3.2, -1]);
      const arr = at(p.arriveAt, p._t0 + 1.2), w = seg(t, p._t0, arr);
      H.reset(); H.root.position.set(-4 + w * 4.2, 0, .8); H.root.rotation.y = w < 1 ? 1.2 : 0;
      if (w < 1) walk(H, t); else { idle(H, t); H.armR.s.rotation.z = t > at(p.waveAt) ? 2.4 + Math.sin(t * 9) * .25 : 0; }
      H.face(faceAt(p.faces, t, 'happy'));
    },
  };
}

// ---------------- pizzeria: brick wall, glowing oven, checked table, margherita; card/POS at cardAt ----------------
function pizza(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.wall || '#c8553d');
  K.lights(scene, { sky: '#fff1dc', ground: '#8a3b2a', hemi: 1.5, sunI: 1.3, dir: [4, 10, 9] });
  const brick = K.canvasTex(512, 512, (g, W) => { g.fillStyle = '#d9c3a5'; g.fillRect(0, 0, W, W); for (let r = 0; r < 16; r++) for (let c = 0; c < 5; c++) { g.fillStyle = ['#c8553d', '#b84a34', '#d4644a'][(r * 3 + c) % 3]; g.fillRect(c * 104 + (r % 2 ? 52 : 0) - 52 + 4, r * 32 + 4, 96, 26); } });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(4, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshLambertMaterial({ map: brick })); wall.position.set(0, 9, -3); scene.add(wall);
  box(30, .3, 20, '#6b3e26', 0, -.15, 6, scene);
  // oven
  const ov = new THREE.Group(); ov.position.set(-2.6, 0, -1.8); scene.add(ov);
  box(3.4, 2.2, 2.4, '#8a8a8a', 0, 1.1, 0, ov);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), K.mat('#e8d5b9')); dome.position.y = 2.2; dome.scale.set(1, .8, .75); dome.castShadow = true; ov.add(dome);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(.6, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff9d2e' })); mouth.position.set(0, 2.25, 1.3); ov.add(mouth);
  box(.5, 1.6, .5, '#8a8a8a', .6, 3.6, -.3, ov);
  const signT = K.canvasTex(512, 160, (g, W, Hh) => { g.fillStyle = '#1f8f4a'; K.rrect(g, 0, 0, W, Hh, 30); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, p.sign || 'PIZZERIA', 460, 100, 900); g.fillText(p.sign || 'PIZZERIA', W / 2, Hh / 2 + 6); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), new THREE.MeshBasicMaterial({ map: signT, transparent: true })); sign.position.set(.9, 6.3, -2.9); scene.add(sign);
  // table + hero
  const cloth = K.canvasTex(256, 256, (g, W) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#ffffff' : '#e8384f'; g.fillRect(i * 32, j * 32, 32, 32); } });
  const top = new THREE.Mesh(K.geo(4.2, .2, 2.4), new THREE.MeshLambertMaterial({ map: cloth })); top.position.set(.6, 2.1, 1.2); top.receiveShadow = top.castShadow = true; scene.add(top);
  box(.25, 2, .25, '#5a3a24', -1.2, 1, 1.2, scene); box(.25, 2, .25, '#5a3a24', 2.4, 1, 1.2, scene);
  const H = hero(ctx).sit(); H.root.position.set(.6, .1, -.3); scene.add(H.root); box(1.6, .3, 1.4, '#5a3a24', .6, 1.05, -.4, scene);
  const pzT = K.canvasTex(256, 256, (g, W) => { g.fillStyle = '#e2a65b'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = '#d63b2a'; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fill();
    g.fillStyle = '#fff6e0'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(128 + Math.cos(i * 2.4) * 60 * (i % 3 ? 1 : .4), 128 + Math.sin(i * 2.4) * 60 * (i % 3 ? 1 : .4), 20, 0, 7); g.fill(); }
    g.fillStyle = '#2f9e44'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(128 + Math.cos(i * 1.3 + 1) * 45, 128 + Math.sin(i * 1.3 + 1) * 45, 12, 7, i, 0, 7); g.fill(); } });
  const pz = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .08, 40), [K.mat('#e2a65b'), new THREE.MeshLambertMaterial({ map: pzT }), K.mat('#e2a65b')]); pz.position.set(.6, 2.26, 1.4); pz.castShadow = true; scene.add(pz);
  const pos = new THREE.Group(); box(.7, .25, 1.0, '#222', 0, 0, 0, pos); const scr = box(.55, .05, .4, '#33c26b', 0, .14, -.2, pos); pos.position.set(2.0, 2.35, 1.6); pos.rotation.y = -.4; pos.visible = false; scene.add(pos);
  const cd = K.card('#141414', '#ffd23f'); cd.visible = false; scene.add(cd);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, lerp3([1.0, 5.6, 12.8], [.8, 5.3, 11.6], k), [.3, 4.0, 0]);
      H.reset(); H.sit(); idle(H, t); H.face(faceAt(p.faces, t, 'happy'));
      mouth.material.color.setHSL(.07 + Math.sin(t * 9) * .01, 1, .55 + Math.sin(t * 13) * .05);
      const c0 = at(p.cardAt), c = ease(seg(t, c0, c0 + .35)); pos.visible = cd.visible = c > 0;
      if (c > 0) { H.armR.s.rotation.x = -1.3 * c; cd.position.set(1.6 + c * .3, 2.7 + (1 - c) * .5, 1.6); cd.rotation.set(-1.2, -.4, 0); scr.material = K.mat(t > c0 + .5 ? '#33c26b' : '#ffd23f'); }
      const bite = at(p.biteAt); if (t > bite) { const b = Math.sin((t - bite) * 5) * .5 + .5; H.armL.s.rotation.x = -1.6 - b * .4; }
      pz.rotation.y = t * .1;
    },
  };
}

// ---------------- mystery: spotlit stage, wobbling gift box, "?" floating, countdown clock; bursts open at openAt ----------------
function mystery(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#0d0a24');
  K.lights(scene, { sky: '#b9b0ff', ground: '#120c30', hemi: .7, sunI: .5, dir: [2, 10, 6] });
  const spot = new THREE.SpotLight('#fff3d0', 260, 30, .5, .5); spot.position.set(0, 14, 4); spot.target.position.set(0, 0, 0); spot.castShadow = true; scene.add(spot, spot.target);
  box(30, .3, 20, '#1b1540', 0, -.15, 0, scene);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, .4, 48), K.mat('#2d2466')); disc.position.y = .2; disc.receiveShadow = true; scene.add(disc);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 14, 40, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3d0', transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false })); beam.position.set(0, 7.2, 0); scene.add(beam);
  const gift = new THREE.Group(); gift.position.y = .4; scene.add(gift);
  const gc = p.giftColor || '#e8384f', rc = p.ribbon || '#ffd23f';
  box(2.8, 2.4, 2.8, gc, 0, 1.2, 0, gift); box(.5, 2.42, 2.82, rc, 0, 1.2, 0, gift); box(2.82, 2.42, .5, rc, 0, 1.2, 0, gift);
  const lid = new THREE.Group(); lid.position.y = 2.4; gift.add(lid);
  box(3.1, .55, 3.1, gc, 0, .27, 0, lid); box(.52, .57, 3.12, rc, 0, .27, 0, lid); box(3.12, .57, .52, rc, 0, .27, 0, lid);
  const bow1 = box(.9, .5, .3, rc, -.45, .8, 0, lid); bow1.rotation.z = .5; const bow2 = box(.9, .5, .3, rc, .45, .8, 0, lid); bow2.rotation.z = -.5;
  const qT = K.canvasTex(128, 128, g => { g.fillStyle = '#ffd23f'; g.font = '900 120px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70); });
  const qs = Array.from({ length: 5 }, (_, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: qT, transparent: true })); sp.scale.setScalar(.9 + (i % 2) * .4); scene.add(sp); return sp; });
  const clockT = K.canvasTex(512, 160, (g, W, Hh, t = 0) => {
    g.fillStyle = '#05040f'; K.rrect(g, 0, 0, W, Hh, 24); g.fill(); g.strokeStyle = '#ff2d55'; g.lineWidth = 6; K.rrect(g, 6, 6, W - 12, Hh - 12, 20); g.stroke();
    const left = Math.max(0, (p.clockFrom ?? 86399) - Math.floor(t * (p.clockSpeed ?? 1))); const h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60), sec = left % 60;
    g.fillStyle = '#ff2d55'; g.font = '900 100px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, W / 2, Hh / 2 + 6); });
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), new THREE.MeshBasicMaterial({ map: clockT })); clock.position.set(-1.5, 4.9, -.5); clock.scale.setScalar(.6); clock.rotation.y = .25; scene.add(clock); clock.visible = p.clock !== false;
  const H = hero(ctx); H.root.position.set(2.5, .4, 1.2); H.root.rotation.y = -.5; scene.add(H.root);
  const prize = K.coin(p.prize || '80', -Math.PI / 2); prize.scale.setScalar(0); prize.position.set(0, 2.8, 0); scene.add(prize);
  const conf = Array.from({ length: 60 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.18, .32), new THREE.MeshBasicMaterial({ color: ['#ffd23f', '#ff3d8b', '#33c26b', '#3a6cff', '#ffffff'][i % 5], side: THREE.DoubleSide })); m.visible = false; scene.add(m); return m; });
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      const tl = t - p._t0, o = at(p.openAt), op = seg(t, o, o + .5);
      lookCam(camera, [Math.sin(tl * .6) * .5, 5.0, 15.5 - ease(seg(t, p._t0, p._t1)) * 1.5], [0, 3.4 + (p.camLift || 0), 0]);
      const shake = t < o ? Math.sin(t * 22) * .05 * (1 + Math.sin(t * 1.3)) : 0; gift.rotation.z = shake; gift.position.x = shake * 2;
      lid.position.y = 2.4 + op * 6; lid.rotation.x = op * 2.2; lid.position.z = op * -1.5; lid.visible = op < .98;
      const pr = pop(seg(t, o + .1, o + .6)); prize.scale.setScalar(pr * 1.4); prize.position.y = 2.8 + pr * 2.2; prize.rotation.y = t * 2.5;
      qs.forEach((q, i) => { const a = i / qs.length * 6.283 + t * .8; q.position.set(Math.cos(a) * 3.2, 4.2 + Math.sin(t * 2 + i) * .6, Math.sin(a) * 1.4); q.visible = t < o; });
      conf.forEach((c, i) => { const d = t - o; c.visible = d > 0 && d < 3; if (!c.visible) return; const a = i * 2.39, v = 4 + (i % 7); c.position.set(Math.cos(a) * d * (1 + i % 3) * .9, 2.8 + v * d - 6 * d * d, Math.sin(a) * d); c.rotation.set(d * 6 + i, d * 4, i); });
      clockT.redraw(tl);
      H.reset(); idle(H, t); H.face(t >= o ? 'stars' : faceAt(p.faces, t, 'surprised'));
      const peek = Math.sin(tl * 1.6) * .5 + .5; H.head.rotation.z = t < o ? .25 * peek : 0; H.torso.rotation.z = t < o ? .1 * peek : 0;
      if (t >= o) { H.armL.s.rotation.z = -2.5; H.armR.s.rotation.z = 2.5; }
    },
    overlay2d(g, t) { drawTitles(g, t, p); },
  };
}

// ---------------- guess: cards flip up one by one and get a red X (or a green check) ----------------
// p.cards: [{text, at, ok}]
function guess(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#ffd23f');
  K.lights(scene, { hemi: 1.7, sunI: 1.3, dir: [3, 8, 10] });
  box(30, 20, .5, p.bg || '#ffd23f', 0, 10, -3, scene); box(30, .3, 20, p.floor || '#f4b400', 0, -.15, 4, scene);
  const H = hero(ctx); H.root.position.set(0, 0, -1.2); scene.add(H.root);
  const n = (p.cards || []).length;
  const cards = (p.cards || []).map((c, i) => {
    const front = K.canvasTex(400, 260, (g, W, Hh, mark = 0) => {
      g.fillStyle = '#fff'; K.rrect(g, 0, 0, W, Hh, 26); g.fill(); g.fillStyle = '#1d1d1d'; g.textAlign = 'center'; g.textBaseline = 'middle';
      K.fitText(g, c.text, W - 60, 64, 900); g.fillText(c.text, W / 2, Hh / 2 + 4);
      if (mark > 0) { g.save(); g.globalAlpha = Math.min(1, mark * 1.5); g.lineCap = 'round'; g.lineWidth = 26;
        if (c.ok) { g.strokeStyle = '#33c26b'; g.beginPath(); g.moveTo(W * .3, Hh * .55); g.lineTo(W * .45, Hh * .75); g.lineTo(W * .75, Hh * .25); g.stroke(); }
        else { g.strokeStyle = '#ff2d2d'; const k = mark; g.beginPath(); g.moveTo(40, 30); g.lineTo(40 + (W - 80) * k, 30 + (Hh - 60) * k); g.moveTo(W - 40, 30); g.lineTo(W - 40 - (W - 80) * k, 30 + (Hh - 60) * k); g.stroke(); }
        g.restore(); } });
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.46, .08), [K.mat('#ddd'), K.mat('#ddd'), K.mat('#ddd'), K.mat('#ddd'), new THREE.MeshLambertMaterial({ map: front }), K.mat('#3a6cff')]);
    m.castShadow = true; scene.add(m); return { m, front, c, i, x: n === 1 ? 0 : (i % 2 ? 1.2 : -1.2), y: 6.7 - Math.floor(i / 2) * 1.7 };
  });
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      lookCam(camera, [0, 4.8, 13.5 - ease(seg(t, p._t0, p._t1)) * 1.0], [0, 4.4, 0]);
      H.reset(); idle(H, t);
      let last = null;
      cards.forEach(({ m, front, c, x, y }) => {
        const a = at(c.at), f = ease(seg(t, a, a + .3)), mk = seg(t, a + .3, a + .6);
        m.visible = f > 0; m.position.set(x, y + (1 - f) * -2, .8); m.rotation.y = (1 - f) * Math.PI; m.rotation.z = (c.i % 2 ? .05 : -.05);
        front.redraw(mk); if (t >= a) last = c;
      });
      const shakeNo = last && !last.ok && t - at(last.at) < 1.2; H.head.rotation.y = shakeNo ? Math.sin(t * 18) * .35 : 0;
      H.face(last ? (last.ok ? 'happy' : 'bored') : 'neutral');
      if (last && last.ok) { H.armR.s.rotation.z = 2.3; H.armR.el.rotation.z = .4; }
    },
  };
}

// ---------------- checklist: giant clipboard, steps tick at their times; hero with a big pencil ----------------
// p.steps: [{text, at}]
function checklist(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#7ee0c3');
  K.lights(scene, { hemi: 1.7, sunI: 1.2, dir: [4, 8, 10] });
  box(30, 20, .5, p.bg || '#7ee0c3', 0, 10, -3, scene); box(30, .3, 20, p.floor || '#4fbf9f', 0, -.15, 4, scene);
  const steps = p.steps || [];
  const tex = K.canvasTex(600, 820, (g, W, Hh, t = 0) => {
    g.fillStyle = '#fffdf5'; K.rrect(g, 0, 0, W, Hh, 30); g.fill();
    g.fillStyle = '#1d1d1d'; g.textAlign = 'center'; g.textBaseline = 'middle'; K.fitText(g, p.head || 'COSA FARE', W - 80, 62, 900); g.fillText(p.head || 'COSA FARE', W / 2, 90);
    steps.forEach((s, i) => {
      const y = 210 + i * (560 / Math.max(1, steps.length)), k = clamp((t - at(s.at)) / .3);
      g.strokeStyle = '#1d1d1d'; g.lineWidth = 6; K.rrect(g, 40, y - 40, 80, 80, 14); g.stroke();
      if (k > 0) { g.strokeStyle = '#1f8f4a'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(55, y); g.lineTo(55 + 20 * Math.min(1, k * 2), y + 20 * Math.min(1, k * 2)); if (k > .5) g.lineTo(75 + 40 * (k - .5) * 2, y + 20 - 50 * (k - .5) * 2); g.stroke(); }
      g.fillStyle = k > 0 ? '#1d1d1d' : '#8a8a8a'; g.textAlign = 'left'; K.fitText(g, s.text, W - 190, 46, 900); g.fillText(s.text, 150, y - 4);
      if (s.sub) { g.fillStyle = '#666'; g.font = '800 30px Nunito'; g.fillText(s.sub, 150, y + 40); }
    }); });
  const board = new THREE.Group(); board.position.set(-.7, 4.7, -1.2); board.rotation.z = .04; board.scale.setScalar(.85); scene.add(board);
  box(4.6, 6.1, .2, '#a0663a', 0, 0, 0, board); box(1.6, .5, .3, '#c0c0c0', 0, 3.0, .12, board);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.7), new THREE.MeshBasicMaterial({ map: tex })); paper.position.z = .11; board.add(paper);
  const H = hero(ctx); H.root.position.set(1.8, 0, .6); H.root.rotation.y = -.6; scene.add(H.root);
  const pencil = new THREE.Group(); box(.25, 1.6, .25, '#ffd23f', 0, 0, 0, pencil); box(.26, .3, .26, '#ff8fb1', 0, .9, 0, pencil); box(.15, .3, .15, '#3a2a1a', 0, -.9, 0, pencil); H.armR.hand.add(pencil); pencil.position.set(0, -.4, .3);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      lookCam(camera, [.4, 4.6, 13.2 - ease(seg(t, p._t0, p._t1)) * 1.0], [.1, 4.1, -.5]);
      tex.redraw(t); H.reset(); idle(H, t);
      let near = false; for (const s of steps) if (t > at(s.at) - .2 && t < at(s.at) + .5) near = true;
      H.armR.s.rotation.x = near ? -1.6 + Math.sin(t * 25) * .1 : -.6; H.armR.s.rotation.z = near ? .6 : .2;
      H.face(faceAt(p.faces, t, 'happy'));
    },
  };
}

// ---------------- vault: round vault door swings open (openAt), gold light, coin stacks rise; closes at closeAt ----------------
function vault(p, ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#2b2f3a');
  K.lights(scene, { hemi: 1.1, sunI: 1.0, dir: [4, 9, 10] });
  box(30, 20, .5, '#3a3f4d', 0, 10, -3, scene); box(30, .3, 20, '#22252e', 0, -.15, 4, scene);
  box(8.4, 8.4, .6, '#5b6170', 0, 4.6, -2.6, scene);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ color: '#ffcf4a' })); inside.position.set(0, 4.6, -2.25); scene.add(inside);
  const stacks = Array.from({ length: 7 }, (_, i) => { const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .12, 20), K.mat('#e2a33a')); c.position.y = k * .13; g.add(c); } g.position.set(-1.8 + (i % 4) * 1.2, 2.2 + Math.floor(i / 4) * 1.4, -2.1); scene.add(g); return g; });
  const hinge = new THREE.Group(); hinge.position.set(-3.3, 4.6, -1.9); scene.add(hinge);
  const door = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, .7, 48), K.mat('#a8b0c0')); door.rotation.x = Math.PI / 2; door.position.x = 3.3; door.castShadow = true; hinge.add(door);
  const wheel = new THREE.Group(); wheel.position.set(3.3, 0, .45); hinge.add(wheel);
  for (let i = 0; i < 3; i++) { const sp = box(3.0, .22, .22, '#6b7385', 0, 0, 0, wheel); sp.rotation.z = i * Math.PI / 3; }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .3, 24), K.mat('#6b7385')); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  const H = hero(ctx); H.root.position.set(1.9, 0, 2.2); H.root.rotation.y = -.5; scene.add(H.root);
  const camera = cam(40);
  return {
    scene, camera, update(t) {
      lookCam(camera, [.6, 4.6, 19.5 - ease(seg(t, p._t0, p._t1)) * 1.4], [.3, 4.0, -1]);
      const o = at(p.openAt), c = at(p.closeAt), spin = seg(t, o - .6, o), op = ease(seg(t, o, o + .7)) * (1 - ease(seg(t, c, c + .5)));
      wheel.rotation.z = spin * Math.PI * 2; hinge.rotation.y = -op * 1.9;
      stacks.forEach((g, i) => { const k = ease(seg(t, o + .3 + i * .08, o + .7 + i * .08)); g.scale.set(1, Math.max(.01, k), 1); });
      inside.material.color.setHSL(.12, 1, .45 + op * .15);
      H.reset(); idle(H, t); H.face(op > .5 ? 'stars' : faceAt(p.faces, t, 'neutral'));
      if (op > .5) { H.armL.s.rotation.z = -2.4; H.armR.s.rotation.z = 2.4; }
    },
  };
}

// ---------------- explain: dark stage, gold accent, diagram modes, live labels/numbers, small reacting mascot ----------------
// p.show: 'paradox' | 'ads' | 'referral' | 'steps' | 'timeline'
// p.gestures: [{at, g: 'point'|'think'|'shrug'|'cheer'|'wave'}]; labels drawn crisp in 2D, anchored to 3D points
function explain(p, ctx) {
  const GOLD = '#ffc83d', scene = new THREE.Scene(); scene.background = new THREE.Color(p.bg || '#0b0b14');
  K.lights(scene, { sky: '#d9d4ff', ground: '#1a1a2a', hemi: 1.4, sunI: 1.0, dir: [3, 10, 8] });
  box(40, .2, 40, '#12121c', 0, -.1, 0, scene);
  for (let i = -6; i <= 6; i++) { box(.02, .01, 30, '#2a2a3a', i * 2, .01, -4, scene); box(30, .01, .02, '#2a2a3a', 0, .01, i * 2 - 4, scene); }
  const glowM = c => new THREE.MeshBasicMaterial({ color: c });
  const anchors = {}, labels = [];
  const coinStream = (from, to, t0, n = 12) => { const cs = Array.from({ length: n }, () => { const c = K.coin('€', -Math.PI / 2); c.scale.setScalar(.32); c.visible = false; scene.add(c); return c; });
    return t => cs.forEach((c, i) => { const d = (t - t0 - i * .12); const u = d > 0 ? (d % 1.4) / 1.4 : -1; c.visible = u >= 0 && t0 < 1e8; if (!c.visible) return;
      c.position.set(from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u + Math.sin(u * Math.PI) * 1.6, from[2] + (to[2] - from[2]) * u); c.rotation.y = t * 6 + i; }); };
  const bank = (x, y, z, sc = 1) => { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(sc); scene.add(g);
    box(3, .3, 2, '#1d1d2c', 0, .15, 0, g); for (let i = 0; i < 4; i++) box(.3, 2, .3, '#2a2a40', -1.1 + i * .73, 1.3, .7, g);
    box(3.3, .35, 2.2, '#1d1d2c', 0, 2.45, 0, g); const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1, 4), K.mat('#1d1d2c')); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .6); roof.position.y = 3.1; g.add(roof);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(3.34, .06, 2.24), glowM(GOLD)); edge.position.y = 2.64; g.add(edge); return g; };
  const updaters = [];
  if (p.show === 'paradox') {
    bank(-1.0, 0, -1, .72); anchors.tag = [-1.0, 3.4, -1]; labels.push({ at: 'tag', text: p.tagText || 'CONTO: 0€', from: p._t0 + .2 });
    const ph = new THREE.Group(); box(1.1, 2, .12, '#1d1d2c', 0, 0, 0, ph); const scr = new THREE.Mesh(new THREE.PlaneGeometry(.95, 1.8), glowM('#1a1a28')); scr.position.z = .07; ph.add(scr); ph.position.set(1.35, 2.0, 0); ph.rotation.y = -.3; scene.add(ph);
    anchors.phone = [1.35, 3.4, 0]; labels.push({ at: 'phone', text: p.gainText || '+50€', from: at(p.flowAt), color: '#33c26b', big: true });
    updaters.push(coinStream([-1.0, 2.0, -1], [1.35, 2.0, 0], at(p.flowAt)), t => { scr.material.color.set(t > at(p.flowAt) + .6 ? '#1f8f4a' : '#1a1a28'); });
  }
  if (p.show === 'ads') {
    bank(0, 0, -2.6, .62);
    const ads = [[-1.55, 0, .4, 'TV'], [0, 0, 1.4, 'CARTELLONI'], [1.55, 0, .4, 'SOCIAL']].map(([x, y, z, name], i) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(.75); scene.add(g);
      if (i === 0) { box(1.6, 1.1, .2, '#1d1d2c', 0, 1.6, 0, g); box(.2, 1, .2, '#2a2a40', 0, .5, 0, g); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .9), glowM('#2f6bff')); s2.position.set(0, 1.6, .11); g.add(s2); }
      if (i === 1) { box(2, 1.2, .15, '#1d1d2c', 0, 2.2, 0, g); box(.15, 1.6, .15, '#2a2a40', -.6, .8, 0, g); box(.15, 1.6, .15, '#2a2a40', .6, .8, 0, g); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), glowM('#ff3d8b')); s2.position.set(0, 2.2, .09); g.add(s2); }
      if (i === 2) { box(.9, 1.6, .12, '#1d1d2c', 0, 1.2, 0, g); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(.78, 1.4), glowM('#ffc83d')); s2.position.set(0, 1.2, .07); g.add(s2); }
      anchors['ad' + i] = [x, i === 1 ? 2.6 : 2.1, z]; labels.push({ at: 'ad' + i, text: name, from: at(p.adsAt, p._t0) + i * .4, small: true });
      updaters.push(coinStream([0, 2, -2.6], [x, 1.6, z], at(p.adsAt, p._t0) + i * .4, 6)); return g; });
  }
  if (p.show === 'referral') {
    bank(0, 0, -3, .7);
    const A = hero(ctx), B = friend(ctx); A.root.position.set(-1.1, 0, .8); B.root.position.set(1.1, 0, .8); A.root.scale.setScalar(.72); B.root.scale.setScalar(.72); A.root.rotation.y = .3; B.root.rotation.y = -.3; scene.add(A.root, B.root);
    const link = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.2, 8), glowM(GOLD)); link.rotation.z = Math.PI / 2; link.position.set(0, 2.0, .8); link.scale.x = .7; scene.add(link);
    const bb = new THREE.Group(); box(1.8, 1.1, .15, '#1d1d2c', 0, 0, 0, bb); const bs = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .9), glowM('#ff3d8b')); bs.position.z = .09; bb.add(bs); bb.position.set(-1.2, 5.0, -1.5); bb.scale.setScalar(.8); scene.add(bb);
    const xA = new THREE.Mesh(new THREE.BoxGeometry(2.0, .14, .05), glowM('#ff2d2d')), xB = xA.clone(); xA.rotation.z = .5; xB.rotation.z = -.5; xA.position.set(-1.2, 5.0, -1.35); xA.scale.y = .8; xB.position.copy(xA.position); scene.add(xA, xB);
    anchors.a = [-1.1, 3.0, .8]; anchors.b = [1.1, 3.0, .8]; anchors.bb = [-1.2, 5.8, -1.5];
    labels.push({ at: 'bb', text: 'PUBBLICITÀ', from: p._t0 + .1, small: true }, { at: 'a', text: p.aText || 'TU', from: at(p.flowAt), color: '#33c26b' }, { at: 'b', text: p.bText || 'CHI TI INVITA', from: at(p.flowAt) + .3, color: '#33c26b' });
    const s1 = coinStream([0, 2, -3], [-1.1, 2.0, .8], at(p.flowAt), 6), s2 = coinStream([0, 2, -3], [1.1, 2.0, .8], at(p.flowAt) + .3, 6);
    updaters.push(s1, s2, t => { const l = ease(seg(t, at(p.linkAt), at(p.linkAt) + .4)); link.scale.set(1, Math.max(.001, l), 1); const c = seg(t, at(p.crossAt), at(p.crossAt) + .3); xA.scale.set(Math.max(.001, c), 1, 1); xB.scale.set(Math.max(.001, c), 1, 1);
      A.reset(); B.reset(); idle(A, t); idle(B, t + 1); A.face(t > at(p.flowAt) ? 'happy' : 'neutral'); B.face(t > at(p.flowAt) ? 'wink' : 'neutral'); });
  }
  if (p.show === 'steps' || p.show === 'timeline') {
    const cd = new THREE.Group(); const cm = new THREE.Mesh(K.geo(3.2, 2, .12), K.mat('#1d1d2c')); cd.add(cm); const chip = new THREE.Mesh(new THREE.BoxGeometry(.5, .38, .05), glowM(GOLD)); chip.position.set(-.9, .25, .08); cd.add(chip);
    const st = new THREE.Mesh(new THREE.BoxGeometry(3.2, .3, .05), glowM('#2f6bff')); st.position.set(0, -.55, .08); cd.add(st); cd.position.set(0, p.show === 'steps' ? .9 : 4.6, -1); cd.scale.setScalar(.8); scene.add(cd);
    updaters.push(t => { cd.rotation.y = Math.sin(t * .8) * .5; cd.rotation.x = -.15; });
  }
  // mascot: small, bottom-right corner, reacting
  const camera = cam(40); scene.add(camera);
  const M = hero(ctx); M.root.scale.setScalar(.2); M.root.position.set(.74, -1.62, -5); M.root.rotation.y = -.5; camera.add(M.root);   // rides with the camera: always bottom-right
  const proj = a => { const v = new THREE.Vector3(...a).project(camera); return [(v.x + 1) / 2 * 1080, (1 - v.y) / 2 * 1920]; };
  return {
    scene, camera, update(t) {
      const k = ease(seg(t, p._t0, p._t1)); lookCam(camera, [Math.sin((t - p._t0) * .4) * .3, 4.4, 11.5 - k * 1.0], [0, 3.0, 0]);
      updaters.forEach(f => f(t));
      M.reset(); idle(M, t); let gst = null; for (const x of p.gestures || []) if (t >= at(x.at, -1)) gst = x.g;
      if (gst === 'point') { M.armR.s.rotation.x = -1.5; M.armR.s.rotation.z = -.6; M.face('neutral'); }
      else if (gst === 'think') { M.armR.s.rotation.x = -2.2; M.armR.el.rotation.x = -1.6; M.face('bored'); M.head.rotation.z = .12; }
      else if (gst === 'shrug') { M.armL.s.rotation.z = -.8; M.armR.s.rotation.z = .8; M.armL.el.rotation.x = M.armR.el.rotation.x = -1.2; M.face('surprised'); }
      else if (gst === 'cheer') { M.armL.s.rotation.z = -2.5; M.armR.s.rotation.z = 2.5; M.face('stars'); }
      else if (gst === 'wave') { M.armR.s.rotation.z = 2.4 + Math.sin(t * 9) * .3; M.face('happy'); }
      else M.face('neutral');
    },
    overlay2d(g, t) {
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const L of labels) { const a = seg(t, at(L.from), at(L.from) + .25); if (a <= 0) continue; const [x, y] = proj(anchors[L.at]); g.globalAlpha = a;
        g.font = `900 ${L.big ? 84 : L.small ? 34 : 50}px Nunito`; const w = g.measureText(L.text).width + 34, h = L.big ? 104 : L.small ? 50 : 70;
        g.fillStyle = 'rgba(10,10,20,.85)'; rrect2(g, x - w / 2, y - h / 2, w, h, 14); g.fill(); g.strokeStyle = L.color || GOLD; g.lineWidth = 3; g.stroke(); g.fillStyle = L.color || GOLD; g.fillText(L.text, x, y + 3); }
      if (p.show === 'ads' && p.count) { const c0 = at(p.countAt), u = ease(seg(t, c0, c0 + 1.6)); if (t >= c0) { g.globalAlpha = 1; const v = Math.round((p.countFrom || 0) + (p.count - (p.countFrom || 0)) * u);
        g.font = '900 150px Nunito'; g.fillStyle = GOLD; g.fillText(`${p.prefix || ''}${v}${p.suffix || ''}`, 540, 560); g.font = '800 40px Nunito'; g.fillStyle = '#e9e7f5'; g.fillText(p.countLabel || '', 540, 665);
        if (p.source) { g.font = '700 28px Nunito'; g.fillStyle = '#8a87a8'; g.fillText(p.source, 540, 720); } } }
      if (p.show === 'steps') (p.steps || []).forEach((s, i) => { const a = seg(t, at(s.at), at(s.at) + .25); if (a <= 0) return; g.globalAlpha = a; const y = 560 + i * 130;
        g.fillStyle = 'rgba(20,20,34,.92)'; rrect2(g, 120, y - 50, 840, 100, 20); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 3; g.stroke();
        g.fillStyle = GOLD; g.beginPath(); g.arc(180, y, 30, 0, 7); g.fill(); g.fillStyle = '#0b0b14'; g.font = '900 34px Nunito'; g.fillText(String(i + 1), 180, y + 2);
        g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '900 40px Nunito'; g.fillText(s.text, 235, y - (s.sub ? 14 : 0)); if (s.sub) { g.fillStyle = '#a9a6c8'; g.font = '800 28px Nunito'; g.fillText(s.sub, 235, y + 26); } g.textAlign = 'center'; });
      if (p.show === 'timeline') { const a0 = at(p.barAt, p._t0), u = ease(seg(t, a0, a0 + 2)); g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,255,255,.12)'; rrect2(g, 140, 1000, 800, 40, 20); g.fill(); g.fillStyle = GOLD; rrect2(g, 140, 1000, 800 * u, 40, 20); g.fill();
        g.font = '800 34px Nunito'; g.fillStyle = '#e9e7f5'; g.fillText('oggi', 160, 1080); g.fillText(p.barEnd || '90 giorni lavorativi', 820, 1080);
        (p.chips || []).forEach((c, i) => { const a = seg(t, at(c.at), at(c.at) + .25); if (a <= 0) return; g.globalAlpha = a; g.font = '900 52px Nunito'; const w = g.measureText(c.text).width + 50, x = 540 + (i - ((p.chips.length - 1) / 2)) * 430;
          g.fillStyle = c.color || '#33c26b'; rrect2(g, x - w / 2, 1150, w, 96, 48); g.fill(); g.fillStyle = '#fff'; g.fillText(c.text, x, 1200); }); }
      g.restore();
    },
  };
}
function rrect2(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

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

export const SCENES = { city, room, park, phone, screen, end, portrait, desk, bigcal, hook, cinema, money, street, shop, bank, pizza, mystery, guess, checklist, vault, explain };
