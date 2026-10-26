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


@router.get("/api/v1/files/content")
def get_file_content(path: str = Query(..., description="File path to read")):
    """
    Safely read and return text content, line array, and metadata for a given file.
    Supports Windows/POSIX formats, file:// URIs, and workspace-relative paths.
    """
    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Path parameter is required")

    clean_path = path.strip()
    if clean_path.startswith("file:///"):
        clean_path = clean_path[8:]
    elif clean_path.startswith("file://"):
        clean_path = clean_path[7:]
    elif clean_path.startswith("file:/"):
        clean_path = clean_path[6:]

    # Remove URL hash if present (e.g. #L10-L20)
    if "#" in clean_path:
        clean_path = clean_path.split("#")[0]

    # Strip leading slash if followed by Windows drive letter (e.g. /d:/ or /D:/)
    import re
    if re.match(r"^/[a-zA-Z]:", clean_path):
        clean_path = clean_path.lstrip("/")

    # Resolve target file path
    target = Path(clean_path)
    repo_root = Path(__file__).resolve().parent.parent.parent

    if not target.is_absolute():
        target = (repo_root / target).resolve()
    else:
        target = target.resolve()

    # If direct path does not exist, attempt searching relative to repo root, brain directory, or workspace
    if not target.exists():
        fallback = (repo_root / clean_path.lstrip("/\\")).resolve()
        if fallback.exists():
            target = fallback
        else:
            basename = Path(clean_path).name
            # Check in active brain session directory first
            brain_base = Path.home() / ".gemini" / "antigravity-ide" / "brain"
            if brain_base.exists():
                brain_candidates = list(brain_base.glob(f"**/{basename}"))
                if brain_candidates:
                    brain_candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                    target = brain_candidates[0]

            if not target.exists():
                # Check by basename in repo root if it was a plain filename
                candidates = list(repo_root.glob(f"**/{basename}"))
                # Filter out .git and venv directories
                valid_candidates = [
                    c for c in candidates 
                    if ".git" not in c.parts and ".venv" not in c.parts and "node_modules" not in c.parts
                ]
                if valid_candidates:
                    target = valid_candidates[0]

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
            return {
                "path": encoded_path,
                "filename": target.name,
                "extension": ext or "bin",
                "is_media": True,
                "media_type": "image" if is_image else ("video" if is_video else "audio"),
                "raw_url": raw_url,
                "size_bytes": size_bytes,
                "total_lines": 0,
                "content": "",
                "lines": []
            }

        if size_bytes > MAX_VIEW_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large to preview ({round(size_bytes / (1024 * 1024), 2)} MB). Max limit is 3 MB."
            )

        # Attempt reading text with utf-8, fallback to latin-1
        try:
            content = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                content = target.read_text(encoding="utf-8-sig")
            except UnicodeDecodeError:
                content = target.read_text(encoding="latin-1")

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
    if clean_path.startswith("file:///"):
        clean_path = clean_path[8:]
    elif clean_path.startswith("file://"):
        clean_path = clean_path[7:]

    import re
    if re.match(r"^/[a-zA-Z]:", clean_path):
        clean_path = clean_path.lstrip("/")

    target = Path(clean_path).resolve()
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    mime_type, _ = mimetypes.guess_type(str(target))
    if not mime_type:
        ext = target.suffix.lower()
        if ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]:
            mime_type = f"image/{ext.lstrip('.')}"
        elif ext in [".mp4", ".webm", ".mov"]:
            mime_type = f"video/{ext.lstrip('.')}"
        else:
            mime_type = "application/octet-stream"

    return FileResponse(path=str(target), media_type=mime_type, filename=target.name)



@router.get("/api/v1/artifacts")
def get_artifacts():
    """
    List all generated artifacts (markdown documents, diagrams, design specs, media)
    from the active conversation directory in ~/.gemini/antigravity-ide/brain.
    """
    brain_base = Path.home() / ".gemini" / "antigravity-ide" / "brain"
    if not brain_base.exists():
        return {"artifacts": [], "total": 0}

    # Find the most recently active session directory
    transcripts = list(brain_base.glob("*/.system_generated/logs/transcript.jsonl"))
    if not transcripts:
        return {"artifacts": [], "total": 0}

    transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    active_session_dir = transcripts[0].parent.parent.parent

    artifacts = []
    # 1. Look for user-facing markdown artifacts (.md) and companion .metadata.json in session root
    try:
        import json
        for md_file in active_session_dir.glob("*.md"):
            try:
                st = md_file.stat()
                meta_file = active_session_dir / f"{md_file.name}.metadata.json"
                meta_info = {}
                if meta_file.exists():
                    try:
                        meta_info = json.loads(meta_file.read_text(encoding="utf-8"))
                    except Exception:
                        pass

                artifacts.append({
                    "id": md_file.stem,
                    "title": md_file.name.replace("_", " ").replace(".md", "").title(),
                    "filename": md_file.name,
                    "path": str(md_file).replace("\\", "/"),
                    "type": "markdown",
                    "summary": meta_info.get("summary", ""),
                    "size_bytes": st.st_size,
                    "mtime": st.st_mtime,
                })
            except Exception:
                continue
    except Exception:
        pass

    # 2. Look for media artifacts (.png, .jpg, .jpeg, .webp, .gif, .svg, .mp4, .webm, .mov) in .tempmediaStorage or session root
    try:
        media_dirs = [active_session_dir / ".tempmediaStorage", active_session_dir]
        image_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
        video_exts = {".mp4", ".webm", ".mov"}
        all_exts = image_exts | video_exts
        seen_paths = {a["path"] for a in artifacts}

        for mdir in media_dirs:
            if not mdir.exists():
                continue
            for file_path in mdir.iterdir():
                if not file_path.is_file():
                    continue
                ext = file_path.suffix.lower()
                normalized_path = str(file_path).replace("\\", "/")
                if ext in all_exts and normalized_path not in seen_paths:
                    try:
                        st = file_path.stat()
                        is_video = ext in video_exts
                        artifact_type = "video" if is_video else "image"
                        size_kb = round(st.st_size / 1024, 1)
                        summary_label = f"Video artifact ({size_kb} KB)" if is_video else f"Image artifact ({size_kb} KB)"

                        artifacts.append({
                            "id": file_path.stem,
                            "title": file_path.name,
                            "filename": file_path.name,
                            "path": normalized_path,
                            "type": artifact_type,
                            "summary": summary_label,
                            "size_bytes": st.st_size,
                            "mtime": st.st_mtime,
                        })
                        seen_paths.add(normalized_path)
                    except Exception:
                        continue
    except Exception:
        pass


    # Sort descending by last modified time
    artifacts.sort(key=lambda a: a.get("mtime", 0), reverse=True)

    return {
        "artifacts": artifacts,
        "total": len(artifacts),
        "session_id": active_session_dir.name
    }


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
    res = await antigravity_adapter.kill_terminal_task(index=payload.index, tooltip_id=payload.tooltip_id)
    return res


