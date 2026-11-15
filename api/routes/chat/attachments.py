"""Attachment Upload and Management Route."""

import os
import re
import time
import uuid
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from config.settings import settings
from services.chat.attachment_service import attachment_service

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
async def upload_attachments(
    files: List[UploadFile] = File(...),
    conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upload one or more images, documents, or pasted files for prompt attachment.
    Enforces a generous configurable size cap (e.g., 50MB).
    Stores uploads in a conversation-id scoped subfolder when provided for efficient organization,
    or falls back to the active conversation or global uploads directory.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided in upload payload"
        )

    # Determine upload directory: prioritize specified conversation_id, then active conversation
    resolved_cid = conversation_id.strip() if conversation_id and conversation_id.strip() else None
    if not resolved_cid:
        try:
            from integrations.antigravity.core.adapter import antigravity_adapter

            st = antigravity_adapter.get_status()
            cid = st.get("active_conversation_id")
            if cid:
                resolved_cid = str(cid).strip()
        except Exception:
            pass

    if resolved_cid:
        target_dir = UPLOAD_DIR / resolved_cid
        target_dir.mkdir(parents=True, exist_ok=True)
        url_prefix = f"/uploads/{resolved_cid}"
        rel_prefix = f"uploads/{resolved_cid}"
    else:
        target_dir = UPLOAD_DIR
        url_prefix = "/uploads"
        rel_prefix = "uploads"

    results = []
    max_bytes = getattr(settings, "max_upload_size_bytes", 50 * 1024 * 1024)

    for idx, upload in enumerate(files):
        original_name = upload.filename or f"upload_{idx}"
        safe_name = _sanitize_filename(original_name)
        _, ext = os.path.splitext(safe_name)
        ext_lower = ext.lower()

        try:
            # Stream read in chunks into memory while hashing
            hasher = hashlib.sha256()
            chunks = []
            total_size = 0
            chunk_size = 1024 * 1024  # 1MB chunks

            while True:
                chunk = await upload.read(chunk_size)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_bytes:
                    limit_mb = max_bytes // (1024 * 1024)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File {original_name} exceeds configured maximum limit of {limit_mb}MB",
                    )
                hasher.update(chunk)
                chunks.append(chunk)

            file_hash = hasher.hexdigest()
            # Content-addressed deduplication: use the sha256 prefix as unique filename
            storage_filename = f"{file_hash[:16]}{ext_lower}"
            dest_path = target_dir / storage_filename

            # If an identical file already exists in target_dir or root uploads, reuse it directly
            already_existed = dest_path.exists()
            if not already_existed:
                # Also check root UPLOAD_DIR for duplicate
                global_dest = UPLOAD_DIR / storage_filename
                if global_dest.exists():
                    dest_path = global_dest
                    already_existed = True
                else:
                    with open(dest_path, "wb") as f:
                        for chk in chunks:
                            f.write(chk)

            mime_type = upload.content_type or "application/octet-stream"
            is_img = mime_type in IMAGE_MIMES or ext_lower in (
                ".png",
                ".jpg",
                ".jpeg",
                ".webp",
                ".gif",
                ".svg",
                ".bmp",
            )

            results.append(
                {
                    "id": f"att_{file_hash[:16]}",
                    "filename": storage_filename,
                    "original_name": original_name,
                    "storage_path": str(dest_path).replace("\\", "/"),
                    "relative_path": f"{rel_prefix}/{storage_filename}",
                    "url": f"{url_prefix}/{storage_filename}",
                    "content_type": mime_type,
                    "size": total_size,
                    "is_image": is_img,
                    "conversation_id": resolved_cid,
                    "is_deduplicated": already_existed and len(chunks) > 0,
                }
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process {original_name}: {str(exc)}",
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
async def delete_attachment(filename: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Delete a single file whether global or chat-scoped via attachment_service.
    Prevents path traversal attacks and preserves .gitkeep.
    """
    safe_name = os.path.basename(filename)
    if safe_name == ".gitkeep":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete system placeholder"
        )

    freed_bytes = attachment_service.delete_attachment(filename, conversation_id=conversation_id)
    if freed_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found"
        )

    return {"success": True, "deleted": safe_name, "freed_bytes": freed_bytes}


@router.post("/api/v1/attachments/delete-batch")
async def delete_attachments_batch(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Batch delete multiple attachments by filename.
    """
    filenames = payload.get("filenames") or []
    conversation_id = payload.get("conversation_id")
    if not filenames or not isinstance(filenames, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="filenames list is required"
        )

    deleted = []
    failed = []
    total_freed_bytes = 0

    for name in filenames:
        safe_name = os.path.basename(name)
        if safe_name == ".gitkeep":
            continue
        try:
            freed = attachment_service.delete_attachment(name, conversation_id=conversation_id)
            if freed is not None:
                deleted.append(safe_name)
                total_freed_bytes += freed
            else:
                failed.append({"filename": safe_name, "error": "File not found"})
        except Exception as e:
            failed.append({"filename": safe_name, "error": str(e)})

    return {
        "success": True,
        "deleted_count": len(deleted),
        "failed_count": len(failed),
        "deleted": deleted,
        "failed": failed,
        "freed_bytes": total_freed_bytes,
        "freed_mb": round(total_freed_bytes / (1024 * 1024), 2),
    }
