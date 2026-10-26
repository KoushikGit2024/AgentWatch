import React, { forwardRef, useRef, useLayoutEffect } from 'react';
import { Icon } from '../../constants/icons';
import ChatTurn from './ChatTurn';

const ChatStream = forwardRef(function ChatStream(
  {
    chatMessages,
    isChatLoading,
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
    onStop,
  },
  ref
) {
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const prevFirstTurnIdRef = useRef(null);

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

  const handleContainerScroll = e => {
    if (onScroll) onScroll(e);
    const el = e.currentTarget;
    if (!el) return;
    if (el.scrollTop <= 75 && hasMoreHistory && !isLoadingOlder) {
      triggerLoadOlder();
    }
  };

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#101113]">
      <div
        ref={ref}
        onScroll={handleContainerScroll}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden w-full px-2.5 sm:px-4 py-3.5 space-y-3 select-text"
      >
        <div className="min-h-full aw-chat-column flex flex-col justify-end">
          <div className="space-y-3 w-full min-w-0 max-w-full">
            {chatMessages.length > 0 && (
              <div className="flex justify-center py-1">
                {isLoadingOlder ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#17191C] border border-[#30343A] text-[11px] text-[#A0A6AF]">
                    <span className="w-2 h-2 rounded-full bg-[#7C9FC5] animate-ping" />
                    <span>Loading earlier conversation block...</span>
                  </div>
                ) : hasMoreHistory ? (
                  <button
                    type="button"
                    onClick={triggerLoadOlder}
                    className="aw-focus-ring inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#17191C] hover:bg-[#1D2024] border border-[#30343A] text-[11px] text-[#7C9FC5] font-medium transition cursor-pointer"
                  >
                    <span>Load earlier messages</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-[#747C87] uppercase tracking-wider font-mono">
                    Beginning of conversation
                  </span>
                )}
              </div>
            )}

            {chatMessages.length === 0 &&
              (isChatLoading ? (
                <div className="space-y-4 py-8 px-2 max-w-2xl mx-auto w-full">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#17191C]/70 border border-[#2B323F] animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-[#2B323F] rounded w-1/3" />
                      <div className="h-2.5 bg-[#20252E] rounded w-2/3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#17191C]/40 border border-[#2B323F]/50 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-[#2B323F] rounded w-1/4" />
                      <div className="h-2.5 bg-[#20252E] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2.5">
                  <div className="w-9 h-9 rounded-md bg-[#17191C] border border-[#30343A] flex items-center justify-center text-[#7C9FC5]">
                    <div className="w-4 h-4">{Icon.terminal}</div>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-[#E8EAED]">
                      Antigravity Agent Ready
                    </h2>
                    <p className="text-xs text-[#A0A6AF] max-w-sm">
                      Connected to your live Antigravity IDE workspace. Real-time execution traces,
                      interactive decision prompts, and conversation turns appear here.
                    </p>
                  </div>
                </div>
              ))}

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

      {isScrolledUp && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={onScrollToBottom}
            className="aw-focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1D2024] hover:bg-[#23272D] text-[#E8EAED] border border-[#30343A] text-xs shadow-lg cursor-pointer select-none transition"
          >
            <div className="w-3.5 h-3.5 text-[#7C9FC5]">{Icon.chevronDown}</div>
            <span className="font-medium text-[11px]">Jump to latest</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default ChatStream;
