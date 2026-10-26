/**
 * Real-time WebSocket connection manager for AgentWatch.
 */
import { getAuthToken } from './api';

export class WebSocketClient {
  constructor({ onMessage, onOpen, onClose, onError }) {
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.socket = null;
    this.reconnectTimer = null;
    this.isClosedManually = false;
  }

  connect() {
    if (typeof window === 'undefined') return;
    this.isClosedManually = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = getAuthToken();
    const wsUrl = `${protocol}//${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        if (this.onOpen) this.onOpen();
      };

      this.socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          // Ignore non-JSON ping/pong messages
        }
      };

      this.socket.onerror = err => {
        if (this.onError) this.onError(err);
      };

      this.socket.onclose = () => {
        if (this.onClose) this.onClose();
        if (!this.isClosedManually) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(payload);
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  disconnect() {
    this.isClosedManually = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
