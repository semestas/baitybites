const CACHE_NAME = 'baitybites-oms-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/main.css',
    '/js/app.js',
    '/assets/logo.png',
    '/assets/favicon.png',
    'https://fonts.googleapis.com/css2?family=Exo:ital,wght@0,100..900;1,100..900&family=Outfit:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests or specific internal API if needed
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                // Optional: Cache new successful requests
                return response;
            }).catch(() => {
                // Fallback or generic error handling
            });
        })
    );
});
