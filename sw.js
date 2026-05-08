const V='nt-v3';
const SHELL=['./','./index.html','./manifest.json','./icon.jpg'];
self.oninstall=e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
self.onactivate=e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
);
self.onfetch=e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
};
