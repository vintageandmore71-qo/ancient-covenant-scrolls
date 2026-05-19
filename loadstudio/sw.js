const CACHE='loadstudio-complete-v175';
const ASSETS=['./','index.html','styles.css','app.js','load-provider-registry.js','load-pipeline-registry.js','load-orchestrator.js','lseditor.js','lseb.js','manifest.json','project.json','scenes.json','characters.json','rights.json','credits.json','platform.json','data/feature-registry.json','data/initial-state.json','director-ai.json','character-stability.json','prompt-log.json','generation-report.json','continuity-report.json','asset-declarations.json','voices.json','wardrobe.json','props.json','locations.json','looks.json','assets/brand/loadstudio-logo.png','assets/brand/loadstudio-splash.jpeg','icons/icon-72.png','icons/icon-96.png','icons/icon-128.png','icons/icon-144.png','icons/icon-152.png','icons/icon-180.png','icons/icon-192.png','icons/icon-384.png','icons/icon-512.png','own-image-clones.json','provider-routing.json','reference-packs.json','approved-takes.json','rejected-takes.json','scene-proof.json','production-board.json','load-asset-registry.js','asset-registry-report.json','provider-registry-report.json','provider-pipeline-report.json','missing-provider-audit.json','connector-readiness-report.json','style-bible.json','voice-bible.json','scene-audio.json','video-pipeline.json','pipeline-execution-readiness-report.json','assets/audio/demo/demo-music-mellow.wav','assets/audio/demo/demo-music-upbeat.wav','assets/audio/demo/demo-music-energetic.wav','assets/audio/demo/demo-music-acoustic.wav','assets/audio/demo/demo-music-electronic.wav','assets/audio/demo/demo-music-hiphop.wav','assets/audio/demo/demo-music-fresh.wav','assets/audio/demo/demo-music-mellow.mp3','assets/audio/demo/demo-music-upbeat.mp3','assets/audio/demo/demo-music-energetic.mp3','assets/audio/demo/demo-music-acoustic.mp3','assets/audio/demo/demo-music-electronic.mp3','assets/audio/demo/demo-music-hiphop.mp3','assets/audio/demo/demo-music-fresh.mp3','assets/audio/demo/audible-test.mp3','assets/audio/demo/demo-sfx-boing.wav','assets/audio/demo/demo-sfx-whoosh.wav','assets/audio/demo/demo-sfx-ding.wav','assets/audio/demo/demo-sfx-hit.wav','assets/audio/demo/demo-sfx-rumble.wav','assets/sfx/sfx-cartoon.wav','assets/sfx/sfx-swish.wav','assets/sfx/sfx-funny.wav','assets/sfx/sfx-machine.wav','assets/sfx/sfx-ringing.wav','assets/sfx/sfx-vehicles.wav','assets/sfx/sfx-weather.wav','assets/sfx/sfx-variety.wav','assets/sfx/sfx-vlogsf.wav','assets/sfx/sfx-physical.wav','assets/sfx/sfx-transitions.wav','assets/sfx/sfx-cues.wav','assets/sfx/sfx-game.wav','assets/sfx/sfx-emotion.wav'];
// Cache each asset individually so a single failing file (e.g. new SFX WAV with a
// transient 404) cannot wipe the entire cache install. addAll() is all-or-nothing;
// Promise.all + per-file .catch lets every other asset cache even if one fails.
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{})))));self.skipWaiting();});
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
