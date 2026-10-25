import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';

/**
 * ApprovalModal — Full-screen overlay for Antigravity IDE command & tool approval requests.
 * Renders all available approval options (Allow, Always Allow, Deny, or dynamic IDE options)
 * plus a "Type something else / Deny with custom instructions" text box.
 */
export default function ApprovalModal({
    approval,
    isSubmitting,
    onDecide,
    onDismiss
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [localDecision, setLocalDecision] = useState(null);
    const [customInstructions, setCustomInstructions] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    const approvalKey = approval ? (approval.step_id || approval.target || approval.title) : null;

    useEffect(() => {
        if (approval) {
            setLocalDecision(null);
            setCustomInstructions('');
            setShowCustomInput(false);
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [approvalKey]);

    if (!approval) return null;

    const requestType = approval.request_type || 'command';
    const target = approval.target || approval.command || approval.file || approval.path || '';
    const title = approval.title || `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Permission Request`;
    const description = approval.description || approval.permission_desc || 'Antigravity is waiting for your confirmation before executing this action.';
    const isCommand = requestType === 'command' || Boolean(approval.command);
    const stepId = approval.step_id || approval.id;

    const defaultOptions = [
        { id: 'allow', label: 'Allow', description: 'Execute this action once' },
        ...(isCommand ? [{ id: 'always_allow', label: 'Always Allow', description: 'Allow similar commands in this session' }] : []),
        { id: 'deny', label: 'Deny', description: 'Reject this action' }
    ];
    const options = Array.isArray(approval.options) && approval.options.length > 0
        ? approval.options
        : defaultOptions;

    const handleDecide = async (decision, optionLabel = '', customText = '') => {
        if (isSubmitting || localDecision) return;
        const textToUse = (customText || customInstructions).trim();
        setLocalDecision(decision);
        await onDecide(requestType, target, decision, stepId, textToUse, optionLabel);
    };

    const handleSendCustomDeny = async () => {
        if (!customInstructions.trim() || isSubmitting || localDecision) return;
        await handleDecide('deny', 'Deny', customInstructions.trim());
    };

    const typeColor = {
        command: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        file: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        browser: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
        decision: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    }[requestType] || 'text-amber-400 bg-amber-500/10 border-amber-500/30';

    const getButtonStyle = (optId, optLabel) => {
        const lower = `${optId} ${optLabel}`.toLowerCase();
        if (lower.includes('deny') || lower.includes('reject') || lower.includes('cancel') || lower.includes('no')) {
            return 'bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300';
        }
        if (lower.includes('always')) {
            return 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-zinc-100';
        }
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40';
    };

    return (
        <div
            className={`fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ${
                isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backdropFilter: isVisible ? 'blur(10px)' : 'none' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={!isSubmitting ? onDismiss : undefined} />

            {/* Card */}
            <div
                className={`relative w-full sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 max-h-[90dvh] flex flex-col ${
                    isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
                }`}
                style={{
                    boxShadow: isVisible
                        ? '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.9)'
                        : 'none'
                }}
            >
                {/* Type accent stripe */}
                <div className={`h-1 w-full shrink-0 ${
                    requestType === 'command' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    requestType === 'file' ? 'bg-gradient-to-r from-sky-500 to-blue-500' :
                    requestType === 'browser' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                } opacity-90`} />

                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${typeColor}`}>
                            <div className="w-5 h-5">
                                {requestType === 'command' ? Icon.terminal :
                                 requestType === 'file' ? Icon.file :
                                 requestType === 'browser' ? Icon.screen :
                                 Icon.shield}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${typeColor}`}>
                                    {requestType.replace('_', ' ')}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            </div>
                            <h2 className="text-sm font-bold text-zinc-100 mt-1.5">{title}</h2>
                            {description && (
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
                            )}
                        </div>
                    </div>

                    {/* Command / Target Preview */}
                    {target && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                {isCommand ? 'Terminal Command' : 'Target Resource'}
                            </p>
                            <pre className="text-xs text-amber-200 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto">
                                {isCommand ? `$ ${target}` : target}
                            </pre>
                            {(approval.cwd || approval.cwd_short) && (
                                <p className="text-[10px] text-zinc-500 font-mono truncate">
                                    cwd: {approval.cwd || approval.cwd_short}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Result state: after decision made */}
                    {localDecision ? (
                        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${
                            localDecision === 'deny'
                                ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                                : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                        }`}>
                            <div className="w-4 h-4">{localDecision === 'deny' ? Icon.x : Icon.check}</div>
                            <span>
                                {localDecision === 'always_allow' ? 'Always Allowed — Forwarded to IDE' :
                                 localDecision === 'allow' ? 'Allowed — Forwarded to IDE' :
                                 customInstructions.trim() ? 'Denied & Custom Instructions Sent' : 'Denied — Forwarded to IDE'}
                            </span>
                            {isSubmitting && (
                                <svg className="w-3.5 h-3.5 animate-spin ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Action buttons for all available options */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {options.map((opt, idx) => {
                                    const optId = opt.id || `opt_${idx}`;
                                    const optLabel = opt.label || optId;
                                    const isDenyBtn = `${optId} ${optLabel}`.toLowerCase().match(/deny|reject|cancel|no/);
                                    return (
                                        <button
                                            key={optId}
                                            type="button"
                                            onClick={() => handleDecide(optId, optLabel)}
                                            disabled={isSubmitting}
                                            className={`flex-1 min-w-[95px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${getButtonStyle(optId, optLabel)}`}
                                        >
                                            <div className="w-4 h-4 shrink-0">
                                                {isDenyBtn ? Icon.x : Icon.check}
                                            </div>
                                            <span>{optLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* "Type something else / Deny with custom instructions" section */}
                            <div className="pt-1 border-t border-zinc-800/80 space-y-2">
                                {!showCustomInput ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomInput(true)}
                                        className="w-full py-2 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 transition cursor-pointer"
                                    >
                                        <span>Type something else / Deny with instructions…</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in duration-150">
                                        <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                            Tell the agent what to do instead
                                        </label>
                                        <textarea
                                            value={customInstructions}
                                            onChange={e => setCustomInstructions(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && customInstructions.trim()) {
                                                    e.preventDefault();
                                                    handleSendCustomDeny();
                                                }
                                            }}
                                            placeholder="e.g., Don't run that command, use 'npm test' instead..."
                                            rows={2}
                                            autoFocus
                                            className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowCustomInput(false); setCustomInstructions(''); }}
                                                className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!customInstructions.trim() || isSubmitting}
                                                onClick={() => handleDecide('allow', 'Allow', customInstructions.trim())}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                                            >
                                                Allow + Send Note
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!customInstructions.trim() || isSubmitting}
                                                onClick={handleSendCustomDeny}
                                                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                                            >
                                                Deny &amp; Send Instructions
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Minimize / Dismiss link */}
                    {!localDecision && (
                        <div className="text-center pt-0.5">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                            >
                                Minimize to chat stream
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
