// Channel-art options, built from the stills in src/ (rendered by the shorts' ?brand= modes). ?o=<option>
const W = innerWidth, H = innerHeight, c = document.getElementById('c'); c.width = W; c.height = H; const x = c.getContext('2d');
const O = new URLSearchParams(location.search).get('o') || 'b1';
const img = n => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'src/' + n + '-0.jpg'; });
const S = Object.fromEntries(await Promise.all(['k-eye', 'k-ship', 'k-wide', 'd-head', 'd-soar', 'phoenix', 'phoenix-close', 'yeti', 'yeti-close', 'hydra', 'hydra-close'].map(async n => [n, await img(n)])));
await document.fonts.load("100px 'Lilita One'"); await document.fonts.load("700 40px 'Fredoka'");

function cover(i, dx = 0, dy = 0, dw = W, dh = H, fx = .5, fy = .5) {   // draw image filling a box, focus point fx/fy
  const s = Math.max(dw / i.width, dh / i.height), w = i.width * s, h = i.height * s;
  x.drawImage(i, dx + (dw - w) * fx, dy + (dh - h) * fy, w, h);
}
function title(cx, cy, size, sub) {   // the shorts' caption look: white Lilita One, thick dark outline; gold subtitle
  x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.font = `${size}px 'Lilita One', sans-serif`; x.lineWidth = size * .19; x.strokeStyle = 'rgba(10,10,14,.96)';
  x.strokeText('FABLE PHYSICS', cx, cy); x.fillStyle = '#fff'; x.fillText('FABLE PHYSICS', cx, cy);
  if (sub) { const s2 = size * .3; x.font = `700 ${s2}px 'Fredoka', sans-serif`; x.lineWidth = s2 * .3;
    x.strokeText(sub, cx, cy + size * .72); x.fillStyle = '#ffd36b'; x.fillText(sub, cx, cy + size * .72); }
  x.restore();
}
function chipText(t, cx, cy, size) {   // gold-outlined label chip, like in the shorts
  x.save(); x.font = `700 ${size}px 'Fredoka', sans-serif`; const w = x.measureText(t).width + size * 1.6, h = size * 2;
  x.beginPath(); x.roundRect(cx - w / 2, cy - h / 2, w, h, h * .32); x.fillStyle = 'rgba(14,20,24,.9)'; x.fill();
  x.lineWidth = size * .12; x.strokeStyle = '#e9b949'; x.stroke(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, cy + size * .05); x.restore();
}
function seam(left, right, slant = .12) {   // two scenes split by a wavy diagonal with a gold edge
  cover(left, 0, 0, W * .62, H, .55); x.save(); x.beginPath();
  const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([W * (.5 + slant) - W * slant * 2 * t + Math.sin(t * 9) * W * .008, H * t]); }
  x.moveTo(W, 0); for (const [px, py] of pts) x.lineTo(px, py); x.lineTo(W, H); x.closePath(); x.clip(); cover(right, W * .38, 0, W * .62, H, .5); x.restore();
  x.save(); x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.lineWidth = Math.max(6, W * .004); x.strokeStyle = '#e9b949'; x.stroke(); x.restore();
}
function panels(list, slant = .06) {   // N scenes side by side, split by slanted wavy gold seams (the B3 look, generalised)
  const N = list.length, edge = i => { const pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30; pts.push([W * i / N + W * slant * (1 - 2 * t) + Math.sin(t * 9 + i) * W * .006, H * t]); } return pts; };
  const E = []; for (let i = 0; i <= N; i++) E.push(i === 0 ? [[-W, 0], [-W, H]] : i === N ? [[2 * W, 0], [2 * W, H]] : edge(i));
  list.forEach(([im, fx], i) => { x.save(); x.beginPath(); E[i].forEach(([px, py], k) => k ? x.lineTo(px, py) : x.moveTo(px, py)); [...E[i + 1]].reverse().forEach(([px, py]) => x.lineTo(px, py)); x.closePath(); x.clip();
    const x0 = Math.max(0, W * i / N - W * slant * 1.5), x1 = Math.min(W, W * (i + 1) / N + W * slant * 1.5); cover(im, x0, 0, x1 - x0, H, fx ?? .5); x.restore(); });
  for (let i = 1; i < N; i++) { x.save(); x.beginPath(); E[i].forEach(([px, py], k) => k ? x.lineTo(px, py) : x.moveTo(px, py)); x.lineWidth = Math.max(6, W * .004); x.strokeStyle = '#e9b949'; x.stroke(); x.restore(); }
}
function quads(list) {   // four creatures in an X, for a round profile picture
  const cx = W / 2, cy = H / 2, C = [[0, 0], [W, 0], [W, H], [0, H]];
  list.forEach((im, i) => { const a = C[i], b = C[(i + 1) % 4]; x.save(); x.beginPath(); x.moveTo(cx, cy); x.lineTo(...a); x.lineTo(...b); x.closePath(); x.clip(); cover(im); x.restore(); });
  x.save(); x.lineWidth = W * .012; x.strokeStyle = '#e9b949'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, H); x.moveTo(W, 0); x.lineTo(0, H); x.stroke(); x.restore();
}
function vignette(a = .45) { const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }

window.render = () => {
  x.clearRect(0, 0, W, H);
  const SUB = 'mythical creatures, real science';
  if (O === 'p1') { cover(S['k-eye'], 0, 0, W, H, .3); vignette(.5); }
  else if (O === 'p2') { cover(S['d-head']); vignette(.35); }
  else if (O === 'p3') { cover(S['k-ship']); vignette(.35); }
  else if (O === 'p4') {   // dragon / kraken mash-up with FP
    seam(S['d-head'], S['k-eye'], .1); vignette(.3);
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; const s = H * .36;
    x.font = `${s}px 'Lilita One', sans-serif`; x.lineWidth = s * .16; x.strokeStyle = 'rgba(10,10,14,.96)'; x.strokeText('FP', W / 2, H * .53); x.fillStyle = '#fff'; x.fillText('FP', W / 2, H * .53); x.restore();
  }
  else if (O === 'p5') { cover(S['phoenix-close']); vignette(.35); }
  else if (O === 'p6') { cover(S['yeti-close']); vignette(.3); }
  else if (O === 'p7') { cover(S['hydra-close']); vignette(.35); }
  else if (O === 'p8') { quads([S['d-head'], S['k-eye'], S['phoenix-close'], S['hydra-close']]); vignette(.25); }
  else if (O === 'b5') { panels([[S['phoenix'], .5], [S['k-wide'], .6]], .12); vignette(.3); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b6') { panels([[S['yeti'], .55], [S['d-soar'], .5]], .12); vignette(.3); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b7') { panels([[S['d-soar'], .5], [S['hydra'], .5], [S['k-wide'], .62]], .07); vignette(.3); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b8') { panels([[S['phoenix'], .5], [S['yeti'], .55], [S['hydra'], .5], [S['k-wide'], .62]], .05); vignette(.3); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b1') { cover(S['k-wide']); vignette(.35); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b2') { cover(S['d-soar'], 0, 0, W, H, .5, .5); vignette(.35); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b3') { seam(S['d-soar'], S['k-wide']); vignette(.3); title(W / 2, H * .47, H * .12, SUB); }
  else if (O === 'b4') { seam(S['d-soar'], S['k-wide']); vignette(.3); title(W / 2, H * .45, H * .11);
    chipText('DRAGONS', W * .36, H * .58, H * .026); chipText('KRAKENS', W * .5, H * .58, H * .026); chipText('AND MORE', W * .64, H * .58, H * .026); }
};
window.DUR = 1; window.EV = []; window.READY = true;
