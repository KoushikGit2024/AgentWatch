import React from 'react';

export function Header({
    status,
    isConnected,
    onNewChat,
    onOpenHistory,
    onOpenTimeline,
    onOpenRecovery,
    recoveryCount = 0,
    onStop,
    onRefresh
}) {
    return (
        <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0 z-40 select-none">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                <span>AgentWatch</span>
            </h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={onNewChat}
                    title="New Conversation"
                    className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition active:scale-95"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1={12} y1={5} x2={12} y2={19} />
                        <line x1={5} y1={12} x2={19} y2={12} />
                    </svg>
                </button>
                <button
                    onClick={onOpenHistory}
                    title="Past Conversations"
                    className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx={12} cy={12} r={10} />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </button>
                <button
                    onClick={onOpenTimeline}
                    title="Activity Timeline"
                    className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <line x1={8} y1={6} x2={21} y2={6} />
                        <line x1={8} y1={12} x2={21} y2={12} />
                        <line x1={8} y1={18} x2={21} y2={18} />
                        <line x1={3} y1={6} x2={3.01} y2={6} />
                        <line x1={3} y1={12} x2={3.01} y2={12} />
                        <line x1={3} y1={18} x2={3.01} y2={18} />
                    </svg>
                </button>
                <button
                    onClick={onOpenRecovery}
                    title="Recovery Center"
                    className="relative p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition active:scale-95"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {recoveryCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-zinc-900" />
                    )}
                </button>
                <button
                    onClick={onStop}
                    title="Stop Generation"
                    className="px-2 py-1 text-xs font-semibold rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition active:scale-95"
                >
                    STOP
                </button>
                <button
                    onClick={onRefresh}
                    title="Refresh"
                    className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-medium">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{status}</span>
                </div>
            </div>
        </header>
    );
}
