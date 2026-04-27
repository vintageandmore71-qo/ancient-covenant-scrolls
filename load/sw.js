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

var CACHE = 'load-v17l';

var SHELL = [
  './',
  'index.html',
  'load.css',
  'load.js',
  'manifest.json',
  'icon.png',
  'lib-jszip.min.js',
  'lib-hebrew-pron.js',
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
  // Code files (load.js, load.css, index.html, sw.js) are NEVER cached
  // by the SW — they go straight to network with no cache write so a
  // user can never get stuck on a stale build. Their update happens on
  // every page load. Asset files (fonts, libs, icons) still go through
  // the network-first cached path because they rarely change.
  var url = new URL(req.url);
  var path = url.pathname;
  var isCode = /\/(load\.js|load\.css|index\.html|sw\.js)(\?|$)/.test(path) || path.endsWith('/');
  if (isCode) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).catch(function () {
        // Only fall back to cache when truly offline.
        return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }
  // Other same-origin assets: network-first with cache fallback.
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
