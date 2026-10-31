"""Unit tests for task output peeking and log seeking."""

from pathlib import Path
from fastapi.testclient import TestClient
from main import app
from services.task_monitor_service import task_monitor_service

client = TestClient(app)


def test_task_log_endpoint_nonexistent():
    """Verify that requesting an unknown task log returns 404."""
    resp = client.get("/api/v1/tasks/task-99999999")
    assert resp.status_code == 404
    data = resp.json()
    assert "detail" in data


def test_task_log_seeking(tmp_path: Path):
    """Verify that get_task_log reads with tail_bytes seeking without loading full file."""
    # Create a dummy task log file
    tasks_dir = tmp_path / ".system_generated" / "tasks"
    tasks_dir.mkdir(parents=True)
    log_file = tasks_dir / "task-42.log"

    # Write 1000 lines
    content = "".join([f"Log line {i}\n" for i in range(1000)])
    log_file.write_text(content, encoding="utf-8")

    res = task_monitor_service.get_task_log("task-42", tail_bytes=100, session_dir=tmp_path)
    assert res is not None
    assert res["task_id"] == "task-42"
    assert len(res["content"]) <= 100
    assert "Log line 999" in res["content"]


def test_step_log_fallback(tmp_path: Path):
    """Verify fallback to steps directory when task_id corresponds to a step output.txt."""
    steps_dir = tmp_path / ".system_generated" / "steps" / "123"
    steps_dir.mkdir(parents=True)
    out_file = steps_dir / "output.txt"
    out_file.write_text("Hello from step execution output", encoding="utf-8")

    res = task_monitor_service.get_task_log("step-123", tail_bytes=500, session_dir=tmp_path)
    assert res is not None
    assert "Hello from step execution output" in res["content"]
