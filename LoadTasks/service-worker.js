const CACHE_NAME = 'load-tasks-cache-v2.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './assets/images/LOAD_TASKS_SPLASH_1080.webp',
  './assets/images/LOAD_TASKS_SPLASH_1080.jpg',
  './assets/images/load-tasks-logo.png',
  './assets/icons/load-tasks-icon-96x96.png',
  './assets/icons/load-tasks-icon-180x180.png',
  './assets/icons/load-tasks-icon-192x192.png',
  './assets/icons/load-tasks-icon-512x512.png',
  './README_OPEN_FIRST.md',
  './INSTALLATION_GUIDE.md',
  './SECURITY.md',
  './DEVELOPER_HANDOFF.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
