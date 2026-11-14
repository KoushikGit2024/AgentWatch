"""Unit tests for direct remote file editing (saving, reading, boundaries)."""

from fastapi.testclient import TestClient
from main import app
from services.workspace.file_editor_service import file_editor_service

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


def test_file_actions_create_rename_move_delete():
    root = file_editor_service.repo_root
    test_folder = root / "temp_test_tree"
    test_subfolder = root / "temp_test_tree_dest"
    file_a = test_folder / "file_a.txt"
    file_renamed = test_folder / "file_renamed.txt"
    moved_file = test_subfolder / "file_renamed.txt"

    try:
        # 1. Create directory
        res_dir = client.post("/api/v1/files/create", json={"path": str(test_folder), "is_dir": True})
        assert res_dir.status_code == 200
        res_dest = client.post("/api/v1/files/create", json={"path": str(test_subfolder), "is_dir": True})
        assert res_dest.status_code == 200

        # 2. Create file
        res_file = client.post("/api/v1/files/create", json={"path": str(file_a), "is_dir": False})
        assert res_file.status_code == 200
        assert file_a.exists()

        # 3. Rename file
        res_rename = client.post("/api/v1/files/rename", json={"path": str(file_a), "new_name": "file_renamed.txt"})
        assert res_rename.status_code == 200
        assert not file_a.exists()
        assert file_renamed.exists()

        # 4. Move file
        res_move = client.post("/api/v1/files/move", json={"source_path": str(file_renamed), "destination_folder": str(test_subfolder)})
        assert res_move.status_code == 200
        assert not file_renamed.exists()
        assert moved_file.exists()

        # 5. Delete moved file
        res_del = client.request("DELETE", "/api/v1/files/delete", json={"path": str(moved_file)})
        assert res_del.status_code == 200
        assert not moved_file.exists()
    finally:
        import shutil
        if test_folder.exists():
            shutil.rmtree(test_folder)
        if test_subfolder.exists():
            shutil.rmtree(test_subfolder)
