"""CDP Popup and Banner Inspection Dispatchers."""

import asyncio
import json
import logging
from typing import Any, Dict

logger = logging.getLogger("integrations.antigravity.cdp_popup_inspector")

async def dispatch_inspect_active_popup(target_url: str) -> Dict[str, Any]:
    """
    Inspect the active Antigravity IDE workbench DOM via CDP for any live command approval
    popups, permission banners, quick-input option menus, or dynamic agent question cards.
    Returns structured details including all available option buttons and custom input availability.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=2.5) as ws:
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
                            const promptText = ((titleEl ? titleEl.innerText : '') || (inputEl ? inputEl.placeholder : '') || '').trim();
                            // Require explicit permission/decision/command approval keywords to avoid capturing benign file-pickers or command palette
                            const isApprovalLike = options.some(o => /^(allow|always allow|run|run in terminal|accept|deny|reject|proceed|approve|continue)/i.test(o.label));
                            const hasPromptApprovalCue = /permission|approval|allow|proceed|run in terminal|execute|security/i.test(promptText);

                            if (isApprovalLike || hasPromptApprovalCue) {
                                return {
                                    has_popup: true,
                                    popup_kind: isApprovalLike ? 'approval' : 'question',
                                    title: promptText || 'Antigravity Approval Required',
                                    options: options,
                                    allow_custom_response: Boolean(inputEl)
                                };
                            }
                        }
                    }
                }

                // Check native Antigravity IDE inline question card (radiogroup or multi-select checkbox list)
                const questionContainer = document.querySelector(
                    '[role="radiogroup"], .bg-ide-editor-background:has([data-testid*="ask-question"]), [class*="rounded-2xl"]:has([data-testid="ask-question-writein"]), [class*="rounded-2xl"]:has([data-testid="interaction-continue-button"])'
                );
                if (questionContainer && isVisible(questionContainer)) {
                    const card = questionContainer.closest('.bg-ide-editor-background, [class*="rounded-2xl"]') || questionContainer;
                    const questionEl = card.querySelector('p[node], p, .leading-relaxed, span.text-sm.font-medium, h3, h4') || card;
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
                        // Clone label and remove inputs, SVGs, and index badges to extract full text and description
                        let rawText = '';
                        try {
                            const clone = lbl.cloneNode(true);
                            clone.querySelectorAll('input, svg, .font-mono, [class*="select-none"]').forEach(el => el.remove());
                            rawText = (clone.innerText || clone.textContent || '').trim();
                        } catch (e) {
                            rawText = (lbl.innerText || lbl.textContent || '').trim();
                        }

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
                        // Check if this radiogroup card is an elevated command approval (contains command textarea or code block)
                        const cmdTextarea = card.querySelector('textarea[aria-label*="permission"], textarea.bg-muted, pre, code');
                        const cmdVal = cmdTextarea ? (cmdTextarea.value || cmdTextarea.innerText || '').trim() : '';
                        const isCmdApproval = Boolean(
                            cmdVal ||
                            parsedOptions.some(o => /allow this time|always allow/i.test(o.label)) ||
                            /allow|command|permission/i.test(questionTitle)
                        );

                        return {
                            has_popup: true,
                            popup_kind: isCmdApproval ? 'approval' : 'question',
                            title: questionTitle,
                            command: cmdVal || null,
                            target: cmdVal || questionTitle,
                            is_multi_select: isMultiSelect,
                            step_indicator: stepText,
                            options: parsedOptions,
                            allow_custom_response: hasCustomInput || Boolean(card.querySelector('[data-testid="ask-question-writein"]')),
                            custom_response_label: isCmdApproval ? "Tell the agent what to do instead" : "Other (write your answer)"
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
            await ws.send(
                json.dumps(
                    {
                        "id": 219,
                        "method": "Runtime.evaluate",
                        "params": {"expression": inspect_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {
                "has_popup": False
            }
    except Exception as exc:
        logger.debug("CDP popup inspection notice: %s", str(exc))
        return {"has_popup": False}


async def dispatch_inspect_active_banners(target_url: str) -> Dict[str, Any]:
    """
    Inspect active Antigravity IDE workbench DOM for error banners, rate limits,
    quota exhaustion toasts, and connection drops that never appear in transcript.jsonl.
    """
    try:
        from integrations.antigravity.cdp_connection import cdp_connect

        async with cdp_connect(target_url, open_timeout=1.5, close_timeout=2.0) as ws:
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
            await ws.send(
                json.dumps(
                    {
                        "id": 218,
                        "method": "Runtime.evaluate",
                        "params": {"expression": inspect_js, "returnByValue": True},
                    }
                )
            )
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
            return reply.get("result", {}).get("result", {}).get("value", {}) or {
                "has_banners": False,
                "banners": [],
            }
    except Exception as exc:
        logger.debug("CDP banner inspection notice: %s", str(exc))
        return {"has_banners": False, "banners": []}


