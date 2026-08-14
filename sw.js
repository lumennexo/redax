/* REDAX · Service Worker
 * Objetivo: que la app sea instalable y abra rápido. Estrategia "red primero"
 * para los archivos propios (así siempre ves la última versión cuando hay
 * internet) con respaldo desde caché si estás sin señal. La API (Apps Script)
 * y las fuentes de Google van directo a la red, nunca se cachean.
 * Sube el número de versión (CACHE) cuando cambies index.html o app.js. */
var CACHE = 'redax-v1';
var SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  // Solo gestionamos peticiones GET de nuestro propio origen (el sitio estático).
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
