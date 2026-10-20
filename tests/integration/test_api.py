"""Integration tests for FastAPI application endpoints."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "AgentWatch"


def test_readiness_endpoint():
    response = client.get("/ready")
    # Returns 200 if MongoDB is connected, or 503 if disconnected
    assert response.status_code in (200, 503)
    data = response.json()
    assert "ready" in data
    assert "database" in data
    assert "antigravity" in data
    assert "tailscale" in data
    assert "capabilities" in data


def test_legacy_app_state_contract():
    response = client.get("/app-state")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "mode" in data
    assert "antigravity_connected" in data
    assert "tailscale_serve" in data
    assert data["tailscale_funnel_disabled"] is True


def test_event_ingestion_api():
    payload = {
        "source_event_id": "test_api_event_001",
        "agent_id": "agent_alpha",
        "session_id": "sess_100",
        "event_type": "PreToolUse",
        "raw_payload": {"cmd": "pytest", "secret_token": "dummy_auth_token_for_test_123"},
    }
    response = client.post("/api/v1/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] in ("created", "duplicate")
