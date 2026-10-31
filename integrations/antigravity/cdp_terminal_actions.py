"""CDP Terminal Task Automation Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("integrations.antigravity.cdp_terminal_actions")


async def dispatch_toggle_terminal(target_url: str) -> Dict[str, Any]:
    """
    Click [data-tooltip-id="tooltip-terminal"] in Antigravity IDE workbench via CDP,
    wait for DOM transition, and return active terminal task rows.
    """
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            toggle_js = r"""
            (async () => {
                const btn = document.querySelector('[data-tooltip-id="tooltip-terminal"]');
                if (btn) {
                    btn.click();
                    await new Promise(r => setTimeout(r, 220));
                }

                // Query terminal rows whether expanded or already present
                const taskNodes = Array.from(document.querySelectorAll('[data-tooltip-id^="terminal-expanded-content"]'));
                const rows = taskNodes.map((el, i) => {
                    const tooltipId = el.getAttribute('data-tooltip-id') || `terminal-expanded-content--${i}`;
                    const row = el.closest('.flex-row') || el.parentElement;
                    const fontMono = row ? row.querySelector('.font-mono') : null;
                    const commandText = fontMono ? (fontMono.innerText || fontMono.textContent || '').trim() : '';
                    const hasLoader = Boolean(row && (row.querySelector('.loader') || row.querySelector('.animate-spin') || row.querySelector('span[class*="loader"]')));
                    return {
                        index: i,
                        tooltip_id: tooltipId,
                        command: commandText,
                        is_running: hasLoader
                    };
                });

                return {
                    success: true,
                    toggled: Boolean(btn),
                    tasks: rows
                };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 250,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": toggle_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.5))
            val = reply.get("result", {}).get("result", {}).get("value")
            return val or {"success": True, "toggled": False, "tasks": []}
    except Exception as exc:
        logger.warning("CDP toggle terminal failed: %s", str(exc))
        return {"success": False, "error": str(exc), "tasks": []}


async def dispatch_get_terminal_tasks(target_url: str) -> Dict[str, Any]:
    """
    Passively query Antigravity IDE workbench for currently displayed terminal tasks.
    """
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            query_js = r"""
            (() => {
                const taskNodes = Array.from(document.querySelectorAll('[data-tooltip-id^="terminal-expanded-content"]'));
                const rows = taskNodes.map((el, i) => {
                    const tooltipId = el.getAttribute('data-tooltip-id') || `terminal-expanded-content--${i}`;
                    const row = el.closest('.flex-row') || el.parentElement;
                    const fontMono = row ? row.querySelector('.font-mono') : null;
                    const commandText = fontMono ? (fontMono.innerText || fontMono.textContent || '').trim() : '';
                    const hasLoader = Boolean(row && (row.querySelector('.loader') || row.querySelector('.animate-spin') || row.querySelector('span[class*="loader"]')));
                    return {
                        index: i,
                        tooltip_id: tooltipId,
                        command: commandText,
                        is_running: hasLoader
                    };
                });
                return {
                    success: true,
                    tasks: rows
                };
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 251,
                        "method": "Runtime.evaluate",
                        "params": {"expression": query_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            val = reply.get("result", {}).get("result", {}).get("value")
            return val or {"success": True, "tasks": []}
    except Exception as exc:
        logger.warning("CDP get terminal tasks failed: %s", str(exc))
        return {"success": False, "error": str(exc), "tasks": []}


async def dispatch_kill_terminal_task(
    target_url: str, index: int = 0, tooltip_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Click the specific close button on a terminal task row in Antigravity IDE workbench.
    """
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10 * 1024 * 1024, close_timeout=3) as ws:
            target_tooltip = tooltip_id or f"terminal-expanded-content--{index}"
            kill_js = f"""
            (async () => {{
                const targetId = {json.dumps(target_tooltip)};
                const targetIndex = {index};
                let btn = null;

                const wrapper = document.querySelector(`[data-tooltip-id="${{targetId}}"]`);
                if (wrapper) {{
                    btn = wrapper.querySelector('button') || wrapper;
                }}

                if (!btn) {{
                    const allWrappers = Array.from(document.querySelectorAll('[data-tooltip-id^="terminal-expanded-content"]'));
                    if (allWrappers[targetIndex]) {{
                        btn = allWrappers[targetIndex].querySelector('button') || allWrappers[targetIndex];
                    }}
                }}

                if (btn) {{
                    btn.click();
                    await new Promise(r => setTimeout(r, 200));
                    return {{ success: true, killed: true, target: targetId }};
                }}
                return {{ success: false, error: 'Terminal task close button not found for ' + targetId }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 252,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": kill_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
            val = reply.get("result", {}).get("result", {}).get("value")
            return val or {"success": False, "error": "Evaluation returned null"}
    except Exception as exc:
        logger.warning("CDP kill terminal task failed: %s", str(exc))
        return {"success": False, "error": str(exc)}

