"""
File Content Inspection Route.
Safely retrieves file contents and metadata for interactive code viewing,
line highlighting, and file analysis in AgentWatch.
"""

import os
from pathlib import Path
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

    # If direct path does not exist, attempt searching relative to repo root or workspace
    if not target.exists():
        fallback = (repo_root / clean_path.lstrip("/\\")).resolve()
        if fallback.exists():
            target = fallback
        else:
            # Check by basename in repo root if it was a plain filename
            basename = Path(clean_path).name
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
            "path": str(target).replace("\\", "/"),
            "filename": target.name,
            "extension": target.suffix.lstrip(".").lower() or "txt",
            "total_lines": len(lines),
            "size_bytes": size_bytes,
            "content": content,
            "lines": lines,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
