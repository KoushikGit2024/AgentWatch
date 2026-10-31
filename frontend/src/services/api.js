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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const handleAuthFailure = status => {
  if (status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('agentwatch_token');
    window.location.replace('/login.html');
  }
};

const request = async (url, options = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Device is currently offline (navigator.onLine is false)');
  }

  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  // Provide a generous 15-second default timeout to prevent indefinite UI hangs while accommodating slower disk / git operations
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(new Error('Request timed out after 15 seconds')), options.timeoutMs || 15000)
    : null;

  let res;
  try {
    const fetchOptions = {
      ...options,
      headers,
      signal: options.signal || (controller ? controller.signal : undefined),
    };
    res = await fetch(url, fetchOptions);
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      throw new Error(`Request timed out: ${url}`);
    }
    throw new Error(`Network connection error: ${networkErr.message || 'Server unreachable'}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
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
        custom_response: customResponse,
      }),
    });
    return res.json();
  },

  async dismissInteraction(interactionId) {
    const res = await request('/api/v1/interactions/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interaction_id: interactionId }),
    });
    return res.json();
  },

  async getChatMessages(limit = 15, before = null, conversationId = null) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before !== null && before !== undefined) {
      params.set('before', String(before));
    }
    if (conversationId) {
      params.set('conversation_id', conversationId);
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch('/api/v1/attachments/upload', {
      method: 'POST',
      headers,
      body: formData,
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
      body: JSON.stringify({ message: prompt, prompt, attachments }),
    });
    return res.json();
  },

  async submitApproval(
    requestType,
    target,
    decision,
    stepId,
    customResponse = '',
    optionLabel = ''
  ) {
    const res = await request('/api/v1/approvals/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_type: requestType || 'command',
        target: target || 'unknown',
        decision,
        step_id: stepId,
        option_label: optionLabel || undefined,
        custom_response: customResponse ? customResponse.trim() : undefined,
      }),
    });
    return res.json();
  },

  async setMode(mode) {
    const res = await request('/api/v1/set-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    return res.json();
  },

  async setModel(model) {
    const res = await request('/api/v1/set-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
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

  async getLogFiles() {
    const res = await request('/api/v1/logs/files');
    return res.json();
  },

  async getLogAnalytics(dateOrFile) {
    const res = await request(
      `/api/v1/logs/analytics?date_or_file=${encodeURIComponent(dateOrFile)}`
    );
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
  },

  async terminateProcess(pids, name = '') {
    const res = await request('/api/v1/system/processes/terminate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pids: Array.isArray(pids) ? pids : [pids],
        name,
      }),
    });
    return res.json();
  },

  async getFileContent(filePath) {
    const encoded = encodeURIComponent(filePath);
    const res = await request(`/api/v1/files/content?path=${encoded}`);
    return res.json();
  },

  async getFileTree(subpath = '') {
    const query = subpath ? `?subpath=${encodeURIComponent(subpath)}` : '';
    const res = await request(`/api/v1/files/tree${query}`);
    return res.json();
  },

  async getQueuedMessages() {
    const res = await request('/api/v1/queue/messages');
    return res.json();
  },

  async queueMessage(message, attachments = []) {
    const res = await request('/api/v1/queue/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, attachments }),
    });
    return res.json();
  },

  async executeQueuedAction(itemId, action, text = null) {
    const res = await request(`/api/v1/queue/messages/${encodeURIComponent(itemId)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, text }),
    });
    return res.json();
  },

  async getArtifacts(conversationId = null) {
    const qs = conversationId ? `?conversation_id=${encodeURIComponent(conversationId)}` : '';
    const res = await request(`/api/v1/artifacts${qs}`);
    return res.json();
  },

  async toggleTerminal() {
    const res = await request('/api/v1/controls/terminal/toggle', {
      method: 'POST',
    });
    return res.json();
  },

  async getTerminalTasks() {
    const res = await request('/api/v1/controls/terminal/tasks');
    return res.json();
  },

  async killTerminalTask(index = 0, tooltipId = null) {
    const res = await request('/api/v1/controls/terminal/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, tooltip_id: tooltipId }),
    });
    return res.json();
  },

  async deleteQueuedMessage(itemId) {
    const res = await request(`/api/v1/queue/messages/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getAttachments(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.scope) query.set('scope', params.scope);
    if (params.conversation_id) query.set('conversation_id', params.conversation_id);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request(`/api/v1/attachments${qs}`);
    return res.json();
  },

  async deleteAttachment(filename) {
    const res = await request(`/api/v1/attachments/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async deleteBatchAttachments(filenames = []) {
    const res = await request('/api/v1/attachments/delete-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });
    return res.json();
  },

  async deleteLogFile(filename) {
    const res = await request(`/api/v1/logs/files?filename=${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getGitReview() {
    const res = await request('/api/v1/git/review');
    return res.json();
  },

  async getVapidPublicKey() {
    const res = await request('/api/v1/push/vapid-public-key');
    return res.json();
  },

  async subscribePush(subscriptionPayload) {
    const res = await request('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionPayload),
    });
    return res.json();
  },

  async unsubscribePush(endpoint) {
    const res = await request('/api/v1/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return res.json();
  },

    async sendTestPush(payload = {}) {
    const res = await request('/api/v1/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Tailscale Dynamic Port Forwarding
  async getTailscalePorts() {
    const res = await request('/api/v1/tailscale/ports');
    return res.json();
  },

  async forwardPort(localPort, externalPort = null, label = null) {
    const res = await request('/api/v1/tailscale/ports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_port: Number(localPort),
        external_port: externalPort ? Number(externalPort) : null,
        label: label || null,
      }),
    });
    return res.json();
  },

  async removePortForward(port) {
    const res = await request(`/api/v1/tailscale/ports/${port}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};

export { request };
