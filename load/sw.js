// Load — Run Web Apps on iPad (PWA)
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// Unauthorized reproduction, modification, distribution, or
// commercial use is strictly prohibited. See LICENSE at the
// repository root for the full terms.
//
// Service worker: offline shell caching only. No user data is
// fetched or transmitted. Imported apps live in IndexedDB on the
// user's device and are never sent anywhere.

var CACHE = 'load-v15e';

var SHELL = [
  './',
  'index.html',
  'load.css',
  'load.js',
  'manifest.json',
  'icon.png',
  'lib-jszip.min.js',
  'lib-pdf.min.js',
  'lib-pdf-worker.min.js',
  'lib-epub.min.js',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2',
  'fonts/opendyslexic-400.woff2',
  'fonts/opendyslexic-700.woff2'
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
  // Cross-origin: pass through with no caching. Important for the on-device
  // model install path — transformers.js pulls ~400 MB of weights from
  // huggingface.co + cdn.jsdelivr; letting the SW cache those would
  // blow iOS's Cache Storage quota. The model's own IndexedDB cache
  // handles persistence for those weights, not us.
  try {
    var u = new URL(req.url);
    if (u.origin !== self.location.origin) return;
  } catch (err) { return; }
  // Same-origin: network-first for everything so updates always take effect.
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
