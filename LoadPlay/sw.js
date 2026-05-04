const CACHE = 'loadplay-v57';
const SHELL = ['./', './index.html', './manifest.json', './icon.png', './load-play-splash-768w-compressed.jpg',
               './data/demo-users.json', './data/demo-activity.json', './data/demo-content.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k.indexOf('loadplay-') === 0 && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('blob:') === 0) return;
  try {
    const u = new URL(req.url);
    if (u.origin !== self.location.origin) return;
  } catch (_) { return; }
  // Network-first for code/HTML so users never get stuck on stale builds.
  const path = new URL(req.url).pathname;
  const isCode = /\/(index\.html|sw\.js|js\/.+\.js|css\/.+\.css)(\?|$)/.test(path) || path.endsWith('/LoadPlay/') || path.endsWith('/LoadPlay');
  if (isCode) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Other same-origin assets: cache-first with network fallback.
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => req.destination === 'document' ? caches.match('./index.html') : undefined))
  );
});
