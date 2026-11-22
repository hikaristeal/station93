// Keeps the app itself on the tablet so it opens with no signal. Your data is not stored here.
const V = 'st93-1.1.0';
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
