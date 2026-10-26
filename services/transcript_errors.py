"""Classification of failed, cancelled and quota-limited Antigravity transcript steps."""

import json
import re
from typing import Any, Dict, Optional

ERROR_STATUSES = {"ERROR", "FAILED", "FAILURE"}
CANCEL_STATUSES = {"CANCELED", "CANCELLED", "ABORTED"}
HARD_ERROR_TYPES = {"ERROR", "ERROR_MESSAGE", "CANCELED", "CANCELLED"}
SOFT_ERROR_TYPES = {"SYSTEM", "SYSTEM_MESSAGE", "EPHEMERAL_MESSAGE"}  # only errors if text matches
TOOL_RESULT_TYPES = (
    "RUN_COMMAND",
    "WRITE_TO_FILE",
    "REPLACE_FILE_CONTENT",
    "MULTI_REPLACE_FILE_CONTENT",
    "VIEW_FILE",
    "GREP_SEARCH",
    "LIST_DIRECTORY",
    "GENERIC",
    "CODE_ACTION",
)
TERMINAL_ERROR_TYPES = {"quota_exceeded", "cancelled"}

_QUOTA = re.compile(
    r"quota|rate[\s_-]?limit|\b429\b|resource[_\s]?exhausted|too many requests", re.I
)
_CANCEL = re.compile(r"cancel+ed|user cancel|aborted by user|interrupted by user", re.I)
_TIMEOUT = re.compile(r"timed out|timeout|deadline exceeded", re.I)
_PERM = re.compile(r"permission denied|access is denied|eacces|not permitted", re.I)

DEFAULT_MESSAGES: Dict[str, str] = {
    "quota_exceeded": "The model API reported a quota or rate limit error.",
    "cancelled": "Execution was cancelled.",
    "timed_out": "The step timed out before completing.",
    "permission_denied": "The step failed with a permission error.",
    "execution_error": "The agent step failed with an error.",
}


def extract_step_text(step: Dict[str, Any]) -> str:
    """Concatenate all human-readable text fields from a transcript step."""
    parts = []
    for key in ("error", "error_message", "status_message", "message", "content"):
        val = step.get(key)
        if not val:
            continue
        if isinstance(val, (dict, list)):
            try:
                val = json.dumps(val)
            except Exception:
                val = str(val)
        parts.append(str(val).strip())
    return "\n".join(p for p in parts if p)


def classify_text(text: str) -> Optional[str]:
    """Keyword-scan error text to produce a stable error kind string."""
    if _QUOTA.search(text):
        return "quota_exceeded"
    if _CANCEL.search(text):
        return "cancelled"
    if _TIMEOUT.search(text):
        return "timed_out"
    if _PERM.search(text):
        return "permission_denied"
    return None


def build_error(kind: str, message: str, timestamp: Optional[str] = None) -> Dict[str, Any]:
    """Construct a normalised error dict for embedding in a turn."""
    msg = (message or "").strip()
    return {
        "type": kind,
        "message": msg[:4000] or DEFAULT_MESSAGES.get(kind, DEFAULT_MESSAGES["execution_error"]),
        "timestamp": timestamp,
    }


def detect_step_error(step: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Return a structured error for a transcript step, or None if the step is healthy.

    Free text is only keyword-scanned for steps that are already flagged as errors or are
    system messages, so tool output that merely mentions 'quota' is not misclassified.
    """
    stype = str(step.get("type") or "").upper()
    status = str(step.get("status") or "").upper()
    hard = status in ERROR_STATUSES or status in CANCEL_STATUSES or stype in HARD_ERROR_TYPES
    if not (hard or stype in SOFT_ERROR_TYPES):
        return None

    text = extract_step_text(step)
    if status in CANCEL_STATUSES or stype in ("CANCELED", "CANCELLED"):
        kind = "cancelled"
    else:
        kind = classify_text(text)
    if kind is None:
        if not hard:
            return None
        kind = "execution_error"
    return build_error(kind, text, step.get("created_at"))
