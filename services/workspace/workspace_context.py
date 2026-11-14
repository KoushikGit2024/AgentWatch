"""
Centralized Workspace Context Service.
Dynamically resolves the active project folder/workspace path for Antigravity IDE,
falling back cleanly to the AgentWatch project root when no external workspace is active.
"""

import json
import logging
import os
import re
import sqlite3
import urllib.parse
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger("services.workspace_context")


class WorkspaceContext:
    def __init__(self):
        self._default_root: Path = Path(__file__).resolve().parent.parent.parent
        self._db_paths = [
            Path.home() / ".gemini" / "antigravity" / "conversation_summaries.db",
            Path.home() / ".gemini" / "antigravity-ide" / "conversation_summaries.db",
        ]

    def _decode_uri_to_path(self, uri: str) -> Optional[Path]:
        """Convert a file:// URI to an absolute Path object."""
        if not uri:
            return None
        try:
            unquoted = urllib.parse.unquote(urllib.parse.unquote(uri))
            clean = unquoted.replace("file://", "").lstrip("/")
            if re.match(r"^[a-zA-Z]:", clean):
                p = Path(clean.replace("/", "\\"))
            else:
                p = Path(clean)
            if p.exists():
                return p.resolve()
            # Even if it does not exist on disk temporarily, if it's absolute return it
            if p.is_absolute():
                return p
        except Exception as e:
            logger.debug("Failed to decode uri %s: %s", uri, e)
        return None

    def get_workspace_for_conversation(self, conversation_id: str) -> Tuple[Optional[Path], Optional[str]]:
        """Lookup workspace path and name for a specific conversation ID from SQLite summaries."""
        if not conversation_id:
            return None, None

        for db_file in self._db_paths:
            if not db_file.exists():
                continue
            try:
                uri = f"file:{db_file.as_posix()}?mode=ro"
                with sqlite3.connect(uri, uri=True, timeout=1.0) as con:
                    cur = con.cursor()
                    row = cur.execute(
                        "SELECT workspace_uris FROM conversation_summaries WHERE conversation_id = ? LIMIT 1",
                        (conversation_id,),
                    ).fetchone()
                    if row and row[0]:
                        uris = json.loads(row[0])
                        if isinstance(uris, list) and uris:
                            p = self._decode_uri_to_path(uris[0])
                            if p:
                                return p, p.name
            except Exception as e:
                logger.debug("Error querying conversation workspace from %s: %s", db_file, e)
        return None, None

    def get_active_workspace(self, target_conversation_id: Optional[str] = None) -> Tuple[Path, str]:
        """
        Determine the effective workspace directory:
        1. From target_conversation_id if specified.
        2. From active Antigravity adapter state (CDP session / iframe workspace).
        3. From active conversation in SQLite summaries.
        4. Fallback to AgentWatch repo root.
        """
        # 1. Target conversation ID if supplied
        if target_conversation_id:
            conv_path, conv_name = self.get_workspace_for_conversation(target_conversation_id)
            if conv_path and conv_path.exists():
                return conv_path, conv_name or conv_path.name

        # 2. Live Antigravity adapter CDP state
        try:
            from integrations.antigravity.core.adapter import antigravity_adapter
            if antigravity_adapter.active_workspace_path:
                ws_path = Path(antigravity_adapter.active_workspace_path).resolve()
                if ws_path.exists():
                    ws_name = antigravity_adapter.active_workspace_name or ws_path.name
                    return ws_path, ws_name

            # Also check if adapter has an active conversation id
            if antigravity_adapter.active_conversation_id:
                conv_path, conv_name = self.get_workspace_for_conversation(antigravity_adapter.active_conversation_id)
                if conv_path and conv_path.exists():
                    return conv_path, conv_name or conv_path.name
        except Exception as e:
            logger.debug("Failed reading workspace from antigravity_adapter: %s", e)

        # 3. Fallback to repository root
        return self._default_root, self._default_root.name

    def get_active_workspace_path(self, target_conversation_id: Optional[str] = None) -> Path:
        path, _ = self.get_active_workspace(target_conversation_id)
        return path

    def get_active_workspace_name(self, target_conversation_id: Optional[str] = None) -> str:
        _, name = self.get_active_workspace(target_conversation_id)
        return name


workspace_context = WorkspaceContext()

