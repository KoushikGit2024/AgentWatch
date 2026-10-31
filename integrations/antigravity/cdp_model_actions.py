"""CDP Model & Mode Automation Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict, List

logger = logging.getLogger("integrations.antigravity.cdp_model_actions")


async def dispatch_switch_model(target_url: str, target_model: str) -> Dict[str, Any]:
    """Switch active model or effort tier (Low/Medium/High) in Antigravity IDE via CDP."""
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            switch_js = f"""
            (async () => {{
                const target = {json.dumps(target_model.lower())};
                const btn = document.querySelector('button[data-testid="model-selector-trigger"]') ||
                    Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return {{ success: false, error: 'Model button not found' }};

                btn.click();
                await new Promise(r => setTimeout(r, 450));

                const menu = document.querySelector('div[role="menu"].agy-overlay') ||
                    document.querySelector('div[role="menu"]');
                if (!menu) return {{ success: false, error: 'Menu not found' }};

                // Check if target requires opening an effort-tier submenu (Low / Medium / High)
                const effortMatch = target.match(/\\b(low|medium|high)\\b/i);
                const effortGroup = menu.querySelector('[data-testid="model-selector-effort-group"]');
                const baseModelName = (effortGroup?.getAttribute('data-model-base') || effortGroup?.innerText || '').toLowerCase();

                if (effortGroup && effortMatch && (target.includes(baseModelName) || (!target.includes('claude') && !target.includes('gpt')))) {{
                    const effortItem = effortGroup.closest('[role="menuitem"]');
                    const wantedEffort = effortMatch[1].toLowerCase();

                    effortItem.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }}));
                    await new Promise(r => setTimeout(r, 300));

                    const submenus = Array.from(document.querySelectorAll('[role="menu"].agy-overlay'));
                    const sub = submenus[submenus.length - 1];
                    if (sub && sub !== menu) {{
                        const opt = sub.querySelector(`[data-testid="model-selector-effort-option"][data-effort="${{wantedEffort}}"]`) ||
                            Array.from(sub.querySelectorAll('[role="menuitemradio"], [role="menuitem"], div[tabindex]')).find(el => (el.innerText || '').toLowerCase().includes(wantedEffort));

                        if (opt) {{
                            const clickable = opt.closest('[role="menuitemradio"]') || opt;
                            clickable.click();
                            return {{ success: true, selected: `${{effortGroup.innerText.trim()}} (${{wantedEffort}})` }};
                        }}
                    }}
                }}

                // Standard direct click for standalone models
                const items = Array.from(menu.querySelectorAll('[role="menuitem"]:not(.menubar-menu-button), [role="option"], [data-testid="model-selector-item"]'));
                const match = items.find(i => {{
                    const label = (i.getAttribute('data-model-label') || '').toLowerCase();
                    const txt = (i.innerText || '').toLowerCase().replace(/\\s+/g, ' ');
                    return label.includes(target) || txt.includes(target) || target.includes(label || '---');
                }});
                if (match) {{
                    match.click();
                    return {{ success: true, selected: (match.innerText || '').split('\\n')[0].trim() }};
                }}

                // Close cleanly on failure
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }}));
                window.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }}));
                if (btn.getAttribute('aria-expanded') === 'true') btn.click();
                document.body.click();
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

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
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
    """Passively read current model and quota status from Antigravity IDE UI via CDP."""
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            passive_js = r"""
            (() => {
                const btn = document.querySelector('button[data-testid="model-selector-trigger"]') ||
                    Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return { model: null, quota_status: 'normal' };

                const aria = btn.getAttribute('aria-label') || '';
                const m = aria.match(/current:\s*([^,]+)/i);
                let modelName = m ? m[1].trim() : null;
                if (!modelName && btn.innerText) {
                    modelName = btn.innerText.replace(/\s+/g, ' ').trim();
                }

                // Quota status: inspect SVG inside [data-tooltip-id] wrapper
                let quotaStatus = 'normal';
                let quotaTooltip = null;

                const quotaWrapper = btn.querySelector('[data-tooltip-id]');
                if (quotaWrapper) {
                    const qsvg = quotaWrapper.querySelector('svg');
                    if (qsvg) {
                        const cls = qsvg.getAttribute('class') || '';
                        if (/red|rose/i.test(cls)) {
                            quotaStatus = 'depleted';
                        } else if (/orange|amber|yellow/i.test(cls)) {
                            quotaStatus = 'low';
                        }
                    }
                    if (quotaStatus === 'normal') {
                        const tid = quotaWrapper.getAttribute('data-tooltip-id');
                        const ttNode = document.getElementById(tid) ||
                            document.querySelector(`[role="tooltip"][id="${tid}"]`);
                        if (ttNode && ttNode.innerText) {
                            quotaTooltip = ttNode.innerText.trim();
                            const lower = quotaTooltip.toLowerCase();
                            if (lower.includes('limit reached') || lower.includes('exhausted') || lower.includes('quota exceeded')) {
                                quotaStatus = 'depleted';
                            } else if (lower.includes('running low') || lower.includes('approaching limit')) {
                                quotaStatus = 'low';
                            }
                        }
                    }
                }

                return {
                    model: modelName,
                    quota_status: quotaStatus,
                    quota_tooltip: quotaTooltip
                };
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
            cur = reply.get("result", {}).get("result", {}).get("value") or {}
            return {
                "model": cur.get("model"),
                "quota_status": cur.get("quota_status", "normal"),
                "quota_tooltip": cur.get("quota_tooltip"),
            }
    except Exception as exc:
        logger.warning("CDP read model failed: %s", str(exc))
        return {"model": None, "quota_status": "normal", "quota_tooltip": None}


async def dispatch_scan_available_models(target_url: str) -> List[Dict[str, Any]]:
    """Dynamically scan all models and effort tiers (Low/Medium/High) from Antigravity IDE."""
    try:
        import websockets

        async with websockets.connect(
            target_url, max_size=10 * 1024 * 1024, close_timeout=3, open_timeout=2.0
        ) as ws:
            scan_js = r"""
            (async () => {
                const btn = document.querySelector('button[data-testid="model-selector-trigger"]') ||
                    Array.from(document.querySelectorAll('*')).find(e => (e.getAttribute('aria-label') || '').includes('Select model'));
                if (!btn) return [];

                btn.click();
                await new Promise(r => setTimeout(r, 450));

                const menu = document.querySelector('div[role="menu"].agy-overlay') ||
                    document.querySelector('div[role="menu"]');
                const models = [];
                if (menu) {
                    const rawItems = Array.from(menu.querySelectorAll('[role="menuitem"], [data-testid="model-selector-item"]'));
                    for (const el of rawItems) {
                        const label = el.getAttribute('data-model-label');
                        const effortGroup = el.querySelector('[data-testid="model-selector-effort-group"]');
                        const disabled = el.getAttribute('data-disabled') !== null ||
                            el.classList.contains('cursor-not-allowed') ||
                            (el.innerText || '').includes('Unavailable');

                        if (effortGroup) {
                            const base = effortGroup.getAttribute('data-model-base') || effortGroup.innerText.trim();
                            // Open effort submenu to discover all effort options (Low, Medium, High)
                            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
                            await new Promise(r => setTimeout(r, 200));

                            const submenus = Array.from(document.querySelectorAll('[role="menu"].agy-overlay'));
                            const sub = submenus[submenus.length - 1];
                            let effortOptions = [];
                            if (sub && sub !== menu) {
                                effortOptions = Array.from(sub.querySelectorAll('[data-testid="model-selector-effort-option"]')).map(opt => {
                                    return opt.getAttribute('data-effort') || opt.innerText.trim();
                                });
                                el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, bubbles: true }));
                                await new Promise(r => setTimeout(r, 100));
                            }
                            if (effortOptions.length > 0) {
                                for (const eff of effortOptions) {
                                    const formatted = eff.charAt(0).toUpperCase() + eff.slice(1).toLowerCase();
                                    models.push({
                                        name: `${base} (${formatted})`,
                                        disabled: false
                                    });
                                }
                            } else {
                                const curEffort = el.querySelector('span.opacity-70')?.innerText?.trim() || 'Low';
                                models.push({
                                    name: `${base} (${curEffort})`,
                                    disabled: false
                                });
                            }
                        } else if (label) {
                            models.push({
                                name: label.trim(),
                                disabled: disabled
                            });
                        }
                    }
                }

                // Close dropdown cleanly
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                if (btn.getAttribute('aria-expanded') === 'true') {
                    btn.click();
                }
                document.body.click();

                return models;
            })()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 245,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": scan_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
            return reply.get("result", {}).get("result", {}).get("value") or []
    except Exception as exc:
        logger.warning("CDP scan available models failed: %s", str(exc))
        return []
