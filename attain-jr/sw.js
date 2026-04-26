/* Attain Jr — service worker.
   Network-first for the HTML shell so edits propagate; cache-first
   for everything else so the app works offline once visited. */
var CACHE = 'attainjr-v1c';
var SHELL = ['./', 'index.html', 'attain-jr.css', 'attain-jr.js', 'manifest.json', 'icon.png', 'splash.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf('attainjr-') === 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Network-first for HTML shell + sw.js so edits propagate.
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('sw.js')) {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./'); }); })
    );
    return;
  }
  // Cache-first for everything else.
  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (res) {
        if (res.ok && url.origin === self.location.origin) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
        }
        return res;
      });
    })
  );
});
