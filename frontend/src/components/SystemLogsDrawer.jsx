import React, { useState, useEffect, useRef } from 'react';
import { Check, Copy } from 'lucide-react';

export function SystemLogsDrawer({ isOpen, onClose, logs = [], isLoading = false, onRefresh }) {
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [autoScroll, setAutoScroll] = useState(true);
    const [copied, setCopied] = useState(false);
    const logBoxRef = useRef(null);

    useEffect(() => {
        if (isOpen && autoScroll && logBoxRef.current) {
            logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
        }
    }, [isOpen, logs, autoScroll]);

    if (!isOpen) return null;

    const filteredLogs = logs.filter(l => {
        if (levelFilter === 'ALL') return true;
        return l.level === levelFilter;
    });

    const handleCopy = () => {
        const text = logs.map(l => `${l.time_str} [${l.level}] [${l.logger}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <polyline points="4 17 10 11 4 5" />
                                <line x1={12} y1={19} x2={20} y2={19} />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-100">Live System & Server Logs</h2>
                            <p className="text-[11px] text-zinc-500">Real-time FastAPI, Uvicorn, and CDP logging</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={onRefresh}
                            title="Refresh Logs"
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition active:scale-95"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <line x1={18} y1={6} x2={6} y2={18} />
                                <line x1={6} y1={6} x2={18} y2={18} />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-4 py-2 border-b border-zinc-850 bg-zinc-950/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        {['ALL', 'INFO', 'WARNING', 'ERROR'].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setLevelFilter(lvl)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                                    levelFilter === lvl
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={e => setAutoScroll(e.target.checked)}
                                className="rounded border-zinc-700 bg-zinc-800 text-blue-600"
                            />
                            Scroll
                        </label>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-750 text-zinc-200 transition active:scale-95"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Log Terminal Window */}
                <div
                    ref={logBoxRef}
                    className="flex-1 overflow-y-auto p-3.5 bg-zinc-950 font-mono text-[11px] select-text space-y-1 leading-relaxed"
                >
                    {isLoading && logs.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">Connecting to server log buffer...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600">No log entries matching filter.</div>
                    ) : (
                        filteredLogs.map((l, idx) => {
                            let badgeColor = 'text-blue-400 bg-blue-950/60 border-blue-900';
                            if (l.level === 'WARNING') badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-900';
                            if (l.level === 'ERROR' || l.level === 'CRITICAL') badgeColor = 'text-rose-400 bg-rose-950/60 border-rose-900';
                            return (
                                <div key={idx} className="flex items-start gap-2 hover:bg-zinc-900/60 px-1.5 py-0.5 rounded transition">
                                    <span className="text-zinc-500 shrink-0 select-none text-[10px]">{l.time_str}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border shrink-0 ${badgeColor}`}>
                                        {l.level}
                                    </span>
                                    <span className="text-zinc-500 shrink-0 text-[10px]">[{l.logger}]</span>
                                    <span className="text-zinc-200 break-all flex-1">{l.message}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
