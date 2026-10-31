import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';
import NotificationMenu from './notifications/NotificationMenu';

export default function Navbar({
  targetTitle,
  workspaceName,
  chatTitle,
  isConnected,
  viewMode,
  onViewModeChange,
  onOpenTimeline,
  onOpenLogs,
  onOpenTaskManager,
  onOpenRecovery,
  recoveryCount = 0,
  onOpenHistory,
  onOpenFiles,
  onOpenPortForwarding,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    const handleEsc = e => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [mobileMenuOpen]);

  const handleAction = actionFn => {
    setMobileMenuOpen(false);
    if (actionFn) actionFn();
  };

  const displayName = workspaceName || targetTitle || 'AgentWatch';

  return (
    <header className="aw-landscape-compact-header relative w-full px-2.5 sm:px-4 lg:px-6 py-2 bg-[#17191C] border-b border-[#30343A] flex items-center justify-between gap-2 shrink-0 select-none z-30">
      <div className="flex items-center gap-2.5 min-w-0 shrink">
        <div className="w-8 h-8 rounded-lg bg-[#14181E] border border-[#30343A] flex items-center justify-center p-1 shrink-0 shadow-inner group hover:border-cyan-500/50 transition-colors overflow-hidden">
          <img
            src="/logo.svg"
            alt="AgentWatch Logo"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1
              title={displayName}
              className="text-xs sm:text-sm font-semibold text-[#E8EAED] tracking-tight leading-none truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[170px] lg:max-w-[260px]"
            >
              {displayName}
            </h1>
            {chatTitle && (
              <>
                <span className="hidden md:inline text-zinc-600 text-xs">/</span>
                <span
                  title={chatTitle}
                  className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-medium truncate max-w-[140px] xl:max-w-[220px]"
                >
                  {chatTitle}
                </span>
              </>
            )}
            <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-[#1D2024] border border-[#30343A] text-[#A0A6AF] text-[10px] font-mono shrink-0">
              v2.0
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#A0A6AF] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isConnected ? 'bg-[#79B89A] pulse-live' : 'bg-[#747C87]'
              }`}
            />
            <span className="truncate">{isConnected ? 'CDP Live · 9000' : 'Standby'}</span>
            {chatTitle && (
              <span
                title={chatTitle}
                className="md:hidden truncate text-zinc-500 max-w-[90px] xs:max-w-[130px]"
              >
                · {chatTitle}
              </span>
            )}
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
          <div
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              viewMode === 'chat' ? 'text-blue-400' : 'text-blue-400/70 group-hover:text-blue-400'
            }`}
          >
            {Icon.chat}
          </div>
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
          <div
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              viewMode === 'screen' ? 'text-cyan-400' : 'text-cyan-400/70 group-hover:text-cyan-400'
            }`}
          >
            {Icon.screen}
          </div>
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
            <div className="w-4 h-4 p-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 shrink-0 transition-all">
              {Icon.activity}
            </div>
            <span className="hidden xl:inline">Tasks</span>
          </button>

          <button
            type="button"
            onClick={onOpenTimeline}
            title="System Audit Timeline"
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
            title="System Diagnostics & Logs"
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
            title="Action Recovery"
            className="aw-focus-ring relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
          >
            <div className="w-4 h-4 p-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500/20 group-hover:border-rose-500/40 shrink-0 transition-all">
              {Icon.shield}
            </div>
            <span className="hidden xl:inline">Recovery</span>
            {recoveryCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] flex items-center justify-center font-bold animate-pulse">
                {recoveryCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenPortForwarding}
            title="Tailscale Port Forwarding"
            className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
          >
            <div className="w-4 h-4 p-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 shrink-0 transition-all">
              {Icon.globe}
            </div>
            <span className="hidden xl:inline">Ports</span>
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            title="History"
            className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer"
          >
            <div className="w-4 h-4 p-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 shrink-0 transition-all">
              {Icon.history}
            </div>
            <span className="hidden xl:inline">History</span>
          </button>
        </nav>

        <NotificationMenu />

        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle diagnostic tools menu"
            aria-expanded={mobileMenuOpen}
            className={`aw-focus-ring p-1.5 rounded-md text-[#A0A6AF] hover:text-[#E8EAED] transition border cursor-pointer ${
              mobileMenuOpen
                ? 'bg-[#1D2024] text-[#E8EAED] border-[#30343A]'
                : 'bg-transparent border-transparent hover:bg-[#1D2024] hover:border-[#30343A]'
            }`}
          >
            <div className="w-4 h-4">{Icon.moreHorizontal}</div>
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-[#1A1D21] border border-[#30343A] rounded-lg shadow-2xl z-50 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => handleAction(onOpenFiles)}
                className="aw-focus-ring flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  {Icon.folder}
                </div>
                <span>Files</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onOpenTaskManager)}
                className="aw-focus-ring flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 p-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  {Icon.activity}
                </div>
                <span>Tasks</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onOpenTimeline)}
                className="aw-focus-ring flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 p-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                  {Icon.timeline}
                </div>
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onOpenLogs)}
                className="aw-focus-ring flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 p-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {Icon.terminal}
                </div>
                <span>Logs</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onOpenRecovery)}
                className="aw-focus-ring flex items-center justify-between px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 p-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                    {Icon.shield}
                  </div>
                  <span>Recovery</span>
                </div>
                {recoveryCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold">
                    {recoveryCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleAction(onOpenHistory)}
                className="aw-focus-ring flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#25282E] transition text-left cursor-pointer"
              >
                <div className="w-4 h-4 p-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  {Icon.history}
                </div>
                <span>History</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
