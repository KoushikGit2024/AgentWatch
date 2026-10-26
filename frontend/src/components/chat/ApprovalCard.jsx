import React, { useState } from 'react';
import { Icon } from '../../constants/icons';

export default function ApprovalCard({
    item,
    itemKey,
    approvalState,
    onApprove
}) {
    const [showCustom, setShowCustom] = useState(false);
    const [customText, setCustomText] = useState('');

    if (!item.requires_permission && !approvalState && !item.approval_decision) return null;

    const effectiveDecision = approvalState || item.approval_decision;
    const stepId = item.step_id || itemKey;
    const target = item.command || item.file || item.target || 'action';
    const permType = item.permission_type || (item.kind === 'command' ? 'command' : 'decision');

    const defaultOptions = [
        { id: 'allow', label: 'Allow' },
        ...(item.kind === 'command' ? [{ id: 'always_allow', label: 'Always Allow' }] : []),
        { id: 'deny', label: 'Deny' }
    ];
    const options = Array.isArray(item.approval_options) && item.approval_options.length > 0
        ? item.approval_options
        : defaultOptions;

    const handleCustomSubmit = (decision) => {
        if (!customText.trim()) return;
        onApprove(permType, target, decision, stepId, customText.trim());
        setShowCustom(false);
    };

    return (
        <div className="my-1.5 p-3 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-850 border border-amber-500/30 flex flex-col gap-2.5 shadow-sm font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span>{item.permission_title || 'Command Approval Required'}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono break-all">
                        {item.command
                            ? `${item.cwd_short || '.../workspace'} > ${item.command}`
                            : (item.permission_desc || 'Allow the agent to proceed with this action.')}
                    </p>
                </div>

                {!effectiveDecision ? (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                        {options.map((opt, idx) => {
                            const optId = opt.id || `opt_${idx}`;
                            const optLabel = opt.label || optId;
                            const isDeny = `${optId} ${optLabel}`.toLowerCase().match(/deny|reject|cancel|no/);
                            const isAlways = `${optId} ${optLabel}`.toLowerCase().includes('always');
                            return (
                                <button
                                    key={optId}
                                    type="button"
                                    onClick={() => onApprove(permType, target, optId, stepId, '', optLabel)}
                                    className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition active:scale-95 cursor-pointer ${
                                        isDeny
                                            ? 'bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300'
                                            : isAlways
                                                ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                    }`}
                                >
                                    {optLabel}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setShowCustom(v => !v)}
                            className="px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium text-[11px] transition active:scale-95 cursor-pointer"
                        >
                            {showCustom ? 'Hide input' : 'Type something else…'}
                        </button>
                    </div>
                ) : (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${
                        effectiveDecision === 'deny'
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                            : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                    }`}>
                        <div className="w-3 h-3">
                            {effectiveDecision === 'deny' ? Icon.x : Icon.check}
                        </div>
                        <span>
                            {effectiveDecision === 'always_allow' ? 'Always Allowed' : effectiveDecision === 'allow' ? 'Allowed' : 'Denied'}
                        </span>
                    </span>
                )}
            </div>

            {!effectiveDecision && showCustom && (
                <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && customText.trim()) {
                                e.preventDefault();
                                handleCustomSubmit('deny');
                            }
                        }}
                        placeholder="Type custom instructions for the agent instead..."
                        className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            disabled={!customText.trim()}
                            onClick={() => handleCustomSubmit('deny')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition disabled:opacity-40 cursor-pointer shadow-sm"
                        >
                            Send Instructions
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
