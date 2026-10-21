import React from 'react';
import { Icon } from '../../constants/icons';

export default function ApprovalCard({
    item,
    itemKey,
    approvalState,
    onApprove
}) {
    if (!item.requires_permission) return null;

    return (
        <div className="my-1.5 p-2.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-850 border border-zinc-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm font-sans">
            <div>
                <div className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>{item.permission_title || 'Authorization Required'}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    {item.command
                        ? `${item.cwd_short || '.../workspace'} > ${item.command}`
                        : (item.permission_desc || 'Allow the agent to proceed with this action.')}
                </p>
            </div>

            {!approvalState ? (
                <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                    <button
                        type="button"
                        onClick={() => onApprove(item.permission_type || 'command', item.command || item.file || item.target, 'allow', itemKey)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition active:scale-95 shadow-sm"
                    >
                        Allow
                    </button>
                    {item.kind === 'command' && (
                        <button
                            type="button"
                            onClick={() => onApprove('command', item.command, 'always_allow', itemKey)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-[11px] transition active:scale-95"
                        >
                            Always Allow
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onApprove(item.permission_type || 'command', item.command || item.file || item.target, 'deny', itemKey)}
                        className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-medium text-[11px] transition active:scale-95"
                    >
                        Deny
                    </button>
                </div>
            ) : (
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                    approvalState === 'deny'
                        ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                        : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                }`}>
                    <div className="w-3 h-3">
                        {approvalState === 'deny' ? Icon.x : Icon.check}
                    </div>
                    <span>{approvalState === 'always_allow' ? 'Always Allowed' : approvalState === 'allow' ? 'Allowed' : 'Denied'}</span>
                </span>
            )}
        </div>
    );
}
