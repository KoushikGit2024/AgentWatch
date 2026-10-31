"""CDP Prompt and Stop Generation Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict

logger = logging.getLogger("integrations.antigravity.cdp_prompt_actions")


async def dispatch_send_prompt(target_url: str, message: str) -> Dict[str, Any]:
    """
    Dispatch prompt text directly into Antigravity IDE workbench via CDP.
    Focuses the contenteditable or textarea message input, clears existing text via Ctrl+A + Backspace,
    inserts prompt via native CDP Input.insertText, and clicks the Send message button.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            # 1. Focus input element
            focus_js = """
            (() => {
                const selectors = [
                    '[aria-label="Message input"]',
                    '[placeholder*="Type something"]',
                    '[placeholder*="Ask anything"]',
                    '[placeholder*="Follow up"]',
                    'div[contenteditable="true"][role="textbox"]',
                    'div[contenteditable="true"]',
                    'textarea.monaco-inputbox',
                    'textarea'
                ];
                let el = null;
                for (const sel of selectors) {
                    const candidates = Array.from(document.querySelectorAll(sel)).filter(node => {
                        const rect = node.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0 && !node.disabled;
                    });
                    if (candidates.length > 0) {
                        el = candidates[candidates.length - 1];
                        break;
                    }
                }
                if (!el) return { found: false, error: 'Input element not found' };
                el.focus();
                if (typeof el.click === 'function') el.click();
                return { found: true, tag: el.tagName };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 201,
                        "method": "Runtime.evaluate",
                        "params": {"expression": focus_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            prep_res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            if not prep_res.get("found"):
                return {"success": False, "error": "Antigravity prompt input not located in DOM"}

            # 2. Clear any existing text via Ctrl+A and Backspace
            await ws.send(
                json.dumps(
                    {
                        "id": 202,
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
                        "id": 203,
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
                        "id": 204,
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
                        "id": 205,
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

            # 3. Native CDP Text Insertion into focused editor
            await ws.send(
                json.dumps({"id": 206, "method": "Input.insertText", "params": {"text": message}})
            )
            await asyncio.wait_for(ws.recv(), timeout=2.0)
            await asyncio.sleep(0.08)

            # 4. Attempt clicking the native Send message button
            submit_js = """
            (() => {
                const directSelectors = [
                    '[aria-label="Send message"]',
                    '[aria-label="Send Message"]',
                    '[aria-label="Submit"]',
                    '[aria-label="Send"]',
                    'button[type="submit"]'
                ];
                for (const sel of directSelectors) {
                    const btn = document.querySelector(sel);
                    if (btn && !btn.disabled) {
                        btn.click();
                        return { submitted: true, via: 'direct_send_button' };
                    }
                }

                const el = document.querySelector('[aria-label="Message input"]') || document.activeElement;
                const card = el ? (el.closest('.bg-card') || el.closest('[class*="bg-card"]') || el.closest('.composer') || el.parentElement?.parentElement) : null;
                const btns = Array.from((card || document).querySelectorAll('button, [role="button"]'));
                for (const b of btns) {
                    if (b.disabled) continue;
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const text = (b.innerText || '').toLowerCase().trim();
                    const title = (b.title || '').toLowerCase();
                    if (aria.includes('send') || aria.includes('submit') || text === 'send' || text === 'submit' || title.includes('send')) {
                        b.click();
                        return { submitted: true, via: 'card_button' };
                    }
                }
                return { submitted: false };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 207,
                        "method": "Runtime.evaluate",
                        "params": {"expression": submit_js, "returnByValue": True},
                    }
                )
            )
            sub_reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            sub_res = sub_reply.get("result", {}).get("result", {}).get("value", {}) or {}

            # 5. If button wasn't clicked, dispatch Enter key event
            if not sub_res.get("submitted"):
                await ws.send(
                    json.dumps(
                        {
                            "id": 208,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "rawKeyDown",
                                "key": "Enter",
                                "code": "Enter",
                                "windowsVirtualKeyCode": 13,
                                "nativeVirtualKeyCode": 13,
                            },
                        }
                    )
                )
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                await ws.send(
                    json.dumps(
                        {
                            "id": 209,
                            "method": "Input.dispatchKeyEvent",
                            "params": {
                                "type": "keyUp",
                                "key": "Enter",
                                "code": "Enter",
                                "windowsVirtualKeyCode": 13,
                                "nativeVirtualKeyCode": 13,
                            },
                        }
                    )
                )
                await asyncio.wait_for(ws.recv(), timeout=2.0)

            # 6. Immediate check: if Antigravity queued the message while generating, trigger 'Send Now' immediately
            await asyncio.sleep(0.15)
            send_now_js = """
            (() => {
                const card = document.querySelector('[data-testid="queued-messages-card"]');
                if (card) {
                    const sendNowBtn = card.querySelector('button[aria-label="Send Now"], button:has(svg)');
                    if (sendNowBtn) {
                        sendNowBtn.click();
                        return { auto_sent: true };
                    }
                }
                return { auto_sent: false };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 210,
                        "method": "Runtime.evaluate",
                        "params": {"expression": send_now_js, "returnByValue": True},
                    }
                )
            )
            await asyncio.sleep(0.05)

            return {
                "success": True,
                "message_length": len(message),
                "submitted_via": sub_res.get("via", "enter_key"),
            }
    except Exception as exc:
        logger.error("Failed to dispatch prompt via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_stop_generation(target_url: str) -> Dict[str, Any]:
    """
    Dispatch stop/cancel signal to active Antigravity session via CDP.
    Finds the Stop/Cancel button, dispatches Ctrl+D, and Escape keys.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            stop_js = """
            (() => {
                const termCloseBtn = document.querySelector('[data-tooltip-id^="terminal-expanded-content"] button, [data-tooltip-id*="terminal"] button');
                if (termCloseBtn) {
                    termCloseBtn.click();
                    return { clicked: true, target: 'terminal_row_close' };
                }

                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                for (const b of btns) {
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const text = (b.innerText || '').toLowerCase();
                    const title = (b.title || '').toLowerCase();
                    const tip = (b.getAttribute('data-tooltip-id') || '').toLowerCase();
                    if (
                        aria.includes('cancel (ctrl+d)') ||
                        aria.includes('cancel') ||
                        aria.includes('stop') ||
                        text.includes('stop') ||
                        title.includes('stop') ||
                        title.includes('cancel') ||
                        tip.includes('terminal-expanded')
                    ) {
                        b.click();
                        return { clicked: true, target: aria || text || title || tip };
                    }
                }
                return { clicked: false };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 210,
                        "method": "Runtime.evaluate",
                        "params": {"expression": stop_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            val = reply.get("result", {}).get("result", {}).get("value", {})

            # Ctrl+D key combination
            await ws.send(
                json.dumps(
                    {
                        "id": 211,
                        "method": "Input.dispatchKeyEvent",
                        "params": {
                            "type": "rawKeyDown",
                            "key": "d",
                            "code": "KeyD",
                            "modifiers": 2,
                            "windowsVirtualKeyCode": 68,
                            "nativeVirtualKeyCode": 68,
                        },
                    }
                )
            )
            await asyncio.wait_for(ws.recv(), timeout=1.5)
            await ws.send(
                json.dumps(
                    {
                        "id": 212,
                        "method": "Input.dispatchKeyEvent",
                        "params": {
                            "type": "keyUp",
                            "key": "d",
                            "code": "KeyD",
                            "modifiers": 2,
                            "windowsVirtualKeyCode": 68,
                            "nativeVirtualKeyCode": 68,
                        },
                    }
                )
            )
            await asyncio.wait_for(ws.recv(), timeout=1.5)

            # Escape key
            await ws.send(
                json.dumps(
                    {
                        "id": 213,
                        "method": "Input.dispatchKeyEvent",
                        "params": {
                            "type": "rawKeyDown",
                            "key": "Escape",
                            "code": "Escape",
                            "windowsVirtualKeyCode": 27,
                        },
                    }
                )
            )
            await asyncio.wait_for(ws.recv(), timeout=1.5)
            await ws.send(
                json.dumps(
                    {
                        "id": 214,
                        "method": "Input.dispatchKeyEvent",
                        "params": {
                            "type": "keyUp",
                            "key": "Escape",
                            "code": "Escape",
                            "windowsVirtualKeyCode": 27,
                        },
                    }
                )
            )
            await asyncio.wait_for(ws.recv(), timeout=1.5)

            return {"success": True, "stopped": True, "details": val}
    except Exception as exc:
        logger.error("Failed to dispatch stop via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}

