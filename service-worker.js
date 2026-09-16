const CACHE="lunhs-shell-v32";
const SHELL=["./","./index.html","./styles.css","./lunhs-logo.png","./portal.html"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET") return;
 const u=new URL(e.request.url);
 // Keep Supabase/API data online and fresh.
 if(u.hostname.includes("supabase.co")) return;
 e.respondWith(fetch(e.request).then(r=>{
   const copy=r.clone();
   if(u.origin===location.origin) caches.open(CACHE).then(c=>c.put(e.request,copy));
   return r;
 }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});