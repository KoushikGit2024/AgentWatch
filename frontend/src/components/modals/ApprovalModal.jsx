import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';

const DECISION_CONFIG = {
    allow: {
        label: 'Allow',
        classes: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50',
        icon: 'check'
    },
    always_allow: {
        label: 'Always Allow',
        classes: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
        icon: 'check'
    },
    deny: {
        label: 'Deny',
        classes: 'bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300',
        icon: 'x'
    }
};

/**
 * ApprovalModal — Full-screen blocking overlay for CDP/IDE approval requests.
 * Shows a rich card with command/file details and Allow / Always Allow / Deny buttons.
 * Dispatches to the backend which forwards via CDP to Antigravity IDE.
 */
export default function ApprovalModal({
    approval,
    isSubmitting,
    onDecide,
    onDismiss
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [localDecision, setLocalDecision] = useState(null);

    useEffect(() => {
        if (approval) {
            setLocalDecision(null);
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [approval]);

    if (!approval) return null;

    const requestType = approval.request_type || 'command';
    const target = approval.target || approval.command || approval.file || approval.path || '';
    const title = approval.title || `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Permission Request`;
    const description = approval.description || approval.permission_desc || null;
    const isCommand = requestType === 'command' || Boolean(approval.command);

    const handleDecide = async (decision) => {
        if (isSubmitting || localDecision) return;
        setLocalDecision(decision);
        await onDecide(requestType, target, decision, approval.step_id || approval.id);
    };

    const typeColor = {
        command: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        file: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
        browser: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
        decision: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    }[requestType] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';

    return (
        <div
            className={`fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backdropFilter: isVisible ? 'blur(10px)' : 'none' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/65" onClick={!isSubmitting ? onDismiss : undefined} />

            {/* Card */}
            <div
                className={`relative w-full sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
                    isVisible ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'
                }`}
                style={{
                    boxShadow: isVisible
                        ? '0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.9)'
                        : 'none'
                }}
            >
                {/* Type accent stripe */}
                <div className={`h-1 w-full ${
                    requestType === 'command' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    requestType === 'file' ? 'bg-gradient-to-r from-sky-500 to-blue-500' :
                    requestType === 'browser' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                } opacity-90`} />

                <div className="p-5 space-y-4">
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
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                {isCommand ? 'Command' : 'Target'}
                            </p>
                            <p className="text-xs text-zinc-200 font-mono break-all leading-relaxed">
                                {target}
                            </p>
                            {approval.cwd && (
                                <p className="text-[10px] text-zinc-600 font-mono">
                                    cwd: {approval.cwd}
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
                            {localDecision === 'always_allow' ? 'Always Allowed — Forwarded to IDE' :
                             localDecision === 'allow' ? 'Allowed — Forwarded to IDE' :
                             'Denied — Forwarded to IDE'}
                            {isSubmitting && (
                                <svg className="w-3.5 h-3.5 animate-spin ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                            )}
                        </div>
                    ) : (
                        /* Action buttons */
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => handleDecide('allow')}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
                            >
                                <div className="w-4 h-4">{Icon.check}</div>
                                Allow
                            </button>
                            {isCommand && (
                                <button
                                    type="button"
                                    onClick={() => handleDecide('always_allow')}
                                    disabled={isSubmitting}
                                    className="px-3 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                >
                                    Always Allow
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleDecide('deny')}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 font-bold text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                Deny
                            </button>
                        </div>
                    )}

                    {/* Dismiss link */}
                    {!localDecision && (
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-[11px] text-zinc-600 hover:text-zinc-400 transition"
                            >
                                Dismiss (handle in desktop IDE)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
