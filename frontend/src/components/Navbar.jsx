import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';

/**
 * High-performance, responsive navigation header for AgentWatch.
 * Scales seamlessly across mobile (320px+), tablet, laptop, and ultra-wide displays (1920px+).
 * Features rich visual affordances, distinct icons, and full tool labels on wider screens.
 */
export default function Navbar({
    targetTitle,
    isConnected,
    viewMode,
    onViewModeChange,
    onOpenTimeline,
    onOpenLogs,
    onOpenTaskManager,
    onOpenRecovery,
    recoveryCount = 0,
    onOpenHistory,
    onNewChat,
    onStop
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close mobile dropdown on outside click
    useEffect(() => {
        if (!mobileMenuOpen) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    const handleAction = (actionFn) => {
        setMobileMenuOpen(false);
        if (actionFn) actionFn();
    };

    return (
        <header className="relative w-full px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/90 flex items-center justify-between shrink-0 select-none z-30 shadow-xs">
            {/* ─── Left Section: Logo, Title & Status ─── */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-[11px] sm:text-xs font-bold shadow-md shadow-blue-900/40 shrink-0">
                    AW
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-xs sm:text-sm font-bold text-zinc-100 tracking-tight leading-none truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[280px]">
                            {targetTitle || 'AgentWatch'}
                        </h1>
                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-400 text-[10px] font-mono shrink-0">
                            v2.0
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-zinc-400 font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 pulse-live' : 'bg-zinc-500'}`} />
                        <span className="truncate">
                            {isConnected ? 'Antigravity Live · Port 9000' : 'Offline / Standby'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Center Section: View Mode Toggle (Chat vs IDE Screen) ─── */}
            <div className="flex items-center p-0.5 sm:p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs shrink-0 mx-1.5">
                <button
                    type="button"
                    onClick={() => onViewModeChange('chat')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        viewMode === 'chat'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <div className="w-3.5 h-3.5 shrink-0">{Icon.chat}</div>
                    <span>Agent Chat</span>
                </button>
                <button
                    type="button"
                    onClick={() => onViewModeChange('screen')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        viewMode === 'screen'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    <div className="w-3.5 h-3.5 shrink-0">{Icon.screen}</div>
                    <span className="hidden sm:inline">IDE Screen</span>
                    <span className="sm:hidden">IDE</span>
                </button>
            </div>

            {/* ─── Right Section: Diagnostic Tools & Action Controls ─── */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" ref={menuRef}>
                {/* Long Screen / Desktop Toolbar (Visible lg+: Full labeled buttons; md+: Icon buttons) */}
                <div className="hidden md:flex items-center gap-1 lg:gap-1.5">
                    {/* Task Manager Button */}
                    <button
                        type="button"
                        onClick={onOpenTaskManager}
                        title="System Task Manager & Process Monitor"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-blue-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    >
                        <div className="w-4 h-4 text-blue-400 shrink-0">{Icon.activity}</div>
                        <span className="hidden xl:inline text-zinc-200">Task Manager</span>
                    </button>

                    {/* Timeline Button */}
                    <button
                        type="button"
                        onClick={onOpenTimeline}
                        title="Execution Timeline & Traces"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-indigo-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    >
                        <div className="w-4 h-4 text-indigo-400 shrink-0">{Icon.timeline}</div>
                        <span className="hidden xl:inline text-zinc-200">Timeline</span>
                    </button>

                    {/* Logs Button */}
                    <button
                        type="button"
                        onClick={onOpenLogs}
                        title="Live Server & System Logs"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    >
                        <div className="w-4 h-4 text-emerald-400 shrink-0">{Icon.terminal}</div>
                        <span className="hidden xl:inline text-zinc-200">Logs</span>
                    </button>

                    {/* Recovery Center Button */}
                    <button
                        type="button"
                        onClick={onOpenRecovery}
                        title="Recovery Center & Diagnostics"
                        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    >
                        <div className="w-4 h-4 text-amber-400 shrink-0">{Icon.shield}</div>
                        <span className="hidden xl:inline text-zinc-200">Recovery</span>
                        {recoveryCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                                {recoveryCount}
                            </span>
                        )}
                    </button>

                    {/* Past Conversations Button */}
                    <button
                        type="button"
                        onClick={onOpenHistory}
                        title="Conversation History"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/60 transition active:scale-95 cursor-pointer"
                    >
                        <div className="w-4 h-4 text-zinc-400 shrink-0">{Icon.history}</div>
                        <span className="hidden xl:inline text-zinc-200">History</span>
                    </button>
                </div>

                {/* Divider between tools and primary actions */}
                <div className="hidden md:block h-4 w-px bg-zinc-800 mx-1" />

                {/* New Chat Button */}
                <button
                    type="button"
                    onClick={onNewChat}
                    title="Start New Conversation"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
                >
                    <div className="w-3.5 h-3.5">{Icon.plus}</div>
                    <span className="hidden sm:inline">New Chat</span>
                </button>

                {/* Emergency Stop Button */}
                <button
                    type="button"
                    onClick={onStop}
                    title="Stop Agent Execution"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                >
                    <div className="w-3.5 h-3.5">{Icon.stop}</div>
                    <span className="hidden sm:inline">Stop</span>
                </button>

                {/* Mobile Overflow Menu Toggle (< md) */}
                <div className="md:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        title="More Tools"
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            mobileMenuOpen
                                ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/60'
                        }`}
                    >
                        <div className="w-4 h-4">{Icon.moreHorizontal}</div>
                    </button>

                    {/* Mobile Dropdown Menu */}
                    {mobileMenuOpen && (
                        <div className="absolute right-3 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                            <button
                                type="button"
                                onClick={() => handleAction(onOpenTaskManager)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-blue-300 transition cursor-pointer text-left"
                            >
                                <div className="w-4 h-4 text-blue-400 shrink-0">{Icon.activity}</div>
                                <span>Task Manager & Processes</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction(onOpenTimeline)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition cursor-pointer text-left"
                            >
                                <div className="w-4 h-4 text-indigo-400 shrink-0">{Icon.timeline}</div>
                                <span>Activity Timeline</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction(onOpenLogs)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition cursor-pointer text-left"
                            >
                                <div className="w-4 h-4 text-emerald-400 shrink-0">{Icon.terminal}</div>
                                <span>System & Server Logs</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction(onOpenRecovery)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-4 h-4 text-amber-400 shrink-0">{Icon.shield}</div>
                                    <span>Recovery Center</span>
                                </div>
                                {recoveryCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                                        {recoveryCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAction(onOpenHistory)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition cursor-pointer text-left border-t border-zinc-800/80 pt-1.5 mt-1"
                            >
                                <div className="w-4 h-4 text-zinc-400 shrink-0">{Icon.history}</div>
                                <span>Past Conversations</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
