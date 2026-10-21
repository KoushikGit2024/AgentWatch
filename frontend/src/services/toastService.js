/**
 * Lightweight event-driven Toast Notification Service.
 * Allows components and services to dispatch typed error, warning, info, and success toasts.
 */

class ToastService {
    constructor() {
        this.listeners = new Set();
        this.toasts = [];
        this.counter = 0;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.toasts);
        return () => this.listeners.delete(listener);
    }

    _notify() {
        for (const listener of this.listeners) {
            listener([...this.toasts]);
        }
    }

    show({ type = 'info', title = '', message = '', duration = 5000 }) {
        const id = 'toast-' + (++this.counter) + '-' + Date.now();
        const toast = { id, type, title, message, duration, timestamp: Date.now() };
        this.toasts = [toast, ...this.toasts].slice(0, 5); // Keep at most 5 toasts visible
        this._notify();

        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }
        return id;
    }

    error(message, title = 'Error') {
        return this.show({ type: 'error', title, message, duration: 6500 });
    }

    warning(message, title = 'Notice') {
        return this.show({ type: 'warning', title, message, duration: 5500 });
    }

    success(message, title = 'Success') {
        return this.show({ type: 'success', title, message, duration: 4000 });
    }

    info(message, title = 'Information') {
        return this.show({ type: 'info', title, message, duration: 4000 });
    }

    dismiss(id) {
        const prevLen = this.toasts.length;
        this.toasts = this.toasts.filter(t => t.id !== id);
        if (this.toasts.length !== prevLen) {
            this._notify();
        }
    }

    clear() {
        this.toasts = [];
        this._notify();
    }
}

export const toastService = new ToastService();
export const toast = toastService;
