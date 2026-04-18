// DSS Orit Study — service worker
// Scope: /ancient-covenant-scrolls/study/
// Own cache namespace so it never touches the reader's cache.
// Pre-caches the shell AND every chapter JSON the study app references,
// so every section works offline after the first online install.

const CACHE = 'acr-study-v35';

const SHELL = [
  './',
  'index.html',
  'study.css',
  'study.js',
  'manifest.json',
  'icon.png'
];

// The 18 chapter files the study app uses — Bereshit, Shemot, Vayikra,
// Bamidbar, Devarim, Chanokh, Yovelim, and War Scroll 1QM.
const DATA_FILES = [
  '../data/file_1.json',  '../data/file_2.json',
  '../data/file_3.json',  '../data/file_4.json',
  '../data/file_5.json',  '../data/file_6.json',
  '../data/file_7.json',  '../data/file_8.json',
  '../data/file_9.json',  '../data/file_10.json',
  '../data/file_11.json', '../data/file_12.json',
  '../data/file_13.json', '../data/file_14.json',
  '../data/file_15.json', '../data/file_16.json',
  '../data/file_17.json', '../data/file_94.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // 1. Clean up our own old study caches (never touches reader's acr-* caches).
    caches.keys().then(ks => Promise.all(
      ks.filter(k => k.indexOf('acr-study-') === 0 && k !== CACHE)
        .map(k => caches.delete(k))
    ))
      // 2. Take control of any open clients.
      .then(() => self.clients.claim())
      // 3. Background pre-fetch every study chapter JSON so offline study
      //    works for every section after the first online visit.
      .then(() => prefetchAllChapters())
  );
});

function prefetchAllChapters() {
  return caches.open(CACHE).then(cache =>
    Promise.all(DATA_FILES.map(url =>
      cache.match(url).then(hit => {
        if (hit) return;
        return fetch(url, { credentials: 'same-origin' })
          .then(res => {
            if (res && res.ok) return cache.put(url, res);
          })
          .catch(() => {});
      })
    ))
  );
}

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
