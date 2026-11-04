import { request } from './api';

export const terminalApi = {
  async listSessions() {
    const res = await request('/api/v1/terminal/sessions');
    return res.json();
  },

  async createSession(shellType = 'powershell') {
    const res = await request('/api/v1/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shell_type: shellType }),
    });
    return res.json();
  },

  async closeSession(sessionId) {
    const res = await request(`/api/v1/terminal/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async executeCommand(sessionId, command) {
    const res = await request(
      `/api/v1/terminal/sessions/${encodeURIComponent(sessionId)}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      }
    );
    return res.json();
  },

  async killSession(sessionId) {
    const res = await request(`/api/v1/terminal/sessions/${encodeURIComponent(sessionId)}/kill`, {
      method: 'POST',
    });
    return res.json();
  },

  async getSessionOutput(sessionId, tail = 300) {
    const res = await request(
      `/api/v1/terminal/sessions/${encodeURIComponent(sessionId)}/output?tail=${tail}`
    );
    return res.json();
  },
};
