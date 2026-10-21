import React from 'react';
import { Icon } from '../../constants/icons';
import ApprovalCard from './ApprovalCard';

export default function StreamItem({
    item,
    itemKey,
    isOpen,
    approvalState,
    isWorking,
    onToggle,
    onApprove
}) {
    if (item.type === 'thought') {
        return (
            <div className="group">
                <button
                    type="button"
                    onClick={() => onToggle(itemKey)}
                    className="inline-flex items-center gap-1.5 py-0.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer select-none font-sans text-xs"
                >
                    <span>{item.title || 'Thought for 1s'}</span>
                    <div className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
                        {Icon.chevronRight}
                    </div>
                </button>
                {isOpen && (
                    <div className="mt-1 mb-2 ml-1 pl-3 border-l-2 border-zinc-700/80 bg-zinc-950/60 py-2 pr-3 rounded-r font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-text">
                        {item.text}
                    </div>
                )}
            </div>
        );
    }

    const isReactFile = item.target?.includes('.jsx') || item.target?.includes('.tsx');

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap font-sans text-xs leading-snug py-0.5">
                <span className="text-zinc-400">{item.verb || 'Analyzed'}</span>

                <div className="inline-flex items-center gap-1 text-zinc-200">
                    {item.kind === 'analyze' && (
                        isReactFile ? (
                            <div className="w-3.5 h-3.5 text-cyan-400 shrink-0">{Icon.react}</div>
                        ) : (
                            <div className="w-3.5 h-3.5 text-zinc-400 shrink-0">{Icon.file}</div>
                        )
                    )}
                    {item.kind === 'search' && (
                        <div className="w-3.5 h-3.5 text-purple-400 shrink-0">{Icon.search}</div>
                    )}
                    {item.kind === 'edit' && (
                        <div className="w-3.5 h-3.5 text-emerald-400 shrink-0">{Icon.fileEdit}</div>
                    )}
                    {item.kind === 'command' && (
                        <div className="w-3.5 h-3.5 text-amber-400 shrink-0">{Icon.terminal}</div>
                    )}
                    {item.kind === 'browser' && (
                        <div className="w-3.5 h-3.5 text-blue-400 shrink-0">{Icon.globe}</div>
                    )}
                    <span className="text-zinc-200 font-mono text-[11px] font-medium break-all">{item.target}</span>

                    {item.extra && (
                        <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] ml-1 font-sans">
                            {item.extra}
                        </span>
                    )}
                </div>
            </div>

            {item.requires_permission && (isWorking || approvalState) && (
                <ApprovalCard
                    item={item}
                    itemKey={itemKey}
                    approvalState={approvalState}
                    onApprove={onApprove}
                />
            )}
        </div>
    );
}
