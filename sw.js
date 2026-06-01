const CACHE_NAME = 'sg2026-v2';
const ASSETS = [
  './',
  './index.html',
  './lock-screen.js',
  './trip-app.js',
  './trip-data.js.enc',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
const FONT_ORIGIN = 'https://fonts.googleapis.com';
const FONT_STATIC = 'https://fonts.gstatic.com';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Google Maps embeds — always network, never cache
  if (url.hostname.includes('google.com') && !url.hostname.includes('fonts')) {
    return;
  }

  // Google Fonts — cache-first (they're immutable)
  if (url.origin === FONT_ORIGIN || url.origin === FONT_STATIC) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // App assets — network-first, fall back to cache
  // This ensures updates are picked up when online,
  // but the app still works fully offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
