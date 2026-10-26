import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';

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
        try {
            const res = await onDecide(requestType, target, decision, stepId, textToUse, optionLabel);
            if (res && res.success === false) {
                setLocalDecision(null);
            }
        } catch {
            setLocalDecision(null);
        }
    };

    const handleSendCustomDeny = async () => {
        if (!customInstructions.trim() || isSubmitting || localDecision) return;
        await handleDecide('deny', 'Deny', customInstructions.trim());
    };

    const getButtonStyle = (optId, optLabel) => {
        const lower = `${optId} ${optLabel}`.toLowerCase();
        if (lower.includes('deny') || lower.includes('reject') || lower.includes('cancel') || lower.includes('no')) {
            return 'bg-[#D77E83]/15 hover:bg-[#D77E83]/25 border border-[#D77E83]/40 text-[#D77E83]';
        }
        if (lower.includes('always')) {
            return 'bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-[#E8EAED]';
        }
        return 'bg-[#79B89A] hover:opacity-90 text-[#101113] font-semibold';
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 ${
                isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            <div className="absolute inset-0 bg-black/75" onClick={!isSubmitting ? onDismiss : undefined} />

            <div className="relative w-full sm:max-w-md bg-[#17191C] border border-[#30343A] rounded-t-xl sm:rounded-lg shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
                <div className="h-0.5 w-full shrink-0 bg-[#D8B36A]" />

                <div className="aw-modal-scroll-region p-4 sm:p-5 space-y-4 overflow-y-auto">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-md flex items-center justify-center border border-[#D8B36A]/40 bg-[#D8B36A]/12 text-[#D8B36A] shrink-0">
                            <div className="w-4 h-4">
                                {requestType === 'command' ? Icon.terminal :
                                 requestType === 'file' ? Icon.file :
                                 requestType === 'browser' ? Icon.screen :
                                 Icon.shield}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-[#D8B36A]/40 bg-[#D8B36A]/12 text-[#D8B36A]">
                                    {requestType.replace('_', ' ')}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B36A] shrink-0" />
                            </div>
                            <h2 className="text-sm font-semibold text-[#E8EAED] mt-1.5">{title}</h2>
                            {description && (
                                <p className="text-xs text-[#A0A6AF] mt-1 leading-relaxed">{description}</p>
                            )}
                        </div>
                    </div>

                    {target && (
                        <div className="bg-[#101113] border border-[#30343A] rounded-md p-3 space-y-1.5">
                            <p className="text-[10px] text-[#747C87] uppercase tracking-wider font-mono font-semibold">
                                {isCommand ? 'Terminal Command' : 'Target Resource'}
                            </p>
                            <pre className="text-xs text-[#E8EAED] font-mono whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto">
                                {isCommand ? `$ ${target}` : target}
                            </pre>
                            {(approval.cwd || approval.cwd_short) && (
                                <p className="text-[10px] text-[#747C87] font-mono truncate">
                                    cwd: {approval.cwd || approval.cwd_short}
                                </p>
                            )}
                        </div>
                    )}

                    {localDecision ? (
                        <div className={`flex items-center gap-2 p-3 rounded-md border text-xs font-semibold ${
                            localDecision === 'deny'
                                ? 'bg-[#D77E83]/12 border-[#D77E83]/40 text-[#D77E83]'
                                : 'bg-[#79B89A]/12 border-[#79B89A]/40 text-[#79B89A]'
                        }`}>
                            <div className="w-4 h-4">{localDecision === 'deny' ? Icon.x : Icon.check}</div>
                            <span>
                                {localDecision === 'always_allow' ? 'Always Allowed — Forwarded to IDE' :
                                 localDecision === 'allow' ? 'Allowed — Forwarded to IDE' :
                                 customInstructions.trim() ? 'Denied & Custom Instructions Sent' : 'Denied — Forwarded to IDE'}
                            </span>
                        </div>
                    ) : (
                        <>
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
                                            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs transition cursor-pointer disabled:opacity-50 ${getButtonStyle(optId, optLabel)}`}
                                        >
                                            <div className="w-3.5 h-3.5 shrink-0">
                                                {isDenyBtn ? Icon.x : Icon.check}
                                            </div>
                                            <span>{optLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-2 border-t border-[#262A30] space-y-2">
                                {!showCustomInput ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomInput(true)}
                                        className="w-full py-2 px-3 rounded-md bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] flex items-center justify-center gap-2 transition cursor-pointer"
                                    >
                                        <span>Deny with custom instructions...</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-semibold text-[#A0A6AF] uppercase tracking-wider">
                                            Alternative instructions for the agent
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
                                            placeholder="Specify what command or approach the agent should use instead..."
                                            rows={2}
                                            autoFocus
                                            className="w-full bg-[#101113] border border-[#30343A] focus:border-[#7C9FC5] rounded-md px-3 py-2 text-xs text-[#E8EAED] placeholder-[#747C87] outline-none resize-none"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setShowCustomInput(false); setCustomInstructions(''); }}
                                                className="px-2.5 py-1.5 rounded text-xs text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!customInstructions.trim() || isSubmitting}
                                                onClick={handleSendCustomDeny}
                                                className="px-3 py-1.5 rounded bg-[#7C9FC5] hover:bg-[#8FB0D4] text-[#101113] text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
                                            >
                                                Send Instructions
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!localDecision && (
                        <div className="text-center pt-0.5">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-[11px] text-[#747C87] hover:text-[#A0A6AF] transition cursor-pointer"
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
