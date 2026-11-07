// Brand art. Open index.html?art=<name>; render.mjs saves each one as a JPG.
import * as D from '../lib/draw.js';
const { C } = D;
await Promise.all(['300 40px "Space Grotesk"', '500 40px "Space Grotesk"', '700 40px "Space Grotesk"', '200 40px "JetBrains Mono"', '400 40px "JetBrains Mono"'].map(f => document.fonts.load(f)));
const NAME = 'VOID ATLAS', TAG = 'THE UNIVERSE, ONE MAP AT A TIME';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const size = (w, h) => { cv.width = w; cv.height = h; };

function wordmark(x, y, px, a = 1) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `500 ${px}px "Space Grotesk"`; g.letterSpacing = `${px * .42}px`;
  g.shadowColor = C.gold; g.shadowBlur = px * .45; g.fillStyle = `rgba(255,243,220,${a})`;
  g.fillText(NAME, x + px * .21, y); g.shadowBlur = 0; g.fillText(NAME, x + px * .21, y); g.restore();
}
function tagline(x, y, px, a = .75, text = TAG) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 ${px}px "JetBrains Mono"`; g.letterSpacing = `${px * .4}px`;
  g.fillStyle = `rgba(255,196,107,${a})`; g.fillText(text, x + px * .2, y); g.restore();
}
function coords(x, y, text, a = .6, px = 18, align = 'left') {
  g.save(); g.font = `200 ${px}px "JetBrains Mono"`; g.letterSpacing = '3px'; g.textAlign = align; g.fillStyle = `rgba(255,214,150,${a})`; g.fillText(text, x, y); g.restore();
}
function rule(x0, x1, y, a = .5) { g.save(); g.strokeStyle = `rgba(255,196,107,${a})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.restore(); }

const ART = {
  // ---- profile pictures (square; YouTube shows them as a circle, so keep art inside the middle 80%) ----
  'pfp-mark'() { size(1024, 1024); D.sky(g, 1024, 1024, 0, .8); D.stars(g, 1024, 1024, 0, 160, 4, .7);
    D.mark(g, 512, 512, 860, 0, 1); D.vignette(g, 1024, 1024, .55); D.grain(g, 1024, 1024, .04); },
  'pfp-planet'() { size(1024, 1024); D.sky(g, 1024, 1024, 0, .6); D.stars(g, 1024, 1024, 0, 180, 9, .8);
    D.planet(g, 512, 520, 175, { base: ['#ffd99a', '#4a2a10'], bands: 9, bandCol: 'rgba(120,60,20,.25)', light: -2.5, atmo: '255,200,130', ring: { tilt: .26, inner: 1.3, outer: 1.95, rot: -.32 } });
    D.vignette(g, 1024, 1024, .6); D.grain(g, 1024, 1024, .05); },
  'pfp-hole'() { size(1024, 1024); D.sky(g, 1024, 1024, 0, .5); D.stars(g, 1024, 1024, 0, 200, 21, .8);
    D.blackHole(g, 512, 512, 150, 1.3, 1); D.vignette(g, 1024, 1024, .6); D.grain(g, 1024, 1024, .05); },
  'pfp-monogram'() { size(1024, 1024); D.sky(g, 1024, 1024, 0, .7); D.stars(g, 1024, 1024, 0, 120, 6, .6);
    g.save(); g.strokeStyle = 'rgba(255,196,107,.6)'; g.lineWidth = 6; g.shadowColor = C.gold; g.shadowBlur = 30; g.beginPath(); g.arc(512, 512, 360, 0, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(512, 512, 335, 0, 7); g.stroke(); g.restore();
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '300 330px "Space Grotesk"'; g.letterSpacing = '-10px'; g.fillStyle = C.cream; g.shadowColor = C.gold; g.shadowBlur = 50; g.fillText('VA', 505, 530); g.restore();
    D.glow(g, 512 + Math.cos(-.8) * 360, 512 + Math.sin(-.8) * 360, 22, 1, '255,214,150');
    D.vignette(g, 1024, 1024, .55); D.grain(g, 1024, 1024, .04); },

  // ---- banners 2560x1440. Everything that matters sits in the centre 1546x423 (the part phones show) ----
  'banner-orbit'() { size(2560, 1440);   // a ringed world on the left, a black hole on the right, the name between
    D.sky(g, 2560, 1440, 0, 1.1, -.18); D.stars(g, 2560, 1440, 0, 900, 13, .9);
    D.planet(g, 270, 760, 190, { base: ['#ffd99a', '#3a200c'], bands: 11, bandCol: 'rgba(120,60,20,.25)', light: -.4, atmo: '255,200,130', ring: { tilt: .22, inner: 1.3, outer: 2.1, rot: -.25 } });
    D.blackHole(g, 2330, 720, 58, .8, 1);
    D.atlasFrame(g, 2560, 1440, .0);
    rule(1000, 1560, 640, .4); wordmark(1280, 720, 116); tagline(1280, 820, 26);
    coords(560, 600, 'RA 05h 34m · DEC +22° 01′', .55); coords(2000, 600, 'SGR A* · 26,000 LY', .55, 18, 'right');
    D.vignette(g, 2560, 1440, .45); D.grain(g, 2560, 1440, .05); },
  'banner-chart'() { size(2560, 1440);   // an old star chart: constellation lines, grid, the name in the middle
    D.sky(g, 2560, 1440, 0, .9, .1); D.stars(g, 2560, 1440, 0, 700, 31, .8);
    g.save(); g.strokeStyle = 'rgba(255,196,107,.08)'; g.lineWidth = 1.2; for (let i = -6; i <= 6; i++) { g.beginPath(); g.ellipse(1280, 3200, 2900 + i * 30, 2600 + i * 180, 0, 0, 7); g.stroke(); } for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (i - 8.5) * .07; g.beginPath(); g.moveTo(1280, 3200); g.lineTo(1280 + Math.cos(a) * 4000, 3200 + Math.sin(a) * 4000); g.stroke(); } g.restore();
    D.constellation(g, [[330, 520], [430, 600], [550, 570], [650, 660], [590, 790], [450, 820], [430, 600]], 1, .9);   // left
    D.constellation(g, [[1930, 560], [2020, 670], [2160, 630], [2230, 730], [2130, 830]], 1, .9);                         // right
    D.galaxy(g, 2300, 1000, 110, .5, .7, .4); D.planet(g, 260, 1000, 80, { base: ['#9fd8ff', '#0b1530'], light: -.6 });
    wordmark(1280, 700, 110); tagline(1280, 800, 26);
    D.atlasFrame(g, 2560, 1440, .7, 60);
    D.vignette(g, 2560, 1440, .5); D.grain(g, 2560, 1440, .05); },
  'banner-voyage'() { size(2560, 1440);   // a probe leaving the Sun behind, a dotted path across the frame
    D.sky(g, 2560, 1440, 0, 1, -.3); D.stars(g, 2560, 1440, 0, 800, 41, .9);
    D.sun(g, 160, 720, 120, 0, 1);
    g.save(); g.strokeStyle = 'rgba(255,196,107,.35)'; g.setLineDash([3, 14]); g.lineWidth = 3; g.beginPath(); g.moveTo(300, 720); g.bezierCurveTo(900, 520, 1700, 980, 2300, 640); g.stroke(); g.restore();
    D.probe(g, 2190, 660, 120, 0, 1, -.15);
    [[420, 670, 12, '#9fd8ff'], [580, 630, 18, '#ffb07a'], [780, 640, 34, '#ffd99a']].forEach(([x, y, r, c]) => D.planet(g, x, y, r, { base: [c, '#120a20'], light: Math.PI }));
    wordmark(1500, 720, 110); tagline(1500, 820, 26);
    D.vignette(g, 2560, 1440, .5); D.grain(g, 2560, 1440, .05); },
};
const name = new URLSearchParams(location.search).get('art') || 'banner-orbit';
ART[name](); window.ART = Object.keys(ART); window.READY = true;
