const CACHE='universal-shell-v10';
const ASSETS=['/painel/','/painel/styles.css?v=10','/painel/app.js?v=10','/painel/workflow.js?v=10','/painel/delivery.js?v=10','/painel/init.js?v=10','/painel/manifest.webmanifest','/favicon.svg','/universal-logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))})
