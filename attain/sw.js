// Attain Universal — Service Worker
// Network-first for everything so updates always take effect

var CACHE = 'attain-v34';

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
        ks.filter(function (k) { return k.indexOf('attain-') === 0 && k !== CACHE && k !== 'attain-books-data'; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // Network-first for EVERYTHING — cache is only for offline fallback
  e.respondWith(
    fetch(req).then(function (res) {
      var clone = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        return r || caches.match('index.html');
      });
    })
  );
});
