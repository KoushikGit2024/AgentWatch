"""CDP Terminal & Background Tasks Automation Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("integrations.antigravity.cdp_terminal_actions")


async def dispatch_toggle_terminal(target_url: str) -> Dict[str, Any]:
    """
    Toggle or expand running items panel in Antigravity IDE and return tasks.
    """
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            toggle_js = r"""
            (async () => {
                const toggle = document.querySelector('button[data-testid="running-items-panel-toggle"]') ||
                    document.querySelector('[data-tooltip-id="tooltip-terminal"]');
                let toggled = false;

                if (toggle) {
                    toggle.click();
                    toggled = true;
                    await new Promise(r => setTimeout(r, 250));
                }

                // Query task rows from current IDE DOM structure
                const rows = [];
                const panel = document.querySelector('[data-testid="running-items-panel"]');
                if (panel) {
                    const rowNodes = Array.from(panel.querySelectorAll('[data-tooltip-id^="label-task-"]'));
                    rowNodes.forEach((labelEl, i) => {
                        const row = labelEl.closest('.flex') || labelEl.parentElement;
                        const stopBtn = row?.querySelector('button[aria-label="Stop Task"]') || row?.querySelector('[data-tooltip-id^="stop-task-"]');
                        const statusSvg = row?.querySelector('[data-testid="status-task-running"]');

                        const command = (labelEl?.innerText || labelEl?.textContent || '').trim();
                        const stopTooltip = stopBtn?.getAttribute('data-tooltip-id');
                        const labelTooltip = labelEl?.getAttribute('data-tooltip-id');
                        const id = stopTooltip || labelTooltip || `task-${i}`;

                        if (command) {
                            rows.push({
                                index: i,
                                tooltip_id: id,
                                command: command,
                                is_running: Boolean(statusSvg || stopBtn)
                            });
                        }
                    });
                }

                return {
                    success: true,
                    toggled: toggled,
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
    Passively query Antigravity IDE workbench for currently running tasks and processes.
    """
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            query_js = r"""
            (() => {
                const rows = [];
                const panel = document.querySelector('[data-testid="running-items-panel"]');
                if (panel) {
                    const rowNodes = Array.from(panel.querySelectorAll('[data-tooltip-id^="label-task-"]'));
                    rowNodes.forEach((labelEl, i) => {
                        const row = labelEl.closest('.flex') || labelEl.parentElement;
                        const stopBtn = row?.querySelector('button[aria-label="Stop Task"]') || row?.querySelector('[data-tooltip-id^="stop-task-"]');
                        const statusSvg = row?.querySelector('[data-testid="status-task-running"]');

                        const command = (labelEl?.innerText || labelEl?.textContent || '').trim();
                        const stopTooltip = stopBtn?.getAttribute('data-tooltip-id');
                        const labelTooltip = labelEl?.getAttribute('data-tooltip-id');
                        const id = stopTooltip || labelTooltip || `task-${i}`;

                        if (command) {
                            rows.push({
                                index: i,
                                tooltip_id: id,
                                command: command,
                                is_running: Boolean(statusSvg || stopBtn)
                            });
                        }
                    });
                }
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
    Click the Stop Task button on a specific running item row in Antigravity IDE workbench.
    """
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            target_tooltip = tooltip_id or ""
            kill_js = f"""
            (async () => {{
                const targetId = {json.dumps(target_tooltip)};
                const targetIndex = {index};
                let btn = null;

                // 1. Try finding by target tooltip id (e.g. stop-task-21501 or label-task-21501)
                if (targetId) {{
                    const directBtn = document.querySelector(`button[data-tooltip-id="${{targetId}}"]`);
                    if (directBtn) {{
                        btn = directBtn;
                    }} else {{
                        // Maybe targetId is label-task-..., find sibling or parent stop button
                        const labelNode = document.querySelector(`[data-tooltip-id="${{targetId}}"]`);
                        if (labelNode) {{
                            const row = labelNode.closest('.group') || labelNode.closest('.flex') || labelNode.parentElement;
                            btn = row?.querySelector('button[aria-label="Stop Task"]') || row?.querySelector('[data-tooltip-id^="stop-task-"]');
                        }}
                    }}
                }}

                // 2. Fallback by index among all Stop Task buttons in panel
                if (!btn) {{
                    const stopBtns = Array.from(document.querySelectorAll('[data-testid="running-items-panel"] button[aria-label="Stop Task"], [data-testid="running-items-panel"] [data-tooltip-id^="stop-task-"]'));
                    if (stopBtns[targetIndex]) {{
                        btn = stopBtns[targetIndex];
                    }} else if (stopBtns.length > 0) {{
                        btn = stopBtns[0];
                    }}
                }}

                if (btn) {{
                    btn.click();
                    await new Promise(r => setTimeout(r, 200));
                    return {{ success: true, killed: true, target: targetId }};
                }}
                return {{ success: false, error: 'Stop Task button not found for ' + (targetId || targetIndex) }};
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
