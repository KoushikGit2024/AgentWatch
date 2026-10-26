import React, { useState, memo } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import { parseFileLink, isValidFilePath } from '../../utils/fileLinkParser';
import ApprovalCard from './ApprovalCard';
import DiffViewer from './DiffViewer';

const StreamItem = memo(function StreamItem({
    item,
    itemKey,
    isOpen,
    approvalState,
    isWorking,
    onToggle,
    onApprove,
    onOpenFile
}) {
    const [isOutputExpanded, setIsOutputExpanded] = useState(false);
    const [copiedOutput, setCopiedOutput] = useState(false);
    if (item.type === 'thought') {
        return (
            <div className="group">
                <button
                    type="button"
                    onClick={() => onToggle(itemKey)}
                    className="inline-flex items-center gap-1.5 py-0.5 text-zinc-400 hover:text-indigo-300 transition cursor-pointer select-none font-sans text-xs"
                >
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" />
                        {item.title || 'Thought for 1s'}
                    </span>
                    <div className={`w-3 h-3 text-zinc-500 group-hover:text-indigo-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
                        {Icon.chevronRight}
                    </div>
                </button>
                {isOpen && (
                    <div className="mt-1 mb-2 ml-1 pl-3 border-l-2 border-indigo-500/50 bg-[#12141a]/80 py-2 pr-3 rounded-r font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto select-text shadow-inner">
                        {item.text}
                    </div>
                )}
            </div>
        );
    }

    const isCommand = item.kind === 'command';
    const isEdit = item.kind === 'edit';
    const isAnalyze = item.kind === 'analyze';
    const isQuestion = item.kind === 'question';
    const hasDetails = Boolean(item.command || item.output || item.diff || item.instruction || item.file || item.question_data);
    const rawFileCandidate = item.file || item.target || '';
    const parsedTarget = parseFileLink(rawFileCandidate);
    const hasValidFile = parsedTarget.isValid && Boolean(parsedTarget.cleanPath);
    const fileInfo = hasValidFile ? getFileInfo(parsedTarget.cleanPath) : null;
    const effectiveApproval = approvalState || item.approval_decision;

    return (
        <div className="space-y-1.5 w-full min-w-0 max-w-full overflow-hidden">
            {/* Header / Clickable Summary Row */}
            <div
                onClick={() => hasDetails && onToggle(itemKey)}
                className={`flex items-center justify-between gap-2 px-2 py-1 -mx-2 rounded-lg transition select-none w-full min-w-0 ${
                    hasDetails ? 'cursor-pointer hover:bg-zinc-800/60' : ''
                }`}
            >
                <div className="flex items-center gap-2 flex-wrap font-sans text-xs leading-snug min-w-0 max-w-full">
                    <span className="text-zinc-400 font-medium">{item.verb || 'Used'}</span>

                    <div className="inline-flex items-center gap-1.5 text-zinc-200">
                        {isAnalyze && (
                            <div className={`p-0.5 rounded shrink-0 ${fileInfo?.bg ? fileInfo.bg : 'bg-sky-500/10 border border-sky-500/20'}`}>
                                <FileIcon path={parsedTarget.cleanPath || item.target || item.file} className="w-3.5 h-3.5" />
                            </div>
                        )}
                        {item.kind === 'search' && (
                            <div className="w-4 h-4 p-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                                {Icon.search}
                            </div>
                        )}
                        {isEdit && (
                            <div className={`inline-flex items-center gap-1 p-0.5 px-1 rounded shrink-0 ${fileInfo?.bg ? fileInfo.bg : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                <FileIcon path={parsedTarget.cleanPath || item.target || item.file} className="w-3.5 h-3.5" />
                                <div className={`w-3 h-3 shrink-0 ${fileInfo?.color || 'text-emerald-400'}`}>{Icon.fileEdit}</div>
                            </div>
                        )}
                        {isCommand && (
                            <div className="w-4 h-4 p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                {Icon.terminal}
                            </div>
                        )}
                        {item.kind === 'browser' && (
                            <div className="w-4 h-4 p-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                {Icon.globe}
                            </div>
                        )}
                        {isQuestion && (
                            <div className="w-4 h-4 p-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                                {Icon.brain}
                            </div>
                        )}
                        {!isAnalyze && !isEdit && !isCommand && !isQuestion && item.kind !== 'browser' && item.kind !== 'search' && hasValidFile && (
                            <FileIcon path={parsedTarget.cleanPath} className="w-3.5 h-3.5" />
                        )}

                        {(() => {
                            if (hasValidFile) {
                                return (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                             e.stopPropagation();
                                             if (typeof onOpenFile === 'function') {
                                                 const targetRange = parseFileLink(item.target || '');
                                                 const fileRange = parseFileLink(item.file || '');
                                                 const startLine = targetRange.startLine || fileRange.startLine || parsedTarget.startLine;
                                                 const endLine = targetRange.endLine || fileRange.endLine || parsedTarget.endLine;

                                                 const fullPath = item.file || parsedTarget.cleanPath || item.target || '';
                                                 onOpenFile(fullPath, { startLine, endLine });
                                             }
                                         }}
                                         title="Click to view file contents"
                                         className={`font-mono text-[11px] font-medium break-all hover:underline cursor-pointer ${fileInfo ? fileInfo.color : 'text-cyan-300'}`}
                                     >
                                         {item.target || parsedTarget.filename || rawFileCandidate}
                                     </button>
                                 );
                             }

                             return (
                                 <span className={`font-mono text-[11px] font-medium break-all ${fileInfo ? fileInfo.color : 'text-zinc-200'}`}>
                                     {item.target}
                                 </span>
                             );
                         })()}

                         {fileInfo && fileInfo.label && (
                             <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase tracking-wider bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
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
                                 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                 : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                         }`}>
                             {item.exit_code === 0 ? 'exit 0' : `exit ${item.exit_code}`}
                         </span>
                     )}

                     {isCommand && item.exit_code === undefined && (item.status !== 'done' || isWorking) && (
                         <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-amber-400/30" />
                     )}

                     {hasDetails && (
                         <div className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${isOpen ? 'rotate-90 text-zinc-300' : ''}`}>
                             {Icon.chevronRight}
                         </div>
                     )}
                 </div>
             </div>

             {/* Expandable Details Card (Terminal Output / Diff Preview / Question Details) */}
             {isOpen && hasDetails && (
                 <div className="mt-1 mb-2.5 ml-2 pl-3 border-l-2 border-blue-500/30 space-y-2 text-xs w-full min-w-0 max-w-full overflow-hidden">
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
                                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                                        <span className="uppercase tracking-wider">Output</span>
                                        <div className="flex items-center gap-2">
                                            {item.output.length > 350 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsOutputExpanded(v => !v);
                                                    }}
                                                    className="hover:text-zinc-300 underline underline-offset-2 cursor-pointer transition"
                                                >
                                                    {isOutputExpanded ? 'Collapse' : 'Expand full output'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(item.output);
                                                    setCopiedOutput(true);
                                                    setTimeout(() => setCopiedOutput(false), 1500);
                                                }}
                                                className="hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition"
                                            >
                                                <div className="w-3 h-3">{copiedOutput ? Icon.check : Icon.copy}</div>
                                                <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap [word-break:break-word] leading-relaxed overflow-x-auto select-text w-full max-w-full transition-all ${
                                        isOutputExpanded ? 'max-h-none overflow-y-visible' : 'max-h-64 overflow-y-auto'
                                    }`}>
                                        {item.output}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[11px] text-zinc-500 italic py-1">
                                    {item.status === 'done' ? 'Completed with no standard output.' : 'Waiting for approval or execution…'}
                                </div>
                            )}
                        </div>
                    )}

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
                                <DiffViewer
                                    diff={item.diff}
                                    filename={item.target || item.file}
                                />
                            )}
                        </div>
                    )}

                    {item.kind === 'analyze' && item.file && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 break-all [word-break:break-all] [overflow-wrap:anywhere] bg-zinc-950 p-2 rounded border border-zinc-850 w-full max-w-full">
                            <FileIcon path={item.file} className="w-3.5 h-3.5" />
                            <span>{item.file}</span>
                        </div>
                    )}

                    {isQuestion && item.question_data && (
                        <div className="space-y-1.5 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                            <div className="text-xs font-semibold text-zinc-200">{item.question_data.question}</div>
                            {Array.isArray(item.question_data.options) && item.question_data.options.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    {item.question_data.options.map((opt, idx) => (
                                        <div key={opt.id || idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                                            <span className="text-blue-400 font-mono">{idx + 1}.</span>
                                            <span>{typeof opt === 'string' ? opt : opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(item.requires_permission || effectiveApproval) && !item.output && (item.status === 'pending' || effectiveApproval || isWorking) && (
                <ApprovalCard
                    item={item}
                    itemKey={item.step_id || itemKey}
                    approvalState={effectiveApproval}
                    onApprove={onApprove}
                />
            )}
        </div>
    );
});

export default StreamItem;
