"""Recursive secret and sensitive parameter redaction engine."""

import re
from typing import Any, Dict, List, Union

# Sensitive key name patterns
SENSITIVE_KEY_PATTERN = re.compile(
    r"(?i)(password|secret|token|api_?key|auth|access_?token|credential|private_?key|bearer|session_?token)"
)

# Sensitive value string patterns (e.g., Bearer tokens, GitHub/Google keys)
SENSITIVE_VALUE_PATTERN = re.compile(
    r"(?i)(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35}|bearer\s+[a-zA-Z0-9\._\-]+)"
)

REDACTED_SUBSTITUTE = "[REDACTED]"


def redact_sensitive_value(val: Any) -> Any:
    """Check and redact single string values if they look like known credentials."""
    if isinstance(val, str):
        if SENSITIVE_VALUE_PATTERN.search(val):
            return REDACTED_SUBSTITUTE
    return val


def redact_secrets(data: Any) -> Any:
    """
    Recursively sanitize dictionaries, lists, or primitives by redacting keys or values
    that match credential patterns.
    """
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            if isinstance(key, str) and SENSITIVE_KEY_PATTERN.search(key):
                sanitized[key] = REDACTED_SUBSTITUTE
            else:
                sanitized[key] = redact_secrets(value)
        return sanitized
    elif isinstance(data, list):
        return [redact_secrets(item) for item in data]
    else:
        return redact_sensitive_value(data)
