// Render a short's picture: node lib/render.mjs <short-dir> [--fps 30] [--workers 4] [--stills 1,5,9 --out sheet.jpg]
// Each worker is a headless page drawing frames; JPEG frames are piped into ffmpeg, then the parts are joined.
import { createRequire } from 'node:module'; import { spawn, execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const { serve } = await import('../brand/render.mjs');
const a = process.argv.slice(2), dir = path.resolve(a[0]), opt = k => { const i = a.indexOf('--' + k); return i > 0 ? a[i + 1] : null; };
const FPS = +(opt('fps') || 30), WK = +(opt('workers') || 4), ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const url = (p) => `http://localhost:${p}/${path.relative(ROOT, dir)}/index.html`;
const srv = await serve(), port = srv.address().port, br = await chromium.launch();
const page = async () => { const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.error('PAGE', e.message)); await pg.goto(url(port)); await pg.waitForFunction('window.READY'); return pg; };
const frame = (pg, t) => pg.evaluate(t => { window.render(t); return document.getElementById('c').toDataURL('image/jpeg', .92).split(',')[1]; }, t);
if (opt('stills')) {
  const pg = await page(), ts = opt('stills').split(',').map(Number), tmp = fs.mkdtempSync('/tmp/st');
  for (const [i, t] of ts.entries()) fs.writeFileSync(`${tmp}/${i}.jpg`, Buffer.from(await frame(pg, t), 'base64'));
  const n = ts.length, cols = Math.min(n, 6);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...ts.flatMap((_, i) => ['-i', `${tmp}/${i}.jpg`]), '-filter_complex', ts.map((_, i) => `[${i}]scale=360:640[s${i}]`).join(';') + ';' + ts.map((_, i) => `[s${i}]`).join('') + `xstack=inputs=${n}:layout=` + ts.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join('|') + (n === 1 ? '' : ''), opt('out')]);
  console.log('sheet', opt('out'));
} else {
  const DUR = await (await page()).evaluate('window.DUR'), N = Math.ceil(DUR * FPS), out = path.join(dir, 'out'); fs.mkdirSync(out, { recursive: true });
  let done = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: WK }, async (_, w) => {
    const pg = await page(), f0 = Math.floor(N * w / WK), f1 = Math.floor(N * (w + 1) / WK);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', `${out}/part${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = f0; f < f1; f++) { const buf = Buffer.from(await frame(pg, f / FPS), 'base64'); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); if (++done % 150 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }));
  fs.writeFileSync(`${out}/parts.txt`, Array.from({ length: WK }, (_, w) => `file 'part${w}.mp4'`).join('\n'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${out}/parts.txt`, '-c', 'copy', `${out}/video.mp4`]);
  for (let w = 0; w < WK; w++) fs.unlinkSync(`${out}/part${w}.mp4`); console.log('video', `${out}/video.mp4`);
}
await br.close(); srv.close();
