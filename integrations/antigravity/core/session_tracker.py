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
        clean = decoded.replace("file://", "")
        if ":" in clean:
            clean_path = clean.lstrip("/").replace("/", "\\")
        else:
            clean_path = "/" + clean.lstrip("/")
        if clean_path:
            workspace_path = clean_path
            parts = [p for p in clean.replace("\\", "/").split("/") if p]
            if parts:
                workspace_name = parts[-1]

    # Query data-cascade-id, breadcrumb segment, mismatch banner, and title directly from webview DOM
    chat_title = None
    dom_cascade_id = None
    eval_val: Dict[str, Any] = {}
    try:
        dom_probe_js = """
        (() => {
            const turns = document.querySelectorAll('[data-turn-index], [data-testid*="turn"], [data-testid*="message"]');
            const breadcrumb = document.querySelector('[data-testid="breadcrumb-segment"]');
            const view = document.querySelector('[data-testid="conversation-view"][data-cascade-id]');
            const mismatchBanner = document.querySelector('[data-testid="workspace-mismatch-banner"]');
            
            // If there is no breadcrumb and 0 turns rendered, it is a brand-new blank conversation
            const isFreshChat = !breadcrumb && turns.length === 0;

            return {
                cascadeId: isFreshChat ? null : (view ? view.getAttribute('data-cascade-id') : null),
                breadcrumb: breadcrumb ? breadcrumb.innerText.trim() : null,
                isFreshChat: isFreshChat,
                hasMismatch: Boolean(mismatchBanner),
                docTitle: document.title || ''
            };
        })()
        """
        from integrations.antigravity.core.cdp_connection import cdp_connect

        async with cdp_connect(ws_url, open_timeout=1.5, close_timeout=1.5) as ws:
            await ws.send(
                json.dumps(
                    {
                        "id": 10,
                        "method": "Runtime.evaluate",
                        "params": {"expression": dom_probe_js, "returnByValue": True},
                    }
                )
            )
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=1.5))
            eval_val = msg.get("result", {}).get("result", {}).get("value") or {}
            
            # 1. Prefer data-cascade-id from DOM
            if eval_val.get("cascadeId"):
                dom_cascade_id = eval_val["cascadeId"].strip()
                
            # 2. Prefer breadcrumb text for active chat title
            breadcrumb_text = (eval_val.get("breadcrumb") or "").strip()
            if breadcrumb_text and breadcrumb_text != "Agent":
                chat_title = breadcrumb_text
            else:
                raw_title = eval_val.get("docTitle") or ""
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
        logger.debug("Chat iframe DOM probe notice: %s", exc)

    # If it's a fresh/empty chat, do not fall back to old URL or cascade id
    if eval_val.get("isFreshChat"):
        effective_conv_id = None
        chat_title = "New Conversation"
    else:
        effective_conv_id = dom_cascade_id or conv_id

    # If workspace mismatch is detected, resolve the conversation's true origin workspace from SQLite
    is_mismatch = bool(eval_val.get("hasMismatch"))
    workbench_ws_name = workspace_name
    if is_mismatch and effective_conv_id:
        try:
            from services.workspace.workspace_context import workspace_context
            conv_path, conv_name = workspace_context.get_workspace_for_conversation(effective_conv_id)
            if conv_path and conv_name:
                workspace_path = str(conv_path)
                workspace_name = conv_name
        except Exception:
            pass

    return {
        "conversation_id": effective_conv_id,
        "conversation_title": chat_title or ("New Conversation" if not effective_conv_id else None),
        "workspace_name": workspace_name,
        "workspace_path": workspace_path,
        "workbench_workspace_name": workbench_ws_name,
        "is_workspace_mismatch": is_mismatch,
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
