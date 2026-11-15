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
    """
    Ensure ring buffer handler is attached cleanly to the root logger only.
    Because logging propagates upward by default, attaching to child loggers as well
    causes duplicate log records to be emitted to the buffer.
    """
    root_logger = logging.getLogger()
    if log_buffer_handler not in root_logger.handlers:
        root_logger.addHandler(log_buffer_handler)


# Global singleton instance attached to loggers
log_buffer_handler = RingBufferLogHandler(capacity=500)
log_buffer_handler.setLevel(logging.INFO)
attach_to_all_loggers()
