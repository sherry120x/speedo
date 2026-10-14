// Turbo 2D Racing - Service Worker (Offline PWA Engine)
const CACHE_NAME = 'turbo2d-v1';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline game assets...');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: Clean up previous caches and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting stale cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Cache-first with network fallback for maximum offline resilience
self.addEventListener('fetch', (event) => {
    // Only handle HTTP/HTTPS GET requests
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // If valid response, optionally cache it
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // If offline and request is for navigation/HTML, return index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
