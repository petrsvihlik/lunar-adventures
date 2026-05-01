const CACHE = 'lunar-adventures-v3';
const FILES = [
  './',
  './index.html',
  './style.css',
  './menu.js',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './games/shared/lunarlib.js',
  './games/lunar-garden/',
  './games/lunar-garden/index.html',
  './games/lunar-garden/style.css',
  './games/lunar-garden/game.js',
  './games/lunar-garden/icon.svg',
  './games/lunar-garden/icon-maskable.svg',
  './games/lunar-hop/',
  './games/lunar-hop/index.html',
  './games/lunar-hop/style.css',
  './games/lunar-hop/game.js',
  './games/lunar-hop/icon.svg',
  './games/lunar-feast/',
  './games/lunar-feast/index.html',
  './games/lunar-feast/style.css',
  './games/lunar-feast/game.js',
  './games/lunar-feast/icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && new URL(e.request.url).origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
