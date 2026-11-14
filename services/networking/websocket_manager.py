"""WebSocket connection manager for real-time AgentWatch streaming."""

import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("services.websocket_manager")


class WebSocketManager:
    """Manages active WebSockets and broadcasts live state updates to frontend."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected. Total clients: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(
                "WebSocket client disconnected. Total clients: %d", len(self.active_connections)
            )

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast payload to all active clients, pruning stale connections."""
        if not self.active_connections:
            return

        payload = json.dumps(message)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead.append(connection)

        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)


websocket_manager = WebSocketManager()
