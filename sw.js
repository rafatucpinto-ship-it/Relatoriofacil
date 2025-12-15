const CACHE_NAME = 'serra-sul-v4'; // Final Release Version
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react-router-dom@^7.10.1',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/lucide-react@^0.561.0',
  'https://esm.sh/jspdf@^3.0.4',
  'https://esm.sh/react@^19.2.3',
  'https://cdn-icons-png.flaticon.com/512/906/906334.png'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache error:', err));
    })
  );
  self.skipWaiting();
});

// Activate event - Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests that might fail or are huge (optional optimization)
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('cdn') && !event.request.url.includes('esm.sh')) {
     return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Clone request for fetch
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check valid response
        if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }

        // Clone response for cache
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
          // Fallback logic could go here
          console.log('Offline: Asset not found in cache', event.request.url);
      });
    })
  );
});