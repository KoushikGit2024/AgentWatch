"""Tests for Antigravity environment metadata parsing."""

import json
from integrations.antigravity.event_parser import parse_environment_metadata
from models.schemas import SourceConfidence


def test_parse_valid_environment_metadata():
    env = {
        "ANTIGRAVITY_CONVERSATION_ID": "conv-uuid-1234-5678",
        "ANTIGRAVITY_TRAJECTORY_ID": "traj-uuid-9999",
        "ANTIGRAVITY_SOURCE_METADATA": json.dumps({
            "conversationId": "conv-uuid-1234-5678",
            "stepIndex": 42,
            "toolName": "run_command",
            "argumentsJson": json.dumps({"command": "git status", "apiKey": "secret_key_123"}),
        })
    }
    event = parse_environment_metadata(env)
    assert event is not None
    assert event.session_id == "conv-uuid-1234-5678"
    assert event.source_event_id == "conv-uuid-1234-5678:PreToolUse:42:run_command"
    assert event.source_confidence == SourceConfidence.OBSERVED
    assert event.raw_payload["tool_name"] == "run_command"
    assert event.raw_payload["arguments"]["apiKey"] == "[REDACTED]"
    assert event.raw_payload["arguments"]["command"] == "git status"


def test_parse_empty_environment():
    assert parse_environment_metadata({}) is None
