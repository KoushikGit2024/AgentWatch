import React, { forwardRef } from 'react';
import { Icon } from '../../constants/icons';
import ChatTurn from './ChatTurn';

const ChatStream = forwardRef(function ChatStream({
    chatMessages,
    openItemIds,
    approvals,
    isScrolledUp,
    onToggleItem,
    onApprove,
    onScroll,
    onScrollToBottom,
    messagesEndRef
}, ref) {
    return (
        <div className="relative flex-1 min-h-0">
            <div
                ref={ref}
                onScroll={onScroll}
                className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-4 select-text"
            >
                {/* Bottom-anchoring spacer pushes conversation directly above composer */}
                <div className="min-h-full flex flex-col justify-end">
                    <div className="space-y-4">
                        {/* Empty Conversation Welcome State */}
                        {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-blue-400 shadow-inner">
                                    <div className="w-5 h-5">{Icon.sparkles}</div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold text-zinc-200">Antigravity Agent Ready</h3>
                                    <p className="text-xs text-zinc-500 max-w-sm">
                                        Connected to your live Antigravity IDE workspace. Real-time updates, interactive decision prompts, and conversation turns appear directly here.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Render Conversation Turns */}
                        {chatMessages.map((turn, idx) => (
                            <ChatTurn
                                key={turn.id || idx}
                                turn={turn}
                                turnIndex={idx}
                                openItemIds={openItemIds}
                                approvals={approvals}
                                onToggleItem={onToggleItem}
                                onApprove={onApprove}
                            />
                        ))}

                        <div ref={messagesEndRef} className="h-1" />
                    </div>
                </div>
            </div>

            {/* Smart Scroll: Floating Jump to Bottom Button */}
            {isScrolledUp && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                        type="button"
                        onClick={onScrollToBottom}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs shadow-lg backdrop-blur cursor-pointer select-none transition active:scale-95"
                    >
                        <div className="w-3.5 h-3.5 text-zinc-400">{Icon.chevronDown}</div>
                        <span className="font-medium text-[11px]">Jump to latest</span>
                    </button>
                </div>
            )}
        </div>
    );
});

export default ChatStream;
