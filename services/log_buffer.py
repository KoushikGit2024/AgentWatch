"""In-memory circular log buffer capturing real-time system and agent logs."""

import logging
from collections import deque
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

class RingBufferLogHandler(logging.Handler):
    """Thread-safe circular log buffer for live frontend streaming and diagnostics."""

    def __init__(self, capacity: int = 400):
        super().__init__()
        self.capacity = capacity
        self.buffer: deque = deque(maxlen=capacity)

    def emit(self, record: logging.LogRecord):
        try:
            entry = {
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "time_str": datetime.fromtimestamp(record.created).strftime("%H:%M:%S"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            self.buffer.append(entry)
        except Exception:
            self.handleError(record)

    def get_logs(self, limit: int = 150, min_level: Optional[str] = None) -> List[Dict[str, Any]]:
        logs = list(self.buffer)
        if min_level:
            level_order = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}
            min_val = level_order.get(min_level.upper(), 0)
            logs = [e for e in logs if level_order.get(e["level"], 0) >= min_val]
        return logs[-limit:]


def attach_to_all_loggers():
    """Ensure ring buffer handler is attached across standard loggers."""
    loggers_to_attach = [
        "",  # root
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "main",
        "integrations.antigravity.adapter",
        "api",
        "repositories",
        "services"
    ]
    for name in loggers_to_attach:
        l = logging.getLogger(name)
        if log_buffer_handler not in l.handlers:
            l.addHandler(log_buffer_handler)


# Global singleton instance attached to loggers
log_buffer_handler = RingBufferLogHandler(capacity=500)
log_buffer_handler.setLevel(logging.INFO)
attach_to_all_loggers()
