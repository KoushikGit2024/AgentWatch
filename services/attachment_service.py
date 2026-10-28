"""Service to manage workspace uploads and per-chat attachments."""

import os
import re
import time
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

IMAGE_MIMES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^\w\-.]", "_", name)
    return cleaned[:120] if cleaned else "attachment"


def get_file_category(ext: str) -> str:
    ext = ext.lower()
    if ext in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"):
        return "image"
    if ext in (".txt", ".md", ".log", ".csv", ".json", ".xml", ".yaml", ".yml"):
        return "document"
    if ext in (".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".sql", ".sh"):
        return "code"
    return "other"


class AttachmentService:
    """Handles chat-scoped attachments and global out-of-chat uploads with deletion."""

    def __init__(self):
        self.upload_dir = Path(__file__).resolve().parent.parent / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.brain_bases = [
            Path.home() / ".gemini" / "antigravity" / "brain",
            Path.home() / ".gemini" / "antigravity-ide" / "brain",
        ]

    def get_chat_upload_dir(self, conversation_id: str) -> Optional[Path]:
        """Resolve .user_uploaded directory for a specific conversation."""
        if not conversation_id:
            return None
        for b in self.brain_bases:
            cand = b / conversation_id / ".user_uploaded"
            if cand.exists():
                return cand
        # Default to first base candidate
        cand = self.brain_bases[0] / conversation_id / ".user_uploaded"
        cand.mkdir(parents=True, exist_ok=True)
        return cand

    def list_attachments(
        self,
        conversation_id: Optional[str] = None,
        scope: str = "all",  # 'all' | 'chat' | 'global'
        search: str = "",
        category: str = "all",
        limit: int = 150,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        List attachments with chat-specific distinction.
        - scope='chat': only uploads belonging to conversation_id
        - scope='global': out-of-chat uploads in the global uploads/ folder
        - scope='all': both chat-scoped and global uploads
        """
        items: List[Dict[str, Any]] = []
        total_bytes = 0
        search_lower = search.strip().lower()

        # 1. Global out-of-chat uploads from uploads/
        if scope in ("all", "global") and self.upload_dir.exists():
            for entry in os.scandir(self.upload_dir):
                if entry.name == ".gitkeep" or not entry.is_file():
                    continue
                try:
                    stat = entry.stat()
                    total_bytes += stat.st_size
                    parts = entry.name.split("_", 2)
                    original_name = parts[2] if len(parts) >= 3 else entry.name
                    ext = Path(original_name).suffix.lower()
                    cat = get_file_category(ext)

                    if category != "all" and cat != category:
                        continue
                    if search_lower and search_lower not in original_name.lower() and search_lower not in entry.name.lower():
                        continue

                    items.append({
                        "id": entry.name,
                        "filename": entry.name,
                        "original_name": original_name,
                        "category": cat,
                        "size": stat.st_size,
                        "is_image": cat == "image",
                        "url": f"/uploads/{entry.name}",
                        "mtime": stat.st_mtime,
                        "scope": "global",
                        "conversation_id": None,
                        "can_delete": True,
                    })
                except Exception:
                    continue

        # 2. Chat-scoped uploads from .user_uploaded/
        if scope in ("all", "chat"):
            chat_dir = None
            if conversation_id:
                chat_dir = self.get_chat_upload_dir(conversation_id)
            else:
                try:
                    from integrations.antigravity.adapter import antigravity_adapter
                    st = antigravity_adapter.get_status()
                    cid = st.get("active_conversation_id")
                    if cid:
                        conversation_id = cid
                        chat_dir = self.get_chat_upload_dir(cid)
                except Exception:
                    pass

            if chat_dir and chat_dir.exists():
                for entry in os.scandir(chat_dir):
                    if not entry.is_file():
                        continue
                    try:
                        stat = entry.stat()
                        total_bytes += stat.st_size
                        ext = Path(entry.name).suffix.lower()
                        cat = get_file_category(ext)

                        if category != "all" and cat != category:
                            continue
                        if search_lower and search_lower not in entry.name.lower():
                            continue

                        # Route to raw file stream endpoint
                        items.append({
                            "id": f"chat_{entry.name}",
                            "filename": entry.name,
                            "original_name": entry.name,
                            "category": cat,
                            "size": stat.st_size,
                            "is_image": cat == "image",
                            "url": f"/api/v1/files/raw?path={entry.path.replace('\\', '/')}",
                            "mtime": stat.st_mtime,
                            "scope": "chat",
                            "conversation_id": conversation_id,
                            "can_delete": True,
                        })
                    except Exception:
                        continue

        items.sort(key=lambda x: x.get("mtime", 0), reverse=True)
        paginated = items[offset : offset + limit] if limit > 0 else items

        return {
            "success": True,
            "total_count": len(items),
            "total_bytes": total_bytes,
            "attachments": paginated,
            "limit": limit,
            "offset": offset,
        }

    def delete_attachment(self, filename: str, conversation_id: Optional[str] = None) -> bool:
        """Delete an attachment whether global or chat-scoped."""
        safe_name = sanitize_filename(filename.replace("chat_", ""))

        # 1. Check global uploads folder
        cand_global = self.upload_dir / safe_name
        if cand_global.exists():
            cand_global.unlink()
            return True

        # 2. Check chat-scoped folder
        if conversation_id:
            chat_dir = self.get_chat_upload_dir(conversation_id)
            if chat_dir:
                cand_chat = chat_dir / safe_name
                if cand_chat.exists():
                    cand_chat.unlink()
                    return True

        return False


attachment_service = AttachmentService()

