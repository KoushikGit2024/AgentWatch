import asyncio
import json
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

import httpx
import websockets

logger = logging.getLogger("integrations.antigravity.session_tracker")


async def inspect_chat_target(target: Dict[str, Any]) -> Dict[str, Any]:
    """Inspect an Antigravity chat iframe target to extract conversation metadata."""
    ws_url = target.get("webSocketDebuggerUrl")
    if not ws_url:
        return {}

    url = target.get("url") or ""
    # Parse conversation_id and workspaceUri from URL
    conv_id = None
    workspace_name = None
    workspace_path = None

    parsed = urllib.parse.urlparse(url)
    if parsed.path.startswith("/c/"):
        conv_id = parsed.path.split("/c/")[1].split("/")[0]

    qs = urllib.parse.parse_qs(parsed.query)
    if "workspaceUri" in qs and qs["workspaceUri"]:
        raw_uri = qs["workspaceUri"][0]
        decoded = urllib.parse.unquote(urllib.parse.unquote(raw_uri))
        clean_path = decoded.replace("file://", "").lstrip("/").replace("/", "\\")
        if clean_path:
            workspace_path = clean_path
            parts = [p for p in clean_path.split("\\") if p]
            if parts:
                workspace_name = parts[-1]

    # Query document.title directly from the webview context
    chat_title = None
    try:
        async with websockets.connect(ws_url, open_timeout=1.5, close_timeout=1.5) as ws:
            await ws.send(
                json.dumps(
                    {
                        "id": 10,
                        "method": "Runtime.evaluate",
                        "params": {"expression": "document.title", "returnByValue": True},
                    }
                )
            )
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=1.5))
            raw_title = msg.get("result", {}).get("result", {}).get("value") or ""
            if raw_title:
                clean_title = (
                    raw_title.replace("- Standalone - Antigravity", "")
                    .replace("- Antigravity IDE", "")
                    .replace("- Antigravity", "")
                    .strip()
                )
                if clean_title and clean_title != "Agent" and not clean_title.startswith("http"):
                    chat_title = clean_title
    except Exception as exc:
        logger.debug("Chat iframe document.title query notice: %s", exc)

    return {
        "conversation_id": conv_id,
        "conversation_title": chat_title,
        "workspace_name": workspace_name,
        "workspace_path": workspace_path,
        "chat_target_url": ws_url,
    }


def parse_workbench_title(raw_title: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Parse workspace name and active file name from VS Code/Antigravity window title.
    Examples:
      'AgentWatchV2 - Antigravity IDE - Navbar.jsx' -> ('AgentWatchV2', 'Navbar.jsx')
      'Navbar.jsx - AgentWatchV2 - Antigravity IDE' -> ('AgentWatchV2', 'Navbar.jsx')
    """
    if not raw_title:
        return None, None

    cleaned = raw_title.replace("● ", "").strip()
    parts = [p.strip() for p in cleaned.split(" - ") if p.strip()]

    # Filter out known IDE brand strings
    parts = [p for p in parts if p.lower() not in ("antigravity ide", "antigravity", "visual studio code")]
    if not parts:
        return None, None

    workspace_name = parts[0]
    active_file = parts[1] if len(parts) > 1 else None
    return workspace_name, active_file
