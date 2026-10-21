"""CDP Actions for Antigravity IDE Workbench."""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


async def dispatch_send_prompt(target_url: str, message: str) -> Dict[str, Any]:
    """
    Dispatch prompt text directly into Antigravity IDE workbench via CDP.
    Focuses the contenteditable or textarea message input, clears existing text via Ctrl+A + Backspace,
    inserts prompt via native CDP Input.insertText, and clicks the Send message button.
    """
    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=3) as ws:
            # 1. Focus input element
            focus_js = """
            (() => {
                const el = document.querySelector('[aria-label="Message input"]')
                    || document.querySelector('div[contenteditable="true"]')
                    || document.querySelector('textarea.monaco-inputbox')
                    || document.querySelector('textarea');
                if (!el) return { found: false, error: 'Input element not found' };
                el.focus();
                return { found: true, tag: el.tagName };
            })()
            """
            await ws.send(json.dumps({
                "id": 201,
                "method": "Runtime.evaluate",
                "params": {"expression": focus_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            prep_res = reply.get("result", {}).get("result", {}).get("value", {})
            if not prep_res.get("found"):
                return {"success": False, "error": "Antigravity prompt input not located in DOM"}

            # 2. Clear any existing text via Ctrl+A and Backspace
            await ws.send(json.dumps({
                "id": 202,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "rawKeyDown", "key": "a", "code": "KeyA", "modifiers": 2, "windowsVirtualKeyCode": 65}
            }))
            await ws.recv()
            await ws.send(json.dumps({
                "id": 203,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "keyUp", "key": "a", "code": "KeyA", "modifiers": 2, "windowsVirtualKeyCode": 65}
            }))
            await ws.recv()
            await ws.send(json.dumps({
                "id": 204,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "rawKeyDown", "key": "Backspace", "code": "Backspace", "windowsVirtualKeyCode": 8}
            }))
            await ws.recv()
            await ws.send(json.dumps({
                "id": 205,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "keyUp", "key": "Backspace", "code": "Backspace", "windowsVirtualKeyCode": 8}
            }))
            await ws.recv()

            # 3. Native CDP Text Insertion into focused editor
            await ws.send(json.dumps({
                "id": 206,
                "method": "Input.insertText",
                "params": {"text": message}
            }))
            await asyncio.wait_for(ws.recv(), timeout=2.0)

            # Give DOM a small moment to mount the Send button
            await asyncio.sleep(0.08)

            # 4. Attempt clicking the native Send message button
            submit_js = """
            (() => {
                // Priority 1: Direct aria-label matching
                const directSend = document.querySelector('[aria-label="Send message"]')
                    || document.querySelector('[aria-label="Send Message"]')
                    || document.querySelector('[aria-label="Submit"]');
                if (directSend && !directSend.disabled) {
                    directSend.click();
                    return { submitted: true, via: 'direct_send_button' };
                }

                // Priority 2: Card container search
                const el = document.querySelector('[aria-label="Message input"]');
                const card = el ? (el.closest('.bg-card') || el.closest('[class*="bg-card"]') || el.closest('.composer')) : null;
                const btns = Array.from((card || document).querySelectorAll('button, [role="button"]'));
                for (const b of btns) {
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const text = (b.innerText || '').toLowerCase();
                    const title = (b.title || '').toLowerCase();
                    if (aria.includes('send') || aria.includes('submit') || text.includes('send') || title.includes('send')) {
                        b.click();
                        return { submitted: true, via: 'card_button' };
                    }
                }
                return { submitted: false };
            })()
            """
            await ws.send(json.dumps({
                "id": 207,
                "method": "Runtime.evaluate",
                "params": {"expression": submit_js, "returnByValue": True}
            }))
            sub_reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            sub_res = sub_reply.get("result", {}).get("result", {}).get("value", {})

            # 5. If button wasn't clicked, dispatch Enter key event
            if not sub_res.get("submitted"):
                await ws.send(json.dumps({
                    "id": 208,
                    "method": "Input.dispatchKeyEvent",
                    "params": {
                        "type": "rawKeyDown",
                        "key": "Enter",
                        "code": "Enter",
                        "windowsVirtualKeyCode": 13,
                        "nativeVirtualKeyCode": 13
                    }
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                await ws.send(json.dumps({
                    "id": 209,
                    "method": "Input.dispatchKeyEvent",
                    "params": {
                        "type": "keyUp",
                        "key": "Enter",
                        "code": "Enter",
                        "windowsVirtualKeyCode": 13,
                        "nativeVirtualKeyCode": 13
                    }
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)

            return {"success": True, "message_length": len(message), "submitted_via": sub_res.get("via", "enter_key")}
    except Exception as exc:
        logger.error("Failed to dispatch prompt via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_stop_generation(target_url: str) -> Dict[str, Any]:
    """
    Dispatch stop/cancel signal to active Antigravity session via CDP.
    Finds the Stop/Cancel button, dispatches Ctrl+D, and Escape keys.
    """
    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=3) as ws:
            stop_js = """
            (() => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                for (const b of btns) {
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const text = (b.innerText || '').toLowerCase();
                    const title = (b.title || '').toLowerCase();
                    if (aria.includes('cancel (ctrl+d)') || aria.includes('cancel') || aria.includes('stop') || text.includes('stop') || title.includes('stop')) {
                        b.click();
                        return { clicked: true, target: aria || text || title };
                    }
                }
                return { clicked: false };
            })()
            """
            await ws.send(json.dumps({
                "id": 210,
                "method": "Runtime.evaluate",
                "params": {"expression": stop_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            val = reply.get("result", {}).get("result", {}).get("value", {})

            # Also dispatch Ctrl+D key combination
            await ws.send(json.dumps({
                "id": 211,
                "method": "Input.dispatchKeyEvent",
                "params": {
                    "type": "rawKeyDown",
                    "key": "d",
                    "code": "KeyD",
                    "modifiers": 2,
                    "windowsVirtualKeyCode": 68,
                    "nativeVirtualKeyCode": 68
                }
            }))
            await asyncio.wait_for(ws.recv(), timeout=1.5)
            await ws.send(json.dumps({
                "id": 212,
                "method": "Input.dispatchKeyEvent",
                "params": {
                    "type": "keyUp",
                    "key": "d",
                    "code": "KeyD",
                    "modifiers": 2,
                    "windowsVirtualKeyCode": 68,
                    "nativeVirtualKeyCode": 68
                }
            }))
            await asyncio.wait_for(ws.recv(), timeout=1.5)

            # Dispatch Escape key
            await ws.send(json.dumps({
                "id": 213,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "rawKeyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27}
            }))
            await asyncio.wait_for(ws.recv(), timeout=1.5)
            await ws.send(json.dumps({
                "id": 214,
                "method": "Input.dispatchKeyEvent",
                "params": {"type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27}
            }))
            await asyncio.wait_for(ws.recv(), timeout=1.5)

            return {"success": True, "stopped": True, "details": val}
    except Exception as exc:
        logger.error("Failed to dispatch stop via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_forward_approval(target_url: str, request_type: str, decision: str) -> Dict[str, Any]:
    """Forward user approval decision to Antigravity IDE workbench by clicking dialog button.

    Strategy (in priority order):
    1. Scoped search inside dialog/modal/notification containers
    2. Shadow DOM traversal for web-component hosted dialogs
    3. Global flat scan of all buttons
    4. Keyboard fallback (Enter = allow, Escape = deny)
    Returns diagnostics for debugging when no button found.
    """
    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=5) as ws:
            click_js = f"""
            (() => {{
                const dec = {json.dumps(decision.lower())};
                const isAllow = dec.includes('allow') || dec.includes('accept') || dec.includes('always');
                const isDeny  = dec.includes('deny') || dec.includes('reject');

                // Label matchers
                const allowTerms = ['allow', 'always allow', 'accept', 'run', 'yes', 'approve', 'continue', 'ok', 'confirm'];
                const denyTerms  = ['deny', 'reject', 'cancel', 'no', 'decline', 'block', 'refuse'];
                const terms = isAllow ? allowTerms : denyTerms;

                function scoreButton(b) {{
                    const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const title = (b.title || '').toLowerCase();
                    const combined = txt + ' ' + aria + ' ' + title;
                    for (const t of terms) {{
                        if (combined.includes(t)) return {{ score: 1, label: txt || aria }};
                    }}
                    return null;
                }}

                // Collect buttons from an element's shadow DOM recursively
                function collectFromShadow(root, acc) {{
                    if (!root) return;
                    const els = root.querySelectorAll('button, .monaco-button, [role="button"]');
                    els.forEach(e => acc.push(e));
                    root.querySelectorAll('*').forEach(el => {{
                        if (el.shadowRoot) collectFromShadow(el.shadowRoot, acc);
                    }});
                }}

                // Priority 1: dialog/modal/notification container buttons
                const containers = document.querySelectorAll([
                    '[role="dialog"]',
                    '.monaco-dialog-box',
                    '.quick-input-widget',
                    '.notifications-toasts',
                    '.notification-list-item',
                    '.dialog-shadow',
                    '.monaco-modal-dialog',
                    '.agy-dialog',
                    '.tool-use-dialog',
                    '[class*="permission"]',
                    '[class*="approval"]',
                    '[class*="confirm"]',
                ].join(','));

                for (const container of containers) {{
                    const btns = Array.from(container.querySelectorAll('button, .monaco-button, [role="button"]'));
                    for (const b of btns) {{
                        const m = scoreButton(b);
                        if (m) {{ b.click(); return {{ clicked: true, via: 'dialog_container', target: m.label }}; }}
                    }}
                }}

                // Priority 2: shadow DOM traversal
                const shadowBtns = [];
                collectFromShadow(document, shadowBtns);
                for (const b of shadowBtns) {{
                    const m = scoreButton(b);
                    if (m) {{ b.click(); return {{ clicked: true, via: 'shadow_dom', target: m.label }}; }}
                }}

                // Priority 3: global flat scan (all buttons, visible only)
                const allBtns = Array.from(document.querySelectorAll('button, .monaco-button, [role="button"]'));
                const visible = allBtns.filter(b => {{
                    const rect = b.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }});
                for (const b of visible) {{
                    const m = scoreButton(b);
                    if (m) {{ b.click(); return {{ clicked: true, via: 'global_scan', target: m.label }}; }}
                }}

                // Diagnostics: return what we found so we can tune
                const allLabels = visible.slice(0, 30).map(b =>
                    (b.innerText || b.textContent || '').trim().substring(0, 40)
                ).filter(Boolean);
                return {{ clicked: false, found_buttons: allLabels }};
            }})()
            """
            await ws.send(json.dumps({
                "id": 220,
                "method": "Runtime.evaluate",
                "params": {"expression": click_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
            res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            clicked = bool(res.get("clicked"))

            # Keyboard fallback: Enter = allow/accept, Escape = deny
            if not clicked:
                is_allow = "allow" in decision.lower() or "accept" in decision.lower()
                key = "Enter" if is_allow else "Escape"
                vk = 13 if is_allow else 27
                for ev_type in ("rawKeyDown", "keyUp"):
                    await ws.send(json.dumps({
                        "id": 221,
                        "method": "Input.dispatchKeyEvent",
                        "params": {
                            "type": ev_type,
                            "key": key,
                            "code": "Enter" if is_allow else "Escape",
                            "windowsVirtualKeyCode": vk,
                            "nativeVirtualKeyCode": vk
                        }
                    }))
                    await asyncio.wait_for(ws.recv(), timeout=1.5)

                logger.info(
                    "CDP approval button not found; dispatched keyboard fallback '%s'. Visible buttons: %s",
                    key, res.get("found_buttons", [])
                )

            return {
                "success": True,
                "clicked": clicked,
                "via": res.get("via", "keyboard_fallback" if not clicked else None),
                "target": res.get("target"),
                "found_buttons": res.get("found_buttons", []),
                "requires_native_ide": False,
                "message": "Action forwarded to IDE" if clicked else f"Sent keyboard fallback to IDE"
            }
    except Exception as exc:
        logger.error("Failed to forward approval via CDP: %s", str(exc))
        return {"success": False, "requires_native_ide": True, "error": str(exc)}


async def dispatch_switch_model(target_url: str, target_model: str) -> Dict[str, Any]:
    """Switch active model in Antigravity IDE by clicking matching menu item."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10*1024*1024, close_timeout=3) as ws:
            switch_js = f"""
            (async () => {{
                const target = {json.dumps(target_model.lower())};
                const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return {{ success: false, error: 'Model button not found' }};
                btn.click();
                await new Promise(r => setTimeout(r, 450));

                const items = Array.from(document.querySelectorAll('[role="menuitem"]:not(.menubar-menu-button)'));
                const match = items.find(i => i.innerText.toLowerCase().includes(target));
                if (match) {{
                    match.click();
                    return {{ success: true, selected: match.innerText.split('\\n')[0].trim() }};
                }}
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }}));
                return {{ success: false, error: 'Model option not in current plan' }};
            }})()
            """
            await ws.send(json.dumps({
                "id": 230,
                "method": "Runtime.evaluate",
                "params": {"expression": switch_js, "awaitPromise": True, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
            return reply.get("result", {}).get("result", {}).get("value", {})
    except Exception as exc:
        logger.error("Failed to switch model via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_read_model(target_url: str, force_full_scan: bool = False) -> Dict[str, Any]:
    """Passively read current model from Antigravity IDE UI via CDP."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10*1024*1024, close_timeout=3) as ws:
            passive_js = r"""
            (() => {
                const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return null;
                const aria = btn.getAttribute('aria-label') || '';
                const m = aria.match(/current:\s*([^,]+)/i);
                return m ? m[1].trim() : btn.innerText.trim();
            })()
            """
            await ws.send(json.dumps({
                "id": 240,
                "method": "Runtime.evaluate",
                "params": {"expression": passive_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            cur = reply.get("result", {}).get("result", {}).get("value")
            return {"model": cur}
    except Exception as exc:
        logger.warning("CDP read model failed: %s", str(exc))
        return {"model": None}
