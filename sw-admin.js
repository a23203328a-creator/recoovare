/* App del panel (Recoovare Admin). No guarda nada en caché: siempre pide la
   versión más reciente de cada página para no mostrar datos viejos. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* la red responde como siempre */ });
