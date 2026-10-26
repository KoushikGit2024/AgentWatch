import React from 'react';

export function SettingsBar({ mode, model, chatStats, onOpenModeModal, onOpenModelModal }) {
  return (
    <div className="bg-zinc-950 px-4 py-2 flex items-center gap-2 overflow-x-auto border-b border-zinc-800 shrink-0 whitespace-nowrap text-xs text-zinc-400 select-none">
      <button
        type="button"
        onClick={onOpenModeModal}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition"
      >
        <svg
          className="w-3.5 h-3.5 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span className="font-medium">{mode}</span>
      </button>
      <button
        type="button"
        onClick={onOpenModelModal}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition"
      >
        <svg
          className="w-3.5 h-3.5 text-zinc-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx={12} cy={12} r={10} />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="font-medium">{model}</span>
      </button>
      <div className="ml-auto text-[11px] text-zinc-500 font-mono tracking-tight select-none">
        {chatStats}
      </div>
    </div>
  );
}
