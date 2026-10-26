import React from 'react';
import { X } from 'lucide-react';

export function HistoryDrawer({ isOpen, onClose, chats, isLoading, onSelectChat }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 bg-zinc-950/70">
          <h2 className="text-sm font-semibold text-zinc-100 truncate">Past Conversations</h2>
          <button
            onClick={onClose}
            aria-label="Close past conversations"
            title="Close"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700/60 sm:border-transparent transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-500 text-xs">
              <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
              <span>Loading history...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-500">
              No past conversations found.
            </div>
          ) : (
            chats.map((c, i) => (
              <div
                key={i}
                onClick={() => onSelectChat(c.title)}
                className="p-2.5 rounded-md bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 cursor-pointer transition"
              >
                <h4 className="text-xs font-medium text-zinc-200 truncate">{c.title}</h4>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
