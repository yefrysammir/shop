const CACHE = 'salem-store-v2';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'items.json',
  'discounts.json',
  'settings.json',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});