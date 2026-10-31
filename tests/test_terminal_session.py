import time
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_terminal_session_lifecycle():
    # 1. List sessions
    res = client.get("/api/v1/terminal/sessions")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["sessions"]) >= 1

    # 2. Create new session
    create_res = client.post(
        "/api/v1/terminal/sessions",
        json={"shell_type": "powershell"}
    )
    assert create_res.status_code == 200
    new_session = create_res.json()
    session_id = new_session["session_id"]
    assert session_id.startswith("term-")

    # 3. Execute echo command
    exec_res = client.post(
        f"/api/v1/terminal/sessions/{session_id}/execute",
        json={"command": "echo test_agentwatch_output"}
    )
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["success"] is True

    # 4. Wait brief moment and get session output
    time.sleep(0.4)
    out_res = client.get(f"/api/v1/terminal/sessions/{session_id}/output?tail=20")
    assert out_res.status_code == 200
    out_data = out_res.json()
    assert out_data["success"] is True
    assert any("test_agentwatch_output" in l for l in out_data["lines"])

    # 5. Close session
    del_res = client.delete(f"/api/v1/terminal/sessions/{session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
