import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { formatFileSize } from './AttachmentPreview';
import StreamItem from './StreamItem';
import MarkdownView from '../MarkdownView';

export default function ChatTurn({
    turn,
    turnIndex,
    openItemIds,
    approvals,
    onToggleItem,
    onApprove
}) {
    const isUser = turn.role === 'user';
    const timeStr = turn.timestamp
        ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const [copied, setCopied] = useState(false);
    const [reaction, setReaction] = useState(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(turn.text || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    if (isUser) {
        return (
            <div className="flex justify-end w-full min-w-0 max-w-full animate-in fade-in duration-150">
                <div className="max-w-[88%] md:max-w-[85%] min-w-0 rounded-2xl rounded-br-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-md break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden space-y-2">
                    {/* Attached Images */}
                    {turn.attachments && turn.attachments.some(a => a.is_image) && (
                        <div className="flex flex-wrap gap-2 pt-0.5">
                            {turn.attachments.filter(a => a.is_image).map((att, idx) => (
                                <a
                                    key={att.id || idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-xl overflow-hidden border border-blue-400/40 max-w-[200px] max-h-48 shadow"
                                >
                                    <img
                                        src={att.url}
                                        alt={att.original_name || att.filename}
                                        className="w-full h-full object-cover hover:scale-105 transition"
                                    />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Attached Non-Image Files */}
                    {turn.attachments && turn.attachments.some(a => !a.is_image) && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {turn.attachments.filter(a => !a.is_image).map((att, idx) => (
                                <a
                                    key={att.id || idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-700/80 hover:bg-blue-750 border border-blue-400/30 text-xs text-white transition max-w-full truncate"
                                >
                                    <FileIcon path={att.original_name || att.filename} className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate font-mono text-[11px]">{att.original_name || att.filename}</span>
                                    {att.size && (
                                        <span className="text-[9px] text-blue-200 shrink-0 font-sans">
                                            ({formatFileSize(att.size)})
                                        </span>
                                    )}
                                </a>
                            ))}
                        </div>
                    )}

                    {turn.text && (
                        <p className="whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">{turn.text}</p>
                    )}
                    {timeStr && (
                        <span className="block text-right text-[10px] text-blue-200 mt-1">{timeStr}</span>
                    )}
                </div>
            </div>
        );
    }

    // Agent Turn
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
                    type: 'action',
                    kind: s.kind || 'generic',
                    verb: s.verb || (s.kind === 'analyze' ? 'Analyzed' : s.kind === 'search' ? 'Searched' : s.kind === 'command' ? 'Ran' : s.kind === 'edit' ? 'Edited' : 'Used'),
                    target: s.target || s.file_short || s.command || s.summary || s.name,
                    command: s.command,
                    cwd_short: s.cwd_short,
                    file: s.file,
                    extra: s.extra,
                    requires_permission: s.requires_permission,
                    permission_type: s.permission_type,
                    permission_title: s.permission_title,
                    permission_desc: s.permission_desc
                });
            });
        }
    }

    const hasStream = streamItems.length > 0 || turn.is_working;

    return (
        <div className="flex justify-start w-full min-w-0 max-w-full overflow-hidden animate-in fade-in duration-150">
            <div className="max-w-[95%] md:max-w-[88%] w-full min-w-0 rounded-2xl rounded-bl-sm bg-zinc-850 border border-zinc-750/70 p-3.5 sm:p-4 text-sm text-zinc-100 shadow-md space-y-2.5 overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word]">
                {/* Agent Header */}
                <div className="flex items-center gap-2 pb-1 border-b border-zinc-750/40 text-xs text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="font-semibold text-zinc-300">Antigravity Agent</span>
                    {timeStr && (
                        <span className="text-[10px] text-zinc-500 font-mono ml-auto">{timeStr}</span>
                    )}
                </div>

                {/* Chronological Stream */}
                {hasStream && (
                    <div className="space-y-1.5 py-1 select-text">
                        {streamItems.map((item, itemIdx) => {
                            const itemKey = `${turn.id || turnIndex}-${item.id || itemIdx}`;
                            return (
                                <StreamItem
                                    key={itemKey}
                                    item={item}
                                    itemKey={itemKey}
                                    isOpen={openItemIds.has(itemKey)}
                                    approvalState={approvals[itemKey]}
                                    isWorking={turn.is_working}
                                    onToggle={onToggleItem}
                                    onApprove={onApprove}
                                />
                            );
                        })}

                        {/* Working Indicator */}
                        {turn.is_working && (
                            <div className="flex items-center gap-2 text-zinc-400 text-xs pt-1 font-sans">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                <span className="text-zinc-300 font-medium">Working</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Markdown Agent Response */}
                {turn.text && (
                    <MarkdownView content={turn.text} />
                )}

                {/* Response Action Buttons */}
                {turn.text && (
                    <div className="flex items-center justify-end gap-1 pt-1 text-zinc-500">
                        <button
                            type="button"
                            onClick={handleCopy}
                            title="Copy text"
                            className="p-1 rounded-md hover:text-zinc-200 hover:bg-zinc-800 transition"
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
                            title="Good response"
                            className={`p-1 rounded-md transition ${reaction === 'up' ? 'text-blue-400 bg-blue-950/40' : 'hover:text-zinc-200 hover:bg-zinc-800'}`}
                        >
                            <div className="w-3.5 h-3.5">{Icon.thumbsUp}</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setReaction(prev => (prev === 'down' ? null : 'down'))}
                            title="Bad response"
                            className={`p-1 rounded-md transition ${reaction === 'down' ? 'text-rose-400 bg-rose-950/40' : 'hover:text-zinc-200 hover:bg-zinc-800'}`}
                        >
                            <div className="w-3.5 h-3.5">{Icon.thumbsDown}</div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
