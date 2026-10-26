"""Attachment Upload and Management Route."""

import os
import re
import time
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter(tags=["Attachments"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
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
    Upload one or more images or files for attachment to the prompt.
    Saves to the local uploads directory and returns structured file metadata.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided in upload payload"
        )

    results = []
    ts = int(time.time() * 1000)

    for idx, upload in enumerate(files):
        original_name = upload.filename or f"upload_{idx}"
        safe_name = _sanitize_filename(original_name)
        unique_name = f"{ts}_{idx}_{safe_name}"
        dest_path = UPLOAD_DIR / unique_name

        try:
            content = await upload.read()
            if len(content) > 25 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File {original_name} exceeds 25MB limit"
                )

            with open(dest_path, "wb") as f:
                f.write(content)

            mime_type = upload.content_type or "application/octet-stream"
            is_img = mime_type in IMAGE_MIMES or safe_name.lower().endswith(
                (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
            )

            results.append({
                "id": f"att_{ts}_{idx}",
                "filename": safe_name,
                "original_name": original_name,
                "storage_path": str(dest_path).replace("\\", "/"),
                "relative_path": f"uploads/{unique_name}",
                "url": f"/uploads/{unique_name}",
                "content_type": mime_type,
                "size": len(content),
                "is_image": is_img
            })
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save {original_name}: {str(exc)}"
            )

    return {
        "success": True,
        "count": len(results),
        "attachments": results
    }


def _get_file_category(ext: str) -> str:
    ext = ext.lower()
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"}:
        return "image"
    if ext in {".pdf", ".txt", ".md", ".csv", ".docx", ".xlsx", ".json", ".log"}:
        return "document"
    if ext in {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".cpp", ".c", ".h", ".java", ".rs", ".go"}:
        return "code"
    return "other"


@router.get("/api/v1/attachments")
async def list_attachments(
    search: str = "",
    category: str = "all",
    limit: int = 150,
    offset: int = 0
) -> Dict[str, Any]:
    """
    List all uploaded attachments with metadata, filtering, and storage usage statistics.
    """
    items = []
    total_bytes = 0
    search_lower = search.strip().lower()

    if UPLOAD_DIR.exists():
        for entry in os.scandir(UPLOAD_DIR):
            if entry.name == ".gitkeep" or not entry.is_file():
                continue

            try:
                stat = entry.stat()
                size = stat.st_size
                total_bytes += size
                mtime = stat.st_mtime

                # Match original name or unique name
                parts = entry.name.split("_", 2)
                original_name = parts[2] if len(parts) >= 3 else entry.name
                ext = Path(original_name).suffix.lower()
                cat = _get_file_category(ext)
                is_img = cat == "image"

                # Filter category
                if category != "all" and cat != category:
                    continue

                # Filter search query
                if search_lower and search_lower not in original_name.lower() and search_lower not in entry.name.lower():
                    continue

                items.append({
                    "id": entry.name,
                    "filename": entry.name,
                    "original_name": original_name,
                    "category": cat,
                    "size": size,
                    "is_image": is_img,
                    "url": f"/uploads/{entry.name}",
                    "relative_path": f"uploads/{entry.name}",
                    "mtime": mtime,
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(mtime))
                })
            except OSError:
                continue

    # Sort newest first
    items.sort(key=lambda x: x["mtime"], reverse=True)
    total_count = len(items)
    paginated = items[offset:offset + limit]

    return {
        "success": True,
        "total_count": total_count,
        "total_bytes": total_bytes,
        "total_size_mb": round(total_bytes / (1024 * 1024), 2),
        "attachments": paginated
    }


@router.delete("/api/v1/attachments/{filename}")
async def delete_attachment(filename: str) -> Dict[str, Any]:
    """
    Delete a single file from the uploads directory.
    Prevents path traversal attacks and preserves .gitkeep.
    """
    safe_name = os.path.basename(filename)
    if safe_name == ".gitkeep":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete system placeholder")

    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found")

    try:
        size = file_path.stat().st_size
        file_path.unlink()
        return {"success": True, "deleted": safe_name, "freed_bytes": size}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete {safe_name}: {str(exc)}"
        )


@router.post("/api/v1/attachments/delete-batch")
async def delete_attachments_batch(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Batch delete multiple attachments by filename.
    """
    filenames = payload.get("filenames") or []
    if not filenames or not isinstance(filenames, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="filenames list is required")

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
        "failed": failed
    }

