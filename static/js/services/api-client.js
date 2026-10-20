// API Client Service for CloudWatchV2
export class ApiClient {
    static async request(url, options = {}) {
        if (!options.headers) options.headers = {};
        options.headers['ngrok-skip-browser-warning'] = 'true';

        try {
            const res = await fetch(url, options);
            if (res.status === 401) {
                console.warn('[AUTH] Unauthorized. Redirecting to login...');
                window.location.href = '/login.html';
                return new Promise(() => {});
            }
            return res;
        } catch (e) {
            console.error('[API] Request failed for', url, e);
            throw e;
        }
    }

    static async getJson(url) {
        const res = await this.request(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    }

    static async postJson(url, data) {
        const res = await this.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${res.status}`);
        }
        return await res.json();
    }
}
