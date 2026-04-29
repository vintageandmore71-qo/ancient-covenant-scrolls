const CACHE = 'image-prompt-v1';
const CORE = ['./', './index.html', './manifest.json', './icon.png',
              './fonts/atkinson-400.woff2', './fonts/atkinson-700.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isAPI = ['googleapis','openrouter','anthropic','huggingface','cerebras','js.puter.com']
    .some(h => url.hostname.includes(h));
  if (isAPI) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
