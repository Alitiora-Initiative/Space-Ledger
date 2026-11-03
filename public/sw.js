'use strict';
const CACHE='space-ledger-shell-v1';
const SHELL=['/','/index.html','/pages/mobile.html','/css/styles.css','/css/polish.css','/css/universe.css','/css/release1.css','/js/site.js','/js/mobileSupport.js','/js/space-world.js','/js/transactionRecovery.js','/js/wallet.js','/js/walletModal.js','/js/walletReconnect.js','/img/pwa-icon.svg','/manifest.webmanifest','/offline.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(async()=>await caches.match(request)||await caches.match('/offline.html')));
  return;
 }
 if(/\.(?:js|css|svg|png|webmanifest)$/.test(url.pathname)){
  event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>cached);return cached||network;}));
 }
});