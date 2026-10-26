/**
 * Service Worker for AgentWatch Web Push Notifications.
 * Handles background push events, system notification display, and notification clicks.
 */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let payload = {
        title: 'AgentWatch Notification',
        body: 'New alert from AgentWatch',
        tag: 'agentwatch-alert',
        url: '/',
        data: {}
    };

    try {
        payload = event.data.json();
    } catch (e) {
        payload.body = event.data.text();
    }

    const options = {
        body: payload.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: payload.tag || 'agentwatch-alert',
        renotify: true,
        data: {
            url: payload.url || '/',
            ...payload.data
        },
        actions: [
            { action: 'open', title: 'Open AgentWatch' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    client.focus();
                    if ('postMessage' in client && event.notification.data) {
                        client.postMessage({
                            type: 'notification_opened',
                            data: event.notification.data
                        });
                    }
                    return;
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
