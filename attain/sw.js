// Attain Universal — Service Worker
// Offline-first caching for the app shell

var CACHE = 'attain-v11';

var SHELL = [
  './',
  'index.html',
  'attain.css',
  'attain-core.js',
  'attain-parser.js',
  'attain-study.js',
  'attain-ui.js',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(
        ks.filter(function (k) { return k.indexOf('attain-') === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Network-first for HTML shell so updates always take effect
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/sw.js')
  ) {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images)
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
