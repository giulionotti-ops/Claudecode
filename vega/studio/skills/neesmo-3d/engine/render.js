#!/usr/bin/env node
// Neesmo 3D engine renderer: opens a seekable page (scene.html) in headless Chromium and captures every frame.
//   node render.js <scene.html> <out.mp4> [--w 1080 --h 1920 --fps 30 --from 0 --to <DUR> --stills 1.2,4.5]
// The page must define window.DUR, window.READY (a Promise) and window.seek(t) (draw the frame at t seconds, sync).
// Time is the only input: same t -> same pixels. Works without a GPU (SwiftShader WebGL2), slower but fine.
// --stills writes PNGs at those times next to out.mp4 and skips the video (look before the full render).
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const scene = path.resolve(a[0] || 'scene.html'), out = path.resolve(a[1] || 'scene.mp4');
const W = +opt('w', 1080), H = +opt('h', 1920), FPS = +opt('fps', 30), stills = opt('stills', '');
const root = path.dirname(scene);
fs.mkdirSync(path.dirname(out), { recursive: true });
const MODS = [path.join(root, 'node_modules'), path.join(__dirname, 'node_modules')];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.wav': 'audio/wav' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const tries = u.startsWith('/node_modules/') ? MODS.map(m => path.join(m, u.slice(14))) : [path.join(root, u)];
  const f = tries.find(p => (p.startsWith(root) || MODS.some(m => p.startsWith(m))) && fs.existsSync(p) && fs.statSync(p).isFile());
  if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/${path.basename(scene)}?w=${W}&h=${H}`;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('page error:', e.message));
  p.on('console', m => m.type() === 'error' && console.error('console:', m.text()));
  await p.goto(url);
  await p.waitForFunction(() => window.READY !== undefined, null, { timeout: 60000 });
  await p.evaluate(() => window.READY);
  const DUR = +opt('to', await p.evaluate(() => window.DUR)), FROM = +opt('from', 0);
  const shot = async t => { await p.evaluate(t => window.seek(t), t); return p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }); };
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      const f = out.replace(/\.mp4$/, '') + `_${t.toFixed(2)}s.png`; fs.writeFileSync(f, await shot(t)); console.log(f);
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', W <= 720 ? 'veryfast' : 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((DUR - FROM) * FPS), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = await shot(FROM + i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % (FPS * 2) === 0) process.stderr.write(`frame ${i}/${n} (${((Date.now() - t0) / 1000 / (i + 1)).toFixed(2)} s/frame)\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`${out} ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
