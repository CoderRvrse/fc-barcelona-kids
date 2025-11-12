const CACHE_VERSION = 'v23.4.8.3'; // Ball follows ACTUAL visible shaft path - single source of truth
const CACHE_NAME = `flab-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles/main.css?v=23.4.8.1',
  './styles/components/field.css',
  './styles/components/player.css',
  './styles/components/arrows.css',
  './styles/components/toolbar.css',
  './styles/components/passstyle.css',
  './styles/components/ball.css', // Updated ball styles
  './scripts/version.js?v=23.4.8.1',
  './scripts/main.js?v=23.4.8.1',
  './scripts/logger.js',
  './scripts/state.js',
  './scripts/geometry.js',
  './scripts/orientation.js',
  './scripts/drag.js',
  './scripts/pass.js',
  './scripts/pass.init.js',
  './scripts/pass.markers.js',
  './scripts/pass.headsize.js',
  './scripts/svgroot.js',
  './scripts/aim.js',
  './scripts/assets.arrows.js',
  './scripts/render.js', // Updated layer management
  './scripts/export.js',
  './scripts/ui.js',
  './scripts/keyboard.js',
  './scripts/presets.js',
  './scripts/persist.js',
  './scripts/ui.presets.menu.js',
  './scripts/ui.erase.menu.js',
  './scripts/ui.passstyle.menu.js',
  './scripts/storage.js',
  './scripts/audit.js',
  './scripts/animate.js', // Updated ball playback system
  './assets/favicon.png',
  './assets/icons.svg',
  './assets/jersey.svg',
  './assets/landscape/pitch-landscape.svg',
  './assets/portrait/pitch-portrait.svg',
  './assets/arrows/head-solid.svg',
  './assets/arrows/head-comic-flat.svg',
  './assets/arrows/head-comic-halftone.svg',
  './assets/balls/Soccer-ball-1.svg'
];

const PRECACHE_SET = new Set(PRECACHE_URLS.map(url => new URL(url, self.location).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('flab-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    if (isIndexLike(request.url)) {
      cache.put(new Request('./index.html'), response.clone());
      cache.put(new Request('./'), response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await caches.match(request) || (isIndexLike(request.url) ? await caches.match('./index.html') : undefined);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (shouldCache(request)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (isIndexLike(request.url)) {
      const fallback = await caches.match('./index.html');
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }
}

function shouldCache(request) {
  const url = new URL(request.url);
  return PRECACHE_SET.has(url.href);
}

function isIndexLike(url) {
  const u = new URL(url, self.location);
  return u.pathname === '/' || u.pathname.endsWith('/index.html');
}
