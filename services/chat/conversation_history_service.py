"""
Service for discovering, indexing, caching, and searching past Antigravity conversations.
Uses Antigravity's official conversation_summaries.db SQLite database for 100% exact
titles, workspaces, and timestamps (matching Antigravity IDE sidebar), falling back
to direct transcript scanning when needed.
"""

import json
import logging
import sqlite3
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("services.conversation_history_service")

CACHE_TTL_SECONDS = 5.0


class ConversationHistoryService:
    def __init__(self):
        self._cached_conversations: List[Dict[str, Any]] = []
        self._last_cache_time: float = 0.0

        home = Path.home()
        self.db_paths = [
            home / ".gemini" / "antigravity" / "conversation_summaries.db",
            home / ".gemini" / "antigravity-ide" / "conversation_summaries.db",
        ]
        self.brain_bases = [
            home / ".gemini" / "antigravity" / "brain",
            home / ".gemini" / "antigravity-ide" / "brain",
        ]

    def _parse_iso_to_epoch(self, dt_str: Optional[str]) -> float:
        """Parse SQLite datetime string into Unix epoch timestamp."""
        if not dt_str:
            return 0.0
        try:
            # Handles '2026-11-11 18:46:33.8944779+00:00' or standard ISO
            # Truncate fractional seconds beyond 6 digits for standard python datetime
            clean_str = dt_str.strip()
            if "+" in clean_str:
                dt_part, tz_part = clean_str.rsplit("+", 1)
                if "." in dt_part:
                    main_part, frac = dt_part.split(".", 1)
                    clean_str = f"{main_part}.{frac[:6]}+{tz_part}"
            elif clean_str.endswith("Z"):
                clean_str = clean_str[:-1] + "+00:00"
            dt = datetime.fromisoformat(clean_str)
            return dt.timestamp()
        except Exception:
            return 0.0

    def _extract_workspace_info(self, uris_raw: Optional[str]) -> Tuple[str, Optional[str]]:
        """Extract user-friendly workspace name and absolute path from workspace_uris JSON."""
        if not uris_raw:
            return "Workspace", None
        try:
            uris = json.loads(uris_raw)
            if isinstance(uris, list) and uris:
                first_uri = uris[0]
                unquoted = urllib.parse.unquote(urllib.parse.unquote(first_uri))
                clean = unquoted.replace("file://", "").lstrip("/")
                clean_path = clean.replace("/", "\\") if ":" in clean else clean
                parts = [p for p in unquoted.replace("\\", "/").split("/") if p]
                ws_name = parts[-1] if parts else "Workspace"
                return ws_name, clean_path
        except Exception:
            pass
        return "Workspace", None

    def _extract_workspace_name(self, uris_raw: Optional[str]) -> str:
        name, _ = self._extract_workspace_info(uris_raw)
        return name

    def _load_from_sqlite_databases(self) -> Dict[str, Dict[str, Any]]:
        """Query official conversation_summaries.db to get official titles & metadata."""
        db_records: Dict[str, Dict[str, Any]] = {}

        for db_file in self.db_paths:
            if not db_file.exists():
                continue
            try:
                # Open read-only URI connection to avoid locks
                uri = f"file:{db_file.as_posix()}?mode=ro"
                with sqlite3.connect(uri, uri=True, timeout=2.0) as con:
                    cur = con.cursor()
                    rows = cur.execute(
                        """
                        SELECT conversation_id, title, preview, workspace_uris, last_modified_time
                        FROM conversation_summaries
                        """
                    ).fetchall()
                    for r in rows:
                        cid, title, preview, uris, mtime_str = r
                        if not cid:
                            continue
                        clean_title = (title or "").strip()
                        if not clean_title:
                            clean_title = (preview or "").strip()
                        epoch_time = self._parse_iso_to_epoch(mtime_str)
                        ws_name, ws_path = self._extract_workspace_info(uris)

                        # Store or update with latest mtime
                        if cid not in db_records or epoch_time > db_records[cid]["updated_at"]:
                            db_records[cid] = {
                                "conversation_id": cid,
                                "title": clean_title,
                                "preview": preview or "",
                                "updated_at": epoch_time,
                                "workspace": ws_name,
                                "workspace_path": ws_path,
                            }
            except Exception as e:
                logger.warning("Could not read conversation summaries from %s: %s", db_file, e)

        return db_records

    def _extract_fallback_title(self, transcript_path: Path) -> Optional[str]:
        """Extract fallback title from transcript when DB has no title."""
        try:
            with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    content = data.get("content") or ""
                    if data.get("type") == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
                        import re
                        clean = re.sub(r"<[^>]+>", " ", content).strip()
                        clean = " ".join(clean.split())
                        if clean:
                            return clean[:100]
        except Exception:
            pass
        return None

    def _discover_conversations(self) -> List[Dict[str, Any]]:
        """Combine official SQLite summaries with brain directory data."""
        # 1. Fetch official titles and workspaces from Antigravity DB
        db_records = self._load_from_sqlite_databases()

        conversations = []
        seen_ids = set()

        # 2. Match with brain directories for size and presence
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

                    # Locate transcript file
                    transcript_file = conv_dir / ".system_generated" / "logs" / "transcript.jsonl"
                    if not transcript_file.exists():
                        transcript_file = (
                            conv_dir / ".system_generated" / "logs" / "transcript_full.jsonl"
                        )

                    file_size = 0
                    disk_mtime = 0.0
                    if transcript_file.exists():
                        try:
                            st = transcript_file.stat()
                            disk_mtime = st.st_mtime
                            file_size = st.st_size
                        except OSError:
                            pass

                    # Pull metadata from DB record if present
                    record = db_records.get(cid)
                    if record and record["title"]:
                        title = record["title"]
                    elif transcript_file.exists():
                        title = self._extract_fallback_title(transcript_file)
                    else:
                        title = None

                    display_title = title if title else f"Conversation {cid[:8]}"
                    workspace = (record.get("workspace") if record else None) or "Workspace"
                    workspace_path = record.get("workspace_path") if record else None
                    updated_at = (
                        record["updated_at"]
                        if record and record["updated_at"] > 0
                        else disk_mtime
                    )

                    conversations.append(
                        {
                            "conversation_id": cid,
                            "title": display_title,
                            "updated_at": updated_at,
                            "size_bytes": file_size,
                            "workspace": workspace,
                            "workspace_path": workspace_path,
                            "brain_path": str(conv_dir),
                        }
                    )
                    seen_ids.add(cid)
            except Exception as e:
                logger.error("Error scanning brain directory %s: %s", base, e)

        # 3. Add any DB conversations that might exist outside the scanned brain roots
        for cid, record in db_records.items():
            if cid not in seen_ids:
                conversations.append(
                    {
                        "conversation_id": cid,
                        "title": record["title"] or f"Conversation {cid[:8]}",
                        "updated_at": record["updated_at"],
                        "size_bytes": 0,
                        "workspace": record.get("workspace", "Workspace"),
                        "workspace_path": record.get("workspace_path"),
                        "brain_path": "",
                    }
                )
                seen_ids.add(cid)

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
        """Return filtered and paginated conversation items with infinite-scroll metadata."""
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
