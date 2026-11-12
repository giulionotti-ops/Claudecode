// One clean frame (no captions/top bar), square-cropped: node tools/still.mjs <episode> <t> <out.png> [cropY]
import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [ep, t = '0.2', out = 'still.png', cy = '420'] = process.argv.slice(2);
const srv = await serve(0), b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`http://127.0.0.1:${srv.address().port}/engine/index.html?ep=${ep}&capture&clean`); await p.waitForFunction(() => window.READY);
const d = await p.evaluate(t => { window.render(t); return document.getElementById('out').toDataURL('image/png'); }, +t);
fs.writeFileSync(out + '.full.png', Buffer.from(d.split(',')[1], 'base64'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out + '.full.png', '-vf', `crop=1080:1080:0:${cy}`, out]); fs.rmSync(out + '.full.png');
await b.close(); srv.close(); console.log(out);
