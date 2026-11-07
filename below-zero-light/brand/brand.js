// Brand art. Open index.html?art=<name>; render.mjs saves each one as a JPG.
import * as D from '../lib/draw.js';
const { C } = D;
await Promise.all(['300 40px "Space Grotesk"', '500 40px "Space Grotesk"', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"'].map(f => document.fonts.load(f)));
const NAME = 'BELOW ZERO LIGHT', TAG = 'EVERY SHORT IS A DIVE';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const size = (w, h) => { cv.width = w; cv.height = h; };

function wordmark(x, y, px, a = 1, align = 'center') {
  g.save(); g.textAlign = align; g.textBaseline = 'middle'; g.font = `300 ${px}px "Space Grotesk"`; g.letterSpacing = `${px * .32}px`;
  g.shadowColor = C.glow; g.shadowBlur = px * .5; g.fillStyle = `rgba(233,251,255,${a})`;
  g.fillText(NAME, x + (align === 'center' ? px * .16 : 0), y); g.shadowBlur = 0; g.fillText(NAME, x + (align === 'center' ? px * .16 : 0), y); g.restore();
}
function tagline(x, y, px, a = .7, align = 'center', text = TAG) {
  g.save(); g.textAlign = align; g.textBaseline = 'middle'; g.font = `400 ${px}px "JetBrains Mono"`; g.letterSpacing = `${px * .45}px`;
  g.fillStyle = `rgba(111,246,255,${a})`; g.fillText(text, x + (align === 'center' ? px * .22 : 0), y); g.restore();
}
function depthScale(x0, x1, y, labels, a = 1) {   // horizontal depth ruler with ticks
  g.save(); g.strokeStyle = C.glow; g.fillStyle = C.glow; g.globalAlpha = .45 * a; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  for (let i = 0; i <= 50; i++) { const x = D.lerp(x0, x1, i / 50), big = i % 10 === 0; g.globalAlpha = (big ? .6 : .3) * a; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (big ? 22 : 10)); g.stroke(); }
  g.font = '200 22px "JetBrains Mono"'; g.letterSpacing = '3px'; g.textAlign = 'center'; g.globalAlpha = .75 * a;
  labels.forEach((l, i) => g.fillText(l, D.lerp(x0, x1, i / (labels.length - 1)), y + 50));
  g.restore();
}

const ART = {
  // ---- profile pictures (square; YouTube shows them as a circle) ----
  'pfp-lure'() { size(1024, 1024); D.water(g, 1024, 1024, .95, 0, false); D.snow(g, 1024, 1024, 0, 90, 4, .7);
    D.angler(g, 450, 600, 300, 0, 1); D.vignette(g, 1024, 1024, .6); D.grain(g, 1024, 1024, .05); },
  'pfp-eye'() { size(1024, 1024); D.water(g, 1024, 1024, .98, 0, false); D.snow(g, 1024, 1024, 0, 110, 9, .8);
    D.eye(g, 512, 520, 400, Math.PI * .6, 1); D.vignette(g, 1024, 1024, .7); D.grain(g, 1024, 1024, .05); },
  'pfp-mark'() { size(1024, 1024); D.water(g, 1024, 1024, .9, 0, false); D.snow(g, 1024, 1024, 0, 70, 2, .5);
    D.mark(g, 512, 520, 520, 0, 1); D.vignette(g, 1024, 1024, .55); D.grain(g, 1024, 1024, .04); },
  'pfp-jelly'() { size(1024, 1024); D.water(g, 1024, 1024, .92, 0, false); D.snow(g, 1024, 1024, 0, 100, 6, .7);
    D.jelly(g, 512, 420, 300, 1.2, 1); D.vignette(g, 1024, 1024, .6); D.grain(g, 1024, 1024, .05); },

  // ---- banners 2560x1440. Everything that matters sits in the centre 1546x423 (the part phones show) ----
  'banner-descent'() { size(2560, 1440);   // left = sunlit surface, right = the abyss
    const gr = g.createLinearGradient(0, 0, 2560, 0); gr.addColorStop(0, '#1f8597'); gr.addColorStop(.28, C.mid); gr.addColorStop(.6, C.deep); gr.addColorStop(1, C.abyss);
    g.fillStyle = gr; g.fillRect(0, 0, 2560, 1440);
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x = 120 + i * 130, gr2 = g.createLinearGradient(0, 0, 0, 1440); gr2.addColorStop(0, 'rgba(200,250,255,.10)'); gr2.addColorStop(1, 'rgba(200,250,255,0)'); g.fillStyle = gr2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 380, 1440); g.lineTo(x + 200, 1440); g.fill(); } g.restore();
    D.snow(g, 2560, 1440, 0, 380, 11, .8);
    D.diver(g, 470, 660, 120, .4, .9); D.whale(g, 330, 860, 120, .7);
    D.angler(g, 2260, 760, 140, 0, 1, true);
    wordmark(1280, 640, 92); tagline(1280, 735, 26, .75);
    depthScale(560, 2000, 800, ['0 m', '200', '1,000', '4,000', '6,000', '10,935 m'], .8);
    D.vignette(g, 2560, 1440, .45); D.grain(g, 2560, 1440, .05); },
  'banner-abyss'() { size(2560, 1440);   // pure black water, one lure lighting the name
    D.water(g, 2560, 1440, 1, 0, false); D.snow(g, 2560, 1440, 0, 420, 21, .7);
    D.orb(g, 1280, 560, 26, 1);
    const gr = g.createRadialGradient(1280, 600, 0, 1280, 640, 700); gr.addColorStop(0, 'rgba(40,160,180,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 2560, 1440);
    const rod = new Path2D(); rod.moveTo(1280, 560); rod.bezierCurveTo(1320, 480, 1500, 420, 1700, 470); g.save(); g.strokeStyle = 'rgba(111,246,255,.35)'; g.lineWidth = 3; g.shadowColor = C.glow; g.shadowBlur = 12; g.stroke(rod); g.restore();
    D.jelly(g, 400, 640, 110, .5, .55); D.jelly(g, 2190, 690, 75, 2.1, .45, '255,179,193');
    wordmark(1280, 700, 104); tagline(1280, 805, 26, .7);
    D.vignette(g, 2560, 1440, .55); D.grain(g, 2560, 1440, .05); },
  'banner-sonar'() { size(2560, 1440);   // sonar screen: creatures show up as glowing contacts
    D.water(g, 2560, 1440, .85, 0, false);
    g.save(); g.strokeStyle = 'rgba(111,246,255,.06)'; g.lineWidth = 1; for (let x = 0; x < 2560; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1440); g.stroke(); } for (let y = 0; y < 1440; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(2560, y); g.stroke(); } g.restore();
    D.sonar(g, 1280, 720, 900, .55, .9, 6);
    g.save(); g.globalCompositeOperation = 'lighter'; const sw = g.createConicGradient(-.9, 1280, 720); sw.addColorStop(0, 'rgba(111,246,255,.16)'); sw.addColorStop(.08, 'rgba(111,246,255,0)'); sw.addColorStop(1, 'rgba(111,246,255,0)'); g.fillStyle = sw; g.fillRect(0, 0, 2560, 1440); g.restore();
    D.snow(g, 2560, 1440, 0, 200, 5, .5);
    D.angler(g, 2230, 600, 95, 0, .9, true); D.snailfish(g, 420, 830, 80, 0, .9); D.jelly(g, 380, 560, 55, 1, .7);
    const tag = (x, y, t) => { g.save(); g.font = '400 18px "JetBrains Mono"'; g.letterSpacing = '3px'; g.fillStyle = 'rgba(111,246,255,.7)'; g.fillText(t, x, y); g.strokeStyle = 'rgba(111,246,255,.5)'; g.strokeRect(x - 14, y - 70, 10, 10); g.restore(); };
    tag(2120, 700, 'CONTACT 03 · −1,240 m'); tag(330, 910, 'CONTACT 07 · −8,336 m');
    wordmark(1280, 700, 96); tagline(1280, 800, 26, .75);
    D.vignette(g, 2560, 1440, .55); D.grain(g, 2560, 1440, .05); },
};
const name = new URLSearchParams(location.search).get('art') || 'banner-descent';
ART[name](); window.ART = Object.keys(ART); window.READY = true;
