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
        <div className="my-1.5 p-3 rounded-lg bg-[#101113] border border-[#D8B36A]/40 flex flex-col gap-2.5 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#D8B36A] text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D8B36A] shrink-0" />
                        <span>{item.permission_title || 'Command Approval Required'}</span>
                    </div>
                    <p className="text-[11px] text-[#A0A6AF] mt-0.5 font-mono break-all">
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
                                    className={`px-2.5 py-1 rounded font-medium text-[11px] transition cursor-pointer ${
                                        isDeny
                                            ? 'bg-[#D77E83]/15 hover:bg-[#D77E83]/25 border border-[#D77E83]/40 text-[#D77E83]'
                                            : isAlways
                                                ? 'bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-[#E8EAED]'
                                                : 'bg-[#79B89A] hover:opacity-90 text-[#101113] font-semibold'
                                    }`}
                                >
                                    {optLabel}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setShowCustom(v => !v)}
                            className="px-2 py-1 rounded bg-[#17191C] hover:bg-[#1D2024] border border-[#30343A] text-[#A0A6AF] hover:text-[#E8EAED] font-medium text-[11px] transition cursor-pointer"
                        >
                            {showCustom ? 'Hide input' : 'Custom instructions...'}
                        </button>
                    </div>
                ) : (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded shrink-0 border ${
                        effectiveDecision === 'deny'
                            ? 'text-[#D77E83] bg-[#D77E83]/12 border-[#D77E83]/35'
                            : 'text-[#79B89A] bg-[#79B89A]/12 border-[#79B89A]/35'
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
