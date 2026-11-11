"""
Service for discovering, indexing, caching, and searching past Antigravity conversations.
Scans Gemini Brain directories directly from disk without blocking event loop.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("services.conversation_history_service")

CACHE_TTL_SECONDS = 10.0


class ConversationHistoryService:
    def __init__(self):
        self._cached_conversations: List[Dict[str, Any]] = []
        self._last_cache_time: float = 0.0

        home = Path.home()
        self.brain_bases = [
            home / ".gemini" / "antigravity" / "brain",
            home / ".gemini" / "antigravity-ide" / "brain",
        ]

    def _extract_title_from_transcript(self, transcript_path: Path) -> Optional[str]:
        """Extract a readable title from the first meaningful user prompt in transcript."""
        try:
            with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    content = data.get("content") or ""
                    # Handle USER_INPUT or USER_EXPLICIT prompts
                    if data.get("type") == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
                        # Clean XML tags like <USER_REQUEST>
                        import re

                        clean = re.sub(r"<[^>]+>", " ", content).strip()
                        clean = " ".join(clean.split())
                        if clean:
                            return clean[:120]
                    # Fallback to general content
                    if content and isinstance(content, str) and len(content.strip()) > 3:
                        import re

                        clean = re.sub(r"<[^>]+>", " ", content).strip()
                        clean = " ".join(clean.split())
                        if clean:
                            return clean[:120]
        except Exception:
            pass
        return None

    def _discover_conversations(self) -> List[Dict[str, Any]]:
        """Scan all brain directories and build metadata for each conversation."""
        conversations = []
        seen_ids = set()

        for base in self.brain_bases:
            if not base.exists():
                continue

            try:
                for conv_dir in base.iterdir():
                    if not conv_dir.is_dir() or conv_dir.name.startswith("."):
                        continue

                    cid = conv_dir.name
                    if cid in seen_ids:
                        continue

                    transcript_file = conv_dir / ".system_generated" / "logs" / "transcript.jsonl"
                    if not transcript_file.exists():
                        # Try compact transcript or direct file
                        transcript_file = (
                            conv_dir / ".system_generated" / "logs" / "transcript_full.jsonl"
                        )
                        if not transcript_file.exists():
                            continue

                    try:
                        st = transcript_file.stat()
                        mtime = st.st_mtime
                        file_size = st.st_size
                    except OSError:
                        mtime = 0.0
                        file_size = 0

                    title = self._extract_title_from_transcript(transcript_file)
                    display_title = title if title else f"Conversation {cid[:8]}"

                    # Detect workspace if present in conversation directory or files
                    detected_workspace = None
                    try:
                        # Check if any artifacts or code files exist
                        for child in conv_dir.iterdir():
                            if child.name not in [".system_generated", "scratch", ".user_uploaded"]:
                                detected_workspace = child.name
                                break
                    except Exception:
                        pass

                    conversations.append(
                        {
                            "conversation_id": cid,
                            "title": display_title,
                            "updated_at": mtime,
                            "size_bytes": file_size,
                            "workspace": detected_workspace or "Workspace",
                            "brain_path": str(conv_dir),
                        }
                    )
                    seen_ids.add(cid)
            except Exception as e:
                logger.error("Error scanning brain directory %s: %s", base, e)

        # Sort descending by latest modified time
        conversations.sort(key=lambda c: c["updated_at"], reverse=True)
        return conversations

    def get_all_conversations(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Get all conversations with smart cache."""
        now = time.time()
        if (
            force_refresh
            or not self._cached_conversations
            or (now - self._last_cache_time) > CACHE_TTL_SECONDS
        ):
            self._cached_conversations = self._discover_conversations()
            self._last_cache_time = now
        return self._cached_conversations

    def list_conversations(
        self,
        query: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Return filtered and paginated conversation items with infinite-scroll metadata.
        """
        all_convs = self.get_all_conversations(force_refresh=force_refresh)

        if query and query.strip():
            q_lower = query.strip().lower()
            filtered = [
                c
                for c in all_convs
                if q_lower in c["title"].lower()
                or q_lower in c["conversation_id"].lower()
                or q_lower in (c.get("workspace") or "").lower()
            ]
        else:
            filtered = all_convs

        total = len(filtered)
        paged_items = filtered[offset : offset + limit]
        has_more = (offset + limit) < total

        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": has_more,
            "next_offset": (offset + limit) if has_more else None,
            "conversations": paged_items,
        }


conversation_history_service = ConversationHistoryService()
