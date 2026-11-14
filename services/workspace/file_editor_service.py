"""
Service for safe direct remote file operations (save, create, delete).
Enforces workspace boundaries and writes directly to disk.
"""

import os
import time
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("services.file_editor_service")

# Max allowable file size for remote modification: 5MB
MAX_EDIT_SIZE_BYTES = 5 * 1024 * 1024


class FileEditorService:
    def __init__(self):
        self.repo_root = Path(__file__).resolve().parent.parent.parent

    def is_path_safe(self, target_path: Path) -> bool:
        """Ensure file path is strictly within active workspace, repo root, or Gemini brain directories."""
        try:
            resolved = target_path.resolve()
            # Forbid critical system/version control paths from any modifications
            forbidden_names = {".git", ".venv", "node_modules", "__pycache__"}
            if any(part in forbidden_names for part in resolved.parts):
                return False

            from services.workspace.workspace_context import workspace_context
            active_ws = workspace_context.get_active_workspace_path()
            allowed_roots = [
                active_ws.resolve(),
                self.repo_root.resolve(),
                (Path.home() / ".gemini" / "antigravity" / "brain").resolve(),
                (Path.home() / ".gemini" / "antigravity-ide" / "brain").resolve(),
            ]
            # Disallow operating directly on root workspace directories
            if any(resolved == root for root in allowed_roots):
                return False

            for root in allowed_roots:
                if root.exists():
                    try:
                        resolved.relative_to(root)
                        return True
                    except ValueError:
                        continue
            return False
        except Exception as e:
            logger.warning("Safety check failed for path %s: %s", target_path, e)
            return False

    def save_file_content(self, target_path: Path, content: str) -> Dict[str, Any]:
        """Atomically save content directly to target file on disk."""
        if not self.is_path_safe(target_path):
            raise PermissionError("Access denied: Target path outside authorized workspace boundaries")

        content_bytes = content.encode("utf-8")
        if len(content_bytes) > MAX_EDIT_SIZE_BYTES:
            raise ValueError(f"Content exceeds maximum allowable size of {MAX_EDIT_SIZE_BYTES} bytes")

        # Atomic write: write to temp file then replace
        temp_file = target_path.with_name(f"{target_path.name}.tmp.{int(time.time() * 1000)}")
        try:
            temp_file.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)

            os.replace(temp_file, target_path)
            stat = target_path.stat()
            return {
                "success": True,
                "path": str(target_path),
                "size": stat.st_size,
                "mtime": stat.st_mtime,
            }
        except Exception as e:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except OSError:
                    pass
            logger.error("Failed to save file %s: %s", target_path, e)
            raise e

    def create_new_file_or_dir(self, target_path: Path, is_dir: bool = False) -> Dict[str, Any]:
        """Create a new file or directory directly in workspace."""
        if not self.is_path_safe(target_path):
            raise PermissionError("Access denied: Target path outside authorized workspace boundaries")

        if target_path.exists():
            raise FileExistsError(f"Target path already exists: {target_path.name}")

        if is_dir:
            target_path.mkdir(parents=True, exist_ok=True)
            return {"success": True, "path": str(target_path), "is_directory": True}
        else:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.touch()
            return {"success": True, "path": str(target_path), "is_directory": False}

    def delete_file_or_dir(self, target_path: Path) -> Dict[str, Any]:
        """Delete a file or directory from workspace."""
        if not self.is_path_safe(target_path):
            raise PermissionError("Access denied: Target path outside authorized workspace boundaries")

        if not target_path.exists():
            raise FileNotFoundError(f"Target path not found: {target_path.name}")

        import shutil
        if target_path.is_file():
            target_path.unlink()
        elif target_path.is_dir():
            shutil.rmtree(target_path)

        return {"success": True, "path": str(target_path)}

    def rename_item(self, target_path: Path, new_name: str) -> Dict[str, Any]:
        """Rename a file or directory within its current parent directory."""
        if not self.is_path_safe(target_path):
            raise PermissionError("Access denied: Target path outside authorized workspace boundaries")

        if not target_path.exists():
            raise FileNotFoundError(f"Target path not found: {target_path.name}")

        clean_name = new_name.strip()
        if not clean_name or "/" in clean_name or "\\" in clean_name:
            raise ValueError("New name must be a valid file or folder name without path separators")

        destination_path = target_path.parent / clean_name
        if not self.is_path_safe(destination_path):
            raise PermissionError("Access denied: Destination path outside authorized workspace boundaries")

        if destination_path.exists():
            raise FileExistsError(f"An item named '{clean_name}' already exists in this folder")

        target_path.rename(destination_path)
        return {
            "success": True,
            "old_path": str(target_path),
            "new_path": str(destination_path),
            "name": clean_name,
        }

    def move_item(self, source_path: Path, destination_folder: Path) -> Dict[str, Any]:
        """Move a file or directory into a target directory within workspace."""
        if not self.is_path_safe(source_path):
            raise PermissionError("Access denied: Source path outside authorized workspace boundaries")
        if not self.is_path_safe(destination_folder):
            raise PermissionError("Access denied: Destination folder outside authorized workspace boundaries")

        if not source_path.exists():
            raise FileNotFoundError(f"Source path not found: {source_path.name}")
        if not destination_folder.is_dir():
            raise ValueError(f"Destination must be an existing directory: {destination_folder.name}")

        # Guard against circular directory nesting
        resolved_src = source_path.resolve()
        resolved_dst = destination_folder.resolve()
        if resolved_src == resolved_dst:
            raise ValueError("Cannot move a folder into itself")
        if resolved_dst.is_relative_to(resolved_src):
            raise ValueError("Cannot move a folder into one of its own subdirectories")

        target_destination = destination_folder / source_path.name
        if target_destination.exists():
            raise FileExistsError(f"An item named '{source_path.name}' already exists in the destination folder")

        import shutil
        shutil.move(str(source_path), str(target_destination))
        return {
            "success": True,
            "source_path": str(source_path),
            "destination_path": str(target_destination),
            "name": source_path.name,
        }


file_editor_service = FileEditorService()
