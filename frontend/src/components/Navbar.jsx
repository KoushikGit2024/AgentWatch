import React from 'react';
import { Icon } from '../constants/icons';

export default function Navbar({
    targetTitle,
    isConnected,
    viewMode,
    onViewModeChange,
    onOpenTimeline,
    onOpenLogs,
    onOpenRecovery,
    recoveryCount = 0,
    onOpenHistory,
    onNewChat,
    onStop
}) {
    return (
        <header className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
            {/* Left: Logo & Status */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/40">
                    AW
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-semibold text-zinc-100 tracking-tight leading-none">
                            {targetTitle || 'AgentWatch'}
                        </h1>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                            Agent Panel
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 pulse-live' : 'bg-zinc-500'}`} />
                        <span>{isConnected ? 'Connected to Antigravity (CDP 9000)' : 'Antigravity Offline'}</span>
                    </div>
                </div>
            </div>

            {/* Middle: View Mode Toggle (Agent Chat vs IDE Screen) */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                <button
                    type="button"
                    onClick={() => onViewModeChange('chat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                        viewMode === 'chat'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <div className="w-3.5 h-3.5">{Icon.chat}</div>
                    <span>Agent Chat</span>
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange('screen')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                        viewMode === 'screen'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <div className="w-3.5 h-3.5">{Icon.screen}</div>
                    <span>IDE Screen</span>
                </button>
            </div>

            {/* Right: Feature Toolbars */}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onOpenTimeline}
                    title="Execution Timeline & Traces"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.timeline}</div>
                </button>
                <button
                    type="button"
                    onClick={onOpenLogs}
                    title="Live Server & System Logs"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.terminal}</div>
                </button>
                <button
                    type="button"
                    onClick={onOpenRecovery}
                    title="Recovery Center & Diagnostics"
                    className="relative p-2 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.shield}</div>
                    {recoveryCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                    {recoveryCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={onOpenHistory}
                    title="Conversation History"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.history}</div>
                </button>
                <button
                    type="button"
                    onClick={onNewChat}
                    title="Start New Conversation"
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.plus}</div>
                </button>
                <button
                    type="button"
                    onClick={onStop}
                    title="Emergency Stop Agent Execution"
                    className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition active:scale-95 ml-1 cursor-pointer"
                >
                    <div className="w-4 h-4">{Icon.stop}</div>
                </button>
            </div>
        </header>
    );
}
