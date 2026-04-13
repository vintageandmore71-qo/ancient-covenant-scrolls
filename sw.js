var CACHE = ‘acr-v3’;
var STATIC = [’./’,’./index.html’,’./manifest.json’,’./icon.png’,’./data/nav.json’];

self.addEventListener(‘install’,function(e){
e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(STATIC);}));
self.skipWaiting();
});
self.addEventListener(‘activate’,function(e){
e.waitUntil(caches.keys().then(function(keys){
return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
}));
self.clients.claim();
});
self.addEventListener(‘fetch’,function(e){
e.respondWith(caches.match(e.request).then(function(r){
return r||fetch(e.request).then(function(res){
if(res.ok&&e.request.url.includes(’/data/’)){
var clone=res.clone();
caches.open(CACHE).then(function(c){c.put(e.request,clone);});
}
return res;
});
}));
});
