"""Service to monitor inter-agent messages and background task notifications."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MessageSyncService:
    """Discovers and parses inter-agent messages from `.system_generated/messages/`."""

    def __init__(self):
        self._cached_delivered_ids: set = set()

    def get_messages_dir(self, session_dir: Optional[Path] = None) -> Optional[Path]:
        """Resolve the active `.system_generated/messages` directory."""
        if session_dir and session_dir.exists():
            md = session_dir / ".system_generated" / "messages"
            if md.exists():
                return md

        from services.conversation_service import conversation_service
        tp = conversation_service.get_latest_transcript_path()
        if tp and tp.exists():
            md = tp.parent.parent.parent / ".system_generated" / "messages"
            if md.exists():
                return md

        return None

    def get_read_status(self, messages_dir: Path) -> Dict[str, bool]:
        """Read read.json tracking acknowledgment status."""
        read_file = messages_dir / "read.json"
        if not read_file.exists():
            return {}
        try:
            with open(read_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def list_messages(
        self, session_dir: Optional[Path] = None, limit: int = 30
    ) -> List[Dict[str, Any]]:
        """List inter-agent and background task messages sorted by timestamp."""
        messages_dir = self.get_messages_dir(session_dir)
        if not messages_dir or not messages_dir.exists():
            return []

        read_status = self.get_read_status(messages_dir)
        json_files = [f for f in messages_dir.glob("*.json") if f.name != "read.json"]
        json_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        results: List[Dict[str, Any]] = []
        for jf in json_files[:limit]:
            try:
                with open(jf, "r", encoding="utf-8") as f:
                    data = json.load(f)
                msg_id = data.get("id") or jf.stem
                is_read = bool(read_status.get(msg_id, False))
                results.append({
                    "id": msg_id,
                    "sender": data.get("sender"),
                    "recipient": data.get("recipient"),
                    "priority": data.get("priority", "NORMAL"),
                    "timestamp": data.get("timestamp"),
                    "render_details": data.get("renderDetails") or {},
                    "is_read": is_read,
                    "content": data.get("content"),
                })
            except Exception:
                continue

        return results


message_sync_service = MessageSyncService()

