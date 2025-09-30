const CACHE = 'syastore-cache-v2';
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

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for JSON (para que RTR siempre vea cambios)
  if (url.pathname.endsWith('/items.json') || url.pathname.endsWith('/discounts.json') || url.pathname.endsWith('/settings.json')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  // Default: cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});