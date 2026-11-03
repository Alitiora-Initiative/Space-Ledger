'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const root=path.join(__dirname,'..');
test('PWA manifest declares standalone web app',()=>{const m=JSON.parse(fs.readFileSync(path.join(root,'public','manifest.webmanifest'),'utf8'));assert.equal(m.display,'standalone');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');});
test('service worker does not cache API responses',()=>{const s=fs.readFileSync(path.join(root,'public','sw.js'),'utf8');assert.ok(s.includes("url.pathname.startsWith('/api/')"));assert.match(s,/offline\.html/);});
test('device detection supports phone, iPad and tablet plus wallet browser links',()=>{const s=fs.readFileSync(path.join(root,'public','js','mobileSupport.js'),'utf8'),p=fs.readFileSync(path.join(root,'public','pages','mobile.html'),'utf8');assert.match(s,/userAgentData\?\.mobile/);assert.match(s,/MacIntel.*maxTouchPoints/);assert.match(s,/phantom\.app\/ul\/browse/);assert.match(s,/solflare\.com\/ul\/v1\/browse/);assert.match(p,/macOS Sonoma 14/);assert.match(p,/iPad/);});
test('responsive styles include focus visibility, forced colours and reduced motion',()=>{const s=fs.readFileSync(path.join(root,'public','css','release1.css'),'utf8');assert.match(s,/:focus-visible/);assert.match(s,/forced-colors/);assert.match(s,/prefers-reduced-motion/);});

test('phone tier is read-only for purchases while tablet remains full workspace',()=>{
 const mobile=fs.readFileSync(path.join(root,'public','js','mobileSupport.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'public','css','release1.css'),'utf8');
 const purchase=fs.readFileSync(path.join(root,'public','pages','purchase.html'),'utf8');
 const grid=fs.readFileSync(path.join(root,'public','pages','grid.html'),'utf8');
 assert.match(mobile,/Purchases and creator\/workspace tools are desktop\/tablet-only/);
 assert.match(css,/body\[data-device-tier="phone"\].*\[data-desktop-workspace\]/);
 assert.match(purchase,/id="devnetPurchase" data-desktop-workspace/);
 assert.match(grid,/id="buyCurrentBlockBtn" data-desktop-workspace/);
});


test('service worker uses a new cache version and prefers current assets over stale cache',()=>{
 const sw=fs.readFileSync(path.join(root,'public','sw.js'),'utf8');
 assert.match(sw,/space-ledger-shell-v2/);
 assert.match(sw,/startsWith\(CACHE_PREFIX\)/);
 const fetchSection=sw.slice(sw.indexOf("if(/\\.(?:js"),sw.length);
 assert.ok(fetchSection.indexOf("fetch(request)") < fetchSection.indexOf("caches.match(request)"),'network must be checked before offline cache fallback');
 assert.ok(!sw.includes("filter(key=>key!==CACHE).map(key=>caches.delete(key))"),'activation must not wipe unrelated origin caches');
});
test('homepage and grid load the final visual theme from parser-discovered stylesheets',()=>{
 const home=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
 const grid=fs.readFileSync(path.join(root,'public','pages','grid.html'),'utf8');
 for(const html of [home,grid]){
  assert.match(html,/css\\/universe\\.css/);
  assert.match(html,/css\\/release1\\.css/);
 }
});
