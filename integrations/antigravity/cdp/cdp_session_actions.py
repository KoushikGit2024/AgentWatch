"""CDP Actions for switching conversations and starting new chat sessions in Antigravity."""

import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("integrations.antigravity.cdp_session_actions")


async def dispatch_switch_conversation(target_url: str, conversation_id: str) -> Dict[str, Any]:
    """
    Switch active conversation in Antigravity IDE via CDP.
    Navigates webview to /c/<conversation_id> maintaining existing workspaceUri query parameter.
    """
    try:
        from integrations.antigravity.core.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            nav_js = f"""
            (() => {{
                const targetCid = "{conversation_id}";
                // First check if already on this conversation
                if (window.location.pathname.includes(targetCid)) {{
                    return {{ switched: true, alreadyActive: true }};
                }}

                // Check if link exists in sidebar and click it for smooth SPA transition
                const link = document.querySelector(`a[href*="${{targetCid}}"]`);
                if (link) {{
                    link.click();
                    return {{ switched: true, via: 'sidebar_link' }};
                }}

                // Direct SPA navigation fallback
                const currentSearch = window.location.search;
                const newUrl = `/c/${{targetCid}}${{currentSearch}}`;
                window.location.href = newUrl;
                return {{ switched: true, via: 'window_location', url: newUrl }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 501,
                        "method": "Runtime.evaluate",
                        "params": {"expression": nav_js, "returnByValue": True},
                    }
                )
            )
            raw = await ws.recv()
            reply = json.loads(raw)
            res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            return {"success": res.get("switched", False), "details": res}
    except Exception as e:
        logger.error("Failed to switch conversation via CDP: %s", e)
        return {"success": False, "error": str(e)}


async def dispatch_new_conversation(target_url: str) -> Dict[str, Any]:
    """
    Trigger New Conversation action in Antigravity IDE via CDP.
    """
    try:
        from integrations.antigravity.core.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            new_chat_js = """
            (() => {
                const btn = document.querySelector('button[aria-label="New Conversation"]') ||
                            document.querySelector('a[href*="/?workspaceUri"]') ||
                            Array.from(document.querySelectorAll('a, button')).find(el => el.innerText?.trim() === 'New Conversation');
                if (btn) {
                    btn.click();
                    return { created: true, via: 'click' };
                }
                const currentSearch = window.location.search;
                window.location.href = `/${currentSearch}`;
                return { created: true, via: 'navigate' };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 502,
                        "method": "Runtime.evaluate",
                        "params": {"expression": new_chat_js, "returnByValue": True},
                    }
                )
            )
            raw = await ws.recv()
            reply = json.loads(raw)
            res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            return {"success": res.get("created", False), "details": res}
    except Exception as e:
        logger.error("Failed to create new conversation via CDP: %s", e)
        return {"success": False, "error": str(e)}
