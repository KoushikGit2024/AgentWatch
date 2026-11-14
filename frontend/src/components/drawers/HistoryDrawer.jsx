import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

function formatRelativeTime(timestampSec) {
  if (!timestampSec) return '';
  const now = Date.now();
  const diffSec = Math.floor(now / 1000 - timestampSec);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(timestampSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function HistoryDrawer({
  isOpen,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const scrollRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const fetchBatch = useCallback(async (currOffset, query, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const data = await api.getConversations(currOffset, 20, query);
      if (currOffset === 0) {
        setConversations(data.conversations || []);
      } else {
        setConversations(prev => [...prev, ...(data.conversations || [])]);
      }
      setHasMore(Boolean(data.has_more));
      setOffset(currOffset + (data.conversations?.length || 0));
    } catch (err) {
      toast.error('Failed to load conversations: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setOffset(0);
    fetchBatch(0, searchQuery, true);
  }, [isOpen, fetchBatch]);

  const handleSearchChange = e => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setOffset(0);
      fetchBatch(0, val, true);
    }, 280);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setOffset(0);
    fetchBatch(0, '', true);
  };

  const handleScroll = () => {
    if (!scrollRef.current || isLoading || isLoadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      fetchBatch(offset, searchQuery, false);
    }
  };

  const handleSelect = async conv => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await api.switchConversation(conv.conversation_id);
      toast.success(`Switched to: ${conv.title.slice(0, 35)}...`);
      if (onSelectConversation) onSelectConversation(conv.conversation_id, conv.title);
      onClose();
    } catch (err) {
      toast.error('Failed to switch conversation: ' + (err.message || ''));
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      await api.createNewConversation();
      toast.success('Started new conversation');
      if (onNewConversation) onNewConversation();
      onClose();
    } catch (err) {
      toast.error('Could not create new conversation: ' + (err.message || ''));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end transition-opacity select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#121417] border-l border-[#272B30] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#22262B] flex items-center justify-between gap-2 shrink-0 bg-[#16181D]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-amber-400">{Icon.history || Icon.messageSquare}</div>
            <h2 className="text-sm font-semibold text-[#E8EAED] tracking-tight">Conversations</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCreateNew}
              title="New Conversation in Antigravity"
              className="px-2.5 py-1 rounded-md bg-[#7C9FC5]/20 hover:bg-[#7C9FC5]/30 border border-[#7C9FC5]/40 text-xs font-medium text-[#7C9FC5] transition flex items-center gap-1 cursor-pointer"
            >
              <div className="w-3.5 h-3.5">{Icon.plus}</div>
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1E2228] transition cursor-pointer"
            >
              <div className="w-4 h-4">{Icon.close || Icon.x}</div>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="px-4 py-2.5 border-b border-[#22262B] bg-[#121417] shrink-0">
          <div className="relative flex items-center">
            <div className="absolute left-3 w-3.5 h-3.5 text-[#747C87] pointer-events-none">
              {Icon.search}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search conversations, topics, folders..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#181A1F] border border-[#2B3037] focus:border-[#7C9FC5] text-xs text-[#E8EAED] placeholder-[#747C87] outline-none font-sans transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 text-[#747C87] hover:text-[#E8EAED] p-0.5 cursor-pointer"
              >
                <div className="w-3.5 h-3.5">{Icon.close || Icon.x}</div>
              </button>
            )}
          </div>
        </div>

        {/* Conversation List with Infinite Scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 space-y-2 select-text"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#747C87] text-xs font-mono">
              <div className="w-5 h-5 border-2 border-[#7C9FC5] border-t-transparent rounded-full animate-spin" />
              <span>Scanning brain conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#747C87] space-y-1">
              <div className="w-8 h-8 mx-auto text-[#4E545F] mb-2">{Icon.messageSquare}</div>
              <p className="font-medium text-[#A0A6AF]">No conversations found</p>
              <p className="text-[11px] text-[#747C87]">
                {searchQuery ? 'Try matching another keyword or folder' : 'Start a new conversation'}
              </p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.conversation_id === activeConversationId;
              return (
                <div
                  key={conv.conversation_id}
                  onClick={() => handleSelect(conv)}
                  className={`group p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-[#182333] border-[#386291] shadow-sm'
                      : 'bg-[#16181D] border-[#24282F] hover:border-[#333842] hover:bg-[#1A1D23]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`text-xs font-medium line-clamp-2 leading-snug ${
                        isActive ? 'text-[#BFD9FF]' : 'text-[#E8EAED] group-hover:text-[#F3F4F6]'
                      }`}
                    >
                      {conv.title}
                    </h4>
                    {isActive && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#747C87] pt-0.5">
                    <span className="truncate max-w-[170px] text-[#A0A6AF] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C9FC5]" />
                      {conv.workspace || 'Workspace'}
                    </span>
                    <span className="tabular-nums">{formatRelativeTime(conv.updated_at)}</span>
                  </div>
                </div>
              );
            })
          )}

          {/* Lazy Loading Spinner Indicator */}
          {isLoadingMore && (
            <div className="py-3 flex items-center justify-center gap-2 text-[11px] text-[#7C9FC5] font-mono">
              <span className="w-3.5 h-3.5 border-2 border-[#7C9FC5] border-t-transparent rounded-full animate-spin" />
              <span>Loading more conversations...</span>
            </div>
          )}

          {/* Show More Button fallback if user doesn't scroll */}
          {hasMore && !isLoading && !isLoadingMore && (
            <div className="pt-2 pb-1 text-center">
              <button
                type="button"
                onClick={() => fetchBatch(offset, searchQuery, false)}
                className="w-full py-2 rounded-lg bg-[#181B20] hover:bg-[#1F232A] border border-[#2B3038] text-xs font-mono text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
              >
                Show More Conversations...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
