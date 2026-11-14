"""Unit tests for attachment upload and management endpoint."""

import io
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_upload_single_image_attachment():
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    files = {"files": ("mock_screenshot.png", io.BytesIO(file_content), "image/png")}

    res = client.post("/api/v1/attachments/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] == 1
    att = data["attachments"][0]
    assert att["filename"].endswith(".png")
    assert att["is_image"] is True
    assert att["size"] == len(file_content)
    assert att["url"].startswith("/uploads/")


def test_upload_code_file_attachment():
    file_content = b"console.log('Hello from AgentWatch');\n"
    files = {"files": ("script.js", io.BytesIO(file_content), "application/javascript")}

    res = client.post("/api/v1/attachments/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    att = data["attachments"][0]
    assert att["filename"].endswith(".js")
    assert att["is_image"] is False
    assert att["size"] == len(file_content)


def test_upload_multiple_attachments():
    files = [
        ("files", ("image.jpg", io.BytesIO(b"\xff\xd8\xff"), "image/jpeg")),
        ("files", ("notes.txt", io.BytesIO(b"Meeting notes"), "text/plain")),
    ]

    res = client.post("/api/v1/attachments/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 2
    assert data["attachments"][0]["is_image"] is True
    assert data["attachments"][1]["is_image"] is False


def test_prompt_send_with_attachments():
    payload = {
        "message": "Please review this screenshot and script",
        "attachments": [
            {
                "original_name": "screenshot.png",
                "storage_path": "d:/All Codes/AllProjects/AgentWatchV2/uploads/test.png",
                "is_image": True,
            },
            {
                "original_name": "app.py",
                "storage_path": "d:/All Codes/AllProjects/AgentWatchV2/uploads/app.py",
                "is_image": False,
            },
        ],
    }
    res = client.post("/send", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert data["attachments_count"] == 2
