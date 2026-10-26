import React, { forwardRef, useRef, useLayoutEffect } from 'react';
import { Icon } from '../../constants/icons';
import ChatTurn from './ChatTurn';

const ChatStream = forwardRef(function ChatStream({
    chatMessages,
    hasMoreHistory,
    isLoadingOlder,
    onLoadOlder,
    openItemIds,
    approvals,
    isScrolledUp,
    onToggleItem,
    onApprove,
    onOpenFile,
    onScroll,
    onScrollToBottom,
    messagesEndRef,
    onStop
}, ref) {
    const prevScrollHeightRef = useRef(0);
    const prevScrollTopRef = useRef(0);
    const prevFirstTurnIdRef = useRef(null);

    // Preserve exact scroll position when an older block is prepended at the top
    useLayoutEffect(() => {
        const el = ref?.current;
        const currentFirstId = chatMessages[0]?.id || null;
        if (
            el &&
            prevFirstTurnIdRef.current &&
            currentFirstId &&
            currentFirstId !== prevFirstTurnIdRef.current &&
            prevScrollHeightRef.current > 0
        ) {
            const heightDelta = el.scrollHeight - prevScrollHeightRef.current;
            if (heightDelta > 0) {
                el.scrollTop = prevScrollTopRef.current + heightDelta;
            }
            prevScrollHeightRef.current = 0;
        }
        prevFirstTurnIdRef.current = currentFirstId;
    }, [chatMessages, ref]);

    const triggerLoadOlder = () => {
        if (!hasMoreHistory || isLoadingOlder || !onLoadOlder) return;
        const el = ref?.current;
        if (el) {
            prevScrollHeightRef.current = el.scrollHeight;
            prevScrollTopRef.current = el.scrollTop;
        }
        onLoadOlder();
    };

    const handleContainerScroll = (e) => {
        if (onScroll) onScroll(e);
        const el = e.currentTarget;
        if (!el) return;
        // When user scrolls near top (within 75px), request the next older block
        if (el.scrollTop <= 75 && hasMoreHistory && !isLoadingOlder) {
            triggerLoadOlder();
        }
    };

    return (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            <div
                ref={ref}
                onScroll={handleContainerScroll}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden w-full px-3 sm:px-4 py-4 space-y-4 select-text"
            >
                <div className="min-h-full w-full min-w-0 max-w-full flex flex-col justify-end">
                    <div className="space-y-4 w-full min-w-0 max-w-full">
                        {/* Upward Scroll Lazy-Loading Banner / Sentinel */}
                        {chatMessages.length > 0 && (
                            <div className="flex justify-center py-1">
                                {isLoadingOlder ? (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                        <span>Loading earlier conversation block…</span>
                                    </div>
                                ) : hasMoreHistory ? (
                                    <button
                                        type="button"
                                        onClick={triggerLoadOlder}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-blue-400 font-medium transition cursor-pointer"
                                    >
                                        <span>Scroll up or tap to load earlier messages</span>
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                                        Beginning of conversation
                                    </span>
                                )}
                            </div>
                        )}

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
                                turnIndex={turn.turn_index ?? idx}
                                openItemIds={openItemIds}
                                approvals={approvals}
                                onToggleItem={onToggleItem}
                                onApprove={onApprove}
                                onOpenFile={onOpenFile}
                                onStop={onStop}
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
