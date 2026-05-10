const V='nt-v5';
const SHELL_CACHE=V+'-shell';
const API_CACHE=V+'-api';
const SHELL=['./','./index.html','./manifest.json',
             './fonts/ibm-plex-mono-400.woff2','./fonts/ibm-plex-mono-500.woff2','./fonts/dm-sans.woff2',
             './icon-192.png','./icon-512.png','./apple-touch-icon-180.png'];
const API_ORIGIN='https://nt.sloccy.com';
const bc=new BroadcastChannel('nt');

self.oninstall=e=>e.waitUntil((async()=>{
  const c=await caches.open(SHELL_CACHE);
  await c.addAll(SHELL);
  try{
    const apic=await caches.open(API_CACHE);
    const r=await fetch(API_ORIGIN+'/s');
    if(r.ok)await apic.put('/s',r);
  }catch(_){}
  self.skipWaiting();
})());

self.onactivate=e=>e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>!k.startsWith(V)).map(k=>caches.delete(k)));
  await self.clients.claim();
})());

async function withTimeout(req,ms){
  const ctrl=new AbortController();
  const tid=setTimeout(()=>ctrl.abort(),ms);
  try{
    return await fetch(req,{signal:ctrl.signal});
  }finally{
    clearTimeout(tid);
  }
}

self.onfetch=e=>{
  const u=new URL(e.request.url);

  if(u.origin===location.origin&&e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{return await withTimeout(e.request,3000);}
      catch(_){return await caches.match('./index.html');}
    })());
    return;
  }

  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
    return;
  }

  if(u.origin===API_ORIGIN){
    if(u.pathname==='/s'){
      e.respondWith((async()=>{
        const c=await caches.open(API_CACHE);
        const cached=await c.match('/s');
        const fresh=fetch(e.request).then(r=>{if(r.ok)c.put('/s',r.clone());return r;}).catch(()=>null);
        if(cached){fresh.catch(()=>{});return cached;}
        return await fresh||Response.error();
      })());
      return;
    }
    if(u.pathname==='/a'){
      e.respondWith((async()=>{
        const c=await caches.open(API_CACHE);
        const key=u.pathname+u.search;
        try{
          const r=await withTimeout(e.request,4000);
          if(r.ok){c.put(key,r.clone());bc.postMessage({type:'fresh',key});}
          return r;
        }catch(_){
          const cached=await c.match(key);
          if(cached){bc.postMessage({type:'stale',key});return cached;}
          return Response.error();
        }
      })());
    }
  }
};
