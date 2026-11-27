// Keeps the app itself on the tablet so it opens with no signal. Your data is not stored here.
// A new version installs in the background and waits; the app's Settings shows a green
// "Install update" button and only switches over after you confirm.
const V = 'st93-2.9.1';
const SHELL = ['./', './index.html', './config.js', './geo.js', './zones.js', './ntypes.js', './arcade93.js', './ta905-front.png', './ta905-side.png', './eg906-front.png', './eg906-side.png', './manifest.webmanifest', './icon-192.png', './icon-512.png', './notify-192.png', './badge-96.png', './splash.jpg'];
self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache so the new version really gets the new files
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, {cache: 'reload'})))));
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage({version: V.replace('st93-', '')});
});
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('st93-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google sign-in and Drive always go to the network
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    if (hit) return hit;                                   // this version's own files, even offline
    try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
    catch (err) { return (await c.match('./index.html')) || Response.error(); }
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
