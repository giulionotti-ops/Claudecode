// node render.mjs <style> [--stills t1,t2 --out f.jpg]   (renders out/<style>.mp4 at 30 fps with the voice)
import { createRequire } from 'node:module'; import { spawn, execFileSync } from 'node:child_process'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.dirname(new URL(import.meta.url).pathname), T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = await new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0, () => r(s)); });
const a = process.argv.slice(2), sty = a[0], opt = k => { const i = a.indexOf('--' + k); return i > 0 ? a[i + 1] : null; };
const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.error('PAGE', e.message));
await pg.goto(`http://localhost:${srv.address().port}/index.html?style=${sty}`); await pg.waitForFunction('window.READY', null, { timeout: 120000 });
const frame = t => pg.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', .92).split(',')[1]; }, t);
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
if (opt('stills')) { const ts = opt('stills').split(',').map(Number); for (const [i, t] of ts.entries()) fs.writeFileSync(`/tmp/st_${sty}_${i}.jpg`, Buffer.from(await frame(t), 'base64'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...ts.flatMap((_, i) => ['-i', `/tmp/st_${sty}_${i}.jpg`]), '-filter_complex', ts.map((_, i) => `[${i}]scale=300:534[s${i}]`).join(';') + ';' + ts.map((_, i) => `[s${i}]`).join('') + `hstack=${ts.length}`, opt('out')]); }
else { const DUR = await pg.evaluate('window.DUR'), N = Math.ceil(DUR * 30), v = path.join(ROOT, 'out', sty + '.v.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', v], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < N; f++) { const b = Buffer.from(await frame(f / 30), 'base64'); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('video', v); }
await br.close(); srv.close();
