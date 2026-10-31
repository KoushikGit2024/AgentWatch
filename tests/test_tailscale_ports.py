"""Unit tests for Tailscale Port Forwarding Service and API Endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app
from services.tailscale_service import tailscale_service


@pytest.fixture
def client():
    return TestClient(app)


def test_tailscale_status_endpoint(client):
    """Verify /api/v1/tailscale/status returns expected health format."""
    res = client.get("/api/v1/tailscale/status")
    assert res.status_code == 200
    data = res.json()
    assert "installed" in data
    assert "funnel_disabled_verified" in data
    assert data["funnel_disabled_verified"] is True


def test_tailscale_ports_endpoint(client):
    """Verify /api/v1/tailscale/ports lists active ports."""
    res = client.get("/api/v1/tailscale/ports")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "forwards" in data
    assert isinstance(data["forwards"], list)


def test_port_forward_validation_rules(client):
    """Test safe port boundaries (reject ports < 1024)."""
    res = client.post("/api/v1/tailscale/ports", json={"local_port": 80})
    assert res.status_code == 422  # Pydantic validation error


def test_cannot_delete_primary_port(client):
    """Verify safeguard that prevents unbinding primary port 443."""
    res = client.delete("/api/v1/tailscale/ports/443")
    assert res.status_code == 400
    assert "reserved" in res.json()["detail"].lower()

