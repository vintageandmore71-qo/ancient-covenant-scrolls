// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 DssOrit. All Rights Reserved.
// Service worker: offline shell caching only. No user data is fetched.

var CACHE = 'load-v2';

var SHELL = [
  './',
  'index.html',
  'load.css',
  'load.js',
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
        ks.filter(function (k) { return k.indexOf('load-') === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  // Never intercept blob: — those are user-loaded web apps.
  if (req.url.indexOf('blob:') === 0) return;
  // Network-first for everything so updates always take effect.
  e.respondWith(
    fetch(req).then(function (res) {
      var clone = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, clone); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
    })
  );
});
