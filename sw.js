const CACHE = ‘acr-v1’;
const SHELL = [‘index.html’, ‘manifest.json’, ‘icon.png’];
self.addEventListener(‘install’, e => {
e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
self.skipWaiting();
});
self.addEventListener(‘activate’, e => {
e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener(‘fetch’, e => {
e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
if(e.request.url.includes(’/data/’)) {
var clone = res.clone();
caches.open(CACHE).then(c => c.put(e.request, clone));
}
return res;
})));
});
