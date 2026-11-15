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
        self.upload_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
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

    def _matches_search(self, term: str, *candidates: str) -> bool:
        """Flexible multi-case search matching sub-terms and extensions."""
        if not term:
            return True
        clean_term = term.strip().lower()
        search_tokens = clean_term.split()
        for cand in candidates:
            if not cand:
                continue
            cand_lower = cand.lower()
            if all(token in cand_lower for token in search_tokens):
                return True
        return False

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

        # 1. Global out-of-chat uploads from uploads/ (root and subdirectories)
        if scope in ("all", "global") and self.upload_dir.exists():
            for root, dirs, files in os.walk(self.upload_dir):
                rel_root = Path(root).relative_to(self.upload_dir).as_posix()
                is_subfolder = rel_root != "."
                subfolder_cid = rel_root if is_subfolder else None

                # If scope is 'chat', skip global root
                for fname in files:
                    if fname == ".gitkeep":
                        continue
                    try:
                        fpath = Path(root) / fname
                        stat = fpath.stat()
                        total_bytes += stat.st_size
                        parts = fname.split("_", 2)
                        original_name = parts[2] if len(parts) >= 3 else fname
                        ext = Path(original_name).suffix.lower()
                        cat = get_file_category(ext)

                        if category != "all" and cat != category:
                            continue
                        if not self._matches_search(search, original_name, fname, ext):
                            continue

                        url_path = (
                            f"/uploads/{rel_root}/{fname}" if is_subfolder else f"/uploads/{fname}"
                        )

                        items.append(
                            {
                                "id": f"{rel_root}_{fname}" if is_subfolder else fname,
                                "filename": f"{rel_root}/{fname}" if is_subfolder else fname,
                                "original_name": original_name,
                                "category": cat,
                                "size": stat.st_size,
                                "is_image": cat == "image",
                                "url": url_path,
                                "mtime": stat.st_mtime,
                                "scope": "chat" if is_subfolder else "global",
                                "conversation_id": subfolder_cid,
                                "can_delete": True,
                            }
                        )
                    except Exception:
                        continue

        # 2. Chat-scoped uploads from .user_uploaded/
        if scope in ("all", "chat"):
            chat_dirs = []
            if conversation_id:
                cdir = self.get_chat_upload_dir(conversation_id)
                if cdir and cdir.exists():
                    chat_dirs.append((cdir, conversation_id))
            else:
                try:
                    from integrations.antigravity.core.adapter import antigravity_adapter

                    st = antigravity_adapter.get_status()
                    cid = st.get("active_conversation_id")
                    if cid:
                        cdir = self.get_chat_upload_dir(cid)
                        if cdir and cdir.exists():
                            chat_dirs.append((cdir, cid))
                except Exception:
                    pass

            for cdir, cid in chat_dirs:
                for entry in os.scandir(cdir):
                    if not entry.is_file():
                        continue
                    try:
                        stat = entry.stat()
                        total_bytes += stat.st_size
                        ext = Path(entry.name).suffix.lower()
                        cat = get_file_category(ext)

                        if category != "all" and cat != category:
                            continue
                        if not self._matches_search(search, entry.name, ext):
                            continue

                        # Route to raw file stream endpoint
                        items.append(
                            {
                                "id": f"chat_{entry.name}",
                                "filename": entry.name,
                                "original_name": entry.name,
                                "category": cat,
                                "size": stat.st_size,
                                "is_image": cat == "image",
                                "url": f"/api/v1/files/raw?path={entry.path.replace('\\', '/')}",
                                "mtime": stat.st_mtime,
                                "scope": "chat",
                                "conversation_id": cid,
                                "can_delete": True,
                            }
                        )
                    except Exception:
                        continue
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

    def delete_attachment(
        self, filename: str, conversation_id: Optional[str] = None
    ) -> Optional[int]:
        """Delete an attachment whether global or chat-scoped. Returns freed byte count on success, None on failure."""
        clean_name = filename.replace("chat_", "").strip().replace("\\", "/")
        parts = clean_name.split("/")
        safe_parts = [sanitize_filename(p) for p in parts if p and p != ".."]
        safe_rel = "/".join(safe_parts)
        safe_name = safe_parts[-1] if safe_parts else "attachment"

        # 1. Check relative subpath in uploads/ (e.g. uploads/<cid>/<file> or uploads/<file>)
        cand_rel = self.upload_dir / safe_rel
        if cand_rel.exists() and cand_rel.is_file():
            size = cand_rel.stat().st_size
            cand_rel.unlink()
            return size

        # 2. Check root uploads folder
        cand_global = self.upload_dir / safe_name
        if cand_global.exists() and cand_global.is_file():
            size = cand_global.stat().st_size
            cand_global.unlink()
            return size

        # 3. Check conversation uploads folder
        if conversation_id:
            chat_upload_sub = self.upload_dir / sanitize_filename(conversation_id) / safe_name
            if chat_upload_sub.exists() and chat_upload_sub.is_file():
                size = chat_upload_sub.stat().st_size
                chat_upload_sub.unlink()
                return size

            chat_dir = self.get_chat_upload_dir(conversation_id)
            if chat_dir:
                cand_chat = chat_dir / safe_name
                if cand_chat.exists() and cand_chat.is_file():
                    size = cand_chat.stat().st_size
                    cand_chat.unlink()
                    return size

        # 4. Fallback: Search all active brain bases for the file across user_uploaded directories
        for base in self.brain_bases:
            if base.exists():
                for cand in base.glob(f"*/.user_uploaded/{safe_name}"):
                    if cand.is_file():
                        size = cand.stat().st_size
                        cand.unlink()
                        return size

        return None


attachment_service = AttachmentService()
