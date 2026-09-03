// Vibentra Service Worker - Background Audio & Real Mobile System Notifications
const CACHE_NAME = 'vibentra-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Handle Notification Clicks in Mobile Phone Notification Bar
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';
    const version = event.notification.data?.version;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If window already open, focus it and tell app to open update modal
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
            // If not open, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
