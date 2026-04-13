const CACHE = 'acr-v3';
const SHELL = ['manifest.json', 'icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first for the HTML shell so updates always take effect
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sw.js')) {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Cache-first for /data/*.json and other assets
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (url.pathname.indexOf('/data/') >= 0) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(()=>{});
      }
      return res;
    }))
  );
});
