"""Unit tests for Git DAG Graph API and Service."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_git_graph_endpoint():
    """Test /api/v1/git/graph endpoint response structure."""
    response = client.get("/api/v1/git/graph?limit=20")
    assert response.status_code == 200
    data = response.json()
    assert "has_git" in data
    assert data["has_git"] is True
    assert "commits" in data
    assert isinstance(data["commits"], list)
    assert len(data["commits"]) > 0

    first_commit = data["commits"][0]
    assert "sha" in first_commit
    assert "lane" in first_commit
    assert "lines" in data
    assert "subject" in first_commit


def test_git_commit_diff_endpoint():
    """Test /api/v1/git/commit/{sha} endpoint."""
    graph_res = client.get("/api/v1/git/graph?limit=5")
    assert graph_res.status_code == 200
    first_sha = graph_res.json()["commits"][0]["sha"]

    diff_res = client.get(f"/api/v1/git/commit/{first_sha}")
    assert diff_res.status_code == 200
    data = diff_res.json()
    assert data["sha"] == first_sha
    assert "details" in data
    assert "diff" in data


def test_git_commit_diff_invalid_sha():
    """Test sanitization rejection on malicious/invalid SHA."""
    res = client.get("/api/v1/git/commit/invalid;rm%20-rf")
    assert res.status_code == 400
