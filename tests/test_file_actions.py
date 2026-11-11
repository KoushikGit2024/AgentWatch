"""Unit tests for direct remote file editing (saving, reading, boundaries)."""

from fastapi.testclient import TestClient
from main import app
from services.file_editor_service import file_editor_service

client = TestClient(app)


def test_direct_file_save():
    test_file = file_editor_service.repo_root / "test_direct_save.txt"
    try:
        res = file_editor_service.save_file_content(test_file, "Line 1: Direct content\n")
        assert res["success"] is True
        assert test_file.read_text(encoding="utf-8") == "Line 1: Direct content\n"
    finally:
        if test_file.exists():
            test_file.unlink()


def test_file_actions_api_save():
    test_path = "test_direct_api.txt"
    full_path = file_editor_service.repo_root / test_path
    try:
        save_resp = client.post(
            "/api/v1/files/save",
            json={"path": test_path, "content": "Saved directly via API\n"},
        )
        assert save_resp.status_code == 200
        assert save_resp.json()["success"] is True
        assert full_path.read_text(encoding="utf-8") == "Saved directly via API\n"
    finally:
        if full_path.exists():
            full_path.unlink()
