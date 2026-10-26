import React from 'react';

export function Viewport({ snapshotData, onStartNewChat, chatContainerRef }) {
  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950 font-sans leading-relaxed overscroll-contain select-text"
      ref={chatContainerRef}
    >
      {snapshotData && snapshotData.html ? (
        <div
          className="chat-content max-w-3xl mx-auto w-full space-y-3"
          dangerouslySetInnerHTML={{ __html: snapshotData.html }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1={9} y1={10} x2={15} y2={10} />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-zinc-200">No Active Chat Open</h2>
          <p className="text-xs text-zinc-500 max-w-xs">
            Start a new conversation or ask Antigravity to begin working.
          </p>
          <button
            type="button"
            onClick={onStartNewChat}
            className="mt-2 px-3.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition active:scale-95"
          >
            Start New Conversation
          </button>
        </div>
      )}
    </div>
  );
}
