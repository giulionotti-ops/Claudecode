// Neesmo Studio UI: first-run setup, channel agent dashboards, @tags on the home composer, Studio settings.
// Uses the main page's helpers ($, api, esc, say, loadAgents, openReport, openNote, notes, agCfg ...).
// Does nothing on a plain Neesmo install (no studio/state.json on the server).
(() => {
const S = { st: null, ch: {}, chd: null, timer: 0 };
window.studioSt = () => S.st;   // read by the auto-permission tip in index.html
const J = (path, body, method = 'POST') => api('/api/studio' + path, body instanceof FormData ? { method, body }
  : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then(r => r.json());
const G = path => api('/api/studio' + path).then(r => r.json());
const yt = () => S.st?.edition !== 'instagram';
const platform = () => S.st?.edition === 'director' ? 'Director' : yt() ? 'YouTube' : 'Instagram';
const PLAT = { youtube: 'YouTube', instagram: 'Instagram' };
const media = (aid, p) => `/api/studio/channels/${encodeURIComponent(aid)}/media?p=${encodeURIComponent(p)}`;
const ago = ts => { if (!ts) return ''; const m = Math.round((Date.now() - new Date(ts)) / 6e4);
  return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
const STATUS = { making: 'Making', ready_for_review: 'Waiting for you', needs_owner: 'Needs you', approved: 'Approved',
  scheduled: 'Scheduled', posted: 'Posted', rejected: 'Rejected', failed: 'Failed' };

document.body.insertAdjacentHTML('beforeend', `
<div id="onb" hidden role="dialog" aria-modal="true" aria-label="Neesmo setup"><div class="ob" id="onb-b"></div></div>
<button type="button" id="warm-pill" hidden></button>
<div id="tagbar" hidden role="listbox" aria-label="Tag an agent"></div>
<dialog class="chd" id="chd" aria-labelledby="chd-t"><div class="rp" id="chd-b"></div></dialog>`);

async function refresh() {
  try { S.st = await G('/state'); } catch { return; }
  if (!S.hinted && typeof loadNotes === 'function') { S.hinted = true; loadNotes(); }  // auto-permission tip needs the state
  if (!S.st.studio) return;
  const lab = $('#studio-label'); if (lab) { lab.textContent = S.st.studio_label || ''; lab.hidden = !S.st.studio_label; }
  onboarding();
  settingsBlock();
}

// ------------------------------------------------------------------ first-run setup
const STEP_N = ['install', 'intro', 'permissions', 'name', 'look', 'warmup', 'ready'];
const dots = s => `<div class="dots" aria-hidden="true">${STEP_N.map((x, i) => `<i class="${i <= STEP_N.indexOf(s) ? 'on' : ''}"></i>`).join('')}</div>`;
let hideWarm = sessionStorage.getItem('neesmo-warm-hide') === '1';
const step = s => J('/step', { step: s }).then(refresh);

function onboarding() {
  const st = S.st, box = $('#onb-b'), onb = $('#onb');
  let s = st.step || 'install';
  const noChannel = !(st.channels || []).length && localStorage.getItem('neesmo-chan-later') !== '1';
  const show = s !== 'ready' || noChannel;
  $('#warm-pill').hidden = !(s === 'warmup' && st.warmup_left != null && hideWarm);
  $('#warm-pill').textContent = `Warm-up: ${st.warmup_left} day${st.warmup_left === 1 ? '' : 's'} left`;
  if (!show || (s === 'warmup' && hideWarm)) { onb.hidden = true; return; }
  const typing = (box.contains(document.activeElement) && document.activeElement.matches('input,textarea'))
    || [...box.querySelectorAll('input:not([type=file]),textarea')].some(i => i.value);
  if (box.dataset.step === s && (typing || (s !== 'install' && s !== 'look' && s !== 'warmup'))) { onb.hidden = false; return; }   // don't wipe typing
  if (box.dataset.step !== s) { S.polls = 0; clearInterval(S.gh); }
  box.dataset.step = s; onb.hidden = false;
  ({ install: vInstall, intro: vIntro, permissions: vPerm, name: vName, look: vLook, warmup: vWarm, ready: vReady }[s] || vInstall)(box, st);
}

function vInstall(box, st) {
  const inst = st.install || {}, items = inst.items || [], c = st.connectors || {};
  const groups = { general: 'Basics', marketing: 'Marketing skills', content: 'Video skills', analysis: 'Learning skills', connect: 'Your accounts' };
  const started = items.length > 0, done = inst.done && !st.install.running;
  const okReq = items.filter(i => i.required).every(i => i.status === 'ok');
  const conn = { github: c.github, youtube: c.youtube, instagram: c.instagram };
  const list = Object.entries(groups).map(([g, label]) => {
    const rows = items.filter(i => i.group === g); if (!rows.length) return '';
    return `<div class="grp">${label}</div><ul class="inst">${rows.map(i => {
      const status = i.group === 'connect' ? (conn[i.id] ? 'ok' : 'waiting') : i.status;
      return `<li class="${esc(status)}"><span class="s"></span><span>${esc(i.label)}${i.msg && status === 'failed' ? `<small>${esc(i.msg)}</small>` : ''}</span><span></span></li>`;
    }).join('')}</ul>`;
  }).join('');
  const logins = items.filter(i => i.login && i.login.action);
  const guides = logins.map(i => guide(i, conn[i.id])).join('');
  const free = items.find(i => i.id === 'omniroute')?.login;
  box.innerHTML = `${dots('install')}<h2>Setting up Neesmo</h2>
    <p>Neesmo installs everything it needs by itself: free tools, memory, marketing skills and video skills. Nothing here uses paid credits.</p>
    ${started ? list : '<p>This takes a few minutes. You can watch it happen.</p>'}
    ${done ? `<p><b>Now connect your accounts.</b> Each one takes a minute. Neesmo walks you through it.</p>${guides}` : ''}
    ${free && done ? `<details class="guide"><summary>${esc(free.title)}</summary><ol>${free.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>` : ''}
    <p class="err" id="onb-err"></p>
    <div class="btns">${!started || (done && !okReq) ? `<button type="button" class="main" id="ob-run">${started ? 'Try again' : 'Start setup'}</button>` : ''}
    ${done ? `<button type="button" class="${conn.github && (yt() ? conn.youtube : conn.instagram) ? 'main' : ''}" id="ob-next">${conn.github && (yt() ? conn.youtube : conn.instagram) ? 'Continue' : 'Skip for now'}</button>` : ''}</div>`;
  $('#ob-run') && ($('#ob-run').onclick = async () => { await J('/install'); poll(); });
  $('#ob-next') && ($('#ob-next').onclick = () => step('intro'));
  wireGuides(box);
  if (started && !done) poll();
}
function poll() {
  clearTimeout(S.timer);
  if ((S.polls = (S.polls || 0) + 1) > 240) {   // ~10 min: the server probably restarted mid-job
    const e = $('#onb-b').querySelector('.err') || $('#onb-b').appendChild(Object.assign(document.createElement('p'), { className: 'err' }));
    e.textContent = 'This is taking too long. Reload the page; if it still hangs, press "Draw new ones" or restart Neesmo.'; return;
  }
  S.timer = setTimeout(refresh, 2500);
}

function guide(i, ok) {
  const l = i.login, a = l.action;
  let act = '';
  if (ok) act = '<p>✓ Connected.</p>';
  else if (a === 'github') act = `<div class="btns"><button type="button" data-act="github">Connect GitHub</button></div><div data-out="github"></div>`;
  else if (a === 'youtube') act = `
    <label>1. The OAuth client file (JSON)</label><input type="file" accept=".json,application/json" data-act="yt-file">
    <div class="btns"><button type="button" data-act="yt-url">2. Open Google sign-in</button></div>
    <label>3. After you allow, the page will not load. That's fine: copy its full address and paste it here.</label>
    <input data-in="yt-back" placeholder="http://localhost:8765/?code=..." autocomplete="off">
    <div class="btns"><button type="button" data-act="yt-finish">Connect</button></div>`;
  else if (a === 'instagram') act = `<input data-in="ig" placeholder="Paste your access token" autocomplete="off">
    <div class="btns"><button type="button" data-act="ig">Connect</button></div>`;
  return `<div class="guide${ok ? ' done' : ''}"><b>${esc(l.title)}</b>${ok ? '' : `<ol>${l.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`}${act}</div>`;
}
function wireGuides(box) {
  const err = t => { const e = box.querySelector('#onb-err') || box.querySelector('.err'); if (e) e.textContent = t || ''; };
  box.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
    err(''); b.disabled = true;
    try {
      if (b.dataset.act === 'github') {
        const r = await J('/github/start');
        box.querySelector('[data-out="github"]').innerHTML = `<p>Open <a href="${r.url}" target="_blank" rel="noopener">github.com/login/device</a> and type:</p><p class="code">${esc(r.code)}</p><p>Neesmo notices by itself when you're done.</p>`;
        clearInterval(S.gh); let n = 0;
        S.gh = setInterval(async () => { if (++n > 150) return clearInterval(S.gh); try { const st = await G('/state'); if (st.connectors.github) { clearInterval(S.gh); refresh(); } } catch {} }, 4000);
      } else if (b.dataset.act === 'yt-url') {
        const r = await G('/youtube/auth-url'); window.open(r.url, '_blank', 'noopener');
      } else if (b.dataset.act === 'yt-finish') {
        await J('/youtube/auth-finish', { url: box.querySelector('[data-in="yt-back"]').value.trim() }); refresh();
      } else if (b.dataset.act === 'ig') {
        await J('/instagram', { token: box.querySelector('[data-in="ig"]').value.trim() }); refresh();
      }
    } catch (x) { err(x.message); }
    b.disabled = false;
  };
  box.onchange = async e => {
    if (e.target.dataset.act !== 'yt-file' || !e.target.files[0]) return;
    const fd = new FormData(); fd.append('file', e.target.files[0]);
    try { await J('/youtube/client', fd); err(''); e.target.insertAdjacentHTML('afterend', '<small>✓ File saved. Now step 2.</small>'); } catch (x) { err(x.message); }
  };
}

function vIntro(box) {
  box.innerHTML = `${dots('intro')}<h2>Everything is ready.</h2>
    <p>One honest thing before we start. Neesmo is built for one job: to help your ${yt() ? 'channel' : 'account'} go viral.</p>
    <p>That doesn't happen by luck. It comes from small steps done right, in the right order. Some of them feel slow (like waiting 10 days before the first post). They are there for a reason.</p>
    <p><b>So my advice: follow every step.</b> I'll keep it simple and tell you what to do each time.</p>
    <div class="btns"><button type="button" class="main" id="ob-go">Got it, let's go</button></div>`;
  $('#ob-go').onclick = () => step('permissions');
}

function vPerm(box) {
  box.innerHTML = `${dots('permissions')}<h2>Fewer interruptions?</h2>
    <p>Your agents do many small steps for each video (write a file, run a render...). By default, Claude asks before each step, and every question becomes a notification.</p>
    <p><b>Auto permissions</b> lets safe steps run by themselves, so you only hear about videos and important things. You can change this any time in Settings › System.</p>
    <div class="btns"><button type="button" id="ob-no">No, ask me every time</button><button type="button" class="main" id="ob-yes">Yes, use auto (recommended)</button></div>`;
  const go = async auto => { await J('/settings', { auto_permissions: auto, notify: 'important' }); step('name'); };
  $('#ob-yes').onclick = () => go(true); $('#ob-no').onclick = () => go(false);
}

function vName(box, st) {
  box.innerHTML = `${dots('name')}<h2>What's your ${yt() ? 'channel' : 'account'} called?</h2>
    <p>Pick the name people will see. Short and easy to say works best. Not sure yet? Write the topic and you can change it later.</p>
    <input id="ob-name" maxlength="40" placeholder="e.g. Tiny Facts" value="${esc(st.channel_name || '')}">
    <p class="err" id="onb-err"></p>
    <div class="btns"><button type="button" class="main" id="ob-ok">Draw my ${yt() ? 'avatar and banner' : 'avatar'}</button></div>`;
  const ok = async () => { try { await J('/name', { name: $('#ob-name').value }); refresh(); } catch (x) { $('#onb-err').textContent = x.message; } };
  $('#ob-ok').onclick = ok; $('#ob-name').onkeydown = e => { if (e.key === 'Enter') ok(); };
  $('#ob-name').focus();
}

async function vLook(box, st) {
  const L = await G('/looks').catch(() => ({ ready: false, looks: [] }));
  const img = (p, v, cls) => p ? `<img class="${cls}" src="/api/studio/looks/${encodeURIComponent(p.split('/').pop())}?v=${esc(v)}" alt="">` : '';
  if (!L.ready) {
    box.innerHTML = `${dots('look')}<h2>Drawing "${esc(st.channel_name)}"…</h2><p>Neesmo is drawing one ${yt() ? 'avatar and banner' : 'avatar'} in each style. Each picture is made by code, in a different art style, so you can pick your favourite.</p><p>About a minute.</p>`;
    return poll();
  }
  box.innerHTML = `${dots('look')}<h2>Pick your look</h2>
    <p>One per style. Tap the one you like most: it also sets the style of your videos.${yt() && st.connectors?.youtube ? ' The banner goes straight onto your channel.' : ''}</p>
    ${L.error ? `<p class="err">${esc(L.error)}</p>` : !L.looks.length ? '<p class="err">No pictures came out this time. Press "Draw new ones".</p>' : ''}
    <div class="looks">${L.looks.map(l => `<button type="button" class="look" data-style="${esc(l.style)}">${img(l.avatar, l.v, 'av')}${img(l.banner, l.v, 'bn')}<b>${esc(l.label)}</b></button>`).join('')}</div>
    <p class="err" id="onb-err"></p>
    <div class="btns"><button type="button" id="ob-again">Draw new ones</button><button type="button" id="ob-rename">Change the name</button></div>`;
  box.querySelector('.looks').onclick = async e => {
    const b = e.target.closest('.look'); if (!b) return;
    try { const r = await J('/look', { style: b.dataset.style }); if (r.banner_set) say('Your new banner is on YouTube.', 'vega'); refresh(); }
    catch (x) { $('#onb-err').textContent = x.message; }
  };
  $('#ob-again').onclick = async () => { await J('/name', { name: st.channel_name }); refresh(); };
  $('#ob-rename').onclick = () => step('name');
}

function vWarm(box, st) {
  const look = st.look || {};
  const av = look.avatar ? `<p>Download your ${yt() ? 'avatar and banner' : 'avatar'} and add ${yt() ? 'them' : 'it'} to the account: <a href="/api/studio/looks/${encodeURIComponent(look.avatar.split('/').pop())}" download>avatar</a>${look.banner ? ` · <a href="/api/studio/looks/${encodeURIComponent(look.banner.split('/').pop())}" download>banner</a>` : ''}</p>` : '';
  if (!st.warmup_start) {
    box.innerHTML = `${dots('warmup')}<h2>First, 10 days as a normal viewer</h2>
      <p>New ${yt() ? 'channels' : 'accounts'} that post on day one often get treated like spam. So for ${st.warmup_days} days, use it like anyone would:</p>
      <ul class="tips"><li>Watch videos in your topic for 10-20 minutes a day, to the end.</li><li>Like and leave a real comment on a few.</li>
      <li>Follow or subscribe to 5-10 creators you'd want to be like.</li><li>Fill in your bio${yt() ? ', avatar and banner' : ' and avatar'}.</li><li>Don't post yet.</li></ul>
      ${av}<p>Neesmo counts the days and tells you when it's time. Then it starts making videos.</p>
      <div class="btns"><button type="button" class="main" id="ob-start">Start the 10 days</button></div>`;
    $('#ob-start').onclick = async () => { await J('/warmup/start'); refresh(); };
    return;
  }
  box.innerHTML = `${dots('warmup')}<h2>Warm-up</h2><div class="big">${st.warmup_left}</div><p>day${st.warmup_left === 1 ? '' : 's'} left. Keep watching, liking and following like a normal viewer. No posts yet.</p>
    ${av}<p>Meanwhile you can send Neesmo pictures or videos you like (in the chat, or on the agent's card): it uses them as inspiration.</p>
    <div class="btns"><button type="button" id="ob-over">The 10 days are over</button><button type="button" class="main" id="ob-hide">OK, close</button></div>`;
  $('#ob-hide').onclick = () => { hideWarm = true; sessionStorage.setItem('neesmo-warm-hide', '1'); onboarding(); };
  $('#ob-over').onclick = async () => { if (st.warmup_left > 0 && !confirm(`There are still ${st.warmup_left} days to go. Skipping them can hurt your reach. Start anyway?`)) return; await J('/warmup/done'); refresh(); };
}
$('#warm-pill').onclick = () => { hideWarm = false; sessionStorage.removeItem('neesmo-warm-hide'); $('#onb-b').dataset.step = ''; onboarding(); };

function vReady(box, st) {
  box.innerHTML = `${dots('ready')}<h2>Time to make videos</h2>
    <p>Neesmo now makes a <b>channel agent</b> for "${esc(st.channel_name || 'your channel')}". It runs the ${yt() ? 'channel' : 'account'} for you: a marketer writes hooks and scripts, a producer makes the video, a supervisor checks it and an analyst learns from the numbers. It shows up on your home screen as a card.</p>
    <p>For the first ${st.trial_days} days, every video waits for your OK before it's scheduled.</p>
    <label for="ob-brief">What is it about? Who is it for? (a few words is fine)</label>
    <textarea id="ob-brief" rows="3" placeholder="e.g. surprising science facts in 30 seconds, for curious teens"></textarea>
    <p class="err" id="onb-err"></p>
    <div class="btns"><button type="button" id="ob-later">Later</button><button type="button" class="main" id="ob-make">Create my channel agent</button></div>`;
  $('#ob-later').onclick = () => { localStorage.setItem('neesmo-chan-later', '1'); $('#onb').hidden = true; };
  $('#ob-make').onclick = async () => {
    const brief = $('#ob-brief').value.trim(); if (!brief) { $('#onb-err').textContent = 'Write a few words about the topic.'; return; }
    $('#ob-make').disabled = true;
    try { await J('/channels', { name: st.channel_name, brief }); $('#onb').hidden = true; await refresh(); loadAgents(); say('Your channel agent is on the home screen. Tap its card to watch it work.', 'vega'); }
    catch (x) { $('#onb-err').textContent = x.message; $('#ob-make').disabled = false; }
  };
}

// ------------------------------------------------------------------ channel cards = dashboards
const isChan = id => (S.st?.channels || []).includes(id);
async function enhance() {
  if (!S.st?.studio) return;
  for (const el of document.querySelectorAll('.agent')) {
    const id = el.dataset.id; if (!isChan(id)) continue;
    el.classList.add('chan');
    let d = S.ch[id];
    if (!d || Date.now() - d._t > 14000) { try { d = S.ch[id] = { ...(await G('/channels/' + encodeURIComponent(id))), _t: Date.now() }; } catch { continue; } }
    const c = d.counts || {}, r = d.running || {};
    const run = d.busy && r.role ? `${(d.roles.find(x => x.id === r.role) || {}).label || r.role} · video ${r.video || ''}` : d.warmup_left ? `Warm-up: ${d.warmup_left} days` : d.settings?.paused ? 'Paused' : 'Waiting for the next slot';
    const pic = d.banner ? media(id, d.banner) + '&v=' + d.banner_v : d.last_poster ? media(id, d.last_poster) : '';
    if (d.avatar && el.querySelector('.mono-a')) el.querySelector('.mono-a').innerHTML = `<img src="${media(id, d.avatar)}&v=${d.avatar_v}" alt="">`;
    // compact card; the banner, numbers and current step unfold on hover (desktop) or keyboard focus
    el.querySelector('small').insertAdjacentHTML('afterend', `<span class="more"><span class="more-in">${pic ? `<img class="pv${d.banner ? ' bn' : ''}" src="${pic}" alt="">` : ''}
      <span class="dash"><span><b>${(c.ready_for_review || 0) + (c.needs_owner || 0)}</b>review</span><span><b>${c.scheduled || 0}</b>sched.</span><span><b>${c.posted || 0}</b>live</span><span><b>${kfmt(d.stats?.views)}</b>views</span></span>
      <span class="run${d.busy ? ' on' : ''}">${esc(run)}</span></span></span>`);
    if (d.busy) el.querySelector('b').textContent = 'Working';
  }
  if (S.chd && $('#chd').open && !S.vd) openChd(S.chd, true);
}
const _loadAgents = loadAgents;
loadAgents = async (...a) => { await _loadAgents(...a); await enhance(); };
// a channel card opens its dashboard instead of the chat (the dashboard has a Chat button)
document.addEventListener('click', e => {
  const b = e.target.closest('.agent.chan'); if (!b || dragOn) return;
  e.stopImmediatePropagation(); e.preventDefault(); openChd(b.dataset.id);
}, true);

const ROLE_ICON = { marketer: 'pen', producer: 'film', supervisor: 'check', main: 'check', analyst: 'chart' };
// ring progress: share of the channel's videos that are live
function ring(n, of) {
  const p = of ? n / of : 0, C = 2 * Math.PI * 24;
  return `<span class="ring" role="img" aria-label="${Math.round(p * 100)}% of videos live"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/><circle cx="30" cy="30" r="24" class="on" stroke-dasharray="${(p * C).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${Math.round(p * 100)}%</b><small>live</small></span>`;
}
async function openChd(id, soft) {
  S.chd = id; const dlg = $('#chd'), box = $('#chd-b');
  let d; try { d = S.ch[id] = { ...(await G('/channels/' + encodeURIComponent(id))), _t: Date.now() }; } catch (x) { return say(x.message, 'vega'); }
  const a = (lastAgents || []).find(x => x.id === id) || { name: id };
  dlg.style.setProperty('--a', AGENT_COLORS[id] || 'var(--c)');
  const c = d.counts || {}, s = d.settings || {}, r = d.running || {}, st = d.stats || {};
  const sub = d.warmup_left ? `Warm-up: ${d.warmup_left} days left` : d.in_trial ? `Trial week: every video waits for your OK` : s.auto_schedule ? 'Schedules by itself' : 'Every video waits for your OK';
  const vids = (d.videos || []).slice().reverse();
  if (soft && document.activeElement?.closest?.('#chd form')) return;   // don't redraw under typing
  box.innerHTML = `<header><div><h2 id="chd-t">${esc(a.name)}</h2><small>${esc(sub)}${s.paused ? ' · paused' : ''}</small></div>
    <div class="hb"><button type="button" id="chd-make" class="main">Make a video now</button><button type="button" id="chd-set">Settings</button><button type="button" id="chd-full">${dlg.classList.contains('full') ? 'Exit full screen' : 'Full screen'}</button><button type="button" id="chd-x" aria-label="Close">✕</button></div></header>
    <div class="kp">
      <div class="k hero o"><span class="kh"><i class="ri" data-i="eye"></i><small>Views</small></span><b>${kfmt(st.views)}</b><small>across ${(d.platforms || ['youtube']).length} platform${(d.platforms || []).length > 1 ? 's' : ''}</small></div>
      <div class="k hero g"><div><span class="kh"><i class="ri" data-i="users"></i><small>${yt() ? 'Subscribers' : 'Followers'}</small></span><b>+${kfmt(st.subs)}</b><small>gained</small></div>${ring(c.posted || 0, (c.posted || 0) + (c.scheduled || 0) + (c.ready_for_review || 0) + (c.needs_owner || 0))}</div>
      <div class="k"><i class="ri" data-i="play"></i><b>${c.posted || 0}</b><small>live</small></div>
      <div class="k"><i class="ri" data-i="clock"></i><b>${c.scheduled || 0}</b><small>scheduled</small></div>
      <div class="k${(c.ready_for_review || 0) + (c.needs_owner || 0) ? ' hot' : ''}"><i class="ri" data-i="inbox"></i><b>${(c.ready_for_review || 0) + (c.needs_owner || 0)}</b><small>waiting for you</small></div>
      <div class="k"><i class="ri" data-i="coin"></i><b>$${(d.cost_usd || 0).toFixed(2)}</b><small>Claude use (est.)</small></div>
    </div>
    <nav class="roles" aria-label="Crew">${d.roles.map(x => `<span class="${d.busy && r.role === x.id ? 'on' : ''}"><i data-i="${ROLE_ICON[x.id] || 'spark'}"></i>${esc(x.label)}${d.busy && r.role === x.id ? ' · working' : ''}</span>`).join('')}</nav>
    <div class="cols">
      <section class="vlist"><h3>Videos</h3><div class="vids">${vids.map(v => vRow(id, v, d.platforms || ['youtube'])).join('') || '<small>No videos yet.</small>'}</div></section>
      <section><h3>Timeline</h3><ol class="ev">${(d.events || []).slice().reverse().map(e => `<li><small>${esc(ago(e.ts))}</small>${esc(e.text)}</li>`).join('') || '<li>Nothing yet.</li>'}</ol></section>
      <section><h3>Team board</h3><pre>${esc((Array.isArray(d.board) ? d.board.join('\n') : d.board) || 'The agents write to each other here.')}</pre>
        <h3 style="margin-top:12px">What it learned</h3><pre>${esc((Array.isArray(d.lessons) ? d.lessons.join('\n') : d.lessons) || 'Lessons appear after the first videos have numbers.')}</pre>
        <h3 style="margin-top:12px">Inspiration</h3><small>Pictures or clips you like. The marketer and producer use them as reference.</small>
        <input type="file" id="chd-insp" accept="image/*,video/mp4" multiple></section>
    </div>`;
  window.paintIcons?.(box);
  const q = sel => box.querySelector(sel);
  q('#chd-x').onclick = () => dlg.close();
  q('#chd-full').onclick = () => { dlg.classList.toggle('full'); openChd(id, true); };
  q('#chd-set').onclick = async () => { dlg.close(); await loadAgentCfg(); const i = agCfg.agents.findIndex(x => x.id === id); if (i >= 0) { openAgentEditor(i); showAgTab('channel'); } };
  q('#chd-make').onclick = async () => { try { const r = await J(`/channels/${encodeURIComponent(id)}/make`); say(r.ok ? `${a.name} started a new video.` : r.msg, 'vega'); openChd(id, true); } catch (x) { say(x.message, 'vega'); } };
  q('#chd-insp').onchange = async e => { for (const f of e.target.files) { const fd = new FormData(); fd.append('file', f);
    try { await J(`/channels/${encodeURIComponent(id)}/inspiration`, fd); } catch (x) { say(x.message, 'vega'); } } say('Thanks, the team will use it.', 'vega'); openChd(id, true); };
  box.querySelector('.vids').onclick = e => { const b = e.target.closest('.vid'); if (b) openVideo(id, b.dataset.v); };
  if (!dlg.open) dlg.showModal();
}

// one row of the video list: poster, #number + title, status, a couple of numbers per platform
function vRow(aid, v, plats) {
  const when = v.publish_at ? new Date(v.publish_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ago(v.created) + ' ago';
  const nums = plats.map(p => { const n = (v.nums || {})[p];
    return `<span class="pn p-${p}" title="${PLAT[p]}"><i>${p === 'youtube' ? 'YT' : 'IG'}</i>${n ? `<b>${kfmt(n.views)}</b> views · <b>${kfmt(n.likes)}</b> likes` : '<em>not posted</em>'}</span>`; }).join('');
  return `<button type="button" class="vid" data-v="${esc(v.id)}">${v.poster ? `<img src="${media(aid, v.poster)}" alt="" loading="lazy">` : '<img alt="">'}
    <div><b><span class="vno">${esc(v.chat || '#' + v.id)}</span> ${esc(v.title || 'Video ' + v.id)}</b>
    <span><span class="st-${esc(v.status)}">${esc(STATUS[v.status] || v.status)}</span> · ${esc(when)}</span><span class="nums">${nums}</span></div></button>`;
}

// ------------------------------------------------------------------ one video: numbers per platform + its own chat
const num = x => x == null ? '–' : typeof x === 'number' ? (Math.abs(x) >= 1e4 ? kfmt(x) : x.toLocaleString(undefined, { maximumFractionDigits: 1 })) : esc(x);
function chart(daily) {
  if (!daily?.length) return '<p class="none">Daily numbers appear a day after the video is posted.</p>';
  const W = 640, H = 220, L = 40, R = 40, T = 14, B = 26, n = daily.length, bw = (W - L - R) / n;
  const mv = Math.max(1, ...daily.map(x => x.views || 0)), ml = Math.max(1, ...daily.map(x => x.likes || 0));
  const y = (v, m) => T + (H - T - B) * (1 - v / m);
  const bars = daily.map((x, i) => `<rect x="${(L + i * bw + bw * .15).toFixed(1)}" y="${y(x.views || 0, mv).toFixed(1)}" width="${(bw * .7).toFixed(1)}" height="${(H - B - y(x.views || 0, mv)).toFixed(1)}"><title>${esc(x.d)}: ${x.views} views</title></rect>`).join('');
  const pts = daily.map((x, i) => `${(L + i * bw + bw / 2).toFixed(1)},${y(x.likes || 0, ml).toFixed(1)}`);
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(mv * f, mv)}" y2="${y(mv * f, mv)}"/><text x="${L - 6}" y="${y(mv * f, mv) + 4}" text-anchor="end">${kfmt(Math.round(mv * f))}</text><text x="${W - R + 6}" y="${y(ml * f, ml) + 4}">${kfmt(Math.round(ml * f))}</text>`).join('');
  const lab = daily.map((x, i) => i % Math.ceil(n / 7) ? '' : `<text x="${L + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(new Date(x.d).toLocaleDateString([], { day: 'numeric', month: 'short' }))}</text>`).join('');
  return `<div class="leg"><span class="lb">Views</span><span class="ll">Likes</span></div>
    <svg viewBox="0 0 ${W} ${H}" class="vc" role="img" aria-label="Daily views and likes"><g class="gr">${grid}</g><g class="bars">${bars}</g>
    <polyline class="ln" points="${pts.join(' ')}"/>${pts.map(p => `<circle class="dot" cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3"/>`).join('')}<g class="ax">${lab}</g></svg>`;
}
function topList(title, rows) {
  const m = Math.max(1, ...rows.map(r => r.views || 0));
  return `<div class="vcard"><h4>${esc(title)}</h4>${rows.map(r => `<div class="tr"><span>${esc(r.name)}</span><i style="width:${(100 * (r.views || 0) / m).toFixed(0)}%"></i><b>${num(r.views)}</b></div>`).join('')}</div>`;
}
function platPane(p, d) {
  if (!d.posted) return `<p class="none">This video is not on ${PLAT[p]} yet. Its numbers show here once it is posted.</p>`;
  const tiles = d.kpis.map(k => `<div class="tile"><small>${esc(k.label)}</small><b>${num(k.value)}</b>${k.delta == null ? '' : `<em class="${k.delta >= 0 ? 'up' : 'dn'}">${k.delta >= 0 ? '▲' : '▼'} ${Math.abs(k.delta)}%</em>`}</div>`).join('');
  return `<div class="vgrid"><div class="tiles">${tiles}</div><div class="vcard"><h4>Views &amp; Likes</h4>${chart(d.daily)}</div></div>
    <p class="cmp">Arrows compare with this channel's average video on ${PLAT[p]}.${d.pct_viewed != null ? ` Viewers watch ${num(d.pct_viewed)}% of it.` : ''}${d.subs != null ? ` ${num(d.subs)} ${p === 'youtube' ? 'subscribers' : 'followers'} gained.` : ''}</p>
    ${Object.keys(d.top || {}).length ? `<div class="tops">${Object.entries(d.top).map(([t, r]) => topList(t, r)).join('')}</div>` : ''}`;
}
function chatHtml(c) {
  const who = { owner: 'you', neesmo: 'vega' };
  return c.messages.map(m => `<p class="${who[m.role] || 'vega'}${m.error ? ' err' : ''}">${esc(m.text)}</p>`).join('')
    + (c.busy ? `<p class="vega wait">${c.busy === 'compacting' ? 'Tidying up this chat to keep it cheap…' : 'Working on it…'}</p>` : '');
}
async function openVideo(aid, vid, tab) {
  const box = $('#chd-b');
  let d; try { d = await G(`/channels/${encodeURIComponent(aid)}/videos/${encodeURIComponent(vid)}`); } catch (x) { return say(x.message, 'vega'); }
  const v = d.video, plats = Object.keys(d.platforms);
  tab = tab && plats.includes(tab) ? tab : plats[0];
  box.innerHTML = `<header><div><h2 id="chd-t"><span class="vno">${esc(d.chat.name)}</span> ${esc(v.title || 'Video ' + v.id)}</h2>
      <small>${esc(STATUS[v.status] || v.status)}${v.publish_at ? ' · ' + esc(new Date(v.publish_at).toLocaleString()) : ''}</small></div>
    <div class="hb"><button type="button" id="vd-back">← Videos</button><button type="button" id="chd-x" aria-label="Close">✕</button></div></header>
    <div class="vd">
      <div class="vmain">
        ${plats.length > 1 ? `<div class="ptabs" role="tablist">${plats.map(p => `<button type="button" role="tab" data-p="${p}" aria-selected="${p === tab}">${PLAT[p]}</button>`).join('')}</div>` : ''}
        <div id="vd-pane">${platPane(tab, d.platforms[tab])}</div>
        ${v.video ? `<video class="play" src="${media(aid, v.video)}" controls playsinline preload="metadata"></video>` : ''}
        ${v.hook ? `<p class="cmp"><b>Hook:</b> ${esc(v.hook)}</p>` : ''}
      </div>
      <aside class="vchat"><h3>Chat ${esc(d.chat.name)}</h3><div class="vlog" id="vd-log">${chatHtml(d.chat)}</div>
        <form id="vd-f"><input id="vd-q" placeholder="Ask for a change to ${esc(d.chat.name)}" autocomplete="off"><button type="submit">Send</button></form>
        <small class="ctx">${d.chat.ctx_pct ? `Chat memory ${d.chat.ctx_pct}% full` : ''}</small></aside>
    </div>`;
  const q = sel => box.querySelector(sel);
  const log = q('#vd-log'); log.scrollTop = log.scrollHeight;
  q('#chd-x').onclick = () => $('#chd').close();
  q('#vd-back').onclick = () => { clearTimeout(S.vt); S.vd = null; openChd(aid); };
  box.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => { box.querySelectorAll('.ptabs button').forEach(x => x.setAttribute('aria-selected', String(x === b))); q('#vd-pane').innerHTML = platPane(b.dataset.p, d.platforms[b.dataset.p]); });
  const paint = c => { log.innerHTML = chatHtml(c); log.scrollTop = log.scrollHeight; q('.ctx').textContent = c.ctx_pct ? `Chat memory ${c.ctx_pct}% full` : '';
    clearTimeout(S.vt); if (c.busy) S.vt = setTimeout(poll, 3000); };
  const poll = async () => { if (S.vd !== vid || !$('#chd').open) return; try { paint(await G(`/channels/${encodeURIComponent(aid)}/videos/${encodeURIComponent(vid)}/chat`)); } catch {} };
  q('#vd-f').onsubmit = async e => { e.preventDefault(); const t = q('#vd-q').value.trim(); if (!t) return; q('#vd-q').value = '';
    try { paint(await J(`/channels/${encodeURIComponent(aid)}/videos/${encodeURIComponent(vid)}/chat`, { text: t })); } catch (x) { say(x.message, 'vega'); } };
  S.vd = vid; if (d.chat.busy) S.vt = setTimeout(poll, 3000);
  if (!$('#chd').open) $('#chd').showModal();
}
$('#chd').addEventListener('click', e => { if (e.target.id === 'chd') e.target.close(); });
$('#chd').addEventListener('close', () => { S.chd = null; S.vd = null; clearTimeout(S.vt); });

// ------------------------------------------------------------------ @tags on the home composer
const tagbar = $('#tagbar');
const tagList = () => (lastAgents || []).map(a => ({ id: a.id, label: AGENT_SHORT[a.id] || a.name, color: AGENT_COLORS[a.id] }));
$('#q').addEventListener('input', () => {
  const v = $('#q').value, m = v.slice(0, $('#q').selectionStart).match(/@([\w-]*)$/);
  if (!m) { tagbar.hidden = true; return; }
  const k = m[1].toLowerCase(), hits = tagList().filter(a => a.id.includes(k) || a.label.toLowerCase().includes(k)).slice(0, 8);
  if (!hits.length) { tagbar.hidden = true; return; }
  tagbar.innerHTML = hits.map((a, i) => `<button type="button" role="option" class="${i ? '' : 'sel'}" style="--a:${esc(a.color || '')}" data-id="${esc(a.id)}">@${esc(a.label)}</button>`).join('');
  const r = $('#f').getBoundingClientRect(); tagbar.style.left = r.left + 'px'; tagbar.style.bottom = (innerHeight - r.top + 6) + 'px'; tagbar.hidden = false;
});
function pickTag(id) {
  const q = $('#q'), pos = q.selectionStart, before = q.value.slice(0, pos).replace(/@[\w-]*$/, '@' + id + ' ');
  q.value = before + q.value.slice(pos); q.focus(); q.setSelectionRange(before.length, before.length); tagbar.hidden = true;
}
tagbar.onmousedown = e => e.preventDefault();
tagbar.onclick = e => { const b = e.target.closest('[data-id]'); if (b) pickTag(b.dataset.id); };
$('#q').addEventListener('keydown', e => {
  if (tagbar.hidden) return;
  const all = [...tagbar.children], i = all.findIndex(b => b.classList.contains('sel'));
  if (e.key === 'Tab' || (e.key === 'Enter' && i >= 0)) { e.preventDefault(); e.stopPropagation(); pickTag(all[Math.max(0, i)].dataset.id); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); all[i]?.classList.remove('sel'); all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length].classList.add('sel'); }
  else if (e.key === 'Escape') tagbar.hidden = true;
}, true);
$('#q').addEventListener('blur', () => setTimeout(() => { tagbar.hidden = true; }, 150));
const _submit = $('#f').onsubmit;
$('#f').onsubmit = async e => {
  const text = $('#q').value;
  if (!/(^|\s)@[\w-]+/.test(text)) return _submit(e);
  e.preventDefault(); tagbar.hidden = true;
  try {
    const r = await J('/tag', { text });
    if (!r.routed.length) return _submit(e);   // no such agent: ask Neesmo normally
    $('#q').value = ''; say(text, 'you');
    const names = r.routed.map(id => (lastAgents.find(a => a.id === id) || { name: id }).name).join(', ');
    say(`Sent to ${names}.${r.routed.some(isChan) ? ' Channel agents follow it from the next video.' : ''}`, 'vega');
  } catch (x) { say(x.message, 'vega'); }
};

// ------------------------------------------------------------------ approvals: the "may I schedule by myself?" question
const _openNote = openNote;
openNote = async id => {
  await _openNote(id);
  const n = notes.find(x => x.id === id);
  if (!n?.studio?.ask) { $('#ap-btns').dataset.ask = ''; return; }
  $('#ap-btns').dataset.ask = '1';
  $('#ap-what').textContent = n.body; $('#ap-details').hidden = true;
  $('#ap-yes').textContent = 'Yes, schedule by yourself'; $('#ap-no').textContent = 'No, keep asking me';
};
$('#ap-no').addEventListener('click', e => {
  if ($('#ap-btns').dataset.ask !== '1') return;
  e.stopImmediatePropagation(); decide('changes', 'No, keep asking me before scheduling.');
}, true);

// ------------------------------------------------------------------ agent settings: Channel tab
$('#ag-tabs').insertAdjacentHTML('beforeend', '<button type="button" role="tab" data-agtab="channel" aria-selected="false" hidden>Channel</button>');
$('#ag-form .agtab[data-agtab="plugins"]').insertAdjacentHTML('afterend', `<div class="agtab" data-agtab="channel" role="tabpanel" hidden>
  <div class="brand"><label class="bn-pick" title="Change banner"><img id="c-bn" alt="" hidden><span>Change banner</span><input type="file" id="c-bnf" accept="image/png,image/jpeg,image/webp" hidden></label>
    <label class="av-pick" title="Change avatar"><img id="c-av" alt="" hidden><i id="c-avl"></i><span>Edit</span><input type="file" id="c-avf" accept="image/png,image/jpeg,image/webp" hidden></label></div>
  <label for="c-name">Channel name</label><input id="c-name" maxlength="40" placeholder="e.g. Bitesized History">
  <p id="b-err" role="alert"></p><div class="btns"><button type="button" id="b-save">Save name and pictures</button></div>
  <h3 class="c-h">Posting</h3>
  <div class="row"><div><label id="l-cas">Schedule by itself</label><small class="sub" id="cas-note">Videos go out without waiting for your OK.</small></div><button type="button" class="tog" role="switch" id="c-auto" aria-labelledby="l-cas"></button></div>
  <label for="c-per">Videos per day</label><select id="c-per"><option>1</option><option>2</option><option>3</option><option>4</option></select>
  <label for="c-times">Post times (24h, comma separated)</label><input id="c-times" placeholder="13:30, 19:30">
  <label for="c-tz">Time zone</label><input id="c-tz" placeholder="">
  <div class="row"><div><label id="l-cp">Pause this agent</label><small class="sub">Stops new videos and posting until you switch it back.</small></div><button type="button" class="tog" role="switch" id="c-pause" aria-labelledby="l-cp"></button></div>
  <p id="c-err" role="alert"></p><div class="btns"><button type="button" id="c-save">Save channel settings</button></div></div>`);
const tog = (el, on) => el.setAttribute('aria-checked', String(!!on));
for (const t of ['#c-auto', '#c-pause']) $(t).onclick = () => { if (!$(t).disabled) tog($(t), $(t).getAttribute('aria-checked') !== 'true'); };
const _openAgentEditor = openAgentEditor;
openAgentEditor = i => {
  _openAgentEditor(i);
  const a = agCfg.agents[i], on = a && isChan(a.id);
  $('#ag-tabs [data-agtab="channel"]').hidden = !on;
  if (!on) return;
  $('#ag-form').dataset.chan = a.id;
  G('/channels/' + encodeURIComponent(a.id)).then(d => {
    const s = d.settings || {};
    showBrand(a, d);
    tog($('#c-auto'), s.auto_schedule); tog($('#c-pause'), s.paused);
    $('#c-auto').disabled = d.in_trial || !!d.warmup_left;
    $('#cas-note').textContent = d.in_trial || d.warmup_left ? `Unlocks after the ${S.st.trial_days}-day trial week. Until then every video waits for your OK.` : 'Videos go out without waiting for your OK.';
    $('#c-per').value = String(s.videos_per_day || 1); $('#c-times').value = (s.post_times || []).join(', ');
    $('#c-tz').value = s.timezone || ''; $('#c-tz').placeholder = Intl.DateTimeFormat().resolvedOptions().timeZone; $('#c-err').textContent = '';
  }).catch(() => {});
};
const _showAgTab = showAgTab;
showAgTab = t => { _showAgTab(t); if (t === 'channel') $('#ag-btns').hidden = true; };
for (const t of ['#c-times', '#c-tz']) $(t).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#c-save').click(); } });
$('#c-save').onclick = async () => {
  const id = $('#ag-form').dataset.chan;
  try {
    await J(`/channels/${encodeURIComponent(id)}/settings`, {
      auto_schedule: $('#c-auto').getAttribute('aria-checked') === 'true', paused: $('#c-pause').getAttribute('aria-checked') === 'true',
      videos_per_day: +$('#c-per').value, post_times: $('#c-times').value.split(/[,\s]+/).filter(Boolean),
      timezone: $('#c-tz').value.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone }, 'PUT');
    $('#c-err').textContent = 'Saved.'; delete S.ch[id];
  } catch (x) { $('#c-err').textContent = x.message; }
};

// channel brand: name, avatar and banner, previewed before saving
function showBrand(a, d) {
  for (const k of ['av', 'bn']) { $(`#c-${k}f`).value = ''; }
  const set = (img, p, v) => { img.hidden = !p; if (p) img.src = media(a.id, p) + '&v=' + v; };
  set($('#c-av'), d.avatar, d.avatar_v); set($('#c-bn'), d.banner, d.banner_v);
  $('#c-avl').textContent = (a.short || a.name || '?').trim()[0] || '?'; $('#c-avl').hidden = !!d.avatar;
  $('#c-name').value = a.name || ''; $('#b-err').textContent = '';
}
for (const k of ['av', 'bn']) $(`#c-${k}f`).onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const img = $(`#c-${k}`); img.src = URL.createObjectURL(f); img.hidden = false; if (k === 'av') $('#c-avl').hidden = true;
};
$('#c-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#b-save').click(); } });
$('#b-save').onclick = async () => {
  const id = $('#ag-form').dataset.chan, fd = new FormData();
  fd.append('name', $('#c-name').value.trim());
  if ($('#c-avf').files[0]) fd.append('avatar', $('#c-avf').files[0]);
  if ($('#c-bnf').files[0]) fd.append('banner', $('#c-bnf').files[0]);
  $('#b-save').disabled = true; $('#b-err').textContent = 'Saving…';
  try {
    const r = await J(`/channels/${encodeURIComponent(id)}/brand`, fd);
    const a = agCfg.agents.find(x => x.id === id);
    if (r.name) { $('#ag-title').textContent = r.name; $('#ag-name').value = r.name; if (a) a.name = r.name; }
    showBrand(a || { id, name: r.name }, r); $('#b-err').textContent = 'Saved.'; delete S.ch[id]; await loadAgents();
  } catch (x) { $('#b-err').textContent = x.message; }
  $('#b-save').disabled = false;
};

// ------------------------------------------------------------------ System settings: permissions, notifications, updates
function settingsBlock() {
  const st = S.st, sys = $('.tab[data-tab="system"]');
  let el = $('#studio-sys');
  if (!el) {
    sys.insertAdjacentHTML('afterbegin', `<div id="studio-sys">
      <h3>Neesmo Studio</h3>
      <div class="grp">
        <div class="row"><i class="ri" data-i="shield"></i><div class="rl"><label id="l-sap">Auto permissions</label><small class="sub">Safe steps run by themselves, so you get fewer questions.</small></div><button type="button" class="tog" role="switch" id="s-ap" aria-labelledby="l-sap"></button></div>
        <div class="row col"><div class="rh"><i class="ri" data-i="bell"></i><span class="rl" id="l-snt">Phone notifications</span></div>
          <div class="seg sm" id="s-nt" role="radiogroup" aria-labelledby="l-snt"><button type="button" role="radio" data-v="important">Important</button><button type="button" role="radio" data-v="all">Everything</button><button type="button" role="radio" data-v="off">Off</button></div></div>
      </div>
      <h3>Updates</h3>
      <div class="grp">
        <div class="row"><i class="ri" data-i="tag"></i><small class="rl">Version</small><small id="s-ver"></small></div>
        <div class="row"><i class="ri" data-i="refresh"></i><div class="rl"><label id="l-sau">Update by itself</label><small class="sub">Free forever. Channels, settings and keys are never touched.</small></div><button type="button" class="tog" role="switch" id="s-au" aria-labelledby="l-sau"></button></div>
        <div class="row"><small id="s-upd" class="rl"></small><span class="btns"><button type="button" id="s-chk" class="ib"><i data-i="refresh"></i>Check</button><button type="button" id="s-go" class="ib main" hidden><i data-i="download"></i>Update now</button></span></div>
      </div>
    </div>`);
    paintIcons(sys);
    el = $('#studio-sys');
    $('#s-ap').onclick = async () => { const on = $('#s-ap').getAttribute('aria-checked') !== 'true'; tog($('#s-ap'), on); try { await J('/settings', { auto_permissions: on }); } catch (x) { tog($('#s-ap'), !on); $('#s-upd').textContent = x.message; } };
    $('#s-au').onclick = async () => { const on = $('#s-au').getAttribute('aria-checked') !== 'true'; tog($('#s-au'), on); try { await J('/settings', { auto_update: on }); } catch (x) { tog($('#s-au'), !on); $('#s-upd').textContent = x.message; } };
    $('#s-nt').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; paintNt(b.dataset.v); J('/settings', { notify: b.dataset.v }).catch(x => { $('#s-upd').textContent = x.message; }); };
    $('#s-chk').onclick = async () => { $('#s-upd').textContent = 'Checking…'; try { S.st.update = await G('/update'); paintUpd(); } catch (x) { $('#s-upd').textContent = x.message; } };
    $('#s-go').onclick = async () => {
      $('#s-go').disabled = true; $('#s-upd').textContent = 'Updating… Neesmo restarts by itself.';
      try { const r = await J('/update'); $('#s-upd').textContent = r.msg; if (r.ok && r.backup) setTimeout(() => location.reload(), 9000); }
      catch (x) { $('#s-upd').textContent = x.message; }
      $('#s-go').disabled = false;
    };
  }
  tog($('#s-ap'), st.auto_permissions); tog($('#s-au'), st.auto_update); paintNt(st.notify || 'important');
  $('#s-ver').textContent = `${st.version} · ${st.studio_label || platform() + ' edition'}`;
  paintUpd();
}
function paintNt(v) { for (const b of document.querySelectorAll('#s-nt [data-v]')) b.setAttribute('aria-checked', String(b.dataset.v === v)); }
function paintUpd() {
  const u = S.st.update || {};
  $('#s-upd').textContent = u.available ? `New: ${u.latest}${u.notes ? ' · ' + u.notes : ''}` : u.error ? 'Could not check right now.' : u.latest ? 'Up to date.' : '';
  $('#s-go').hidden = !u.available;
}

refresh().then(() => loadAgents());
setInterval(() => { if (!document.hidden) refresh(); }, 30000);
})();
