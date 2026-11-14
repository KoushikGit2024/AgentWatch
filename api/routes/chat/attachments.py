"""Attachment Upload and Management Route."""

import os
import re
import time
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from config.settings import settings

router = APIRouter(tags=["Attachments"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
}


def _sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent directory traversal and special character issues."""
    base = os.path.basename(name)
    cleaned = re.sub(r"[^\w\.-]", "_", base)
    return cleaned or "attachment.dat"


@router.post("/api/v1/attachments/upload")
async def upload_attachments(files: List[UploadFile] = File(...)) -> Dict[str, Any]:
    """
    Upload one or more images, documents, or pasted files for prompt attachment.
    Enforces a generous configurable size cap (e.g., 50MB) and stores on disk with unique UUIDs.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided in upload payload"
        )

    results = []
    max_bytes = getattr(settings, "max_upload_size_bytes", 50 * 1024 * 1024)

    for idx, upload in enumerate(files):
        original_name = upload.filename or f"upload_{idx}"
        safe_name = _sanitize_filename(original_name)
        file_uuid = uuid.uuid4().hex[:16]
        _, ext = os.path.splitext(safe_name)
        storage_filename = f"{file_uuid}{ext.lower()}"
        dest_path = UPLOAD_DIR / storage_filename

        try:
            # Stream read in chunks to avoid unbounded memory spikes
            total_size = 0
            chunk_size = 1024 * 1024  # 1MB chunks

            with open(dest_path, "wb") as f:
                while True:
                    chunk = await upload.read(chunk_size)
                    if not chunk:
                        break
                    total_size += len(chunk)
                    if total_size > max_bytes:
                        dest_path.unlink(missing_ok=True)
                        limit_mb = max_bytes // (1024 * 1024)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File {original_name} exceeds configured maximum limit of {limit_mb}MB",
                        )
                    f.write(chunk)

            mime_type = upload.content_type or "application/octet-stream"
            is_img = mime_type in IMAGE_MIMES or ext.lower() in (
                ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"
            )

            results.append(
                {
                    "id": f"att_{file_uuid}",
                    "filename": storage_filename,
                    "original_name": original_name,
                    "storage_path": f"uploads/{storage_filename}",
                    "relative_path": f"uploads/{storage_filename}",
                    "url": f"/uploads/{storage_filename}",
                    "content_type": mime_type,
                    "size": total_size,
                    "is_image": is_img,
                }
            )
        except HTTPException:
            raise
        except Exception as exc:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save {original_name}: {str(exc)}",
            )

    return {"success": True, "count": len(results), "attachments": results}


def _get_file_category(ext: str) -> str:
    ext = ext.lower()
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"}:
        return "image"
    if ext in {".pdf", ".txt", ".md", ".csv", ".docx", ".xlsx", ".json", ".log"}:
        return "document"
    if ext in {
        ".py",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".html",
        ".css",
        ".cpp",
        ".c",
        ".h",
        ".java",
        ".rs",
        ".go",
    }:
        return "code"
    return "other"


@router.get("/api/v1/attachments")
async def list_attachments(
    search: str = "",
    category: str = "all",
    scope: str = "all",
    conversation_id: Optional[str] = None,
    limit: int = 150,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    List uploaded attachments with per-chat distinction and global upload support.
    """
    from services.chat.attachment_service import attachment_service
    return attachment_service.list_attachments(
        conversation_id=conversation_id,
        scope=scope,
        search=search,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.delete("/api/v1/attachments/{filename}")
async def delete_attachment(filename: str) -> Dict[str, Any]:
    """
    Delete a single file from the uploads directory.
    Prevents path traversal attacks and preserves .gitkeep.
    """
    safe_name = os.path.basename(filename)
    if safe_name == ".gitkeep":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete system placeholder"
        )

    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found"
        )

    try:
        size = file_path.stat().st_size
        file_path.unlink()
        return {"success": True, "deleted": safe_name, "freed_bytes": size}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete {safe_name}: {str(exc)}",
        )


@router.post("/api/v1/attachments/delete-batch")
async def delete_attachments_batch(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Batch delete multiple attachments by filename.
    """
    filenames = payload.get("filenames") or []
    if not filenames or not isinstance(filenames, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="filenames list is required"
        )

    deleted = []
    failed = []
    freed_bytes = 0

    for name in filenames:
        safe_name = os.path.basename(name)
        if safe_name == ".gitkeep":
            continue
        file_path = UPLOAD_DIR / safe_name
        if file_path.exists() and file_path.is_file():
            try:
                freed_bytes += file_path.stat().st_size
                file_path.unlink()
                deleted.append(safe_name)
            except Exception as e:
                failed.append({"filename": safe_name, "error": str(e)})
        else:
            failed.append({"filename": safe_name, "error": "File not found"})

    return {
        "success": True,
        "deleted_count": len(deleted),
        "failed_count": len(failed),
        "freed_bytes": freed_bytes,
        "freed_mb": round(freed_bytes / (1024 * 1024), 2),
        "deleted": deleted,
        "failed": failed,
    }
