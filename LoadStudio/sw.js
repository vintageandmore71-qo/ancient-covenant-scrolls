// LoadStudio — Service Worker
// Copyright (c) 2026 LBond. All Rights Reserved.
// Network-first for code/HTML so users never get stuck on stale builds;
// cache-first for assets. Same pattern as LoadPlay/sw.js.

const CACHE = 'loadstudio-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/images/icon.png',
  './assets/images/splash.jpg',
  './assets/images/workspace.png',
  './pages/project-dashboard.html',
  './pages/character-studio.html',
  './pages/developer-lab.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k.indexOf('loadstudio-') === 0 && k !== CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('blob:') === 0) return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // Network-first for code so deploys take effect immediately.
  const path = url.pathname;
  const isCode = /\/(index\.html|sw\.js|app\.js|style\.css)(\?|$)/.test(path) ||
                 path.endsWith('/LoadStudio/') || path.endsWith('/LoadStudio') ||
                 /\/pages\/[^/]+\.html(\?|$)/.test(path);
  if (isCode) {
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Other same-origin assets: cache-first with network fallback.
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => req.destination === 'document' ? caches.match('./index.html') : undefined))
  );
});
