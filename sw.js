
const CACHE_NAME = 'aosta-guide-v1';
const CORE_ASSETS = [
  './index.html',
  './assets/style.css',
  './assets/app.js',
  './assets/data/guide.json',
  './manifest.webmanifest',
  './assets/icon.svg'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (CORE_ASSETS.some(p => url.href.endsWith(p) || url.pathname.endsWith(p))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  } else {
    // Network first for everything else (e.g., map tiles, images)
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
