/**
 * Service Worker for K-Beauty Order PWA
 * Implements Cache First strategy for assets and Network First for API calls.
 */

const CACHE_NAME = 'k-beauty-cache-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache immediately upon installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/style.css',
  '/js/app.js',
  // Add font URLs if self-hosted
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap'
];

// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opened cache');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
        // Don't fail install if one asset fails, but log it
        return Promise.resolve(); 
      });
    })
  );
  // Force activation immediately to skip waiting phase
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch Event: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or cross-origin requests that aren't same-origin
  if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Fetch from network
      return fetch(request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone the response because it's a stream
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache GET requests for same-origin
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_PAGE);
        }
      });
    })
  );
});
