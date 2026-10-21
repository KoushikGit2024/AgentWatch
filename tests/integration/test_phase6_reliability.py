"""Phase 6 Reliability, State Machine, CDP Target Validation, and Diagnostics Tests."""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from models.schemas import (
    ActionExecutionState,
    validate_action_transition,
    VALID_ACTION_TRANSITIONS,
)
from repositories.idempotency_repository import IdempotencyRepository
from integrations.antigravity.adapter import AntigravityAdapter

client = TestClient(app)


def test_action_lifecycle_state_matrix():
    """Verify state transitions adhere strictly to Phase 1 transition matrix."""
    # Permitted forward transitions
    assert validate_action_transition(ActionExecutionState.REQUEST_RECEIVED, ActionExecutionState.REQUEST_ACCEPTED) is True
    assert validate_action_transition(ActionExecutionState.REQUEST_ACCEPTED, ActionExecutionState.DISPATCH_ATTEMPTED) is True
    assert validate_action_transition(ActionExecutionState.DISPATCH_ATTEMPTED, ActionExecutionState.DISPATCH_ACKNOWLEDGED) is True
    assert validate_action_transition(ActionExecutionState.DISPATCH_ACKNOWLEDGED, ActionExecutionState.EXECUTION_OBSERVED) is True
    assert validate_action_transition(ActionExecutionState.EXECUTION_OBSERVED, ActionExecutionState.COMPLETION_CONFIRMED) is True

    # Ambiguous outcome transitions
    assert validate_action_transition(ActionExecutionState.DISPATCH_ATTEMPTED, ActionExecutionState.OUTCOME_UNKNOWN) is True
    assert validate_action_transition(ActionExecutionState.DISPATCH_ACKNOWLEDGED, ActionExecutionState.OUTCOME_UNKNOWN) is True

    # Immediate rejection transitions
    assert validate_action_transition(ActionExecutionState.REQUEST_RECEIVED, ActionExecutionState.REJECTED) is True

    # Invalid backward transitions from terminal states
    assert validate_action_transition(ActionExecutionState.COMPLETION_CONFIRMED, ActionExecutionState.DISPATCH_ATTEMPTED) is False
    assert validate_action_transition(ActionExecutionState.REJECTED, ActionExecutionState.EXECUTION_OBSERVED) is False
    assert validate_action_transition(ActionExecutionState.FAILED, ActionExecutionState.COMPLETION_CONFIRMED) is False

    # Out-of-order skipping check: Cannot jump from request_received directly to completion_confirmed
    assert validate_action_transition(ActionExecutionState.REQUEST_RECEIVED, ActionExecutionState.COMPLETION_CONFIRMED) is False


def test_operational_diagnostics_endpoint():
    """Verify /api/v1/diagnostics returns sanitized, independent component health checks."""
    res = client.get("/api/v1/diagnostics")
    assert res.status_code == 200
    diag = res.json()

    # Core structure validation
    assert diag["fastapi_live"] is True
    assert "mongodb_ready" in diag
    assert "cdp_connected" in diag
    assert "in_progress_operations_count" in diag
    assert "outcome_unknown_count" in diag
    assert "reconnection_attempts" in diag


def test_mark_outcome_unknown_preserves_ttl_and_audit():
    """Verify mark_outcome_unknown preserves record for 7 days rather than early eviction."""
    repo = IdempotencyRepository()
    key = f"test-key-unknown-{uuid.uuid4().hex}"

    # 1. Reserve record
    repo.reserve_or_get(
        scope="prompt_send",
        idempotency_key=key,
        payload={"message": "Uncertain dispatch"}
    )

    # 2. Mark outcome as unknown due to connection interruption
    repo.mark_outcome_unknown(
        scope="prompt_send",
        idempotency_key=key,
        reason="CDP connection dropped mid-dispatch"
    )

    # 3. Verify record state
    record = repo.collection.find_one({"scope": "prompt_send", "idempotency_key": key})
    assert record is not None
    assert record["status"] == ActionExecutionState.OUTCOME_UNKNOWN.value
    assert record["metadata"]["outcome_reason"] == "CDP connection dropped mid-dispatch"
    
    # TTL should be extended into future (~7 days)
    now = datetime.now(timezone.utc)
    exp = record["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    assert exp > now


def test_cdp_antigravity_target_validation():
    """Verify _is_antigravity_target distinguishes Antigravity workbench from other Chrome pages."""
    adapter = AntigravityAdapter()

    # Valid Antigravity workbench target
    valid_target = {
        "title": "AgentWatchV2 - Antigravity IDE - App.jsx",
        "url": "vscode-file://vscode-app/c:/Users/koush/AppData/Local/Programs/Antigravity%20IDE/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html",
        "type": "page"
    }
    assert adapter._is_antigravity_target(valid_target) is True

    # Generic chrome web page target (should be rejected)
    web_target = {
        "title": "Google Search",
        "url": "https://www.google.com",
        "type": "page"
    }
    assert adapter._is_antigravity_target(web_target) is False

    # Background service worker or devtools inspector (should be rejected)
    devtools_target = {
        "title": "DevTools",
        "url": "devtools://devtools/bundled/inspector.html",
        "type": "page"
    }
    assert adapter._is_antigravity_target(devtools_target) is False

    # Empty target
    assert adapter._is_antigravity_target({}) is False
