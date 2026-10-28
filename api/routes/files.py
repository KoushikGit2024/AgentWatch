"""
File Content Inspection Route.
Safely retrieves file contents and metadata for interactive code viewing,
line highlighting, and file analysis in AgentWatch.
"""

import os
from typing import Optional
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from config.settings import settings

router = APIRouter(tags=["Files"])

# Maximum file size allowed for text viewing (3 MB)
MAX_VIEW_SIZE_BYTES = 3 * 1024 * 1024


def _resolve_target_path(clean_path: str) -> Path:
    """Safely resolve a raw or URI file path to a valid Path on disk."""
    if clean_path.startswith("file:///"):
        clean_path = clean_path[8:]
    elif clean_path.startswith("file://"):
        clean_path = clean_path[7:]
    elif clean_path.startswith("file:/"):
        clean_path = clean_path[6:]

    if "#" in clean_path:
        clean_path = clean_path.split("#")[0]

    import re

    if re.match(r"^/[a-zA-Z]:", clean_path):
        clean_path = clean_path.lstrip("/")

    target = Path(clean_path)
    repo_root = Path(__file__).resolve().parent.parent.parent

    if not target.is_absolute():
        target = (repo_root / target).resolve()
    else:
        target = target.resolve()

    if not target.exists():
        fallback = (repo_root / clean_path.lstrip("/\\")).resolve()
        if fallback.exists():
            target = fallback
        else:
            basename = Path(clean_path).name
            brain_bases = [
                Path.home() / ".gemini" / "antigravity" / "brain",
                Path.home() / ".gemini" / "antigravity-ide" / "brain",
            ]
            brain_candidates = []
            for b in brain_bases:
                if b.exists():
                    brain_candidates.extend(list(b.glob(f"**/{basename}")))
            if brain_candidates:
                brain_candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                target = brain_candidates[0]

            if not target.exists():
                candidates = list(repo_root.glob(f"**/{basename}"))
                valid_candidates = [
                    c
                    for c in candidates
                    if ".git" not in c.parts
                    and ".venv" not in c.parts
                    and "node_modules" not in c.parts
                ]
                if valid_candidates:
                    target = valid_candidates[0]

    return target


@router.get("/api/v1/files/content")
def get_file_content(path: str = Query(..., description="File path to read")):
    """
    Safely read and return text content, line array, and metadata for a given file.
    Supports Windows/POSIX formats, file:// URIs, and workspace-relative paths.
    """
    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")

    clean_path = path.strip()
    target = _resolve_target_path(clean_path)

    if not target.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {Path(clean_path).name}")

    if not target.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a regular file: {target.name}")

    try:
        stat = target.stat()
        size_bytes = stat.st_size

        ext = target.suffix.lstrip(".").lower()
        image_exts = {"png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"}
        video_exts = {"mp4", "webm", "mov", "m4v", "ogg"}
        audio_exts = {"mp3", "wav", "m4a", "flac"}

        is_image = ext in image_exts
        is_video = ext in video_exts
        is_audio = ext in audio_exts
        is_media = is_image or is_video or is_audio

        encoded_path = str(target).replace("\\", "/")
        raw_url = f"/api/v1/files/raw?path={target.as_posix()}"

        if is_media:
            svg_content = ""
            svg_lines = []
            if ext == "svg" and size_bytes <= MAX_VIEW_SIZE_BYTES:
                try:
                    svg_content = target.read_text(encoding="utf-8")
                    svg_lines = svg_content.splitlines()
                except Exception:
                    pass

            return {
                "path": encoded_path,
                "filename": target.name,
                "extension": ext or "bin",
                "is_media": True,
                "media_type": "image" if is_image else ("video" if is_video else "audio"),
                "raw_url": raw_url,
                "size_bytes": size_bytes,
                "total_lines": len(svg_lines),
                "content": svg_content,
                "lines": svg_lines,
            }

        if size_bytes > MAX_VIEW_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large to preview ({round(size_bytes / (1024 * 1024), 2)} MB). Max limit is 3 MB.",
            )

        binary_exts = {
            "exe",
            "dll",
            "so",
            "dylib",
            "bin",
            "dat",
            "iso",
            "tar",
            "gz",
            "zip",
            "7z",
            "rar",
            "pdf",
            "docx",
            "xlsx",
            "pptx",
            "pyc",
            "pyd",
            "db",
            "sqlite",
        }
        if ext in binary_exts:
            return {
                "path": encoded_path,
                "filename": target.name,
                "extension": ext or "bin",
                "is_media": False,
                "is_binary": True,
                "raw_url": raw_url,
                "total_lines": 0,
                "size_bytes": size_bytes,
                "content": "",
                "lines": [],
            }

        # Check for null bytes in initial chunk to detect binary files safely
        with target.open("rb") as f:
            chunk = f.read(8192)
            if b"\x00" in chunk:
                return {
                    "path": encoded_path,
                    "filename": target.name,
                    "extension": ext or "bin",
                    "is_media": False,
                    "is_binary": True,
                    "raw_url": raw_url,
                    "total_lines": 0,
                    "size_bytes": size_bytes,
                    "content": "",
                    "lines": [],
                }

        # Attempt reading text with utf-8, fallback to utf-8-sig
        try:
            content = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                content = target.read_text(encoding="utf-8-sig")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=415,
                    detail=f"This binary or non-UTF-8 encoded file cannot be displayed as text. Use 'Download Raw' to view it.",
                )

        lines = content.splitlines()

        return {
            "path": encoded_path,
            "filename": target.name,
            "extension": ext or "txt",
            "is_media": False,
            "raw_url": raw_url,
            "total_lines": len(lines),
            "size_bytes": size_bytes,
            "content": content,
            "lines": lines,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.get("/api/v1/files/raw")
def get_raw_file(path: str = Query(..., description="File path to stream directly")):
    """
    Directly stream media (images, videos, audio) or binary files with correct mime type.
    """
    from fastapi.responses import FileResponse
    import mimetypes

    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")

    clean_path = path.strip()
    target = _resolve_target_path(clean_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    ext = target.suffix.lower()
    if ext == ".svg":
        mime_type = "image/svg+xml"
    else:
        mime_type, _ = mimetypes.guess_type(str(target))
        if not mime_type:
            if ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
                mime_type = f"image/{ext.lstrip('.')}"
            elif ext in [".mp4", ".webm", ".mov"]:
                mime_type = f"video/{ext.lstrip('.')}"
            else:
                mime_type = "application/octet-stream"

    return FileResponse(path=str(target), media_type=mime_type, filename=target.name)


EXCLUDED_TREE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
    "dist",
    ".cache",
    ".turbo",
    ".next",
    "coverage",
}


@router.get("/api/v1/files/tree")
def get_project_file_tree(
    subpath: str = Query(default="", description="Optional subfolder relative to repo root"),
):
    """
    Safely traverse and return a hierarchical tree of files and directories
    in the project workspace, ignoring heavy build/cache folders.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent
    base_dir = repo_root
    if subpath.strip():
        clean_sub = subpath.strip().lstrip("/\\")
        candidate = (repo_root / clean_sub).resolve()
        # Path traversal guard
        if candidate.is_relative_to(repo_root) and candidate.exists() and candidate.is_dir():
            base_dir = candidate

    def build_tree(current_path: Path, max_depth: int = 5) -> dict:
        is_dir = current_path.is_dir()
        rel_path = (
            current_path.relative_to(repo_root).as_posix() if current_path != repo_root else ""
        )
        node = {
            "name": current_path.name or repo_root.name,
            "path": rel_path,
            "full_path": current_path.as_posix(),
            "type": "directory" if is_dir else "file",
        }

        if is_dir:
            children = []
            if max_depth > 0:
                try:
                    entries = sorted(
                        list(current_path.iterdir()), key=lambda p: (not p.is_dir(), p.name.lower())
                    )
                    for entry in entries:
                        if entry.name in EXCLUDED_TREE_DIRS or entry.name.startswith("."):
                            continue
                        children.append(build_tree(entry, max_depth - 1))
                except (PermissionError, OSError):
                    pass
            node["children"] = children
        else:
            try:
                st = current_path.stat()
                node["size"] = st.st_size
                node["mtime"] = st.st_mtime
                node["extension"] = current_path.suffix.lower().lstrip(".")
            except Exception:
                node["size"] = 0
        return node

    tree = build_tree(base_dir, max_depth=6)
    return {"tree": tree, "root_name": repo_root.name, "root_path": repo_root.as_posix()}


@router.get("/api/v1/artifacts")
def get_artifacts(conversation_id: Optional[str] = Query(None, description="Optional target conversation ID")):
    """
    List all generated artifacts from the active or specified conversation directory.
    """
    from services.artifacts_service import artifacts_service
    return artifacts_service.list_artifacts(conversation_id=conversation_id)


class KillTerminalTaskRequest(BaseModel):
    index: int = 0
    tooltip_id: Optional[str] = None


@router.post("/api/v1/controls/terminal/toggle")
async def toggle_terminal():
    """Trigger native IDE terminal toggle button via CDP and return live tasks."""
    from integrations.antigravity.adapter import antigravity_adapter

    res = await antigravity_adapter.toggle_terminal()
    return res


@router.get("/api/v1/controls/terminal/tasks")
async def get_terminal_tasks():
    """Query currently running terminal tasks from IDE workbench via CDP."""
    from integrations.antigravity.adapter import antigravity_adapter

    res = await antigravity_adapter.get_terminal_tasks()
    return res


@router.post("/api/v1/controls/terminal/kill")
async def kill_terminal_task(payload: KillTerminalTaskRequest):
    """Click individual close button for a specific terminal command via CDP."""
    from integrations.antigravity.adapter import antigravity_adapter

    res = await antigravity_adapter.kill_terminal_task(
        index=payload.index, tooltip_id=payload.tooltip_id
    )
    return res
