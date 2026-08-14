/* REDAX PWA · service worker (mismo patrón que ORBI).
   - El cascarón (index.html) se sirve RED-PRIMERO: siempre muestra lo último si hay internet,
     y usa el caché solo como respaldo sin señal. Así las actualizaciones llegan solas.
   - Los íconos van caché-primero (no cambian casi nunca).
   - La app de Apps Script (otro dominio) nunca se cachea: siempre a la red. */
var CACHE = 'redax-shell-v1';
var ASSETS = ['./','index.html','manifest.webmanifest',
  'icon-192.png','icon-512.png','maskable-512.png','apple-touch-180.png','favicon-32.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Apps Script y demás → red directa

  var esHTML = e.request.mode === 'navigate' ||
               url.pathname.endsWith('/') ||
               url.pathname.endsWith('index.html');

  if (esHTML) {
    e.respondWith(
      fetch(e.request).then(function(r){
        var copia = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        return r;
      }).catch(function(){
        return caches.match(e.request).then(function(r){ return r || caches.match('index.html'); });
      })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});
