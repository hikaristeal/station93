// Keeps the app itself on the tablet so it opens with no signal. Your data is not stored here.
const V = 'st93-1.5.1';
const SHELL = ['./', './index.html', './config.js', './geo.js', './zones.js', './ntypes.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './splash.jpg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google sign-in and Drive always go to the network
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const fresh = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
// Tapping a Station 93 pop-up opens the app on that call.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = (e.notification.data || {}).id || '';
  const url = new URL('./' + (id ? '?call=' + encodeURIComponent(id) : ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((cs) => {
    for (const c of cs) { if ('focus' in c) { if (id) c.postMessage({open: id}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
