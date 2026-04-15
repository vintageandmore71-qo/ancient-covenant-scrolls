// ACR Study — service worker
// Scope: /ancient-covenant-scrolls/study/
// Own cache namespace so it never touches the reader's cache.

const CACHE = 'acr-study-v1';
const SHELL = [
  './',
  'index.html',
  'study.css',
  'study.js',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      // Only delete old acr-study-* caches; never touch reader's acr-* caches.
      ks.filter(k => k.indexOf('acr-study-') === 0 && k !== CACHE)
        .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for the HTML shell so future updates always take effect.
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/study/') ||
    url.pathname.endsWith('/study/index.html') ||
    url.pathname.endsWith('/study/sw.js')
  ) {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('index.html'))
      )
    );
    return;
  }

  // Cache-first for /data/*.json (shared with reader, own cache namespace)
  // and for own static assets.
  e.respondWith(
    caches.match(req).then(r => {
      if (r) return r;
      return fetch(req).then(res => {
        if (
          res.ok &&
          (url.pathname.indexOf('/data/') >= 0 ||
            url.origin === self.location.origin)
        ) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
