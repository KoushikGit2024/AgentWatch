import { useState, useEffect, useCallback } from 'react';
import { webNotificationService } from '../services/webNotificationService';
import { toast } from '../services/toastService';

export function useWebPush() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const supported = webNotificationService.isSupported;
        setIsSupported(supported);

        if (supported && typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
            webNotificationService.getSubscription().then((sub) => {
                setIsSubscribed(Boolean(sub));
            });
        }
    }, []);

    const subscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            await webNotificationService.requestPermissionAndSubscribe();
            setIsSubscribed(true);
            setPermission(Notification.permission);
            toast.success('Push notifications enabled for this device!');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to enable notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            await webNotificationService.unsubscribe();
            setIsSubscribed(false);
            toast.info('Push notifications disabled.');
        } catch (err) {
            toast.error('Failed to unsubscribe.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const sendTest = useCallback(async () => {
        try {
            await webNotificationService.sendTestNotification();
            toast.success('Test notification dispatched!');
        } catch (err) {
            toast.error('Failed to send test push.');
        }
    }, []);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
        sendTest
    };
}
