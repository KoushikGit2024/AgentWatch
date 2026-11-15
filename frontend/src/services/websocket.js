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
    this.pingTimer = null;
    this.reconnectAttempts = 0;
    this.isClosedManually = false;

    if (typeof document !== 'undefined') {
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.stopPing();
    } else {
      // Returned to active tab: if disconnected or closing, reconnect immediately
      if (!this.isClosedManually && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectAttempts = 0;
        this.connect();
      } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.startPing();
      }
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN && !document.hidden) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch {}
      }
    }, 25000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
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
        this.reconnectAttempts = 0;
        this.startPing();
        if (this.onOpen) this.onOpen();
      };

      this.socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'pong') return;
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          // Ignore non-JSON ping/pong messages
        }
      };

      this.socket.onerror = err => {
        if (this.onError) this.onError(err);
      };

      this.socket.onclose = () => {
        this.stopPing();
        if (this.onClose) this.onClose();
        if (!this.isClosedManually) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.stopPing();
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
    // Exponential backoff capped at 20s: 2s -> 4s -> 8s -> 16s -> 20s
    this.reconnectAttempts += 1;
    const delay = Math.min(20000, 1000 * Math.pow(2, Math.min(this.reconnectAttempts, 4)));
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.isClosedManually = true;
    this.stopPing();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
