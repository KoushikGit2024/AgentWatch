"""CDP Question Answering and Interactive Response Dispatchers."""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("integrations.antigravity.cdp_question_actions")

async def dispatch_answer_question(
    target_url: str,
    selected_labels: List[str],
    custom_response: Optional[str] = None,
    fallback_prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Answer an interactive agent question or multi-question modal in Antigravity IDE via CDP.
    1. Scopes DOM querying strictly to active dialogs ([role="dialog"], .quick-input-widget, .monaco-dialog-box).
    2. Performs sequential step-by-step option clicking: clicks Q1 option, waits for DOM advance, then clicks Q2.
    3. Handles inline custom text / 'Other' field input inside the active dialog if present.
    4. Post-click verification: verifies the dialog has advanced or closed completely.
    5. Returns clean diagnostic status without writing unrequested out-of-band text to the chat composer.
    """
    clean_labels = [lbl.strip() for lbl in selected_labels if lbl and lbl.strip()]
    has_custom = bool(custom_response and custom_response.strip())
    custom_txt = custom_response.strip() if has_custom else ""

    if not clean_labels and not has_custom:
        return {"success": False, "error": "No options or custom response provided"}

    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=3.0) as ws:
            step_js = f"""
            (async () => {{
                const targetLabels = {json.dumps(clean_labels)};
                const customText = {json.dumps(custom_txt)};

                function isVisible(el) {{
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                }}

                function getActiveContainer() {{
                    const selectors = [
                        '[role="radiogroup"]',
                        '[data-testid*="ask-question"]',
                        '.bg-ide-editor-background',
                        '.quick-input-widget',
                        '[role="dialog"]',
                        '.monaco-dialog-box',
                        '.monaco-modal-dialog',
                        '.agy-dialog',
                        '.tool-use-dialog',
                        '[class*="question-card"]'
                    ];
                    for (const sel of selectors) {{
                        const found = Array.from(document.querySelectorAll(sel)).filter(isVisible);
                        if (found.length > 0) {{
                            const el = found[found.length - 1];
                            return el.closest('.bg-ide-editor-background, [class*="rounded-2xl"]') || el;
                        }}
                    }}
                    return null;
                }}

                let container = getActiveContainer();
                if (!container) {{
                    return {{
                        success: false,
                        error: "No active dialog or question modal found in Antigravity IDE DOM",
                        clicked_options: [],
                        closed_verified: false
                    }};
                }}

                const clicked_options = [];

                // Step-by-step sequential selection loop
                for (let i = 0; i < targetLabels.length; i++) {{
                    const rawTarget = targetLabels[i];
                    const cleanTarget = rawTarget.replace(/^\\(recommended\\)\\s*/i, '').trim().toLowerCase();
                    const fullTarget = rawTarget.trim().toLowerCase();

                    container = getActiveContainer() || container;
                    const candidates = Array.from(container.querySelectorAll(
                        'label, [role="radio"], .quick-input-list .monaco-list-row, [role="option"], [role="checkbox"], button, .monaco-button, [role="button"]'
                    )).filter(isVisible);

                    let match = candidates.find(el => {{
                        const txt = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
                        return txt === fullTarget || txt === cleanTarget || txt.startsWith(cleanTarget + '\\n');
                    }});

                    if (!match) {{
                        match = candidates.find(el => {{
                            const txt = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
                            return cleanTarget.length >= 2 && txt.includes(cleanTarget) && txt.length < cleanTarget.length + 80;
                        }});
                    }}

                    if (match) {{
                        const clickable = match.tagName === 'LABEL' ? (match.querySelector('input') || match) : match;
                        clickable.click();
                        clicked_options.push(rawTarget);
                        // Brief pause to allow DOM state transition or next question rendering
                        await new Promise(r => setTimeout(r, 120));
                    }}
                }}

                // Inject custom response if present into the active modal's input
                let injectedCustom = false;
                if (customText) {{
                    container = getActiveContainer() || container;
                    const inputSelectors = [
                        'textarea[data-testid="ask-question-writein"]',
                        '[data-testid="ask-question-writein"]',
                        'textarea.min-w-0',
                        '.quick-input-widget input.input',
                        '.quick-input-widget input',
                        'textarea.monaco-inputbox',
                        'textarea',
                        'input[type="text"]',
                        'input:not([type="checkbox"]):not([type="radio"])'
                    ];
                    let inputEl = null;
                    for (const sel of inputSelectors) {{
                        const found = Array.from(container.querySelectorAll(sel)).filter(isVisible);
                        if (found.length > 0) {{
                            inputEl = found[found.length - 1];
                            break;
                        }}
                    }}
                    if (inputEl) {{
                        // Select the write_in radio button if present
                        const writeInLabel = container.querySelector('label:has(textarea[data-testid="ask-question-writein"]), label:has(textarea)');
                        if (writeInLabel) {{
                            const radio = writeInLabel.querySelector('input[type="radio"]');
                            if (radio) radio.click();
                        }}

                        inputEl.focus();
                        inputEl.value = customText;
                        inputEl.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        inputEl.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        injectedCustom = true;
                    }}
                }}

                // Submit confirmation: click modal submit/confirm/ok button if present
                container = getActiveContainer() || container;
                if (container) {{
                    const directSubmit = container.querySelector('[data-testid="interaction-continue-button"], button[type="submit"]');
                    if (directSubmit && isVisible(directSubmit) && !directSubmit.disabled) {{
                        directSubmit.click();
                        await new Promise(r => setTimeout(r, 180));
                    }} else {{
                        const btns = Array.from(container.querySelectorAll('button, .monaco-button, [role="button"]')).filter(isVisible);
                        const submitBtn = btns.find(b => {{
                            const txt = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
                            return (txt === 'submit' || txt.startsWith('submit') || txt === 'confirm' || txt === 'ok' || txt === 'done' || txt === 'continue') && !b.disabled;
                        }});
                        if (submitBtn) {{
                            submitBtn.click();
                            await new Promise(r => setTimeout(r, 180));
                        }}
                    }}
                }}

                // Post-Click Verification: Check whether the modal is now closed or advancing
                await new Promise(r => setTimeout(r, 150));
                const remainingContainer = getActiveContainer();
                const closed_verified = !remainingContainer;

                return {{
                    success: clicked_options.length > 0 || injectedCustom || closed_verified,
                    clicked_options,
                    custom_injected: injectedCustom,
                    closed_verified,
                    remaining_modal: Boolean(remainingContainer)
                }};
            }})()
            """
            await ws.send(
                json.dumps(
                    {
                        "id": 225,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": step_js,
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.5))
            val = reply.get("result", {}).get("result", {}).get("value", {}) or {}

            # If dialog wasn't closed and Enter key was needed for confirmation
            if not val.get("closed_verified") and (
                val.get("custom_injected") or val.get("clicked_options")
            ):
                for ev in ("rawKeyDown", "keyUp"):
                    await ws.send(
                        json.dumps(
                            {
                                "id": 226,
                                "method": "Input.dispatchKeyEvent",
                                "params": {
                                    "type": ev,
                                    "key": "Enter",
                                    "code": "Enter",
                                    "windowsVirtualKeyCode": 13,
                                },
                            }
                        )
                    )
                    await asyncio.wait_for(ws.recv(), timeout=1.5)

            return {
                "success": bool(val.get("success")),
                "via": "scoped_modal_interaction",
                "clicked_options": val.get("clicked_options", []),
                "custom_injected": val.get("custom_injected", False),
                "closed_verified": val.get("closed_verified", False),
                "remaining_modal": val.get("remaining_modal", False),
                "error": val.get("error"),
            }
    except Exception as exc:
        logger.warning("CDP answer_question execution error: %s", str(exc))
        return {
            "success": False,
            "error": str(exc),
            "clicked_options": [],
            "closed_verified": False,
        }

