// Service worker pro Density Altitude Calculator (Roko VIA)
// Cíl: appka se po prvním načtení dá používat i offline (kromě živého počasí z Open-Meteo,
// to samozřejmě potřebuje připojení k internetu).

const CACHE_NAME = 'density-altitude-cache-v1';
const APP_SHELL = [
  './density_altitude_calculator.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Živé počasí (Open-Meteo) vždy zkus ze sítě — neukládej do cache (jsou to aktuální data)
  if (req.url.includes('api.open-meteo.com')) {
    event.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Appka samotná: cache-first se síťovým fallbackem (a doplněním cache)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && req.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
