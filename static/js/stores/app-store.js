// Central Application State Store
export class AppStore {
    constructor() {
        this.state = {
            connected: false,
            activeSession: null,
            currentMode: 'Fast',
            currentModel: 'Default Agent',
            pendingInteractions: [],
            capabilities: [],
            isSending: false,
        };
        this.listeners = new Set();
    }

    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.listeners.forEach(fn => fn(this.state));
    }

    getState() {
        return this.state;
    }
}

export const store = new AppStore();
