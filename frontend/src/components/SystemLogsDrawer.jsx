import React, { useState, useEffect, useRef } from 'react';
import { Check, Copy, Radio, BarChart3, Clock, AlertTriangle, FileText } from 'lucide-react';
import { LogAnalyzerView } from './logs/LogAnalyzerView';
import { toast } from '../services/toastService';

export function SystemLogsDrawer({
  isOpen,
  onClose,
  logs = [],
  isLoading = false,
  onRefresh,
  onOpenFile,
}) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'analyzer'
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logBoxRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeTab === 'live' && autoScroll && logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [isOpen, activeTab, logs, autoScroll, levelFilter, searchQuery]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => {
    if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (l.message && l.message.toLowerCase().includes(q)) ||
        (l.logger && l.logger.toLowerCase().includes(q)) ||
        (l.time_str && l.time_str.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const levelCounts = logs.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] || 0) + 1;
    return acc;
  }, {});

  const handleCopy = async () => {
    try {
      const text = filteredLogs
        .map(l => `${l.time_str} [${l.level}] [${l.logger}] ${l.message}`)
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Copied ${filteredLogs.length} log lines to clipboard`, 'Logs Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(err.message || 'Clipboard access denied', 'Copy Failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-[#141619] border-l border-[#30343A] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Live / Analyzer Tabs */}
        <div className="p-3 sm:p-4 border-b border-[#30343A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-[#17191C]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`p-1.5 rounded-lg border shrink-0 transition-colors ${
                activeTab === 'live'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
            >
              {activeTab === 'live' ? (
                <Radio className="w-4 h-4 animate-pulse" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-[#E8EAED] tracking-tight truncate">
                  {activeTab === 'live' ? 'Live Runtime Stream' : 'Date-Based Log Analyzer'}
                </h2>
                {activeTab === 'live' ? (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#1D2024] text-[#A0A6AF] border border-[#30343A] shrink-0">
                    {filteredLogs.length} of {logs.length}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-blue-950/40 text-blue-300 border border-blue-800/50 shrink-0">
                    Analytics & Graphs
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A0A6AF] truncate">
                {activeTab === 'live'
                  ? 'In-memory ring buffer stream of live FastAPI & CDP events'
                  : 'Historical daily log files with breakdown charts & metrics'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tab Switcher */}
            <div className="flex items-center rounded-lg bg-[#101113] border border-[#30343A] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'live'
                    ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A] font-semibold'
                    : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Stream</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analyzer')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'analyzer'
                    ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A] font-semibold'
                    : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                }`}
              >
                <BarChart3 className="w-3 h-3 text-blue-400" />
                <span>Date Analyzer</span>
              </button>
            </div>

            {activeTab === 'live' && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh Logs"
                className="p-1.5 text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] rounded-lg border border-transparent hover:border-[#30343A] transition active:scale-95 cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close logs panel"
              title="Close"
              className="p-1.5 text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] rounded-lg border border-[#30343A] sm:border-transparent transition cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1={18} y1={6} x2={6} y2={18} />
                <line x1={6} y1={6} x2={18} y2={18} />
              </svg>
            </button>
          </div>
        </div>

        {activeTab === 'analyzer' ? (
          <LogAnalyzerView onOpenFileInViewer={onOpenFile} />
        ) : (
          <>
            {/* Filter Toolbar (Responsive Search & Badges) */}
            <div className="p-2.5 sm:px-4 sm:py-2.5 border-b border-[#262A30] bg-[#101113] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {['ALL', 'INFO', 'WARNING', 'ERROR'].map(lvl => {
                  const count = lvl === 'ALL' ? logs.length : levelCounts[lvl] || 0;
                  const isActive = levelFilter === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelFilter(lvl)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] border border-[#30343A]'
                      }`}
                    >
                      <span>{lvl}</span>
                      {count > 0 && (
                        <span
                          className={`text-[9px] font-mono px-1 rounded ${
                            isActive ? 'bg-blue-800 text-blue-100' : 'bg-[#101113] text-[#747C87]'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-48 lg:w-60 min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter log messages..."
                    className="w-full bg-[#17191C] border border-[#30343A] rounded-md pl-7 pr-6 py-1 text-xs text-[#E8EAED] placeholder-[#747C87] outline-none focus:border-blue-500/60 transition"
                  />
                  <svg
                    className="w-3.5 h-3.5 text-[#747C87] absolute left-2 top-2 pointer-events-none"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1.5 p-0.5 text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <line x1={18} y1={6} x2={6} y2={18} />
                        <line x1={6} y1={6} x2={18} y2={18} />
                      </svg>
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-[#A0A6AF] hover:text-[#E8EAED] cursor-pointer select-none shrink-0 px-1 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={e => setAutoScroll(e.target.checked)}
                    className="rounded border-[#30343A] bg-[#17191C] text-blue-500 cursor-pointer"
                  />
                  <span className="hidden xs:inline">Auto-scroll</span>
                  <span className="xs:hidden">Scroll</span>
                </label>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy visible logs"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[#1D2024] hover:bg-[#23272D] text-[#E8EAED] border border-[#30343A] transition active:scale-95 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#A0A6AF]" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Log Terminal Window */}
            <div
              ref={logBoxRef}
              className="flex-1 overflow-y-auto p-2.5 sm:p-4 bg-[#0d0e11] font-mono text-[11px] sm:text-xs select-text space-y-1 leading-relaxed"
            >
              {isLoading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#747C87] text-xs">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to server log buffer...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-1 text-[#747C87] text-xs">
                  <span>No log entries matching filter.</span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-blue-400 hover:underline cursor-pointer mt-1"
                    >
                      Clear search query
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((l, idx) => {
                  let badgeStyle = 'text-blue-400 bg-blue-950/40 border-blue-800/50';
                  if (l.level === 'WARNING')
                    badgeStyle = 'text-amber-400 bg-amber-950/40 border-amber-800/50';
                  if (l.level === 'ERROR' || l.level === 'CRITICAL')
                    badgeStyle = 'text-rose-400 bg-rose-950/40 border-rose-800/50';
                  if (l.level === 'DEBUG')
                    badgeStyle = 'text-zinc-400 bg-zinc-900 border-zinc-700/50';

                  return (
                    <div
                      key={idx}
                      className="group flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2.5 hover:bg-[#17191C]/80 px-2 py-1 rounded transition border border-transparent hover:border-[#30343A]/40"
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[#747C87] select-none text-[10px] font-mono tabular-nums">
                          {l.time_str}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border uppercase tracking-wider shrink-0 ${badgeStyle}`}
                        >
                          {l.level}
                        </span>
                        <span className="text-zinc-500 sm:hidden text-[10px]">[{l.logger}]</span>
                      </div>
                      <span className="hidden sm:inline text-[#747C87] shrink-0 text-[10px] font-mono">
                        [{l.logger}]
                      </span>
                      <span className="text-[#E8EAED] break-words [overflow-wrap:anywhere] flex-1 leading-normal selection:bg-blue-600/30">
                        {l.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
