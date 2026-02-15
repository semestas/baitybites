const CACHE_VERSION = '1.6.1';
const CACHE_NAME = `baitybites-oms-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/order.html',
    '/track.html',
    '/dashboard.html',
    '/customers.html',
    '/products.html',
    '/production.html',
    '/kitchen.html',
    '/cms.html',
    '/css/style.css',
    '/css/main.css',
    '/js/app.js',
    '/js/order.js',
    '/js/track.js',
    '/js/dashboard.js',
    '/js/kitchen.js',
    '/js/production.js',
    '/assets/logo.png',
    '/assets/favicon.ico',
    '/assets/favicon.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Caching assets');

            // We use individual fetch/put instead of addAll to robustly handle 
            // potential "Vary: *" headers which cause addAll to fail entirely.
            const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`[SW] Failed to fetch ${url} for cache: ${response.status}`);
                        return;
                    }

                    // Check for Vary: * header which forbids caching
                    const vary = response.headers.get('Vary');
                    if (vary && vary.includes('*')) {
                        console.warn(`[SW] Skipping cache for ${url} due to Vary: * header`);
                        return;
                    }

                    await cache.put(url, response);
                } catch (error) {
                    console.error(`[SW] Error caching ${url}:`, error);
                }
            });

            await Promise.all(cachePromises);
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
                    const vary = response.headers.get('Vary');
                    if (response.ok && (!vary || !vary.includes('*'))) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request).then((cached) => {
                        if (cached) return cached;

                        // If it's an HTML request and both network/cache fail, show a fallback or just a 404
                        const acceptHeader = event.request.headers.get('Accept');
                        if (acceptHeader && acceptHeader.includes('text/html')) {
                            return new Response('<div style="padding: 20px; font-family: sans-serif;"><h1>Offline</h1><p>Halaman ini sedang tidak tersedia secara offline.</p><a href="/">Kembali ke Beranda</a></div>', {
                                headers: { 'Content-Type': 'text/html' }
                            });
                        }
                        return new Response('Not found', { status: 404 });
                    });
                })
        );
        return;
    }

    // Cache-first for static assets (CSS, JS, images)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version 
                // Only update cache in background for SAME-ORIGIN assets
                // This prevents excessive requests to external APIs like Google (avoiding 429)
                if (url.origin === self.location.origin) {
                    fetch(event.request).then((response) => {
                        const vary = response.headers.get('Vary');
                        if (response.ok && (!vary || !vary.includes('*'))) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => { });
                }
                return cachedResponse;
            }

            // Not in cache, fetch from network
            return fetch(event.request).then((response) => {
                const vary = response.headers.get('Vary');
                // Cache successful responses
                if (response.ok && (!vary || !vary.includes('*'))) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // Return a generic error response instead of undefined
                return new Response('Asset not found', { status: 404 });
            });
        })
    );
});
