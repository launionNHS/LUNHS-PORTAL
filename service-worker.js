const CACHE="lunhs-v30-3-strict-portrait-v1";
const SHELL=["./","./index.html","./styles.css","./lunhs-logo.png","./portal.html"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.hostname.includes("supabase.co"))return;
 e.respondWith(fetch(e.request).then(r=>{if(u.origin===location.origin){let c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});