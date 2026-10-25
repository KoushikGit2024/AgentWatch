// ==============================================================================
// Antigravity IDE Live DOM Extractor
// Paste this directly into the IDE Developer Console (Ctrl+Shift+I or Help > Toggle Developer Tools)
// ==============================================================================
(function extractAntigravityModalDOM() {
    console.clear();
    console.log("%c[AgentWatch] Scanning Antigravity DOM for Modals, Popups, and Option Cards...", "color: #3b82f6; font-size: 14px; font-weight: bold;");

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function searchShadowAndLight(root, selector, acc = []) {
        if (!root) return acc;
        try {
            const found = root.querySelectorAll(selector);
            found.forEach(el => { if (isVisible(el)) acc.push(el); });
        } catch(e) {}
        try {
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) searchShadowAndLight(el.shadowRoot, selector, acc);
            });
        } catch(e) {}
        return acc;
    }

    // 1. Candidate containers
    const containerSelectors = [
        '[role="dialog"]',
        '.monaco-dialog-box',
        '.quick-input-widget',
        '.monaco-modal-dialog',
        '.notifications-toasts',
        '.notification-list-item',
        '[class*="modal"]',
        '[class*="dialog"]',
        '[class*="popup"]',
        '[class*="approval"]',
        '[class*="permission"]',
        '[class*="question"]',
        '[class*="confirm"]',
        '[class*="tool-use"]',
        '[class*="option"]'
    ];

    const results = [];

    containerSelectors.forEach(sel => {
        const found = searchShadowAndLight(document, sel);
        found.forEach(node => {
            if (!results.includes(node)) results.push(node);
        });
    });

    console.log(`%cFound ${results.length} candidate container(s).`, "color: #10b981; font-weight: bold;");

    if (results.length === 0) {
        console.warn("[AgentWatch] No standard modal containers found. Extracting top-level elements with buttons/checkboxes/inputs...");
        const buttons = searchShadowAndLight(document, 'button, [role="button"], [role="checkbox"], [role="radio"], .monaco-list-row');
        console.log(`Found ${buttons.length} interactive elements in total DOM.`);
    }

    const report = results.map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const buttons = Array.from(el.querySelectorAll('button, [role="button"], [role="option"], [role="checkbox"], [role="radio"], .monaco-list-row, .monaco-button')).filter(isVisible);
        const inputs = Array.from(el.querySelectorAll('input, textarea, [contenteditable="true"]')).filter(isVisible);

        return {
            index: idx + 1,
            tagName: el.tagName,
            className: el.className,
            role: el.getAttribute('role'),
            dimensions: `${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})`,
            buttons: buttons.map(b => ({
                text: (b.innerText || b.textContent || '').trim().replace(/\s+/g, ' '),
                aria: b.getAttribute('aria-label'),
                className: b.className,
                role: b.getAttribute('role')
            })),
            inputs: inputs.map(i => ({
                type: i.type || i.tagName,
                placeholder: i.placeholder || i.getAttribute('aria-label'),
                value: i.value || (i.innerText || '').trim()
            })),
            outerHTML: el.outerHTML
        };
    });

    // Output JSON to console and copy to clipboard
    const jsonStr = JSON.stringify(report, null, 2);
    try {
        navigator.clipboard.writeText(jsonStr);
        console.log("%c✅ Successfully copied full extracted DOM structure to Clipboard!", "color: #10b981; font-size: 13px; font-weight: bold;");
    } catch (e) {
        console.log("%cClipboard copy blocked. Please copy the object below directly:", "color: #f59e0b;");
    }

    console.log("%c================ FULL EXTRACTED POPUP REPORT ================", "color: #6366f1; font-weight: bold;");
    console.dir(report);
    return report;
})();
