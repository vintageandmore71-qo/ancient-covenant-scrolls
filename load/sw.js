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

var CACHE = 'load-v17g63';

var SHELL = [
  './',
  'index.html',
  'load.css',
  'load.js',
  'manifest.json',
  'icon.png',
  'lib-jszip.min.js',
  'lib-security-scanner.js',
  'lib-rights-validator.js',
  'lib-provider-registry.js',
  'lib-load-ai-core.js',
  'lib-load-db.js',
  'lib-load-subs.js',
  'lib-output-proof.js',
  'lib-load-queue.js',
  'lib-load-resume.js',
  'lib-load-timeouts.js',
  'lib-load-local-only.js',
  'lib-load-budget.js',
  'lib-load-rights-inspector.js',
  'lib-load-scene-deps.js',
  'lib-load-mixer.js',
  'lib-load-cue-sheet.js',
  'lib-load-mux.js',
  'lib-load-capability-audit.js',
  'lib-load-prompt-compiler.js',
  'lib-load-continuity.js',
  'lib-load-versions.js',
  'lib-load-ai-pipeline.js',
  'lib-load-image-providers.js',
  'lib-public-audio-connectors.js',
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
  // Treat every HTML file (including everything under tools/) as code
  // so users never get a stale tool page after a cache bump. Same
  // cache-buster query trick as the original four root files.
  var isCode = /\/(load\.js|load\.css|index\.html|sw\.js)(\?|$)/.test(path)
            || /\.(html?|js|css)(\?|$)/.test(path)
            || path.endsWith('/');
  if (isCode) {
    // Append a cache-buster query string. iOS Safari has a known bug
    // where { cache: 'no-store' } alone is silently ignored, so the
    // device serves stale load.js / index.html from the HTTP cache
    // even after the SW + GitHub Pages have shipped a new version.
    // A unique query param every fetch closes that loophole — the
    // URL no longer matches any cached entry, so the browser MUST
    // hit the network.
    var bust;
    try {
      bust = new URL(req.url);
      bust.searchParams.set('__v', Date.now());
      bust = bust.toString();
    } catch (_) { bust = req.url; }
    var fresh = new Request(bust, {
      method: 'GET',
      headers: req.headers,
      credentials: req.credentials,
      cache: 'no-store'
    });
    e.respondWith(
      fetch(fresh).catch(function () {
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
