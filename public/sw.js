const CACHE_VERSION = '1.8.0';
const CACHE_NAME = `baitybites-oms-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/order.html',
    '/track.html',
    '/dashboard.html',
    '/css/style.css',
    '/css/main.css',
    '/js/app.js',
    '/js/order.js',
    '/js/track.js',
    '/js/dashboard.js',
    '/assets/logo.png',
    '/assets/favicon.ico',
    '/assets/favicon.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            // Force the waiting service worker to become the active service worker
            return self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('baitybites-oms-v') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - Network-first strategy for HTML/API, cache-first for assets
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Network-first for HTML pages and API calls
    if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response before caching
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first for static assets (CSS, JS, images)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version but update cache in background
                fetch(event.request).then((response) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response);
                    });
                }).catch(() => {
                    // Ignore fetch errors for background updates
                });
                return cachedResponse;
            }

            // Not in cache, fetch from network
            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            });
        })
    );
});
