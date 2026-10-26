import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';

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
    onOpenFiles
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!mobileMenuOpen) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMobileMenuOpen(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [mobileMenuOpen]);

    const handleAction = (actionFn) => {
        setMobileMenuOpen(false);
        if (actionFn) actionFn();
    };

    return (
        <header className="aw-landscape-compact-header relative w-full px-2.5 sm:px-4 lg:px-6 py-2 bg-[#17191C] border-b border-[#30343A] flex items-center justify-between gap-2 shrink-0 select-none z-30">
            <div className="flex items-center gap-2.5 min-w-0 shrink">
                <div className="w-7 h-7 rounded-md bg-[#1D2024] border border-[#30343A] flex items-center justify-center text-[#E8EAED] text-[11px] font-mono font-semibold shrink-0">
                    AW
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-xs sm:text-sm font-semibold text-[#E8EAED] tracking-tight leading-none truncate max-w-[105px] xs:max-w-[140px] sm:max-w-[200px] lg:max-w-[320px]">
                            {targetTitle || 'AgentWatch'}
                        </h1>
                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-[#1D2024] border border-[#30343A] text-[#A0A6AF] text-[10px] font-mono shrink-0">
                            v2.0
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#A0A6AF] font-mono">
                        <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isConnected ? 'bg-[#79B89A] pulse-live' : 'bg-[#747C87]'
                            }`}
                        />
                        <span className="truncate">
                            {isConnected ? 'CDP Live · 9000' : 'Standby'}
                        </span>
                    </div>
                </div>
            </div>

            <div
                role="tablist"
                aria-label="Workspace View Mode"
                className="flex items-center p-0.5 rounded-md bg-[#101113] border border-[#30343A] text-xs shrink-0"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'chat'}
                    onClick={() => onViewModeChange('chat')}
                    className={`aw-focus-ring group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                        viewMode === 'chat'
                            ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A] shadow-sm'
                            : 'text-[#A0A6AF] hover:text-[#E8EAED] border border-transparent'
                    }`}
                >
                    <div className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        viewMode === 'chat' ? 'text-blue-400' : 'text-blue-400/70 group-hover:text-blue-400'
                    }`}>{Icon.chat}</div>
                    <span>Chat</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'screen'}
                    onClick={() => onViewModeChange('screen')}
                    className={`aw-focus-ring group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                        viewMode === 'screen'
                            ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A] shadow-sm'
                            : 'text-[#A0A6AF] hover:text-[#E8EAED] border border-transparent'
                    }`}
                >
                    <div className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        viewMode === 'screen' ? 'text-cyan-400' : 'text-cyan-400/70 group-hover:text-cyan-400'
                    }`}>{Icon.screen}</div>
                    <span className="hidden sm:inline">IDE Screen</span>
                    <span className="sm:hidden">IDE</span>
                </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" ref={menuRef}>
                <nav aria-label="Diagnostic Tools" className="hidden md:flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onOpenFiles}
                        title="Project Files & Explorer"
                        className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 shrink-0 transition-all">
                            {Icon.folder}
                        </div>
                        <span className="hidden xl:inline">Files</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenTaskManager}
                        title="Task Manager & Process Monitor"
                        className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 shrink-0 transition-all">
                            {Icon.activity}
                        </div>
                        <span className="hidden xl:inline">Processes</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenTimeline}
                        title="Activity Timeline & Traces"
                        className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:bg-violet-500/20 group-hover:border-violet-500/40 shrink-0 transition-all">
                            {Icon.timeline}
                        </div>
                        <span className="hidden xl:inline">Timeline</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenLogs}
                        title="System & Server Logs"
                        className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 shrink-0 transition-all">
                            {Icon.terminal}
                        </div>
                        <span className="hidden xl:inline">Logs</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenRecovery}
                        title="Recovery Center & Diagnostics"
                        className="aw-focus-ring group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 shrink-0 transition-all">
                            {Icon.shield}
                        </div>
                        <span className="hidden xl:inline">Recovery</span>
                        {recoveryCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[10px] font-mono tabular-nums border border-amber-500/35">
                                {recoveryCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onOpenHistory}
                        title="Conversation History"
                        className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
                    >
                        <div className="w-4 h-4 p-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 group-hover:bg-sky-500/20 group-hover:border-sky-500/40 shrink-0 transition-all">
                            {Icon.history}
                        </div>
                        <span className="hidden xl:inline">History</span>
                    </button>
                </nav>

                <div className="md:hidden">
                    <button
                        type="button"
                        aria-label="Open tools menu"
                        aria-expanded={mobileMenuOpen}
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        className={`aw-focus-ring p-1.5 rounded-md border transition cursor-pointer ${
                            mobileMenuOpen
                                ? 'bg-[#1D2024] text-[#E8EAED] border-[#30343A]'
                                : 'text-[#A0A6AF] hover:text-[#E8EAED] border-transparent hover:bg-[#1D2024]'
                        }`}
                    >
                        <div className="w-4 h-4">{Icon.moreHorizontal}</div>
                    </button>

                    {mobileMenuOpen && (
                        <div
                            role="menu"
                            className="absolute right-2.5 top-full mt-1.5 w-60 bg-[#17191C] border border-[#30343A] rounded-lg shadow-xl p-1.5 space-y-0.5 z-50"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenFiles)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="w-5 h-5 p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                    {Icon.folder}
                                </div>
                                <span>Project Files Explorer</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenTaskManager)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="w-5 h-5 p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                                    {Icon.activity}
                                </div>
                                <span>Task Manager & Processes</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenTimeline)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="w-5 h-5 p-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                                    {Icon.timeline}
                                </div>
                                <span>Activity Timeline</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenLogs)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="w-5 h-5 p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                    {Icon.terminal}
                                </div>
                                <span>System & Server Logs</span>
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenRecovery)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                        {Icon.shield}
                                    </div>
                                    <span>Recovery Center</span>
                                </div>
                                {recoveryCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[10px] font-mono tabular-nums border border-amber-500/35">
                                        {recoveryCount}
                                    </span>
                                )}
                            </button>
                            <div className="h-px bg-[#262A30] my-1" />
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAction(onOpenHistory)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer text-left"
                            >
                                <div className="w-5 h-5 p-1 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 shrink-0">
                                    {Icon.history}
                                </div>
                                <span>Past Conversations</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
