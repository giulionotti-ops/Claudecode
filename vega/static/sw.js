// Neesmo service worker: shows push notifications and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'Neesmo', {
      body: d.body || '', icon: '/static/icon-192.png', badge: '/static/icon-192.png', tag: d.tag, data: { url: d.url || '/' },
    });
    await setBadge();
  })());
});

// App icon badge = notifications still in Notification Centre; the page sets the exact unread count when open.
async function setBadge() {
  try { const n = (await self.registration.getNotifications()).length; n ? await self.navigator.setAppBadge?.(n) : await self.navigator.clearAppBadge?.(); } catch {}
}
self.addEventListener('notificationclose', e => e.waitUntil(setBadge()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const url = e.notification.data?.url || '/', id = new URL(url, self.location.origin).searchParams.get('n');
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if ('focus' in c) { if (id) c.postMessage({ open: id }); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
