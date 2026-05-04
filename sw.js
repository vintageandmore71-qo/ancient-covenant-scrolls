// ACR Reader service worker.
// - Pre-caches the HTML shell up front so offline navigation works on the
//   first online install.
// - After activate, background-fetches every chapter JSON so every chapter
//   is available offline, not just the ones the user already visited.
// - Leaves the /study/ sub-app's SW and cache alone.

const CACHE = 'acr-v21';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.png'];

// All expected chapter files. file_65 and file_85 have historical
// space-prefixed filenames in the repo and will 404 here; the individual
// .catch below swallows those two so the rest still populate.
const DATA_FILES = (function () {
  const arr = [];
  for (let i = 1; i <= 111; i++) arr.push('data/file_' + i + '.json');
  return arr;
})();

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // 1. Clean up our own old caches (leave acr-study-* alone).
    caches.keys().then(ks => Promise.all(
      ks.filter(k =>
        k !== CACHE &&
        k.indexOf('acr-') === 0 &&
        k.indexOf('acr-study-') !== 0
      ).map(k => caches.delete(k))
    ))
      // 2. Take control of any open clients.
      .then(() => self.clients.claim())
      // 3. Kick off a background pre-fetch of every chapter JSON, so after
      //    the first online visit the reader works fully offline for every
      //    chapter. waitUntil keeps the SW alive until this completes.
      .then(() => prefetchAllChapters())
  );
});

// Background pre-fetch every chapter JSON in parallel. Individual
// failures (e.g. the two space-prefixed orphans) are swallowed so the
// rest of the set still caches.
function prefetchAllChapters() {
  return caches.open(CACHE).then(cache =>
    Promise.all(DATA_FILES.map(url =>
      cache.match(url).then(hit => {
        if (hit) return; // already cached, skip
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

  // Let every sub-app's own service worker handle its own scope. Each
  // of these directories ships its own sw.js with its own cache
  // namespace; intercepting them here would (a) double-cache and (b)
  // potentially serve a stale 404 that this root SW captured before
  // the sub-app's directory existed (which is exactly the bug
  // reported for /loadstudio/ on 2026-05-02).
  const SUBAPP_PATHS = [
    '/study/', '/load/', '/LoadPlay/', '/loadstudio/',
    '/attain/', '/attain-jr/', '/GreatE/'
  ];
  for (let i = 0; i < SUBAPP_PATHS.length; i++) {
    if (url.pathname.indexOf(SUBAPP_PATHS[i]) >= 0) return;
  }

  // Network-first for the HTML shell so edits always take effect.
  // Append a unique cache-buster query string. iPad Safari has a
  // known bug where { cache: 'no-store' } alone is silently ignored,
  // so the device kept serving stale index.html / sw.js from its
  // HTTP cache after each push. A unique URL forces a real network
  // hit. Same fix applied to load/sw.js as v17ca.
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/sw.js')
  ) {
    let bustUrl;
    try {
      const u = new URL(req.url);
      u.searchParams.set('__v', Date.now());
      bustUrl = u.toString();
    } catch (_) { bustUrl = req.url; }
    const fresh = new Request(bustUrl, {
      method: 'GET',
      headers: req.headers,
      credentials: req.credentials,
      cache: 'no-store'
    });
    e.respondWith(
      fetch(fresh).then(res => {
        // Cache under the original (un-busted) request key so future
        // matches still find it. NEVER cache failure responses — a
        // 404 cached here can resurface later (during transient
        // network errors, while the SW is still installing the new
        // version, etc.) and make the app look broken even after the
        // missing path has been added back to the deploy.
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
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

  // Cache-first for /data/*.json and every other same-origin asset so any
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
