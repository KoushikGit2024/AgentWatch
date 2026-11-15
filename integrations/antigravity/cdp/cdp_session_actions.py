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

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=4.0) as ws:
            nav_js = f"""
            (() => {{
                const targetCid = "{conversation_id}";
                const activeView = document.querySelector('[data-testid="conversation-view"]');
                const currentActiveCascade = activeView ? activeView.getAttribute('data-cascade-id') : null;
                if (currentActiveCascade === targetCid && window.location.pathname.includes(targetCid)) {{
                    return Promise.resolve({{ switched: true, alreadyActive: true }});
                }}

                // Helper to fire authentic user click
                function triggerClick(el) {{
                    const a = el.querySelector('a') || el;
                    a.dispatchEvent(new MouseEvent('click', {{ bubbles: true, cancelable: true, view: window }}));
                }}

                // 1. Direct match if row is already in the viewport
                let row = document.querySelector(`[data-cascade-id="${{targetCid}}"]`);
                if (row) {{
                    triggerClick(row);
                    return Promise.resolve({{ switched: true, via: 'visible_row' }});
                }}

                // 2. Virtualized sidebar scroll sweep
                const list = document.querySelector('[data-testid="conversation-list-sidebar"]');
                if (!list) {{
                    // Fallback to location assignment
                    const currentSearch = window.location.search;
                    window.location.href = `/c/${{targetCid}}${{currentSearch}}`;
                    return Promise.resolve({{ switched: true, via: 'location' }});
                }}

                return new Promise(resolve => {{
                    const total = list.scrollHeight;
                    let current = 0;
                    const step = Math.max(350, Math.floor(list.clientHeight * 0.75));
                    const interval = setInterval(() => {{
                        current += step;
                        list.scrollTop = current;
                        const targetRow = document.querySelector(`[data-cascade-id="${{targetCid}}"]`);
                        if (targetRow) {{
                            clearInterval(interval);
                            triggerClick(targetRow);
                            resolve({{ switched: true, via: 'virtual_scroll_row', at: current }});
                        }} else if (current >= total + step) {{
                            clearInterval(interval);
                            // Fallback
                            const currentSearch = window.location.search;
                            window.location.href = `/c/${{targetCid}}${{currentSearch}}`;
                            resolve({{ switched: true, via: 'scroll_sweep_fallback' }});
                        }}
                    }}, 25);
                }});
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 501,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": nav_js,
                            "returnByValue": True,
                            "awaitPromise": True,
                        },
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
