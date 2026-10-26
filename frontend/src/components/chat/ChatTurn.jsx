import React, { useState, memo } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { formatFileSize } from './AttachmentPreview';
import StreamItem from './StreamItem';
import MarkdownView from '../MarkdownView';
import AttachmentLightbox from '../composer/AttachmentLightbox';

const ChatTurn = memo(function ChatTurn({
    turn,
    turnIndex,
    openItemIds,
    approvals,
    onToggleItem,
    onApprove,
    onOpenFile,
    onStop
}) {
    const isUser = turn.role === 'user';
    const timeStr = turn.timestamp
        ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const [copied, setCopied] = useState(false);
    const [reaction, setReaction] = useState(null);
    const [previewItem, setPreviewItem] = useState(null);
    const [isUserTextExpanded, setIsUserTextExpanded] = useState(true);

    const handleCopy = () => {
        navigator.clipboard.writeText(turn.text || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const userText = turn.text || '';
    const isLongUserText = userText.length > 280 || (userText.match(/\n/g) || []).length >= 4;

    if (isUser) {
        return (
            <div className="chat-turn-item flex justify-end w-full min-w-0 max-w-full">
                <div className="max-w-[90%] sm:max-w-[82%] min-w-0 rounded-xl bg-[#1D2024]/90 border border-[#30343A] shadow-sm px-4 py-3 text-xs sm:text-sm text-[#E8EAED] break-words [overflow-wrap:anywhere] overflow-hidden space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-[#A0A6AF] font-mono border-b border-[#262A30] pb-1.5">
                        <span className="font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            User Prompt
                        </span>
                        {timeStr && <span className="tabular-nums text-zinc-400">{timeStr}</span>}
                    </div>

                    {turn.attachments && turn.attachments.some(a => a.is_image) && (
                        <div className="flex flex-wrap gap-2 pt-0.5">
                            {turn.attachments.filter(a => a.is_image).map((att, idx) => (
                                <button
                                    key={att.id || idx}
                                    type="button"
                                    onClick={() => setPreviewItem(att)}
                                    title="Click to inspect image"
                                    className="block rounded-lg overflow-hidden border border-[#30343A] hover:border-blue-500/50 max-w-[180px] max-h-44 cursor-zoom-in text-left transition"
                                >
                                    <img
                                        src={att.url}
                                        alt={att.original_name || att.filename}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {turn.attachments && turn.attachments.some(a => !a.is_image) && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {turn.attachments.filter(a => !a.is_image).map((att, idx) => (
                                <a
                                    key={att.id || idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101113] hover:bg-[#17191C] border border-[#30343A] hover:border-cyan-500/30 text-xs text-[#E8EAED] transition max-w-full truncate"
                                >
                                    <FileIcon path={att.original_name || att.filename} className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate font-mono text-[11px]">{att.original_name || att.filename}</span>
                                    {att.size && (
                                        <span className="text-[9px] text-[#A0A6AF] shrink-0 font-mono tabular-nums">
                                            ({formatFileSize(att.size)})
                                        </span>
                                    )}
                                </a>
                            ))}
                        </div>
                    )}

                    {userText && (
                        <div className="space-y-1.5">
                            <div className={`whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] ${
                                !isUserTextExpanded && isLongUserText ? 'max-h-28 overflow-hidden relative' : ''
                            }`}>
                                <p>{userText}</p>
                            </div>
                            {isLongUserText && (
                                <div className="flex items-center justify-between pt-1 border-t border-[#262A30] text-xs text-[#A0A6AF]">
                                    <button
                                        type="button"
                                        onClick={() => setIsUserTextExpanded(v => !v)}
                                        className="font-medium text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition flex items-center gap-1"
                                    >
                                        <span>{isUserTextExpanded ? 'Collapse message' : 'Expand full message'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-1.5 py-0.5 rounded hover:bg-[#23272D] text-[11px] transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <div className="w-3 h-3 text-blue-400">{copied ? Icon.check : Icon.copy}</div>
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            )}
                            {!isLongUserText && (
                                <div className="flex items-center justify-end pt-1 border-t border-[#262A30] text-xs text-[#A0A6AF]">
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-1.5 py-0.5 rounded hover:bg-[#23272D] text-[11px] transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <div className="w-3 h-3 text-blue-400">{copied ? Icon.check : Icon.copy}</div>
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AttachmentLightbox item={previewItem} onClose={() => setPreviewItem(null)} />
            </div>
        );
    }

    let streamItems = turn.items;
    if (!streamItems || streamItems.length === 0) {
        streamItems = [];
        if (turn.thinking) {
            streamItems.push({
                id: 'th-synth',
                type: 'thought',
                title: 'Thought for 1s',
                text: turn.thinking
            });
        }
        if (turn.steps) {
            turn.steps.forEach((s, sidx) => {
                streamItems.push({
                    id: s.id || `act-${sidx}`,
                    step_id: s.step_id,
                    type: 'action',
                    kind: s.kind || 'generic',
                    verb: s.verb || (s.kind === 'analyze' ? 'Analyzed' : s.kind === 'search' ? 'Searched' : s.kind === 'command' ? 'Ran' : s.kind === 'edit' ? 'Edited' : 'Used'),
                    target: s.target || s.file_short || s.command || s.summary || s.name,
                    command: s.command,
                    cwd: s.cwd,
                    cwd_short: s.cwd_short,
                    file: s.file,
                    extra: s.extra,
                    status: s.status,
                    requires_permission: s.requires_permission,
                    requires_native_ide: s.requires_native_ide,
                    permission_type: s.permission_type,
                    permission_title: s.permission_title,
                    permission_desc: s.permission_desc,
                    approval_options: s.approval_options,
                    approval_decision: s.approval_decision,
                    question_data: s.question_data
                });
            });
        }
    }

    const hasStream = streamItems.length > 0 || turn.is_working;

    return (
        <div className="chat-turn-item flex justify-start w-full min-w-0 max-w-full overflow-hidden">
            <div className="w-full min-w-0 rounded-xl bg-[#17191C]/90 border border-[#30343A] shadow-sm p-3.5 sm:p-4 text-xs sm:text-sm text-[#E8EAED] space-y-3 overflow-hidden break-words [overflow-wrap:anywhere]">
                <div className="flex items-center gap-2 pb-2 border-b border-[#262A30] text-xs text-[#A0A6AF]">
                    <span className={`w-2 h-2 rounded-full ${turn.is_working ? 'bg-cyan-400 pulse-live ring-2 ring-cyan-400/30' : 'bg-emerald-400 ring-2 ring-emerald-400/20'}`} />
                    <span className="font-semibold text-[#E8EAED] tracking-tight">Antigravity Agent</span>
                    {turn.is_working && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                            streaming
                        </span>
                    )}
                    {timeStr && (
                        <span className="text-[10px] text-[#747C87] font-mono tabular-nums ml-auto">{timeStr}</span>
                    )}
                </div>

                {hasStream && (
                    <div className="space-y-1.5 py-0.5 select-text">
                        {streamItems.map((item, itemIdx) => {
                            const itemKey = item.step_id || `${turn.id || turnIndex}-${item.id || itemIdx}`;
                            const isLiveExecuting = item.kind === 'command' && item.exit_code === undefined && (item.status !== 'done' || turn.is_working);
                            return (
                                <StreamItem
                                    key={itemKey}
                                    item={item}
                                    itemKey={itemKey}
                                    isOpen={openItemIds.has(itemKey) || isLiveExecuting}
                                    approvalState={approvals[itemKey] || item.approval_decision}
                                    isWorking={turn.is_working}
                                    onToggle={onToggleItem}
                                    onApprove={onApprove}
                                    onOpenFile={onOpenFile}
                                />
                            );
                        })}

                        {turn.is_working && (
                            <div className="pt-1.5 space-y-1.5 font-sans">
                                {turn.active_command ? (
                                    <div className="flex select-none flex-row items-center justify-between gap-x-2 border border-blue-500/30 bg-[#101113] rounded-lg p-2 px-3 shadow-inner">
                                        <div className="flex min-w-0 flex-1 items-center gap-x-2">
                                            <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                                            <span className="break-all font-mono text-xs text-cyan-200 leading-relaxed">
                                                {turn.active_command}
                                            </span>
                                        </div>
                                        {onStop && (
                                            <button
                                                type="button"
                                                onClick={onStop}
                                                title="Cancel running command"
                                                className="p-1 rounded hover:bg-rose-500/15 text-[#A0A6AF] hover:text-rose-400 transition cursor-pointer shrink-0"
                                            >
                                                <div className="w-3.5 h-3.5">{Icon.x}</div>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-cyan-400/90 text-xs py-0.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-live" />
                                        <span>Working on solution...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {turn.text && (
                    <MarkdownView content={turn.text} onOpenFile={onOpenFile} />
                )}

                {turn.text && (
                    <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-[#262A30] text-[#747C87]">
                        <button
                            type="button"
                            onClick={handleCopy}
                            title="Copy response"
                            className="p-1.5 rounded hover:text-emerald-400 hover:bg-[#1D2024] transition cursor-pointer"
                        >
                            {copied ? (
                                <div className="w-3.5 h-3.5 text-emerald-400">{Icon.check}</div>
                            ) : (
                                <div className="w-3.5 h-3.5">{Icon.copy}</div>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setReaction(prev => (prev === 'up' ? null : 'up'))}
                            title="Helpful response"
                            className={`p-1.5 rounded transition cursor-pointer ${reaction === 'up' ? 'text-blue-400 bg-blue-500/15' : 'hover:text-[#E8EAED] hover:bg-[#1D2024]'}`}
                        >
                            <div className="w-3.5 h-3.5">{Icon.thumbsUp}</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setReaction(prev => (prev === 'down' ? null : 'down'))}
                            title="Needs improvement"
                            className={`p-1.5 rounded transition cursor-pointer ${reaction === 'down' ? 'text-rose-400 bg-rose-500/15' : 'hover:text-[#E8EAED] hover:bg-[#1D2024]'}`}
                        >
                            <div className="w-3.5 h-3.5">{Icon.thumbsDown}</div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ChatTurn;
