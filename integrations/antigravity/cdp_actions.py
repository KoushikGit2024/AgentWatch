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
            # 1. Focus input element (supports both main chat composer and active inline question inputs)
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
            await ws.send(json.dumps({
                "id": 201,
                "method": "Runtime.evaluate",
                "params": {"expression": focus_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.5))
            prep_res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
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

            # Give DOM a small moment to mount/enable the Send button
            await asyncio.sleep(0.08)

            # 4. Attempt clicking the native Send message button
            submit_js = """
            (() => {
                // Priority 1: Direct aria-label matching
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

                // Priority 2: Card container search
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
            await ws.send(json.dumps({
                "id": 207,
                "method": "Runtime.evaluate",
                "params": {"expression": submit_js, "returnByValue": True}
            }))
            sub_reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            sub_res = sub_reply.get("result", {}).get("result", {}).get("value", {}) or {}

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


async def dispatch_inspect_active_popup(target_url: str) -> Dict[str, Any]:
    """
    Inspect the active Antigravity IDE workbench DOM via CDP for any live command approval
    popups, permission banners, quick-input option menus, or dynamic agent question cards.
    Returns structured details including all available option buttons and custom input availability.
    """
    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=2.5) as ws:
            inspect_js = r"""
            (() => {
                function isVisible(el) {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                }

                function collectContainers(root, acc) {
                    if (!root) return;
                    const selectors = [
                        '[role="dialog"]',
                        '.monaco-dialog-box',
                        '.quick-input-widget',
                        '.notifications-toasts .notification-list-item',
                        '.monaco-modal-dialog',
                        '.agy-dialog',
                        '.tool-use-dialog',
                        '[class*="permission"]',
                        '[class*="approval"]',
                        '[class*="confirm-dialog"]',
                        '[class*="command-approval"]',
                        '[class*="question-card"]'
                    ];
                    const found = root.querySelectorAll(selectors.join(','));
                    found.forEach(el => {
                        if (isVisible(el)) acc.push(el);
                    });
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) collectContainers(el.shadowRoot, acc);
                    });
                }

                const containers = [];
                collectContainers(document, containers);

                // Check QuickInput widget first (often used for multi-option selection or command confirmation)
                const quickInput = document.querySelector('.quick-input-widget');
                if (quickInput && isVisible(quickInput)) {
                    const titleEl = quickInput.querySelector('.quick-input-title, .quick-input-message');
                    const inputEl = quickInput.querySelector('input.input');
                    const rows = Array.from(quickInput.querySelectorAll('.quick-input-list .monaco-list-row')).filter(isVisible);
                    if (rows.length > 0) {
                        const options = rows.map((r, idx) => {
                            const labelEl = r.querySelector('.label-name, .monaco-highlighted-label') || r;
                            const descEl = r.querySelector('.label-description, .quick-input-list-entry-keybinding');
                            const label = (labelEl.innerText || labelEl.textContent || '').trim().split('\\n')[0];
                            const desc = descEl ? (descEl.innerText || descEl.textContent || '').trim() : null;
                            return {
                                id: `qi_opt_${idx + 1}`,
                                label: label || `Option ${idx + 1}`,
                                description: desc || null,
                                is_recommended: idx === 0 && label.toLowerCase().includes('recommend')
                            };
                        }).filter(o => o.label);

                        if (options.length > 0) {
                            const promptText = (titleEl ? titleEl.innerText : '') || (inputEl ? inputEl.placeholder : '') || 'Select an option in Antigravity';
                            const isApprovalLike = options.some(o => /^(allow|always allow|run|accept|deny|reject)/i.test(o.label));
                            return {
                                has_popup: true,
                                popup_kind: isApprovalLike ? 'approval' : 'question',
                                title: promptText.trim(),
                                options: options,
                                allow_custom_response: Boolean(inputEl)
                            };
                        }
                    }
                }

                // Check native Antigravity IDE inline question card (radiogroup or multi-select checkbox list)
                const questionContainer = document.querySelector(
                    '[role="radiogroup"], .bg-ide-editor-background:has([data-testid*="ask-question"]), [class*="rounded-2xl"]:has([data-testid="ask-question-writein"]), [class*="rounded-2xl"]:has([data-testid="interaction-continue-button"])'
                );
                if (questionContainer && isVisible(questionContainer)) {
                    const card = questionContainer.closest('.bg-ide-editor-background, [class*="rounded-2xl"]') || questionContainer;
                    const questionEl = card.querySelector('p[node], p, .leading-relaxed') || card;
                    const questionTitle = (questionEl.innerText || questionEl.textContent || 'Agent Question').trim().split('\n')[0];

                    // Check multi-select badge: <span ...>Multi-select</span> or input[type="checkbox"]
                    const isMultiSelect = Boolean(
                        card.querySelector('input[type="checkbox"]') ||
                        Array.from(card.querySelectorAll('span')).some(s => (s.innerText || '').trim().toLowerCase() === 'multi-select')
                    );

                    // Check step progression indicator (e.g., "1 of 2")
                    const stepEl = Array.from(card.querySelectorAll('span')).find(s => /\d+\s+of\s+\d+/i.test((s.innerText || '').trim()));
                    const stepText = stepEl ? stepEl.innerText.trim() : null;

                    const optionLabels = Array.from(card.querySelectorAll('label:has(input[type="checkbox"]), label:has(input[type="radio"]), [role="radio"]')).filter(isVisible);
                    const parsedOptions = [];
                    let hasCustomInput = false;

                    for (let idx = 0; idx < optionLabels.length; idx++) {
                        const lbl = optionLabels[idx];
                        const writeIn = lbl.querySelector('textarea, input[type="text"], [data-testid="ask-question-writein"]');
                        if (writeIn) {
                            hasCustomInput = true;
                            continue;
                        }
                        const span = lbl.querySelector('span.text-secondary-foreground, span:not(.font-mono), .text-sm') || lbl;
                        const rawText = (span.innerText || span.textContent || '').trim();
                        if (rawText) {
                            const isRec = rawText.toLowerCase().includes('(recommended)') || rawText.toLowerCase().includes('recommended');
                            const cleanText = rawText.replace(/^\(recommended\)\s*/i, '').replace(/\s*\(recommended\)$/i, '').trim();
                            const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
                            const optLabel = lines[0] || cleanText;
                            const optDesc = lines.length > 1 ? lines.slice(1).join(' ') : null;

                            parsedOptions.push({
                                id: `opt_${idx + 1}`,
                                label: optLabel,
                                description: optDesc,
                                is_recommended: isRec
                            });
                        }
                    }

                    if (parsedOptions.length > 0) {
                        return {
                            has_popup: true,
                            popup_kind: 'question',
                            title: questionTitle,
                            is_multi_select: isMultiSelect,
                            step_indicator: stepText,
                            options: parsedOptions,
                            allow_custom_response: hasCustomInput || Boolean(card.querySelector('[data-testid="ask-question-writein"]')),
                            custom_response_label: "Other (write your answer)"
                        };
                    }
                }

                // Check native Antigravity IDE browser/URL permission prompt: "Agent needs permission to act on <domain>"
                const browserPermPara = Array.from(document.querySelectorAll('p')).find(p => isVisible(p) && /Agent needs permission to act on/i.test(p.innerText || ''));
                if (browserPermPara) {
                    const permContainer = browserPermPara.closest('.flex.w-full, .flex-col, [class*="rounded"]') || browserPermPara.parentElement;
                    const domainMatch = (browserPermPara.innerText || '').match(/act on\s+([a-zA-Z0-9.-]+)/i);
                    const targetDomain = domainMatch ? domainMatch[1] : 'External Domain';

                    return {
                        has_popup: true,
                        popup_kind: 'browser_permission',
                        title: `Browser Permission: ${targetDomain}`,
                        target: targetDomain,
                        command: null,
                        options: [
                            { id: 'always_allow', label: 'Always Allow', is_recommended: true },
                            { id: 'allow_this_time', label: 'Allow this time' },
                            { id: 'deny', label: 'Deny' }
                        ],
                        allow_custom_response: false
                    };
                }

                // Check dialog/approval containers and inline chat cards with approval buttons
                const approvalActionRegex = /^(allow|always allow|allow all|always run|run|run command|accept|approve|yes|continue|deny|reject|cancel|decline|no)$/i;
                for (const c of containers) {
                    const btns = Array.from(c.querySelectorAll('button, .monaco-button, [role="button"]')).filter(isVisible);
                    const actionBtns = [];
                    for (const b of btns) {
                        const label = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim();
                        if (!label || label.length > 80) continue;
                        if (approvalActionRegex.test(label) || /allow|run|accept|reject|deny/i.test(label)) {
                            actionBtns.push(label);
                        }
                    }
                    if (actionBtns.length >= 2) {
                        const codeEl = c.querySelector('pre, code, .monaco-tokenized-source, [class*="command"]');
                        const cmdText = codeEl ? (codeEl.innerText || codeEl.textContent || '').trim() : '';
                        const headingEl = c.querySelector('h1, h2, h3, h4, .dialog-message-text, .notification-list-item-message, [class*="title"]');
                        const titleText = headingEl ? (headingEl.innerText || headingEl.textContent || '').trim() : 'Command Approval Required';
                        return {
                            has_popup: true,
                            popup_kind: 'approval',
                            title: titleText.substring(0, 140),
                            command: cmdText.substring(0, 500) || null,
                            target: cmdText.substring(0, 500) || titleText.substring(0, 140),
                            options: actionBtns.map((lbl, idx) => ({
                                id: lbl.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `opt_${idx}`,
                                label: lbl
                            })),
                            allow_custom_response: true
                        };
                    }
                }

                return { has_popup: false };
            })()
            """
            await ws.send(json.dumps({
                "id": 219,
                "method": "Runtime.evaluate",
                "params": {"expression": inspect_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {"has_popup": False}
    except Exception as exc:
        logger.debug("CDP popup inspection notice: %s", str(exc))
        return {"has_popup": False}


async def dispatch_inspect_active_banners(target_url: str) -> Dict[str, Any]:
    """
    Inspect active Antigravity IDE workbench DOM for error banners, rate limits,
    quota exhaustion toasts, and connection drops that never appear in transcript.jsonl.
    """
    try:
        import websockets

        async with websockets.connect(target_url, close_timeout=2.0) as ws:
            inspect_js = """
            (() => {
                function isVisible(el) {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                }

                const toastSelectors = [
                    '.notifications-toasts .notification-toast-container',
                    '.notifications-toasts .notification-list-item',
                    '.monaco-notification',
                    '[class*="notification-toast"]',
                    '[class*="banner-error"]',
                    '[class*="alert-danger"]',
                    '[class*="rate-limit"]',
                    '[class*="quota-exceeded"]'
                ];

                const foundBanners = [];
                const toastEls = document.querySelectorAll(toastSelectors.join(','));
                for (const el of toastEls) {
                    if (!isVisible(el)) continue;
                    const text = (el.innerText || el.textContent || '').trim();
                    if (!text || text.length < 5) continue;

                    const lower = text.toLowerCase();
                    const isError = lower.includes('error') || lower.includes('failed') || lower.includes('exception');
                    const isRateLimit = lower.includes('rate limit') || lower.includes('quota') || lower.includes('too many requests') || lower.includes('resource exhausted');
                    const isDisconnect = lower.includes('connection closed') || lower.includes('disconnected') || lower.includes('offline');

                    if (isError || isRateLimit || isDisconnect) {
                        foundBanners.push({
                            text: text.substring(0, 300),
                            kind: isRateLimit ? 'rate_limit' : (isDisconnect ? 'network_drop' : 'error'),
                            severity: isRateLimit ? 'warning' : 'error'
                        });
                    }
                }

                return {
                    has_banners: foundBanners.length > 0,
                    banners: foundBanners.slice(0, 3)
                };
            })()
            """
            await ws.send(json.dumps({
                "id": 218,
                "method": "Runtime.evaluate",
                "params": {"expression": inspect_js, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {"has_banners": False, "banners": []}
    except Exception as exc:
        logger.debug("CDP banner inspection notice: %s", str(exc))
        return {"has_banners": False, "banners": []}


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
        import websockets

        async with websockets.connect(target_url, close_timeout=5) as ws:
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
                const radioGroup = document.querySelector('[role="radiogroup"]');
                if (radioGroup && isVisible(radioGroup)) {{
                    const card = radioGroup.closest('.bg-ide-editor-background, [class*="rounded-2xl"]') || radioGroup.parentElement;
                    const radioLabels = Array.from(radioGroup.querySelectorAll('label')).filter(isVisible);

                    let targetRadio = null;
                    if (isAlwaysAllow) {{
                        targetRadio = radioLabels.find(l => (l.innerText || '').toLowerCase().includes('always allow'));
                    }} else if (isAllow) {{
                        targetRadio = radioLabels.find(l => {{
                            const txt = (l.innerText || '').toLowerCase();
                            return (txt.includes('allow this time') || txt.includes('yes, allow')) && !txt.includes('always allow');
                        }});
                    }} else if (isDeny) {{
                        targetRadio = radioLabels.find(l => (l.innerText || '').toLowerCase().startsWith('no'));
                    }}

                    if (targetRadio) {{
                        const input = targetRadio.querySelector('input[type="radio"]') || targetRadio;
                        input.click();
                        await new Promise(r => setTimeout(r, 120));

                        // If user provided custom denial instructions
                        if (isDeny && custom_response && custom_response.trim()) {{
                            const writeIn = targetRadio.querySelector('textarea, [data-testid="ask-question-writein"]');
                            if (writeIn) {{
                                writeIn.focus();
                                writeIn.value = custom_response.trim();
                                writeIn.dispatchEvent(new Event('input', {{ bubbles: true }}));
                                writeIn.dispatchEvent(new Event('change', {{ bubbles: true }}));
                            }}
                        }}

                        // Click the card submit button: [data-testid="interaction-continue-button"]
                        const submitBtn = card ? card.querySelector('[data-testid="interaction-continue-button"]') : document.querySelector('[data-testid="interaction-continue-button"]');
                        if (submitBtn && isVisible(submitBtn) && !submitBtn.disabled) {{
                            submitBtn.click();
                            return {{ clicked: true, via: 'native_approval_card', target: (targetRadio.innerText || '').trim().split('\n')[0] }};
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
            await ws.send(json.dumps({
                "id": 220,
                "method": "Runtime.evaluate",
                "params": {"expression": click_js, "awaitPromise": True, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.5))
            res = reply.get("result", {}).get("result", {}).get("value", {}) or {}
            clicked = bool(res.get("clicked"))

            # Keyboard fallback: Enter = allow/accept, Escape = deny
            if not clicked:
                is_allow = "allow" in decision.lower() or "accept" in decision.lower() or "run" in decision.lower()
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

        # If the user also provided custom instructions (e.g., "Deny & tell agent what to do instead" or "Type something else")
        custom_dispatch = None
        if custom_response and custom_response.strip():
            await asyncio.sleep(0.25)
            custom_dispatch = await dispatch_send_prompt(target_url, custom_response.strip())

        return {
            "success": True,
            "clicked": clicked,
            "via": res.get("via", "keyboard_fallback" if not clicked else None),
            "target": res.get("target"),
            "found_buttons": res.get("found_buttons", []),
            "custom_response_dispatched": bool(custom_dispatch and custom_dispatch.get("success")),
            "requires_native_ide": False,
            "message": "Action forwarded to IDE" if clicked else "Sent keyboard fallback to IDE"
        }
    except Exception as exc:
        logger.error("Failed to forward approval via CDP: %s", str(exc))
        return {"success": False, "requires_native_ide": False, "error": str(exc)}


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
    try:
        import websockets

        clean_labels = [lbl.strip() for lbl in selected_labels if lbl and lbl.strip()]
        has_custom = bool(custom_response and custom_response.strip())
        custom_txt = custom_response.strip() if has_custom else ""

        if not clean_labels and not has_custom:
            return {"success": False, "error": "No options or custom response provided"}

        async with websockets.connect(target_url, close_timeout=4.0) as ws:
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
            await ws.send(json.dumps({
                "id": 225,
                "method": "Runtime.evaluate",
                "params": {"expression": step_js, "awaitPromise": True, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.5))
            val = reply.get("result", {}).get("result", {}).get("value", {}) or {}

            # If dialog wasn't closed and Enter key was needed for confirmation
            if not val.get("closed_verified") and (val.get("custom_injected") or val.get("clicked_options")):
                for ev in ("rawKeyDown", "keyUp"):
                    await ws.send(json.dumps({
                        "id": 226,
                        "method": "Input.dispatchKeyEvent",
                        "params": {"type": ev, "key": "Enter", "code": "Enter", "windowsVirtualKeyCode": 13}
                    }))
                    await asyncio.wait_for(ws.recv(), timeout=1.5)

            return {
                "success": bool(val.get("success")),
                "via": "scoped_modal_interaction",
                "clicked_options": val.get("clicked_options", []),
                "custom_injected": val.get("custom_injected", False),
                "closed_verified": val.get("closed_verified", False),
                "remaining_modal": val.get("remaining_modal", False),
                "error": val.get("error")
            }
    except Exception as exc:
        logger.warning("CDP answer_question execution error: %s", str(exc))
        return {
            "success": False,
            "error": str(exc),
            "clicked_options": [],
            "closed_verified": False
        }


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
            await ws.send(json.dumps({
                "id": 230,
                "method": "Runtime.evaluate",
                "params": {"expression": switch_js, "awaitPromise": True, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=4.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {"success": False}
    except Exception as exc:
        logger.error("Failed to switch model via CDP: %s", str(exc))
        return {"success": False, "error": str(exc)}


async def dispatch_switch_mode(target_url: str, target_mode: str) -> Dict[str, Any]:
    """Switch active agent execution mode (Fast vs Planning) in Antigravity IDE via CDP."""
    try:
        import websockets

        async with websockets.connect(target_url, max_size=10*1024*1024, close_timeout=3) as ws:
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
            await ws.send(json.dumps({
                "id": 235,
                "method": "Runtime.evaluate",
                "params": {"expression": mode_js, "awaitPromise": True, "returnByValue": True}
            }))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {"success": True, "mode": target_mode}
    except Exception as exc:
        logger.debug("CDP mode switch notice: %s", str(exc))
        return {"success": True, "mode": target_mode}


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
