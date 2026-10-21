import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
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

    const isCommand = item.kind === 'command';
    const isEdit = item.kind === 'edit';
    const isAnalyze = item.kind === 'analyze';
    const hasDetails = Boolean(item.command || item.output || item.diff || item.instruction || item.file);
    const fileInfo = (isAnalyze || isEdit) ? getFileInfo(item.target || item.file) : null;

    return (
        <div className="space-y-1.5 w-full min-w-0 max-w-full overflow-hidden">
            {/* Header / Clickable Summary Row */}
            <div
                onClick={() => hasDetails && onToggle(itemKey)}
                className={`flex items-center justify-between gap-2 px-2 py-1 -mx-2 rounded-lg transition select-none w-full min-w-0 ${
                    hasDetails ? 'cursor-pointer hover:bg-zinc-800/50' : ''
                }`}
            >
                <div className="flex items-center gap-2 flex-wrap font-sans text-xs leading-snug min-w-0 max-w-full">
                    <span className="text-zinc-400 font-medium">{item.verb || 'Used'}</span>

                    <div className="inline-flex items-center gap-1.5 text-zinc-200">
                        {isAnalyze && (
                            <FileIcon path={item.target || item.file} className="w-3.5 h-3.5" />
                        )}
                        {item.kind === 'search' && (
                            <div className="w-3.5 h-3.5 text-purple-400 shrink-0">{Icon.search}</div>
                        )}
                        {isEdit && (
                            <div className="inline-flex items-center gap-1">
                                <FileIcon path={item.target || item.file} className="w-3.5 h-3.5" />
                                <div className="w-3 h-3 text-emerald-400 shrink-0">{Icon.fileEdit}</div>
                            </div>
                        )}
                        {isCommand && (
                            <div className="w-3.5 h-3.5 text-amber-400 shrink-0">{Icon.terminal}</div>
                        )}
                        {item.kind === 'browser' && (
                            <div className="w-3.5 h-3.5 text-blue-400 shrink-0">{Icon.globe}</div>
                        )}

                        <span className={`font-mono text-[11px] font-medium break-all ${fileInfo ? fileInfo.color : 'text-zinc-200'}`}>
                            {item.target}
                        </span>

                        {fileInfo && fileInfo.label && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                                {fileInfo.label}
                            </span>
                        )}

                        {item.extra && (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[10px] font-mono border border-zinc-700/50">
                                {item.extra}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right Status Badge & Chevron */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {isCommand && item.exit_code !== undefined && item.exit_code !== null && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono font-medium rounded ${
                            item.exit_code === 0
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                                : 'bg-rose-950/70 text-rose-300 border border-rose-800/50'
                        }`}>
                            {item.exit_code === 0 ? 'exit 0' : `exit ${item.exit_code}`}
                        </span>
                    )}

                    {isCommand && item.exit_code === undefined && item.status !== 'done' && isWorking && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}

                    {hasDetails && (
                        <div className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
                            {Icon.chevronRight}
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable Details Card (Terminal Output / Diff Preview) */}
            {isOpen && hasDetails && (
                <div className="mt-1 mb-2.5 ml-2 pl-3 border-l-2 border-zinc-700/70 space-y-2 text-xs w-full min-w-0 max-w-full overflow-hidden">
                    {/* Command Details */}
                    {isCommand && (
                        <div className="space-y-1.5 w-full min-w-0 max-w-full">
                            {item.cwd && (
                                <div className="text-[10px] text-zinc-500 font-mono truncate max-w-full">
                                    in <span className="text-zinc-400">{item.cwd}</span>
                                </div>
                            )}
                            {item.command && (
                                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 w-full max-w-full overflow-x-auto select-text break-all">
                                    <span className="text-amber-500 select-none">$ </span>
                                    {item.command}
                                </div>
                            )}
                            {item.output ? (
                                <div className="space-y-1 w-full min-w-0 max-w-full">
                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Output</div>
                                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap [word-break:break-word] leading-relaxed max-h-64 overflow-y-auto overflow-x-auto select-text w-full max-w-full">
                                        {item.output}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[11px] text-zinc-500 italic py-1">
                                    {item.status === 'done' ? 'Completed with no standard output.' : 'Command executing…'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* File Modification Details */}
                    {isEdit && (
                        <div className="space-y-1.5">
                            {item.file && (
                                <div className="text-[10px] text-zinc-500 font-mono truncate flex items-center gap-1.5">
                                    <span>file:</span>
                                    <FileIcon path={item.file} className="w-3 h-3" />
                                    <span className="text-zinc-300 truncate">{item.file}</span>
                                </div>
                            )}
                            {item.instruction && (
                                <div className="text-xs text-zinc-300 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                                    {item.instruction}
                                </div>
                            )}
                            {item.diff && (
                                <div className="space-y-1 font-mono text-[11px] select-text w-full min-w-0 max-w-full">
                                    {item.diff.target_content && (
                                        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap [word-break:break-word] w-full max-w-full">
                                            <div className="text-[9px] uppercase tracking-wider text-rose-400/80 mb-1 font-sans select-none">Removed Lines</div>
                                            {item.diff.target_content}
                                        </div>
                                    )}
                                    {item.diff.replacement_content && (
                                        <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap [word-break:break-word] w-full max-w-full">
                                            <div className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1 font-sans select-none">Added Lines</div>
                                            {item.diff.replacement_content}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* File Analysis Details */}
                    {item.kind === 'analyze' && item.file && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 break-all [word-break:break-all] [overflow-wrap:anywhere] bg-zinc-950 p-2 rounded border border-zinc-850 w-full max-w-full">
                            <FileIcon path={item.file} className="w-3.5 h-3.5" />
                            <span>{item.file}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Approval Decision Card if elevation required */}
            {item.requires_permission && item.status !== 'done' && !item.output && (isWorking || approvalState) && (
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
