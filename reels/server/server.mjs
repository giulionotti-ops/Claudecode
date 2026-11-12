// Reels server: make reels over HTTP on your own machine/VPS, no Claude session or plugins needed.
//   REELS_TOKEN=secret ELEVENLABS_API_KEY=... node server/server.mjs      → http://HOST:8080
// API (header "Authorization: Bearer $REELS_TOKEN"):
//   GET  /api/episodes                      list episodes
//   GET  /api/episodes/:ep                  script.json
//   PUT  /api/episodes/:ep                  save script.json (body = JSON)
//   POST /api/episodes/:ep/render?preview=1 start a job (voice → render → mix); returns {job}
//   GET  /api/jobs/:id                      {status, log}
//   GET  /files/:ep/reel.mp4 | post.txt | preview.jpg
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import crypto from 'node:crypto';
import { ROOT } from '../tools/serve.mjs';
const PORT = +process.env.PORT || 8080, TOKEN = process.env.REELS_TOKEN || '';
if (!TOKEN) console.warn('WARNING: REELS_TOKEN not set — anyone who can reach this port can use it. Set it on a public server.');
const EPS = path.join(ROOT, 'episodes'), okName = s => /^[a-z0-9][a-z0-9-]{0,60}$/.test(s);
const jobs = new Map(); let running = null; const queue = [];
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
const readBody = req => new Promise((ok, no) => { let n = 0, b = []; req.on('data', c => { n += c.length; if (n > 1e6) { no(new Error('too big')); req.destroy(); } else b.push(c); }); req.on('end', () => ok(Buffer.concat(b).toString())); });
function next() {
  if (running || !queue.length) return;
  const j = running = queue.shift(); j.status = 'running';
  const p = spawn('bash', [path.join(ROOT, 'tools/make.sh'), j.ep, ...(j.preview ? ['--preview'] : [])], { cwd: ROOT, env: process.env });
  const log = d => { j.log += d.toString().replace(/\r/g, '\n'); if (j.log.length > 20000) j.log = j.log.slice(-20000); };
  p.stdout.on('data', log); p.stderr.on('data', log);
  p.on('close', code => { j.status = code === 0 ? 'done' : 'failed'; j.code = code; running = null; next(); });
}
const FILES = { 'reel.mp4': ep => [path.join(EPS, ep, 'out', ep + '.mp4'), 'video/mp4'], 'post.txt': ep => [path.join(EPS, ep, 'out', ep + '.txt'), 'text/plain; charset=utf-8'], 'preview.jpg': ep => [path.join(EPS, ep, 'build', 'preview.jpg'), 'image/jpeg'] };

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), parts = u.pathname.split('/').filter(Boolean);
    if (u.pathname === '/' ) return send(res, 200, fs.readFileSync(path.join(ROOT, 'server/index.html')), 'text/html; charset=utf-8');
    const auth = (req.headers.authorization || '').replace(/^Bearer /, '') || u.searchParams.get('token') || '';
    if (TOKEN && (auth.length !== TOKEN.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(TOKEN)))) return send(res, 401, { error: 'unauthorized' });
    if (parts[0] === 'files' && okName(parts[1]) && FILES[parts[2]]) {
      const [f, type] = FILES[parts[2]](parts[1]); if (!fs.existsSync(f)) return send(res, 404, { error: 'not made yet' });
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': fs.statSync(f).size }); return fs.createReadStream(f).pipe(res);
    }
    if (parts[0] !== 'api') return send(res, 404, { error: 'not found' });
    if (parts[1] === 'episodes' && !parts[2] && req.method === 'GET')
      return send(res, 200, fs.readdirSync(EPS).filter(okName).map(ep => ({ ep, reel: fs.existsSync(FILES['reel.mp4'](ep)[0]), title: JSON.parse(fs.readFileSync(path.join(EPS, ep, 'script.json'))).title || ep })));
    if (parts[1] === 'episodes' && parts[2]) {
      const ep = parts[2]; if (!okName(ep)) return send(res, 400, { error: 'name: lowercase letters, digits, dashes' });
      const sf = path.join(EPS, ep, 'script.json');
      if (!parts[3] && req.method === 'GET') return fs.existsSync(sf) ? send(res, 200, fs.readFileSync(sf), 'application/json; charset=utf-8') : send(res, 404, { error: 'no such episode' });
      if (!parts[3] && req.method === 'PUT') {
        const s = JSON.parse(await readBody(req)); if (!Array.isArray(s.lines) || !s.lines.length) return send(res, 400, { error: 'script needs lines[]' });
        fs.mkdirSync(path.dirname(sf), { recursive: true }); fs.writeFileSync(sf, JSON.stringify(s, null, 1)); return send(res, 200, { saved: ep });
      }
      if (parts[3] === 'render' && req.method === 'POST') {
        if (!fs.existsSync(sf)) return send(res, 404, { error: 'no such episode' });
        const id = crypto.randomUUID().slice(0, 8), j = { id, ep, preview: u.searchParams.get('preview') === '1', status: 'queued', log: '' };
        jobs.set(id, j); queue.push(j); next(); return send(res, 202, { job: id });
      }
    }
    if (parts[1] === 'jobs' && jobs.has(parts[2])) { const j = jobs.get(parts[2]); return send(res, 200, { status: j.status, ep: j.ep, preview: j.preview, log: j.log.slice(-4000) }); }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '0.0.0.0', () => console.log(`reels server on http://0.0.0.0:${PORT}`));
