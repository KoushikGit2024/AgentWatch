/**
 * AgentWatch Frontend API Service Layer
 * Centralized, type-consistent HTTP client with automatic authentication headers,
 * upward cursor pagination, and screenshot hash deduplication.
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

    async getSnapshot(lastHash = null) {
        const query = lastHash ? `?last_hash=${encodeURIComponent(lastHash)}` : '';
        const res = await request(`/snapshot${query}`);
        return res.json();
    },

    async getPendingInteractions() {
        const res = await request('/api/v1/interactions/pending');
        return res.json();
    },

    async getPendingApprovals() {
        const res = await request('/api/v1/approvals/pending');
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

    async dismissInteraction(interactionId) {
        const res = await request('/api/v1/interactions/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interaction_id: interactionId })
        });
        return res.json();
    },

    async getChatMessages(limit = 15, before = null) {
        const params = new URLSearchParams({ limit: String(limit) });
        if (before !== null && before !== undefined) {
            params.set('before', String(before));
        }
        const res = await request(`/api/v1/chat/messages?${params.toString()}`);
        return res.json();
    },

    async uploadAttachments(files) {
        const formData = new FormData();
        Array.from(files).forEach(f => {
            formData.append('files', f);
        });
        const token = getAuthToken();
        const headers = {
            'ngrok-skip-browser-warning': 'true',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        const res = await fetch('/api/v1/attachments/upload', {
            method: 'POST',
            headers,
            body: formData
        });
        if (!res.ok) {
            let detail = 'Failed to upload attachments';
            try {
                const data = await res.json();
                detail = data.detail || detail;
            } catch {}
            throw new Error(detail);
        }
        return res.json();
    },

    async sendPrompt(prompt, attachments = []) {
        const res = await request('/api/v1/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, prompt, attachments })
        });
        return res.json();
    },

    async submitApproval(requestType, target, decision, stepId, customResponse = '', optionLabel = '') {
        const res = await request('/api/v1/approvals/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request_type: requestType || 'command',
                target: target || 'unknown',
                decision,
                step_id: stepId,
                option_label: optionLabel || undefined,
                custom_response: customResponse ? customResponse.trim() : undefined
            })
        });
        return res.json();
    },

    async setMode(mode) {
        const res = await request('/api/v1/set-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        return res.json();
    },

    async setModel(model) {
        const res = await request('/api/v1/set-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model })
        });
        return res.json();
    },

    async stopAgent() {
        const res = await request('/api/v1/stop', { method: 'POST' });
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
        const res = await request('/chat-history');
        return res.json();
    },

    async getSystemProcesses(sortBy = 'memory', limit = 15) {
        const res = await request(`/api/v1/system/processes?sort_by=${sortBy}&limit=${limit}`);
        return res.json();
    }
};
