"""
CDP Actions for Antigravity IDE Queued Messages.
Scans for [data-testid="queued-messages-card"], extracts messages,
and handles Send Now, Delete, and Edit actions.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


async def get_ide_queued_messages(target_url: str) -> List[Dict[str, Any]]:
    """
    Scans the IDE workbench for the [data-testid="queued-messages-card"]
    and extracts all queued items.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, max_size=10 * 1024 * 1024, open_timeout=1.5, close_timeout=3.0) as ws:
            extract_js = """
            (() => {
                const card = document.querySelector('[data-testid="queued-messages-card"]');
                if (!card) return [];
                const rows = Array.from(card.querySelectorAll('.min-h-7, [class*="min-h-7"]'));
                return rows.map((row, idx) => {
                    const textSpan = row.querySelector('.line-clamp-2, span.text-sm, [data-quotable="true"]');
                    const text = textSpan ? textSpan.innerText.trim() : '';
                    const hasSendNow = !!row.querySelector('button[aria-label*="Send now" i], button[aria-label*="Send Now"]');
                    const hasEdit = !!row.querySelector('button[aria-label*="Edit" i]');
                    const hasDelete = !!row.querySelector('button[aria-label*="Delete" i]');
                    return {
                        id: 'ide_q_' + idx,
                        index: idx,
                        text: text,
                        source: 'ide_native',
                        can_send_now: hasSendNow,
                        can_edit: hasEdit,
                        can_delete: hasDelete
                    };
                }).filter(item => item.text.length > 0);
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 401,
                        "method": "Runtime.evaluate",
                        "params": {"expression": extract_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
            return reply.get("result", {}).get("result", {}).get("value", []) or []
    except Exception as exc:
        logger.debug("Failed to read IDE queued messages via CDP: %s", str(exc))
        return []


async def dispatch_queued_action(
    target_url: str, action: str, index: int = 0, text: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes Send Now, Delete, or Edit on a queued message in the IDE.
    Actions: 'send_now', 'delete', 'edit'.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, max_size=10 * 1024 * 1024, open_timeout=1.5, close_timeout=3.0) as ws:
            action_js = f"""
            (async () => {{
                const card = document.querySelector('[data-testid="queued-messages-card"]');
                if (!card) return {{ success: false, error: 'Queued messages card not found' }};
                const rows = Array.from(card.querySelectorAll('.min-h-7, [class*="min-h-7"]'));
                const targetRow = rows[{index}] || rows[0];
                if (!targetRow) return {{ success: false, error: 'Target queued row not found' }};

                const act = {json.dumps(action.lower())};
                if (act === 'send_now') {{
                    const btn = targetRow.querySelector('button[aria-label*="Send now" i], button[aria-label*="Send Now"]');
                    if (!btn) return {{ success: false, error: 'Send Now button not found' }};
                    btn.click();
                    return {{ success: true, action: 'send_now' }};
                }} else if (act === 'delete') {{
                    const btn = targetRow.querySelector('button[aria-label*="Delete" i]');
                    if (!btn) return {{ success: false, error: 'Delete button not found' }};
                    btn.click();
                    return {{ success: true, action: 'delete' }};
                }} else if (act === 'edit') {{
                    const btn = targetRow.querySelector('button[aria-label*="Edit" i]');
                    if (!btn) return {{ success: false, error: 'Edit button not found' }};
                    btn.click();
                    return {{ success: true, action: 'edit_opened' }};
                }}
                return {{ success: false, error: 'Unknown queued action' }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 402,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": action_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.5))
            val = reply.get("result", {}).get("result", {}).get("value", {}) or {}

            # If action was edit and new text was provided, insert the new text and confirm
            if action.lower() == "edit" and val.get("success") and text is not None:
                await asyncio.sleep(0.1)
                # Clear and insert text into the active edit input
                await ws.send(
                    json.dumps(
                        {
                            "id": 403,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "rawKeyDown",
                                "key": "a",
                                "code": "KeyA",
                                "modifiers": 2,
                                "windowsVirtualKeyCode": 65,
                            },
                        }
                    )
                )
                await ws.recv()
                await ws.send(
                    json.dumps(
                        {
                            "id": 404,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "keyUp",
                                "key": "a",
                                "code": "KeyA",
                                "modifiers": 2,
                                "windowsVirtualKeyCode": 65,
                            },
                        }
                    )
                )
                await ws.recv()
                await ws.send(
                    json.dumps(
                        {
                            "id": 405,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "rawKeyDown",
                                "key": "Backspace",
                                "code": "Backspace",
                                "windowsVirtualKeyCode": 8,
                            },
                        }
                    )
                )
                await ws.recv()
                await ws.send(
                    json.dumps(
                        {
                            "id": 406,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "keyUp",
                                "key": "Backspace",
                                "code": "Backspace",
                                "windowsVirtualKeyCode": 8,
                            },
                        }
                    )
                )
                await ws.recv()
                await ws.send(
                    json.dumps({"id": 407, "method": "Input.insertText", "params": {"text": text}})
                )
                await ws.recv()
                # Confirm edit via Enter key
                await ws.send(
                    json.dumps(
                        {
                            "id": 408,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "rawKeyDown",
                                "key": "Enter",
                                "code": "Enter",
                                "windowsVirtualKeyCode": 13,
                            },
                        }
                    )
                )
                await ws.recv()
                await ws.send(
                    json.dumps(
                        {
                            "id": 409,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "keyUp",
                                "key": "Enter",
                                "code": "Enter",
                                "windowsVirtualKeyCode": 13,
                            },
                        }
                    )
                )
                await ws.recv()
                val["updated_text"] = text

            return val
    except Exception as exc:
        logger.error("CDP queued message action failed: %s", str(exc))
        return {"success": False, "error": str(exc)}
