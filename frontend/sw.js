// Vibentra Service Worker - v1.3.0 Offline Shell & Mobile System Notifications
const CACHE_NAME = 'vibentra-offline-v1.3.0';
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/logo.png',
    '/version.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('Pre-caching partial failure:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Stale-While-Revalidate / Network-First with Offline Fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Do not cache audio streams or dynamic live search API queries in the Service Worker cache
    // (Audio downloads are managed directly by IndexedDB binary vault for complete reliability)
    if (request.url.includes('/api/') || request.url.includes('saavncdn') || request.url.includes('googlevideo') || request.url.includes('yt-stream')) {
        return;
    }

    // Only handle GET requests
    if (request.method !== 'GET') return;

    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // If valid response, clone and update cache for app shell & static assets
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Network failed -> Serve from offline cache
                return caches.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // For HTML navigation requests, return root / index.html
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html') || caches.match('/');
                    }
                    return new Response('Network unavailable', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                });
            })
    );
});

// Handle Notification Clicks in Mobile Phone Notification Bar
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';
    const version = event.notification.data?.version;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({
                        action: 'OPEN_UPDATE_MODAL',
                        version: version
                    });
                    return;
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
