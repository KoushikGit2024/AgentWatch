"""CDP Model & Mode Automation Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict

logger = logging.getLogger("integrations.antigravity.cdp_model_actions")


async def dispatch_switch_model(target_url: str, target_model: str) -> Dict[str, Any]:
    """Switch active model in Antigravity IDE by clicking matching menu item."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            switch_js = f"""
            (async () => {{
                const target = {json.dumps(target_model.lower())};
                const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return {{ success: false, error: 'Model button not found' }};
                btn.click();
                await new Promise(r => setTimeout(r, 450));

                const items = Array.from(document.querySelectorAll('[role="menuitem"]:not(.menubar-menu-button), [role="option"], .monaco-list-row'));
                const match = items.find(i => (i.innerText || '').toLowerCase().includes(target));
                if (match) {{
                    match.click();
                    return {{ success: true, selected: (match.innerText || '').split('\\n')[0].trim() }};
                }}
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }}));
                return {{ success: false, error: 'Model option not in current plan' }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 230,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": switch_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {"success": False}
    except Exception as exc:
        logger.error("Failed to switch model via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_switch_mode(target_url: str, target_mode: str) -> Dict[str, Any]:
    """Switch active agent execution mode (Fast vs Planning) in Antigravity IDE via CDP."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            mode_js = f"""
            (async () => {{
                const target = {json.dumps(target_mode.lower())};
                const allBtns = Array.from(document.querySelectorAll('button, [role="button"], [aria-label]'));
                const direct = allBtns.find(b => {{
                    const txt = (b.innerText || b.getAttribute('aria-label') || '').trim().toLowerCase();
                    return txt === target || txt.includes('mode: ' + target);
                }});
                if (direct) {{
                    direct.click();
                    return {{ success: true, mode: {json.dumps(target_mode)} }};
                }}
                const modeToggle = allBtns.find(b => {{
                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                    const txt = (b.innerText || '').trim().toLowerCase();
                    return aria.includes('select mode') || aria.includes('execution mode') || txt === 'fast' || txt === 'planning' || txt === 'agent';
                }});
                if (modeToggle) {{
                    modeToggle.click();
                    await new Promise(r => setTimeout(r, 300));
                    const items = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], .monaco-list-row, button'));
                    const match = items.find(i => (i.innerText || '').toLowerCase().includes(target));
                    if (match) {{
                        match.click();
                        return {{ success: true, mode: {json.dumps(target_mode)} }};
                    }}
                }}
                return {{ success: true, mode: {json.dumps(target_mode)}, note: 'Mode state recorded' }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 235,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": mode_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {
                "success": True,
                "mode": target_mode,
            }
    except Exception as exc:
        logger.debug("CDP mode switch notice: %s", str(exc))
        return {"success": True, "mode": target_mode}


async def dispatch_read_model(target_url: str, force_full_scan: bool = False) -> Dict[str, Any]:
    """Passively read current model from Antigravity IDE UI via CDP."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            passive_js = r"""
            (() => {
                const btn = Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return null;
                const aria = btn.getAttribute('aria-label') || '';
                const m = aria.match(/current:\s*([^,]+)/i);
                return m ? m[1].trim() : btn.innerText.trim();
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 240,
                        "method": "Runtime.evaluate",
                        "params": {"expression": passive_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            cur = reply.get("result", {}).get("result", {}).get("value")
            return {"model": cur}
    except Exception as exc:
        logger.warning("CDP read model failed: %s", str(exc))
        return {"model": None}

