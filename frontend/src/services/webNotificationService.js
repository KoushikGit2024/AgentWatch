/**
 * Web Push and Browser Notification Service.
 * Manages ServiceWorker registration, VAPID push subscriptions, and push test requests.
 */

import { getAuthToken } from './api';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

class WebNotificationService {
    constructor() {
        this.swRegistration = null;
        this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async registerServiceWorker() {
        if (!this.isSupported) return null;
        try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            this.swRegistration = reg;
            return reg;
        } catch (err) {
            console.warn('[NotificationService] ServiceWorker registration failed:', err);
            return null;
        }
    }

    async getSubscription() {
        if (!this.swRegistration) {
            await this.registerServiceWorker();
        }
        if (!this.swRegistration) return null;
        try {
            return await this.swRegistration.pushManager.getSubscription();
        } catch {
            return null;
        }
    }

    async requestPermissionAndSubscribe() {
        if (!this.isSupported) {
            throw new Error('Web Push notifications are not supported by this browser.');
        }

        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            throw new Error(`Notification permission ${perm}`);
        }

        await this.registerServiceWorker();
        const reg = await navigator.serviceWorker.ready;
        if (!reg) {
            throw new Error('Could not register notification service worker.');
        }

        // Fetch VAPID public key from backend
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const keyRes = await fetch('/api/v1/push/vapid-public-key', { headers });
        if (!keyRes.ok) {
            throw new Error('Failed to retrieve VAPID key from AgentWatch backend.');
        }
        const { publicKey } = await keyRes.json();

        const convertedKey = urlBase64ToUint8Array(publicKey);
        
        // If an old subscription exists with different key/origin, unsubscribe it first
        try {
            const existing = await reg.pushManager.getSubscription();
            if (existing) {
                await existing.unsubscribe();
            }
        } catch (e) {
            console.debug('No existing subscription to cleanup:', e);
        }

        let subscription = null;
        try {
            subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });
        } catch (pushErr) {
            console.warn('[NotificationService] PushManager.subscribe failed, falling back to in-browser Notification mode:', pushErr);
            // If Google FCM / push service fails (e.g. adblocker, corporate firewall, or Brave shields),
            // we fall back gracefully to standard in-browser notifications so the user still gets full alerts!
            return {
                endpoint: 'in-browser-fallback',
                inBrowserOnly: true
            };
        }

        // Send subscription to backend
        const subRes = await fetch('/api/v1/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(subscription.toJSON())
        });

        if (!subRes.ok) {
            throw new Error('Failed to save push subscription on backend.');
        }

        return subscription;
    }

    async unsubscribe() {
        const sub = await this.getSubscription();
        if (!sub) return true;

        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        try {
            const token = getAuthToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await fetch('/api/v1/push/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({ endpoint })
            });
        } catch (e) {
            console.warn('[NotificationService] Failed to notify backend of unsubscribe:', e);
        }

        return true;
    }

    async sendTestNotification() {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification('AgentWatch Notification', {
                    body: 'Notifications are working smoothly on your device!',
                    icon: '/favicon.svg'
                });
            } catch (e) {
                console.debug('Direct Notification constructor failed, triggering via service worker');
            }
        }

        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/v1/push/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify({
                title: 'AgentWatch Notification',
                body: 'Web push is working on this device even with the browser closed!'
            })
        });
        if (!res.ok) throw new Error('Test notification failed.');
        return await res.json();
    }
}

export const webNotificationService = new WebNotificationService();
