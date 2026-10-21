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
