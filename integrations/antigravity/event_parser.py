"""Parser and normalizer for Antigravity environment metadata and hook payloads."""

import json
from typing import Optional, Dict, Any
from models.schemas import IngestEventRequest, SourceConfidence
from security.redaction import redact_secrets
from datetime import datetime, timezone
import logging

logger = logging.getLogger("integrations.antigravity.parser")


def parse_environment_metadata(env: Dict[str, str]) -> Optional[IngestEventRequest]:
    """
    Parse genuine in-flight Antigravity metadata injected into agent subshells:
    - ANTIGRAVITY_SOURCE_METADATA: JSON containing conversationId, stepIndex, tool details
    - ANTIGRAVITY_CONVERSATION_ID: Conversation UUID
    - ANTIGRAVITY_TRAJECTORY_ID: Trajectory UUID
    """
    raw_meta = env.get("ANTIGRAVITY_SOURCE_METADATA")
    conv_id = env.get("ANTIGRAVITY_CONVERSATION_ID")

    if not raw_meta and not conv_id:
        return None

    meta = {}
    if raw_meta:
        try:
            meta = json.loads(raw_meta)
        except Exception as e:
            logger.warning("Failed to decode ANTIGRAVITY_SOURCE_METADATA: %s", str(e))

    session_id = conv_id or meta.get("conversationId") or "unknown_session"
    step_idx = meta.get("stepIndex", 0)
    tool_name = meta.get("toolName", "AgentStep")

    # Deterministic source event ID
    source_event_id = f"{session_id}:PreToolUse:{step_idx}:{tool_name}"

    raw_args = meta.get("argumentsJson")
    args = {}
    if raw_args:
        try:
            args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
        except Exception:
            args = {"raw": str(raw_args)}

    sanitized_args = redact_secrets(args)

    return IngestEventRequest(
        source_event_id=source_event_id,
        agent_id="antigravity_agent",
        session_id=session_id,
        task_id=f"step_{step_idx}",
        event_type="PreToolUse",
        timestamp=datetime.now(timezone.utc),
        source="antigravity",
        source_confidence=SourceConfidence.OBSERVED,
        raw_payload={
            "tool_name": tool_name,
            "step_index": step_idx,
            "arguments": sanitized_args,
            "trajectory_id": env.get("ANTIGRAVITY_TRAJECTORY_ID"),
        },
    )
