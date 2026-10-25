import React, { useState } from 'react';
import { Icon } from '../../constants/icons';

/**
 * QueuedMessagesCard
 * Matches the Antigravity IDE workbench Queued Messages design:
 * - Collapsible card with count badge and subtitle "Sends after agent finishes working"
 * - List of queued messages with Send Now, Edit, and Delete action buttons
 * - Inline edit mode for adjusting prompt text before dispatch
 */
export default function QueuedMessagesCard({
    messages = [],
    onSendNow,
    onDelete,
    onEdit,
    isActionPending = false
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');

    if (!messages || messages.length === 0) return null;

    const startEditing = (item) => {
        setEditingId(item.id);
        setEditText(item.text);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
    };

    const saveEdit = (item) => {
        if (!editText.trim()) return;
        onEdit(item, editText.trim());
        setEditingId(null);
    };

    return (
        <div
            data-testid="queued-messages-card"
            className="flex flex-col p-2.5 pl-3 rounded-2xl border border-zinc-800 bg-zinc-900/95 max-h-[300px] overflow-y-auto shadow-md gap-1 font-sans mx-3 sm:mx-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
            {/* Header with Title, Count Badge, Description, and Collapse Toggle */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 select-none overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                    <span className="text-zinc-200 font-medium shrink-0">Queued Messages</span>
                    <span className="shrink-0 text-[10px] bg-zinc-800 text-zinc-300 rounded-full px-1.5 py-0.5 leading-none font-mono border border-zinc-750">
                        {messages.length}
                    </span>
                    <span className="text-zinc-400 text-xs overflow-hidden text-ellipsis hidden sm:inline">
                        Sends after agent finishes working
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCollapsed(prev => !prev)}
                    className="inline-flex items-center justify-center font-medium transition-colors select-none outline-none cursor-pointer disabled:opacity-50 bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-6 w-6 shrink-0 rounded-md"
                    title={isCollapsed ? 'Expand queue' : 'Collapse queue'}
                >
                    <div className={`w-3.5 h-3.5 transition-transform duration-150 ${isCollapsed ? 'rotate-180' : ''}`}>
                        {Icon.chevronDown}
                    </div>
                </button>
            </div>

            {/* List of Queued Messages */}
            {!isCollapsed && (
                <div className="flex flex-col divide-y divide-zinc-850 pt-1">
                    {messages.map((item, idx) => {
                        const isCurrentEditing = editingId === item.id;
                        return (
                            <div
                                key={item.id || idx}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 w-full py-1.5 min-h-7"
                            >
                                {isCurrentEditing ? (
                                    <div className="flex-1 w-full flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEdit(item);
                                                if (e.key === 'Escape') cancelEditing();
                                            }}
                                            autoFocus
                                            className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-950 border border-blue-500/80 text-zinc-100 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => saveEdit(item)}
                                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 flex flex-row items-center gap-1.5 overflow-hidden">
                                            <span className="text-xs text-zinc-200 line-clamp-2 break-all">
                                                {item.text}
                                            </span>
                                            {item.source === 'local_buffer' && (
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono shrink-0">
                                                    buffered
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0 self-end sm:self-center">
                                            <div data-testid="queued-decorators" className="flex items-center gap-0.5">
                                                {/* Send Now Button */}
                                                <button
                                                    type="button"
                                                    disabled={isActionPending}
                                                    onClick={() => onSendNow(item)}
                                                    aria-label="Send Now"
                                                    title="Send Now (Dispatch immediately)"
                                                    className="inline-flex items-center justify-center font-medium transition-colors select-none outline-none cursor-pointer disabled:opacity-40 bg-transparent text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 h-6 w-6 shrink-0 rounded-md"
                                                >
                                                    <div className="w-3.5 h-3.5">{Icon.send}</div>
                                                </button>

                                                {/* Edit Button */}
                                                <button
                                                    type="button"
                                                    disabled={isActionPending}
                                                    onClick={() => startEditing(item)}
                                                    aria-label="Edit"
                                                    title="Edit queued message"
                                                    className="inline-flex items-center justify-center font-medium transition-colors select-none outline-none cursor-pointer disabled:opacity-40 bg-transparent text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 h-6 w-6 shrink-0 rounded-md"
                                                >
                                                    <div className="w-3.5 h-3.5">{Icon.edit}</div>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    type="button"
                                                    disabled={isActionPending}
                                                    onClick={() => onDelete(item)}
                                                    aria-label="Delete"
                                                    title="Delete queued message"
                                                    className="inline-flex items-center justify-center font-medium transition-colors select-none outline-none cursor-pointer disabled:opacity-40 bg-transparent text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 h-6 w-6 shrink-0 rounded-md"
                                                >
                                                    <div className="w-3.5 h-3.5">{Icon.trash}</div>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
