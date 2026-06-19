const CACHE_NAME = 'vibentra-cache-v8';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/pages/auth.html',
    '/pages/home.html',
    '/css/style.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/home.js',
    '/js/firebase-config.js',
    '/js/services/musicService.js',
    '/js/services/connectService.js',
    '/js/providers/jiosaavnProvider.js',
    '/js/providers/providerManager.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Event - Cache App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Listen for message from frontend to skip waiting and activate new version
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all clients immediately
});

// Fetch Event - Network First, falling back to Cache
self.addEventListener('fetch', event => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;
    
    // Ignore API requests and third party streaming URLs (like JioSaavn audio, Firebase streams)
    const url = new URL(event.request.url);
    if (url.hostname.includes('firebase') || url.hostname.includes('saavncdn') || url.pathname.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // If network fetch is successful, clone the response and update the cache
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // If network fails (offline), try the cache and ignore query parameters like ?v=123
                return caches.match(event.request, { ignoreSearch: true }).then(response => {
                    if (response) {
                        return response;
                    }
                    // If not found in cache, return a fallback empty response so the browser doesn't throw a promise rejection error
                    return new Response('', { status: 404, statusText: 'Not found in cache' });
                });
            })
    );
});
