const CACHE_VERSION = '2.1.4';

// --- Production Protection: Silence console.log in non-local environments ---
if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(self.location.hostname)) {
    const noop = () => { };
    console.log = noop;
    console.debug = noop;
    console.info = noop;
}
const CACHE_NAME = `baitybites-oms-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/order.html',
    '/orders.html',
    '/track.html',
    '/dashboard.html',
    '/customers.html',
    '/products.html',
    '/production.html',
    '/kitchen.html',
    '/cms.html',
    '/admin.html',
    '/profile.html',
    '/privacy.html',
    '/tos.html',
    '/docs.html',
    '/wa-direct.html',
    `/css/style.css?v=${CACHE_VERSION}`,
    `/css/main.css?v=${CACHE_VERSION}`,
    `/js/app.js?v=${CACHE_VERSION}`,
    `/js/components.js?v=${CACHE_VERSION}`,
    `/js/home.js?v=${CACHE_VERSION}`,
    `/js/order.js?v=${CACHE_VERSION}`,
    `/js/track.js?v=${CACHE_VERSION}`,
    `/js/dashboard.js?v=${CACHE_VERSION}`,
    `/js/kitchen.js?v=${CACHE_VERSION}`,
    `/js/production.js?v=${CACHE_VERSION}`,
    `/js/profile.js?v=${CACHE_VERSION}`,
    `/js/wa-direct.js?v=${CACHE_VERSION}`,
    '/assets/logo.png',
    '/assets/favicon.ico',
    '/assets/favicon.png'
];

/**
 * Sanitizes a response before caching it.
 * The Cache API forbids caching responses with 'Vary: *'.
 * We strip this header if present to ensure offline support.
 */
async function sanitizeResponse(response) {
    const vary = response.headers.get('Vary');
    if (vary && vary.includes('*')) {
        const newHeaders = new Headers(response.headers);
        newHeaders.delete('Vary');

        // Return a new response with the body and modified headers
        // We use blob() to handle the body correctly for all types
        const body = await response.blob();
        return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    }
    return response;
}

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

                    const responseToCache = await sanitizeResponse(response);
                    await cache.put(url, responseToCache);
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

    // Ignore chrome-extension or other non-http implementations
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    // Network-first for HTML pages and API calls
    if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(async (response) => {
                    if (response.ok) {
                        const responseToCache = await sanitizeResponse(response.clone());
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
        caches.match(event.request, { ignoreSearch: false }).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version 
                // Only update cache in background for SAME-ORIGIN assets
                if (url.origin === self.location.origin) {
                    fetch(event.request).then(async (response) => {
                        if (response.ok) {
                            const sanitized = await sanitizeResponse(response);
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, sanitized);
                            });
                        }
                    }).catch(() => { });
                }
                return cachedResponse;
            }

            // Not in cache, fetch from network
            return fetch(event.request).then(async (response) => {
                if (response.ok) {
                    const responseToCache = await sanitizeResponse(response.clone());
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                return new Response('Asset not found', { status: 404 });
            });
        })
    );
});
