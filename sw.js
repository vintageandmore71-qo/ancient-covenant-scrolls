const CACHE = 'acr-v3';
// Pre-cache the HTML shell up front so offline navigation works after a fresh
// install (or after the acr_sw_reset_v5 bust reload race) — previous versions
// only pre-cached manifest.json and icon.png, which left the HTML uncached
// until the user happened to navigate online while this SW was already in
// control. './' and 'index.html' are both listed so either lookup path hits.
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Only delete old reader caches. Leave acr-study-* alone so the study
    // PWA's cache is never wiped as a side effect of the reader updating.
    caches.keys().then(ks => Promise.all(
      ks.filter(k =>
        k !== CACHE &&
        k.indexOf('acr-') === 0 &&
        k.indexOf('acr-study-') !== 0
      ).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Let the /study/ sub-app's own service worker handle its own scope —
  // don't intercept fetches from the study PWA here.
  if (url.pathname.indexOf('/study/') >= 0) return;

  // Network-first for the HTML shell so edits always take effect.
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/sw.js')
  ) {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(r =>
          r || caches.match('./').then(r2 =>
            r2 || caches.match('index.html')
          )
        )
      )
    );
    return;
  }

  // Cache-first for /data/*.json and any other same-origin asset, so any
  // resource the reader touches once online survives the next offline visit.
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
