// Render an episode to video frames with headless Chromium.
// node tools/render.mjs <episode> [--preview] [--fps 30]
//   default:   episodes/<ep>/build/video.mp4 (silent) + sfx.json + timeline used
//   --preview: one frame per second → episodes/<ep>/build/preview.jpg contact sheet (fast check)
import { createRequire } from 'node:module'; import { spawn, execFileSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
import { serve, ROOT } from './serve.mjs';
// Playwright: preinstalled in cloud sessions (global, found via NODE_PATH); elsewhere `npm i playwright && npx playwright install chromium`
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), ep = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || 'esempio';
const preview = args.includes('--preview'), fps = +(args[args.indexOf('--fps') + 1]) || 30;
const B = path.join(ROOT, 'episodes', ep, 'build'); fs.mkdirSync(B, { recursive: true });
const srv = await serve(0), port = srv.address().port;
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
await page.goto(`http://127.0.0.1:${port}/engine/index.html?ep=${ep}&capture`);
await page.waitForFunction(() => window.READY, null, { timeout: 60000 });
const { DUR, SFX, fake } = await page.evaluate(() => ({ DUR: window.DUR, SFX: window.SFX, fake: !!window.TL.fake }));
if (fake) console.log('note: no build/timeline.json yet — using estimated timings (run voice first for real sync)');
fs.writeFileSync(path.join(B, 'sfx.json'), JSON.stringify({ duration: DUR, sfx: SFX }, null, 1));
const grab = async t => Buffer.from((await page.evaluate(t => { window.render(t); return window.frameJPEG(); }, t)).split(',')[1], 'base64');
if (preview) {
  const dir = path.join(B, 'preview'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  let i = 0; for (let t = .5; t < DUR; t += 1) fs.writeFileSync(path.join(dir, String(i++).padStart(3, '0') + '.jpg'), await grab(t));
  const cols = 6, rows = Math.ceil(i / cols);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(dir, '*.jpg'), '-vf', `scale=216:-1,tile=${cols}x${rows}`, '-frames:v', '1', path.join(B, 'preview.jpg')]);
  console.log('preview:', path.join(B, 'preview.jpg'), `(${i} frames, ${DUR.toFixed(1)}s)`);
} else {
  const N = Math.ceil(DUR * fps), outF = path.join(B, 'video.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outF], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const buf = await grab(f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\rframe ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`\nvideo: ${outF}`);
}
await browser.close(); srv.close();
