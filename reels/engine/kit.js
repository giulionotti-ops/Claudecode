// Blocky 3D kit: characters, props and canvas textures. Everything is plain boxes with flat colours.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// Soft toy look: every box gets bevelled edges (thin slabs stay sharp).
export const geo = (w, h, d) => { const m = Math.min(w, h, d); return m < .12 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 3, Math.min(.22, m * .2)); };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = x => x * x * (3 - 2 * x);
export const easeOut = x => 1 - (1 - x) ** 3;
// overshoot pop 0..1 → scale (0 → 1.12 → 1)
export const pop = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;

const matCache = new Map();
export const mat = (color, opts = {}) => {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, ...opts }));
  return matCache.get(k);
};
export function box(w, h, d, color, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo(w, h, d), typeof color === 'string' || typeof color === 'number' ? mat(color) : color);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.redraw = (...a) => { g.clearRect(0, 0, w, h); draw(g, w, h, ...a); tex.needsUpdate = true; };
  tex.redraw(); tex.canvas2d = c;
  return tex;
}
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function fitText(g, text, maxW, size, weight = 900, family = 'Nunito') {
  let s = size; g.font = `${weight} ${s}px ${family}`;
  while (g.measureText(text).width > maxW && s > 8) { s -= 2; g.font = `${weight} ${s}px ${family}`; }
  return s;
}

// ---------- faces ----------
const FACES = {};
function drawFace(g, W, H, kind, skin) {
  g.fillStyle = skin; g.fillRect(0, 0, W, H);
  const eye = (x, y, lid = 0, closed = false) => {
    if (closed) { g.strokeStyle = '#2a1a12'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 16, y + 4); g.quadraticCurveTo(x, y - 10, x + 16, y + 4); g.stroke(); return; }
    g.fillStyle = '#1d1410'; rrect(g, x - 15, y - 22 + lid, 30, 44 - lid, 13); g.fill();
    if (lid < 20) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 5, y - 9 + lid * .5, 6, 0, 7); g.fill(); }
    if (lid) { g.fillStyle = skin; g.fillRect(x - 20, y - 30, 40, lid + 8); }
  };
  const brow = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#3b2416'; rrect(g, -22, -6, 44, 12, 6); g.fill(); g.restore(); };
  const blush = () => { g.fillStyle = 'rgba(255,110,120,.35)'; g.beginPath(); g.ellipse(58, 170, 24, 14, 0, 0, 7); g.ellipse(198, 170, 24, 14, 0, 0, 7); g.fill(); };
  const L = 90, R = 166, Y = 128;
  g.lineCap = 'round';
  if (kind === 'happy') {
    eye(L, Y); eye(R, Y); brow(L, 84, -.12); brow(R, 84, .12); blush();
    g.fillStyle = '#5a1f1f'; g.beginPath(); g.moveTo(98, 176); g.quadraticCurveTo(128, 224, 158, 176); g.closePath(); g.fill();
    g.fillStyle = '#ff8a8a'; g.beginPath(); g.ellipse(128, 198, 14, 8, 0, 0, 7); g.fill();
  } else if (kind === 'smug') {
    eye(L, Y, 18); eye(R, Y, 18); brow(L, 92, .08); brow(R, 88, -.18);
    g.strokeStyle = '#4a2418'; g.lineWidth = 8; g.beginPath(); g.moveTo(104, 186); g.quadraticCurveTo(136, 196, 158, 176); g.stroke();
  } else if (kind === 'wink') {
    eye(L, Y, 0, true); eye(R, Y); brow(L, 90, -.1); brow(R, 82, .1); blush();
    g.fillStyle = '#5a1f1f'; g.beginPath(); g.moveTo(100, 176); g.quadraticCurveTo(130, 214, 160, 176); g.closePath(); g.fill();
  } else if (kind === 'surprised') {
    eye(L, Y - 4); eye(R, Y - 4); brow(L, 74, -.08); brow(R, 74, .08);
    g.fillStyle = '#5a1f1f'; g.beginPath(); g.ellipse(128, 190, 13, 17, 0, 0, 7); g.fill();
  } else if (kind === 'bored') {
    eye(L, Y, 22); eye(R, Y, 22); brow(L, 94, 0); brow(R, 94, 0);
    g.strokeStyle = '#4a2418'; g.lineWidth = 8; g.beginPath(); g.moveTo(108, 186); g.lineTo(150, 186); g.stroke();
  } else if (kind === 'stars') {
    const star = (x, y) => { g.fillStyle = '#ffd23f'; g.strokeStyle = '#8a5a00'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 26, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); };
    star(L, Y); star(R, Y); brow(L, 82, -.15); brow(R, 82, .15); blush();
    g.fillStyle = '#5a1f1f'; g.beginPath(); g.moveTo(96, 174); g.quadraticCurveTo(128, 230, 160, 174); g.closePath(); g.fill();
  } else { // neutral
    eye(L, Y); eye(R, Y); brow(L, 86, -.05); brow(R, 86, .05);
    g.strokeStyle = '#4a2418'; g.lineWidth = 8; g.beginPath(); g.moveTo(108, 182); g.quadraticCurveTo(128, 192, 148, 182); g.stroke();
  }
}
function faceTex(kind, skin) {
  const k = kind + skin;
  if (!FACES[k]) FACES[k] = canvasTex(256, 256, (g, W, H) => drawFace(g, W, H, kind, skin));
  return FACES[k];
}

// ---------- character ----------
// Origin at the floor between the feet. Height ≈ 3.3 units standing.
export function person(o = {}) {
  const P = { skin: '#f2c39b', hair: '#5b3a22', shirt: '#22a597', pants: '#1f2a44', shoe: '#f4f4f4', cap: null, logo: null, ...o };
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 1.2; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  box(1.3, 1.25, .8, P.shirt, 0, .62, 0, torso);
  if (P.logo) { const t = canvasTex(128, 128, (g) => { g.fillStyle = P.logo.color || '#ffd23f'; g.font = '900 96px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.logo.text, 64, 70); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshLambertMaterial({ map: t, transparent: true })); m.position.set(0, .55, .405); torso.add(m); }
  const neck = new THREE.Group(); neck.position.y = 1.25; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .62; neck.add(head);
  const skinM = mat(P.skin);
  const faceM = new THREE.MeshLambertMaterial({ map: faceTex('neutral', P.skin) });
  const hm = new THREE.Mesh(geo(1.25, 1.2, 1.15), [skinM, skinM, skinM, skinM, faceM, skinM]);
  hm.castShadow = hm.receiveShadow = true; head.add(hm);
  if (P.cap) { box(1.32, .32, 1.22, P.cap, 0, .7, 0, head); box(1.0, .1, .5, P.cap, 0, .58, .78, head); }
  else if (P.hair) {
    box(1.33, .34, 1.23, P.hair, 0, .67, -.02, head); box(1.33, .7, .3, P.hair, 0, .3, -.47, head);
    box(.18, .5, 1.0, P.hair, -.62, .4, -.1, head); box(.18, .5, 1.0, P.hair, .62, .4, -.1, head);
    box(.6, .24, .25, P.hair, -.2, .5, .52, head); box(.3, .3, .3, P.hair, .25, .86, .1, head);
  }
  const arm = side => {
    const s = new THREE.Group(); s.position.set(side * .82, 1.12, 0); torso.add(s);
    box(.38, .7, .42, P.shirt, 0, -.3, 0, s);
    const el = new THREE.Group(); el.position.y = -.65; s.add(el);
    box(.36, .5, .4, P.shirt, 0, -.2, 0, el);
    const hand = box(.34, .26, .36, P.skin, 0, -.55, 0, el);
    return { s, el, hand };
  };
  const aL = arm(-1), aR = arm(1);
  const leg = side => {
    const s = new THREE.Group(); s.position.set(side * .33, 0, 0); hips.add(s);
    box(.52, .7, .62, P.pants, 0, -.35, 0, s);
    const kn = new THREE.Group(); kn.position.y = -.7; s.add(kn);
    box(.5, .45, .6, P.pants, 0, -.22, 0, kn);
    box(.54, .2, .78, P.shoe, 0, -.5, .08, kn);
    return { s, kn };
  };
  const lL = leg(-1), lR = leg(1);
  const api = {
    root, hips, torso, head, neck, armL: aL, armR: aR, legL: lL, legR: lR, P,
    face(kind) { faceM.map = faceTex(kind, P.skin); },
    sit() { lL.s.rotation.x = lR.s.rotation.x = -Math.PI / 2; lL.kn.rotation.x = lR.kn.rotation.x = Math.PI / 2; hips.position.y = 1.0; return api; },
    reset() { for (const x of [aL, aR]) { x.s.rotation.set(0, 0, 0); x.el.rotation.set(0, 0, 0); } head.rotation.set(0, 0, 0); torso.rotation.set(0, 0, 0); },
  };
  return api;
}

// ---------- props ----------
export function sofa(color = '#d93a54', w = 5.6) {
  const g = new THREE.Group();
  box(w, .8, 1.8, color, 0, .4, 0, g); box(w, 1.6, .5, color, 0, 1.2, -.75, g);
  box(.5, 1.1, 1.8, color, -w / 2, .75, 0, g); box(.5, 1.1, 1.8, color, w / 2, .75, 0, g);
  const cush = new THREE.Color(color).offsetHSL(0, 0, .07).getStyle();
  box(w / 2 - .3, .25, 1.4, cush, -w / 4 + .05, .92, .1, g); box(w / 2 - .3, .25, 1.4, cush, w / 4 - .05, .92, .1, g);
  return g;
}
export function cityTexture(w = 1024, h = 768, o = {}) {
  const seed = o.seed || 7; let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const bld = []; let x = -20; while (x < w) { const bw = 60 + rnd() * 110; bld.push([x, h * (.25 + rnd() * .45), bw, rnd()]); x += bw + 4; }
  const wins = bld.map(([bx, by, bw]) => { const a = []; for (let yy = by + 16; yy < h - 10; yy += 34) for (let xx = bx + 12; xx < bx + bw - 18; xx += 26) a.push([xx, yy, rnd()]); return a; });
  return canvasTex(w, h, (g, W, H, lit = 1) => {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, o.sky0 || '#2a1f6e'); sky.addColorStop(1, o.sky1 || '#6b3fa8'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, (i * 53) % (H * .3), 3, 3);
    if (o.moon !== false) { g.fillStyle = '#fff6d5'; g.beginPath(); g.arc(W * .18, H * .14, 26, 0, 7); g.fill(); }
    bld.forEach(([bx, by, bw, c], i) => {
      g.fillStyle = ['#1f1b4d', '#2b2563', '#251f57', '#33296f'][Math.floor(c * 4)]; g.fillRect(bx, by, bw, H - by);
      for (const [xx, yy, r] of wins[i]) { g.fillStyle = r < lit * .75 ? ['#ffd45a', '#ffb347', '#ff9de0', '#8ef0ff'][Math.floor(r * 13) % 4] : '#3a3380'; g.fillRect(xx, yy, 14, 20); }
    });
  });
}
export function windowFrame(tex, w = 4, h = 3) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  g.add(glass);
  const f = '#f4f1ea';
  box(w + .4, .25, .3, f, 0, h / 2, .05, g); box(w + .4, .25, .3, f, 0, -h / 2, .05, g);
  box(.25, h, .3, f, -w / 2, 0, .05, g); box(.25, h, .3, f, w / 2, 0, .05, g);
  box(.12, h, .2, f, 0, 0, .05, g); box(w, .12, .2, f, 0, 0, .05, g);
  box(w + .8, .2, .6, f, 0, -h / 2 - .15, .25, g);
  return g;
}
const MONTHS = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
export const monthName = m => MONTHS[((m % 12) + 12) % 12];
function calPage(label, year) {
  return canvasTex(256, 300, (g, W, H) => {
    g.fillStyle = '#fff'; rrect(g, 0, 0, W, H, 18); g.fill();
    g.fillStyle = '#e8384f'; g.fillRect(0, 0, W, 70); g.fillStyle = '#b71f35'; for (let i = 0; i < 4; i++) g.fillRect(40 + i * 52, 8, 16, 34);
    g.fillStyle = '#222'; fitText(g, label, 220, 110, 900); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, 170);
    g.fillStyle = '#888'; g.font = '800 40px Nunito'; g.fillText(String(year), W / 2, 252);
  });
}
// Wall calendar; pages = [{label, year, at}] — each later page tears in at its time.
export function calendar(pages) {
  const g = new THREE.Group();
  const meshes = pages.map((p, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.875), new THREE.MeshLambertMaterial({ map: calPage(p.label, p.year), transparent: true }));
    m.position.z = .01 + .002 * (pages.length - i); g.add(m); return m;
  });
  g.update = t => {
    let cur = 0; pages.forEach((p, i) => { if (t >= (p.at ?? -1)) cur = i; });
    meshes.forEach((m, i) => {
      if (i < cur) { const k = seg(t, pages[i + 1].at, pages[i + 1].at + .45); m.visible = k < 1; m.rotation.z = -k * .9; m.position.x = k * .8; m.position.y = -k * 1.5; }
      else { m.visible = i === cur || i === cur + 1; m.rotation.z = 0; m.position.x = 0; m.position.y = 0; }
      m.position.z = i < cur ? .05 : .01 + .002 * (pages.length - i);
    });
  };
  return g;
}
// Pill-shaped money badge as a sprite (always faces camera).
export function badge(text, kind = 'green', scale = 1) {
  const col = { green: ['#33c26b', '#1f8f4a'], red: ['#f04a4a', '#b82626'], yellow: ['#ffd23f', '#d9a400'], white: ['#ffffff', '#cfcfcf'] }[kind] || [kind, kind];
  const tc = kind === 'yellow' || kind === 'white' ? '#1d1d1d' : '#fff';
  const t = canvasTex(512, 200, (g, W, H) => {
    const s = fitText(g, text, 430, 112, 900); g.font = `900 ${s}px Nunito`;
    const tw = g.measureText(text).width + 70, x = (W - tw) / 2;
    g.fillStyle = 'rgba(0,0,0,.25)'; rrect(g, x, 30, tw, 150, 40); g.fill();
    g.fillStyle = col[1]; rrect(g, x, 20, tw, 150, 40); g.fill();
    g.fillStyle = col[0]; rrect(g, x, 14, tw, 142, 40); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 8; rrect(g, x + 4, 18, tw - 8, 134, 36); g.stroke();
    g.fillStyle = tc; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, 90);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  sp.renderOrder = 10; sp.base = [2.6 * scale, 1.0 * scale]; sp.scale.set(...sp.base, 1);
  return sp;
}
export function coin(label = '1', rot = 0) {
  const g = new THREE.Group();
  const face = canvasTex(256, 256, (c, W) => { c.fillStyle = '#d9893a'; c.fillRect(0, 0, W, W); c.fillStyle = '#c0712a'; c.beginPath(); c.arc(128, 128, 104, 0, 7); c.fill(); c.fillStyle = '#e9a55a'; c.font = '900 150px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.translate(128, 128); c.rotate(rot); c.fillText(label, 0, 10); });
  const side = mat('#b8682a');
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .14, 32), [side, new THREE.MeshLambertMaterial({ map: face }), new THREE.MeshLambertMaterial({ map: face })]);
  m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m);
  return g;
}
export function tree(h = 3, c = '#4fbf4a') {
  const g = new THREE.Group();
  box(.5, h * .5, .5, '#8a5a34', 0, h * .25, 0, g);
  box(2.2, 1.4, 2.2, c, 0, h * .5 + .6, 0, g); box(1.6, 1.0, 1.6, new THREE.Color(c).offsetHSL(0, 0, .06).getStyle(), 0, h * .5 + 1.6, 0, g);
  return g;
}
export function phoneMesh(screenTex, w = 2.2, h = 4.2) {
  const g = new THREE.Group();
  box(w, h, .22, '#1c1c24', 0, 0, 0, g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w - .2, h - .3), new THREE.MeshBasicMaterial({ map: screenTex }));
  s.position.z = .115; g.add(s);
  return g;
}
export function card(color = '#1d1d1d', accent = '#ffd23f') {
  const g = new THREE.Group();
  box(1.1, .7, .05, color, 0, 0, 0, g);
  box(.22, .16, .06, accent, -.3, .08, .01, g);
  return g;
}
export function lights(scene, o = {}) {
  scene.add(new THREE.HemisphereLight(o.sky || '#ffffff', o.ground || '#8a7aa8', o.hemi ?? 1.6));
  const d = new THREE.DirectionalLight(o.sun || '#ffffff', o.sunI ?? 1.8);
  d.position.set(...(o.dir || [5, 12, 8])); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048); const c = d.shadow.camera; c.left = c.bottom = -14; c.right = c.top = 14; c.near = 1; c.far = 50; d.shadow.bias = -.0005; d.shadow.normalBias = .02;
  scene.add(d); return d;
}
