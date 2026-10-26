import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '../constants/icons';
import { api } from '../services/api';
import { toast } from '../services/toastService';

export function TaskManagerDrawer({ isOpen, onClose }) {
    const [sortBy, setSortBy] = useState('memory'); // 'memory' | 'cpu'
    const [limit, setLimit] = useState(15); // 10 | 15
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [error, setError] = useState(null);
    const [terminatingPid, setTerminatingPid] = useState(null);
    const [confirmProcess, setConfirmProcess] = useState(null); // Process targeted for confirmation
    const timerRef = useRef(null);

    const fetchProcesses = useCallback(async (showLoading = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const res = await api.getSystemProcesses(sortBy, limit);
            setData(res);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch process metrics');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [sortBy, limit]);

    const handleConfirmEndTask = async () => {
        if (!confirmProcess) return;
        const target = confirmProcess;
        setConfirmProcess(null);
        const pids = target.pids && target.pids.length > 0 ? target.pids : target.pid ? [target.pid] : [];
        if (pids.length === 0) return;

        setTerminatingPid(pids[0]);
        try {
            const res = await api.terminateProcess(pids, target.name);
            if (res.success) {
                toast.success(
                    `Terminated ${target.name} (${res.killed_pids?.length || pids.length} process${(res.killed_pids?.length || pids.length) > 1 ? 'es' : ''})`,
                    'Task Ended'
                );
                await fetchProcesses(false);
            } else {
                toast.error(res.error || 'Failed to terminate process', 'End Task Error');
            }
        } catch (err) {
            toast.error(err.message || 'Termination request failed', 'End Task Error');
        } finally {
            setTerminatingPid(null);
        }
    };

    // Initial load on open or sort/limit change
    useEffect(() => {
        if (isOpen) {
            fetchProcesses(true);
        }
    }, [isOpen, fetchProcesses]);

    // Auto-refresh interval (every 3 seconds)
    useEffect(() => {
        if (!isOpen || !autoRefresh) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            fetchProcesses(false);
        }, 3000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOpen, autoRefresh, fetchProcesses]);

    if (!isOpen) return null;

    const summary = data?.summary || {
        total_memory_mb: 16384,
        used_memory_mb: 0,
        memory_percent: 0,
        total_cpu_percent: 0,
        process_count: 0
    };

    const processes = data?.processes || [];

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-3.5 sm:p-4 border-b border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                                <div className="w-4 h-4">{Icon.activity}</div>
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-sm font-semibold text-zinc-100 truncate">Task Manager & Processes</h2>
                                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        {summary.process_count} active
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 truncate">Live system performance and resource allocation</p>
                            </div>
                        </div>

                        {/* Mobile dedicated close button (always visible and unclipped) */}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close panel"
                            className="sm:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded-lg border border-zinc-700/60 transition cursor-pointer shrink-0 ml-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <line x1={18} y1={6} x2={6} y2={18} />
                                <line x1={6} y1={6} x2={18} y2={18} />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Auto refresh toggle */}
                            <button
                                type="button"
                                onClick={() => setAutoRefresh(v => !v)}
                                title={autoRefresh ? "Pause 3s auto-refresh" : "Enable 3s auto-refresh"}
                                className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition cursor-pointer ${
                                    autoRefresh
                                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                                <span className="text-[11px] font-medium">{autoRefresh ? '3s Live' : 'Paused'}</span>
                            </button>

                            {/* Top 10 vs 15 toggle */}
                            <div className="flex items-center rounded-md bg-zinc-950 border border-zinc-800 p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setLimit(10)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${limit === 10 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    Top 10
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLimit(15)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${limit === 15 ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    Top 15
                                </button>
                            </div>

                            {/* Manual Refresh */}
                            <button
                                type="button"
                                onClick={() => fetchProcesses(true)}
                                title="Refresh Now"
                                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition active:scale-95 cursor-pointer"
                            >
                                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M23 4v6h-6" />
                                    <path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                            </button>
                        </div>

                        {/* Desktop Close Drawer Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            title="Close panel"
                            className="hidden sm:flex p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <line x1={18} y1={6} x2={6} y2={18} />
                                <line x1={6} y1={6} x2={18} y2={18} />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* System Summary Gauges (Matching Windows Task Manager) */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-950/40 border-b border-zinc-800/80">
                    {/* CPU Card */}
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span className="flex items-center gap-1.5 font-medium">
                                <div className="w-3.5 h-3.5 text-indigo-400">{Icon.cpu}</div>
                                CPU Usage
                            </span>
                            <span className="font-mono text-zinc-200 font-semibold">{summary.total_cpu_percent}%</span>
                        </div>
                        <div className="mt-2.5 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(summary.total_cpu_percent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* RAM Card */}
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span className="flex items-center gap-1.5 font-medium">
                                <div className="w-3.5 h-3.5 text-blue-400">{Icon.activity}</div>
                                Memory (RAM)
                            </span>
                            <span className="font-mono text-zinc-200 font-semibold">{summary.memory_percent}%</span>
                        </div>
                        <div className="mt-2.5 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                    summary.memory_percent > 85 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                }`}
                                style={{ width: `${Math.min(summary.memory_percent, 100)}%` }}
                            />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>{(summary.used_memory_mb / 1024).toFixed(1)} GB used</span>
                            <span>{(summary.total_memory_mb / 1024).toFixed(1)} GB total</span>
                        </div>
                    </div>
                </div>

                {/* Error Banner if any */}
                {error && (
                    <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
                        <span>{error}</span>
                        <button type="button" onClick={() => fetchProcesses(true)} className="underline cursor-pointer">Retry</button>
                    </div>
                )}

                {/* Process List Header & Table */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
                    <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800 text-[11px] font-medium text-zinc-400 select-none">
                        <div className="col-span-5 flex items-center gap-1">
                            <span>Process Name</span>
                        </div>
                        {/* CPU Sort Toggle */}
                        <div
                            onClick={() => setSortBy('cpu')}
                            className={`col-span-2 flex items-center justify-end gap-1 cursor-pointer py-0.5 px-1.5 rounded transition ${
                                sortBy === 'cpu'
                                    ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60 font-semibold'
                                    : 'hover:text-zinc-200'
                            }`}
                        >
                            <span>CPU</span>
                            {sortBy === 'cpu' && (
                                <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            )}
                        </div>
                        {/* Memory Sort Toggle */}
                        <div
                            onClick={() => setSortBy('memory')}
                            className={`col-span-3 flex items-center justify-end gap-1 cursor-pointer py-0.5 px-1.5 rounded transition ${
                                sortBy === 'memory'
                                    ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60 font-semibold'
                                    : 'hover:text-zinc-200'
                            }`}
                        >
                            <span>Memory</span>
                            {sortBy === 'memory' && (
                                <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            )}
                        </div>
                        {/* Action Column */}
                        <div className="col-span-2 text-right">
                            <span>Action</span>
                        </div>
                    </div>

                    {/* Process Rows */}
                    {processes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                            <div className="w-8 h-8 mb-2 animate-spin text-zinc-600">{Icon.activity}</div>
                            <p className="text-xs">Sampling active host processes...</p>
                        </div>
                    ) : (
                        processes.map((proc, idx) => {
                            const isAntigravity = proc.name.toLowerCase().includes('antigravity');
                            const isChrome = proc.name.toLowerCase().includes('chrome');
                            const isTerminating = terminatingPid && (proc.pids?.includes(terminatingPid) || proc.pid === terminatingPid);

                            return (
                                <div
                                    key={proc.name + idx}
                                    className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs transition hover:bg-zinc-800/40 ${
                                        isAntigravity ? 'bg-blue-950/15' : ''
                                    }`}
                                >
                                    {/* Name and Group Count */}
                                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                                        <span className="w-5 text-[10px] font-mono text-zinc-500 shrink-0">
                                            #{idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <span className={`font-medium truncate ${isAntigravity ? 'text-blue-300' : isChrome ? 'text-zinc-100' : 'text-zinc-200'}`}>
                                                    {proc.name}
                                                </span>
                                                {proc.count > 1 && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                                                        ({proc.count})
                                                    </span>
                                                )}
                                            </div>
                                            {proc.pid && (
                                                <span className="text-[10px] font-mono text-zinc-500">
                                                    PID: {proc.pid}
                                                </span>
                                            )}
                                            {proc.is_self && (
                                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 ml-1">
                                                    AgentWatch
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* CPU Column */}
                                    <div className="col-span-2 text-right">
                                        <span className={`font-mono text-xs ${
                                            proc.cpu_percent > 15 ? 'text-amber-400 font-semibold' : proc.cpu_percent > 0 ? 'text-zinc-200' : 'text-zinc-500'
                                        }`}>
                                            {proc.cpu_percent}%
                                        </span>
                                    </div>

                                    {/* Memory Column */}
                                    <div className="col-span-3 text-right">
                                        <div className="font-mono text-xs text-zinc-200 font-medium">
                                            {proc.memory_mb >= 1024
                                                ? `${(proc.memory_mb / 1024).toFixed(2)} GB`
                                                : `${proc.memory_mb.toLocaleString()} MB`}
                                        </div>
                                        <div className="text-[10px] font-mono text-zinc-500">
                                            {proc.memory_percent}%
                                        </div>
                                    </div>

                                    {/* End Task Button */}
                                    <div className="col-span-2 flex items-center justify-end">
                                        {proc.is_protected ? (
                                            <span className="text-[10px] text-zinc-600 font-mono select-none" title="Protected system or server process">
                                                Locked
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={Boolean(terminatingPid)}
                                                onClick={() => setConfirmProcess(proc)}
                                                title={`End Task for ${proc.name}`}
                                                className="aw-focus-ring inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40 hover:border-rose-700/60 transition disabled:opacity-40 cursor-pointer"
                                            >
                                                {isTerminating ? (
                                                    <span className="w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                                                ) : (
                                                    <div className="w-3 h-3 text-rose-400">{Icon.stop}</div>
                                                )}
                                                <span className="hidden sm:inline">End</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer status */}
                <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Sorted by: <strong className="text-zinc-300">{sortBy === 'memory' ? 'Memory (RAM)' : 'Processor (CPU)'}</strong></span>
                    <span>Displaying top {limit} processes</span>
                </div>

                {/* Confirmation Modal */}
                {confirmProcess && (
                    <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-[#17191C] border border-rose-500/40 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-2.5 text-rose-400">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                                    <div className="w-4 h-4 text-rose-400">{Icon.alertCircle}</div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-[#E8EAED]">End Process?</h4>
                                    <p className="text-[11px] text-zinc-400">Terminating may cause unsaved work to be lost.</p>
                                </div>
                            </div>

                            <div className="bg-[#121316] border border-[#262A30] rounded-lg p-2.5 text-xs space-y-1 font-mono">
                                <div className="text-[#E8EAED] font-medium truncate">{confirmProcess.name}</div>
                                <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                                    <span>Instances: {confirmProcess.count || 1}</span>
                                    <span>RAM: {confirmProcess.memory_mb} MB</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setConfirmProcess(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmEndTask}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition cursor-pointer"
                                >
                                    End Process
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
