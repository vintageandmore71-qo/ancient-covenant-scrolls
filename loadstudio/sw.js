const CACHE='loadstudio-complete-v108';
const ASSETS=['./','index.html','styles.css','app.js','lseditor.js','lseb.js','manifest.json','project.json','scenes.json','characters.json','rights.json','credits.json','platform.json','data/feature-registry.json','data/initial-state.json','director-ai.json','character-stability.json','prompt-log.json','generation-report.json','continuity-report.json','asset-declarations.json','voices.json','wardrobe.json','props.json','locations.json','looks.json','assets/brand/loadstudio-logo.png','assets/brand/loadstudio-splash.jpeg','icons/icon-72.png','icons/icon-96.png','icons/icon-128.png','icons/icon-144.png','icons/icon-152.png','icons/icon-180.png','icons/icon-192.png','icons/icon-384.png','icons/icon-512.png','own-image-clones.json','provider-routing.json','reference-packs.json','approved-takes.json','rejected-takes.json','scene-proof.json','production-board.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));self.skipWaiting();});
// SCOPED cleanup — only delete loadstudio-* caches. Without this filter
// the activate handler would wipe every other PWA's cache on this same
// origin (loadplay-vNN, acr-vNN, attain-vNN, etc.). Same-origin caches
// are visible to every SW on that origin via caches.keys().
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.indexOf('loadstudio-')===0&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  let url;try{url=new URL(req.url);}catch(_){return;}
  if(url.origin!==self.location.origin)return;
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
    if(res&&res.status===200&&res.type==='basic'){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone)).catch(()=>{});}
    return res;
  }).catch(()=>caches.match('index.html'))));
});
