const CACHE_NAME = 'daily-money-tracker-v5';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png'
];

// Install: cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fall back to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;
  
  // For API calls (supabase) - network only, no cache
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // For app files - network first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, return the app
          if (e.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
