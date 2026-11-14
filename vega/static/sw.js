// Neesmo service worker: shows push notifications and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Neesmo', {
    body: d.body || '', icon: '/static/icon-192.png', badge: '/static/icon-192.png', tag: d.tag, data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const url = e.notification.data?.url || '/', id = new URL(url, self.location.origin).searchParams.get('n');
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if ('focus' in c) { if (id) c.postMessage({ open: id }); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
