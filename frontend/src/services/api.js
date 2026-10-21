/**
 * AgentWatch Frontend API Service Layer
 * Centralized, type-consistent HTTP client with automatic authentication headers.
 */

export const getAuthToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('agentwatch_token') : null;
};

export const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const handleAuthFailure = (status) => {
    if (status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('agentwatch_token');
        window.location.replace('/login.html');
    }
};

const request = async (url, options = {}) => {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };
    let res;
    try {
        res = await fetch(url, { ...options, headers });
    } catch (networkErr) {
        throw new Error(`Network connection error: ${networkErr.message || 'Server unreachable'}`);
    }

    if (res.status === 401) {
        handleAuthFailure(res.status);
        throw new Error('Authentication required. Session expired or missing credentials.');
    }

    if (!res.ok) {
        let errorDetail = `HTTP ${res.status} ${res.statusText}`;
        try {
            const data = await res.json();
            errorDetail = data.detail || data.reason || data.error || errorDetail;
        } catch {
            try {
                const text = await res.text();
                if (text && text.length < 200) errorDetail = text;
            } catch {}
        }
        const err = new Error(errorDetail);
        err.status = res.status;
        throw err;
    }

    return res;
};

export const api = {
    async getAppState() {
        const res = await request('/app-state');
        return res.json();
    },

    async getSnapshot() {
        const res = await request('/snapshot');
        return res.json();
    },

    async getPendingInteractions() {
        const res = await request('/api/v1/interactions/pending');
        return res.json();
    },

    async respondInteraction(interactionId, selectedOptions = [], customResponse = '') {
        const res = await request('/api/v1/interactions/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                interaction_id: interactionId,
                selected_options: Array.from(selectedOptions),
                custom_response: customResponse
            })
        });
        return res.json();
    },

    async getChatMessages(limit = 50) {
        const res = await request(`/api/v1/chat/messages?limit=${limit}`);
        return res.json();
    },

    async sendPrompt(prompt) {
        const res = await request('/api/v1/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, prompt })
        });
        return res.json();
    },

    async submitApproval(requestType, target, decision, stepId) {
        const res = await request('/api/v1/approvals/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request_type: requestType,
                target: target || 'unknown',
                decision,
                step_id: stepId
            })
        });
        return res.json();
    },

    async setMode(mode) {
        const res = await request('/api/v1/controls/mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        return res.json();
    },

    async setModel(model) {
        const res = await request('/api/v1/controls/model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model })
        });
        return res.json();
    },

    async stopAgent() {
        const res = await request('/api/v1/controls/stop', { method: 'POST' });
        return res.json();
    },

    async getTimeline(limit = 80) {
        const res = await request(`/api/v1/events?limit=${limit}`);
        return res.json();
    },

    async getLogs(limit = 250) {
        const res = await request(`/api/v1/logs?limit=${limit}`);
        return res.json();
    },

    async getRecoveryItems() {
        const res = await request('/api/v1/events/recovery-items');
        return res.json();
    },

    async getDiagnostics() {
        const res = await request('/api/v1/diagnostics');
        return res.json();
    },

    async getHistoryChats() {
        const res = await request('/api/v1/chat/history');
        return res.json();
    }
};
