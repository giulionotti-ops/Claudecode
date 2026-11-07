// Saves every brand piece as a JPG next to this file. Run from the channel folder: node brand/render.mjs
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.wav': 'audio/wav' };
export function serve() { return new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0, () => r(s)); }); }
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const srv = await serve(), port = srv.address().port, br = await chromium.launch(), pg = await br.newPage();
  pg.on('pageerror', e => console.error('PAGE', e.message));
  await pg.goto(`http://localhost:${port}/brand/index.html`); await pg.waitForFunction('window.READY');
  const only = process.argv[2]; const list = (await pg.evaluate('window.ART')).filter(n => !only || n === only);
  for (const n of list) {
    await pg.goto(`http://localhost:${port}/brand/index.html?art=${n}`); await pg.waitForFunction('window.READY');
    const b64 = await pg.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', .93).split(',')[1]);
    fs.writeFileSync(path.join(ROOT, 'brand', n + '.jpg'), Buffer.from(b64, 'base64')); console.log('saved', n);
  }
  await br.close(); srv.close();
}
