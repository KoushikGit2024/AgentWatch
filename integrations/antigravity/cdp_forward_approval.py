"""CDP Forward Approval Dispatcher."""

import asyncio
import json
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger("integrations.antigravity.cdp_forward_approval")

async def dispatch_forward_approval(
    target_url: str,
    request_type: str,
    decision: str,
    custom_response: Optional[str] = None,
    option_label: Optional[str] = None,
) -> Dict[str, Any]:
    """Forward user approval decision to Antigravity IDE workbench by clicking dialog button.

    Strategy (in priority order):
    1. Exact / ranked match inside dialog/modal/notification/chat-card containers
    2. Split-button dropdown expansion when 'always_allow' is inside a secondary menu
    3. Shadow DOM traversal for web-component hosted dialogs
    4. Scoped visible button scan (excluding global IDE toolbar false positives)
    5. Keyboard fallback (Enter = allow, Escape = deny)
    6. Optional custom instructions dispatch if user provided custom_response
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            click_js = f"""
            (async () => {{
                const dec = {json.dumps(decision.lower().strip())};
                const explicitLabel = {json.dumps((option_label or "").lower().strip())};
                const isAlwaysAllow = dec === 'always_allow' || dec.includes('always');
                const isAllow = !isAlwaysAllow && (dec === 'allow' || dec.includes('allow') || dec.includes('accept') || dec.includes('run') || dec.includes('approve'));
                const isDeny = dec === 'deny' || dec.includes('deny') || dec.includes('reject') || dec.includes('cancel') || dec.includes('decline');

                function isVisible(b) {{
                    if (!b || b.disabled) return false;
                    const rect = b.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    const style = window.getComputedStyle(b);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                }}

                function scoreButton(b) {{
                    if (!isVisible(b)) return null;
                    const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                    const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
                    const title = (b.title || '').trim().toLowerCase();
                    const primary = txt || aria || title;
                    if (!primary || primary.length > 65) return null;

                    // Exclude unrelated IDE chrome buttons
                    if (primary.includes('select model') || primary.includes('send message') || primary.includes('new chat') || primary.includes('settings')) {{
                        return null;
                    }}

                    // 1. Explicit option label match (from dynamic popup options)
                    if (explicitLabel) {{
                        if (txt === explicitLabel || aria === explicitLabel) return {{ score: 120, label: txt || aria }};
                        if (primary.includes(explicitLabel)) return {{ score: 95, label: txt || aria }};
                    }}

                    // 2. Always Allow / Always Run
                    if (isAlwaysAllow) {{
                        const alwaysExact = [
                            'always allow', 'always run', 'allow all', 'always accept',
                            'allow for this session', 'always approve', 'always trust',
                            'always authorize', 'remember this choice and allow'
                        ];
                        for (const t of alwaysExact) {{
                            if (txt === t || aria === t) return {{ score: 110, label: txt || aria }};
                            if (primary.includes(t)) return {{ score: 90, label: txt || aria }};
                        }}
                        // Match native Antigravity IDE "Yes, and always allow '...'" option
                        if (primary.startsWith('yes, and always allow') || primary.includes('always allow')) {{
                            return {{ score: 115, label: txt || aria }};
                        }}
                        return null;
                    }}

                    // 3. Single Allow / Run / Accept / Open Link / Trust / Execute
                    if (isAllow) {{
                        if (primary.includes('always')) return null;
                        const exactAllow = [
                            'yes, allow this time', 'allow this time', 'allow', 'run', 'run command',
                            'accept', 'approve', 'yes', 'continue', 'confirm', 'execute', 'open',
                            'open link', 'open external link', 'open external website', 'trust',
                            'trust workspace', 'authorize', 'authorize browser', 'run in terminal', 'proceed'
                        ];
                        for (const t of exactAllow) {{
                            if (txt === t || aria === t) return {{ score: 100, label: txt || aria }};
                        }}
                        for (const t of exactAllow) {{
                            if (primary.startsWith(t + ' ') || primary.includes(t)) return {{ score: 75, label: txt || aria }};
                        }}
                        return null;
                    }}

                    // 4. Deny / Reject / Cancel / Don't Open / Don't Trust
                    if (isDeny) {{
                        const exactDeny = [
                            'no', 'deny', 'reject', 'cancel', 'decline', 'block', 'refuse', 'skip',
                            'don\'t open', 'dont open', 'don\'t trust', 'dont trust', 'dismiss'
                        ];
                        for (const t of exactDeny) {{
                            if (txt === t || aria === t) return {{ score: 100, label: txt || aria }};
                        }}
                        for (const t of exactDeny) {{
                            if (primary === t || primary.startsWith(t + ' ') || primary.includes(t)) return {{ score: 75, label: txt || aria }};
                        }}
                        return null;
                    }}

                    // 5. Fallback custom decision string match
                    if (txt === dec || aria === dec) return {{ score: 100, label: txt || aria }};
                    if (primary.includes(dec)) return {{ score: 70, label: txt || aria }};
                    return null;
                }}

                function pickBestButton(buttons) {{
                    let best = null;
                    for (const b of buttons) {{
                        const m = scoreButton(b);
                        if (m && (!best || m.score > best.score)) {{
                            best = {{ button: b, score: m.score, label: m.label }};
                        }}
                    }}
                    return best;
                }}

                // Collect buttons from shadow DOM recursively
                function collectFromShadow(root, acc) {{
                    if (!root) return;
                    const els = root.querySelectorAll('button, .monaco-button, [role="button"], [role="menuitem"], .monaco-list-row');
                    els.forEach(e => acc.push(e));
                    root.querySelectorAll('*').forEach(el => {{
                        if (el.shadowRoot) collectFromShadow(el.shadowRoot, acc);
                    }});
                }}

                // Priority 1: Scoped dialog/modal/notification/chat-card containers
                const containerSelectors = [
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
                    '[class*="command"]',
                    '[class*="tool"]'
                ];
                // Priority 1: Check native Antigravity IDE approval card ([role="radiogroup"])
                const allGroups = Array.from(document.querySelectorAll('[role="radiogroup"]'));
                const radioGroup = allGroups.reverse().find(rg => isVisible(rg)) || document.querySelector('[role="radiogroup"]');
                if (radioGroup) {{
                    const card = radioGroup.closest('.bg-ide-editor-background, [class*="rounded-2xl"]') || radioGroup.parentElement;
                    const radioLabels = Array.from(radioGroup.querySelectorAll('label'));

                    let targetRadio = null;
                    if (explicitLabel) {{
                        targetRadio = radioLabels.find(l => (l.innerText || '').toLowerCase().includes(explicitLabel));
                    }}
                    if (!targetRadio) {{
                        if (isAlwaysAllow) {{
                            targetRadio = radioLabels.find(l => (l.innerText || '').toLowerCase().includes('always allow'));
                        }} else if (isAllow) {{
                            targetRadio = radioLabels.find(l => {{
                                const txt = (l.innerText || '').toLowerCase();
                                return (txt.includes('allow this time') || txt.includes('yes, allow') || txt.startsWith('yes')) && !txt.includes('always allow');
                            }});
                        }} else if (isDeny) {{
                            // Priority match for write_in (Option 4) if custom instructions are provided
                            if (custom_response && custom_response.trim()) {{
                                targetRadio = radioLabels.find(l => Boolean(l.querySelector('textarea, [data-testid="ask-question-writein"], input[value*="write_in"]')));
                            }}
                            if (!targetRadio) {{
                                targetRadio = radioLabels.find(l => {{
                                    const txt = (l.innerText || '').toLowerCase();
                                    return txt.startsWith('no') || txt.includes('tell the agent');
                                }});
                            }}
                        }}
                    }}

                    if (targetRadio) {{
                        const input = targetRadio.querySelector('input[type="radio"]') || targetRadio;
                        try {{
                            input.checked = true;
                            input.click();
                            input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                            input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        }} catch (e) {{}}
                        await new Promise(r => setTimeout(r, 150));

                        // If user provided custom denial instructions or alternative commands (Option 4 write-in)
                        let writeInInjected = false;
                        if (custom_response && custom_response.trim()) {{
                            const writeIn = targetRadio.querySelector('textarea, [data-testid="ask-question-writein"]') || 
                                            card.querySelector('textarea[data-testid="ask-question-writein"]') ||
                                            card.querySelector('label:has(input[value*="write_in"]) textarea, textarea');
                            if (writeIn) {{
                                writeIn.focus();
                                writeIn.value = custom_response.trim();
                                writeIn.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                writeIn.dispatchEvent(new Event('change', {{ bubbles: true }}));
                                writeInInjected = true;
                                await new Promise(r => setTimeout(r, 120));
                            }}
                        }}

                        // Click the card submit button: [data-testid="interaction-continue-button"]
                        const submitBtn = card ? card.querySelector('[data-testid="interaction-continue-button"]') : document.querySelector('[data-testid="interaction-continue-button"]');
                        if (submitBtn && isVisible(submitBtn)) {{
                            submitBtn.disabled = false;
                            submitBtn.click();
                            
                            // Handshake receipt: wait up to 600ms to confirm the card disappears or finishes
                            let receiptConfirmed = false;
                            for (let poll = 0; poll < 6; poll++) {{
                                await new Promise(r => setTimeout(r, 100));
                                if (!isVisible(radioGroup) || !isVisible(submitBtn) || !document.contains(radioGroup)) {{
                                    receiptConfirmed = true;
                                    break;
                                }}
                            }}

                            return {{
                                clicked: true,
                                receipt_confirmed: receiptConfirmed,
                                via: 'native_approval_card',
                                writein_injected: writeInInjected,
                                target: (targetRadio.innerText || '').trim().split('\n')[0]
                            }};
                        }}
                    }}
                }}

                // Priority 1b: Check native Antigravity IDE browser permission prompt
                const browserPermP = Array.from(document.querySelectorAll('p')).find(p => isVisible(p) && /Agent needs permission to act on/i.test(p.innerText || ''));
                if (browserPermP) {{
                    const permCard = browserPermP.closest('.flex.w-full, .flex-col, [class*="rounded"]') || browserPermP.parentElement;
                    const buttons = Array.from(permCard.querySelectorAll('button')).filter(isVisible);

                    if (isDeny) {{
                        const denyBtn = buttons.find(b => (b.innerText || '').trim().toLowerCase() === 'deny');
                        if (denyBtn) {{
                            denyBtn.click();
                            return {{ clicked: true, via: 'browser_permission_deny', target: 'Deny' }};
                        }}
                    }}

                    if (isAlwaysAllow) {{
                        const alwaysBtn = buttons.find(b => (b.innerText || '').trim().toLowerCase().includes('always allow'));
                        if (alwaysBtn) {{
                            alwaysBtn.click();
                            return {{ clicked: true, via: 'browser_permission_always_allow', target: 'Always Allow' }};
                        }}
                    }}

                    if (isAllow) {{
                        // Check if there is an 'Allow this time' directly or via dropdown
                        const allowThisTimeBtn = buttons.find(b => (b.innerText || '').trim().toLowerCase().includes('allow this time'));
                        if (allowThisTimeBtn) {{
                            allowThisTimeBtn.click();
                            return {{ clicked: true, via: 'browser_permission_allow_this_time', target: 'Allow this time' }};
                        }}

                        // Check the split-button dropdown chevron for 'Allow this time'
                        const moreActionsBtn = buttons.find(b => b.getAttribute('aria-label') === 'More actions' || b.getAttribute('aria-haspopup') === 'menu');
                        if (moreActionsBtn) {{
                            moreActionsBtn.click();
                            await new Promise(r => setTimeout(r, 150));
                            const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button, [class*="menu-item"]')).filter(isVisible);
                            const allowItem = menuItems.find(m => /(allow this time|allow once|allow)/i.test(m.innerText || ''));
                            if (allowItem) {{
                                allowItem.click();
                                return {{ clicked: true, via: 'browser_permission_menu_allow', target: 'Allow this time' }};
                            }}
                        }}

                        // Fallback: click Always Allow if no dropdown options
                        const alwaysBtn = buttons.find(b => (b.innerText || '').trim().toLowerCase().includes('always allow'));
                        if (alwaysBtn) {{
                            alwaysBtn.click();
                            return {{ clicked: true, via: 'browser_permission_always_allow_fallback', target: 'Always Allow' }};
                        }}
                    }}
                }}

                const containerBtns = [];
                for (const container of containers) {{
                    // If isAlwaysAllow was chosen, check if there is an unselected 'Remember my choice' / 'Always allow' checkbox inside the dialog
                    if (isAlwaysAllow) {{
                        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).filter(isVisible);
                        for (const cb of checkboxes) {{
                            const isChecked = cb.checked || cb.getAttribute('aria-checked') === 'true';
                            if (!isChecked) {{
                                cb.click();
                                await new Promise(r => setTimeout(r, 60));
                            }}
                        }}
                    }}
                    container.querySelectorAll('button, .monaco-button, [role="button"], .monaco-list-row').forEach(b => containerBtns.push(b));
                }}
                const bestInContainer = pickBestButton(containerBtns);
                if (bestInContainer) {{
                    bestInContainer.button.click();
                    return {{ clicked: true, via: 'dialog_container', target: bestInContainer.label }};
                }}

                // Priority 1b: If 'always_allow' was requested and not immediately visible, check for a split-button dropdown chevron next to Allow/Run
                if (isAlwaysAllow) {{
                    const splitDrops = Array.from(document.querySelectorAll(
                        '.monaco-dropdown-button, button[aria-label*="More"], button[aria-haspopup="true"], [class*="dropdown-trigger"]'
                    )).filter(isVisible);
                    for (const drop of splitDrops) {{
                        drop.click();
                        await new Promise(r => setTimeout(r, 180));
                        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], .action-item, button, .monaco-button')).filter(isVisible);
                        const bestMenu = pickBestButton(menuItems);
                        if (bestMenu) {{
                            bestMenu.button.click();
                            return {{ clicked: true, via: 'split_dropdown_menu', target: bestMenu.label }};
                        }}
                    }}
                }}

                // Priority 2: Shadow DOM traversal
                const shadowBtns = [];
                collectFromShadow(document, shadowBtns);
                const bestInShadow = pickBestButton(shadowBtns);
                if (bestInShadow) {{
                    bestInShadow.button.click();
                    return {{ clicked: true, via: 'shadow_dom', target: bestInShadow.label }};
                }}

                // Priority 3: Global visible button scan (scored)
                const allBtns = Array.from(document.querySelectorAll('button, .monaco-button, [role="button"]')).filter(isVisible);
                const bestGlobal = pickBestButton(allBtns);
                if (bestGlobal) {{
                    bestGlobal.button.click();
                    return {{ clicked: true, via: 'global_scan', target: bestGlobal.label }};
                }}

                // Priority 4: If 'always_allow' wasn't a separate button, fall back to clicking single 'allow'/'run' button
                if (isAlwaysAllow) {{
                    for (const b of allBtns) {{
                        const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                        if (txt === 'allow' || txt === 'run' || txt === 'accept' || txt === 'run command') {{
                            b.click();
                            return {{ clicked: true, via: 'always_allow_fallback_to_allow', target: txt }};
                        }}
                    }}
                }}

                const allLabels = allBtns.slice(0, 30).map(b =>
                    (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().substring(0, 40)
                ).filter(Boolean);
                return {{ clicked: false, found_buttons: allLabels }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 220,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": click_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.5))
            res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            clicked = bool(res.get("clicked"))

            # Keyboard fallback: Enter = allow/accept, Escape = deny
            if not clicked:
                is_allow = (
                    "allow" in decision.lower()
                    or "accept" in decision.lower()
                    or "run" in decision.lower()
                )
                key = "Enter" if is_allow else "Escape"
                vk = 13 if is_allow else 27
                for ev_type in ("rawKeyDown", "keyUp"):
                    await ws.send(
                        json.dumps(
                            {
                                "id": 221,
                                "method": "Input.dispatchKeyEvent",
                                "params": {
                                    "type": ev_type,
                                    "key": key,
                                    "code": "Enter" if is_allow else "Escape",
                                    "windowsVirtualKeyCode": vk,
                                    "nativeVirtualKeyCode": vk,
                                },
                            }
                        )
                    )
                    await asyncio.wait_for(ws.recv(), timeout=1.5)

                logger.info(
                    "CDP approval button not found; dispatched keyboard fallback '%s'. Visible buttons: %s",
                    key,
                    res.get("found_buttons", []),
                )

        # If the user also provided custom instructions, only fall back to typing in the composer
        # if the card didn't already have an inline Option 4 write-in textarea
        custom_dispatch = None
        if custom_response and custom_response.strip() and not res.get("writein_injected"):
            await asyncio.sleep(0.25)
            custom_dispatch = await dispatch_send_prompt(target_url, custom_response.strip())

        receipt_confirmed = bool(res.get("receipt_confirmed", clicked))
        return {
            "success": True,
            "clicked": clicked,
            "receipt_confirmed": receipt_confirmed,
            "via": res.get("via", "keyboard_fallback" if not clicked else None),
            "target": res.get("target"),
            "found_buttons": res.get("found_buttons", []),
            "custom_response_dispatched": bool(custom_dispatch and custom_dispatch.get("success")),
            "requires_native_ide": False,
            "message": "Action forwarded to IDE" if clicked else "Sent keyboard fallback to IDE",
        }
    except Exception as exc:
        logger.error("Failed to forward approval via CDP: %s", str(exc))
        return {"success": False, "requires_native_ide": False, "error": str(exc)}


