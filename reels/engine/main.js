// Loads an episode (script.json + build/timeline.json + brand.json) and exposes window.render(t) for the renderer.
import * as THREE from 'three';
import { SCENES } from './scenes.js';
import { captionGroups, drawCaption, drawTopBar, drawNote, makeEndCard, drawBadges } from './overlay.js';
import { seg } from './kit.js';

const Q = new URLSearchParams(location.search);
const EP = Q.get('ep') || 'esempio';
const j = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
const [script, brandFile, tl0] = await Promise.all([j(`/episodes/${EP}/script.json`), j('/brand.json'), j(`/episodes/${EP}/build/timeline.json`)]);
const B = { ...(brandFile || {}), ...(script.brand || {}) };
await Promise.all(['800 40px Baloo', '900 40px Nunito', '800 40px Nunito', '700 40px Nunito'].map(f => document.fonts.load(f)));

// Without a voice track yet, estimate word timings so the film can still be previewed.
function fakeTimeline(lines) {
  let t = .3; const words = [], L = [];
  lines.forEach((l, li) => { const s = t; for (const w of l.text.split(/\s+/).filter(Boolean)) { const d = .12 + .055 * w.length; words.push({ w, s: t, e: t + d, line: li }); t += d + .04; } L.push({ s, e: t }); t += .25; });
  return { duration: t + (script.tail ?? 2.5), words, lines: L, fake: true };
}
const TL = tl0 || fakeTimeline(script.lines);
const DUR = TL.duration;

// ---- resolve "@word", "@word#2", "@word+0.3" against the words of a scene's span ----
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9,']/g, '');
function resolver(w0, w1) {
  return v => {
    if (typeof v !== 'string' || v[0] !== '@') return v;
    const m = v.match(/^@([^#+\-]+)(?:#(\d+))?([+\-][\d.]+)?$/); if (!m) return v;
    const key = norm(m[1]), nth = +(m[2] || 1), off = +(m[3] || 0);
    const pick = (a, b) => { let c = 0; for (let i = a; i < b; i++) if (norm(TL.words[i].w).startsWith(key) && ++c === nth) return TL.words[i].s + off; return null; };
    const r = pick(w0, w1) ?? pick(0, TL.words.length);
    if (r == null) console.warn('cue not found', v);
    return r ?? 1e9;
  };
}
const deep = (o, f) => Array.isArray(o) ? o.map(x => deep(x, f)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v, f)])) : f(o);

// ---- scene spans: a line with "scene" starts a new scene; lines without one continue it ----
const spans = [];
script.lines.forEach((l, i) => { if (l.scene || i === 0) spans.push({ li: i, p: l.scene || { type: 'room' } }); });
const firstWord = li => TL.words.findIndex(w => w.line === li);
const ctx = { brand: B, cast: script.cast || {}, drawEndCard: makeEndCard(B) };
ctx.cast.hero = { skin: '#f2c39b', hair: '#5b3a22', shirt: '#22a597', ...(ctx.cast.hero || {}) };
ctx.cast.friend = { skin: '#8d5a3b', hair: null, cap: '#1f2a66', shirt: '#f08a24', pants: '#2a2a2a', ...(ctx.cast.friend || {}) };
const built = spans.map((s, k) => {
  const w0 = firstWord(s.li), next = spans[k + 1], w1 = next ? firstWord(next.li) : TL.words.length;
  const t0 = k === 0 ? 0 : TL.words[w0].s - .08, t1 = next ? TL.words[w1].s - .08 : DUR;
  const p = { ...deep(s.p, resolver(w0, w1)), _t0: t0, _t1: t1 };
  const S = SCENES[p.type]; if (!S) throw new Error('unknown scene type ' + p.type);
  return { t0, t1, p, ...S(p, ctx) };
});

// ---- sound cues for the mixer ----
const SFX = [];
built.forEach((b, i) => {
  if (i) SFX.push({ t: b.t0, kind: 'whoosh' });
  (b.p.badges || []).forEach(x => SFX.push({ t: x.at, kind: x.kind === 'red' ? 'down' : 'pop' }));
  for (const [k, kind] of [['coinAt', 'coin'], ['switchAt', 'ding'], ['give', 'pop'], ['cardAt', 'pop'], ['lightUp', 'rise']]) if (b.p[k] != null) SFX.push({ t: b.p[k], kind });
  if (b.p.form?.typeAt != null) SFX.push({ t: b.p.form.typeAt, kind: 'type', dur: b.p.form.typeDur || 1.2 });
  if (b.p.form?.pressAt != null) SFX.push({ t: b.p.form.pressAt, kind: 'click' });
  if (b.p.panel?.pressAt != null) SFX.push({ t: b.p.panel.pressAt, kind: 'click' });
  if (b.p.panel?.checkAt != null) SFX.push({ t: b.p.panel.checkAt, kind: 'ding' });
  if (b.p.calendar) b.p.calendar.slice(1).forEach(c => SFX.push({ t: c.at, kind: 'flip' }));
  if (b.end) SFX.push({ t: b.t0 + .05, kind: 'ding' });
});

// ---- renderer ----
const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
gl.setPixelRatio(1); gl.setSize(1080, 1920, false); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.NoToneMapping;
const out = document.getElementById('out'), g = out.getContext('2d');
const fit = () => { const s = Math.min(innerWidth / 1080, innerHeight / 1920); out.style.transform = `scale(${s})`; }; fit(); addEventListener('resize', fit);
const groups = captionGroups(TL.words);

window.render = t => {
  const b = built.find(x => t >= x.t0 && t < x.t1) || built[built.length - 1];
  b.update(t);
  // punch-in on each cut
  const k = seg(t, b.t0, b.t0 + .22); b.camera.zoom = 1 + .06 * (1 - k) ** 2; b.camera.updateProjectionMatrix();
  gl.render(b.scene, b.camera);
  g.clearRect(0, 0, 1080, 1920); g.drawImage(gl.domElement, 0, 0);
  // brief white flash on cuts
  if (b.t0 > 0 && t - b.t0 < .1) { g.fillStyle = `rgba(255,255,255,${.35 * (1 - (t - b.t0) / .1)})`; g.fillRect(0, 0, 1080, 1920); }
  if (b.overlay2d) b.overlay2d(g, t);
  drawBadges(g, b.p.badges, t);
  drawTopBar(g, B);
  if (b.p.note) drawNote(g, b.p.note, seg(t, b.t0, b.t0 + .2));
  drawCaption(g, groups, t, b.end ? 1560 : 1340);
  const fo = seg(t, DUR - .35, DUR); if (fo > 0) { g.fillStyle = `rgba(0,0,0,${fo})`; g.fillRect(0, 0, 1080, 1920); }
};
window.frameJPEG = q => out.toDataURL('image/jpeg', q || .93);
Object.assign(window, { DUR, SFX, TL, READY: true });
if (!Q.has('capture')) { const t0 = performance.now(); const loop = () => { window.render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; loop(); }
