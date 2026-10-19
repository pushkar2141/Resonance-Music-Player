/**
 * Resonance — Service Worker (App Shell Cache Only; Never Blindly Caches Audio Streams)
 */
const CACHE_NAME = 'resonance-liquid-crystal-v1';
const SHELL_ASSETS = [
  '/',
  '/static/css/tokens.css',
  '/static/css/palettes.css',
  '/static/css/glass.css',
  '/static/css/themes.css',
  '/static/css/base.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/mobile.css',
  '/static/js/main.js',
  '/static/images/logo.svg',
  '/static/images/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache API calls or audio streams
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('/'))
    )
  );
});
