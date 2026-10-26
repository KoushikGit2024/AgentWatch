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
        <div className="my-2 p-3.5 rounded-xl bg-gradient-to-b from-[#181C23] to-[#12151B] border border-amber-500/35 shadow-lg shadow-amber-950/20 flex flex-col gap-3 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                        <span>{item.permission_title || 'Command Approval Required'}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 font-mono break-all leading-relaxed">
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
                                    className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition cursor-pointer active:scale-[0.98] ${
                                        isDeny
                                            ? 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm'
                                            : isAlways
                                                ? 'bg-[#1C2028] hover:bg-[#252B36] border border-[#3A4250] hover:border-amber-400/40 text-[#E2E8F0] shadow-sm'
                                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#091512] font-bold shadow-md shadow-emerald-500/20'
                                    }`}
                                >
                                    {optLabel}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setShowCustom(v => !v)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#1C2028] hover:bg-[#252B36] border border-[#3A4250] hover:border-amber-400/30 text-[#94A3B8] hover:text-white font-medium text-[11px] transition cursor-pointer"
                        >
                            {showCustom ? 'Hide input' : 'Custom instructions...'}
                        </button>
                    </div>
                ) : (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0 border ${
                        effectiveDecision === 'deny'
                            ? 'text-rose-300 bg-rose-500/15 border-rose-500/40 shadow-sm shadow-rose-500/10'
                            : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    }`}>
                        <div className="w-3.5 h-3.5">
                            {effectiveDecision === 'deny' ? Icon.x : Icon.check}
                        </div>
                        <span>
                            {effectiveDecision === 'always_allow' ? 'Always Allowed' : effectiveDecision === 'allow' ? 'Allowed' : 'Denied'}
                        </span>
                    </span>
                )}
            </div>

            {!effectiveDecision && showCustom && (
                <div className="pt-2 border-t border-[#262A30] flex flex-col sm:flex-row gap-2">
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
                        className="flex-1 bg-[#17191C] border border-[#30343A] focus:border-[#7C9FC5] rounded px-3 py-1.5 text-xs text-[#E8EAED] placeholder-[#747C87] outline-none"
                    />
                    <button
                        type="button"
                        disabled={!customText.trim()}
                        onClick={() => handleCustomSubmit('deny')}
                        className="px-3 py-1.5 rounded bg-[#7C9FC5] hover:bg-[#8FB0D4] text-[#101113] text-[11px] font-semibold transition disabled:opacity-40 cursor-pointer shrink-0"
                    >
                        Send Instructions
                    </button>
                </div>
            )}
        </div>
    );
}
