// File: sw.js
const VERSION = 'v13';
const CACHE_NAME = `fcb-kids-${VERSION}`;
const OFFLINE_URL = '/fc-barcelona-kids/offline.html';

// Handle instant update messages from page
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// ensure instant takeover
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('fcb-kids-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Precache minimal shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/fc-barcelona-kids/',
        '/fc-barcelona-kids/index.html',
        '/fc-barcelona-kids/styles/main.css',
        '/fc-barcelona-kids/scripts/main.js',
        '/fc-barcelona-kids/assets/soccer-ball.svg',
        '/fc-barcelona-kids/assets/FC_Barcelona_logo.svg',
        '/fc-barcelona-kids/assets/placeholder-coach.svg',
        OFFLINE_URL
      ])
    )
  );
  self.skipWaiting();
});

// Network-first for HTML; cache-first for others
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // avoid caching third-party
  if (url.origin !== location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) || (await cache.match(OFFLINE_URL));
      })
    );
    return;
  }

  // CSS/JS/IMG: cache-first with network fallback
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
