import React, { useState, useEffect, useRef } from 'react';

// ─── Inline SVG Icons ──────────────────────────────────────────────────────────
const Icon = {
    monitor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={3} width={20} height={14} rx={2}/><polyline points="8 21 12 17 16 21"/><line x1={12} y1={17} x2={12} y2={17}/></svg>,
    timeline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><polyline points="12 6 12 12 16 14"/></svg>,
    decision: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={3}/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>,
    send: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    stop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={2}/></svg>,
    refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>,
    alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>,
    link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    db: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx={12} cy={5} rx={9} ry={3}/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/></svg>,
    terminal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1={12} y1={19} x2={20} y2={19}/></svg>,
    copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={9} y={9} width={13} height={13} rx={2}/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    maximize: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1={21} y1={3} x2={14} y2={10}/><line x1={3} y1={21} x2={10} y2={14}/></svg>,
    chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ connected, status }) {
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            connected
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 pulse-live' : 'bg-zinc-500'}`} />
            <span>{status}</span>
        </div>
    );
}

// ─── State Helpers ────────────────────────────────────────────────────────────
function eventStateColors(state) {
    if (!state) return { dot: 'bg-zinc-500', badge: 'bg-zinc-800/80 text-zinc-400 border-zinc-700', label: 'Observed' };
    if (['completion_confirmed', 'execution_observed'].includes(state))
        return { dot: 'bg-emerald-500', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50', label: 'Done' };
    if (['dispatch_acknowledged', 'request_accepted', 'dispatch_attempted'].includes(state))
        return { dot: 'bg-blue-400', badge: 'bg-blue-950/60 text-blue-400 border-blue-800/50', label: 'In Progress' };
    if (['stop_requested', 'stop_acknowledged'].includes(state))
        return { dot: 'bg-amber-400', badge: 'bg-amber-950/60 text-amber-400 border-amber-800/50', label: 'Stopping' };
    if (['failed', 'rejected', 'timed_out'].includes(state))
        return { dot: 'bg-rose-500', badge: 'bg-rose-950/60 text-rose-400 border-rose-800/50', label: 'Failed' };
    if (state === 'outcome_unknown')
        return { dot: 'bg-purple-400', badge: 'bg-purple-950/60 text-purple-400 border-purple-800/50', label: 'Unknown' };
    return { dot: 'bg-zinc-500', badge: 'bg-zinc-800/80 text-zinc-400 border-zinc-700', label: state };
}

// ─── Live View Tab ────────────────────────────────────────────────────────────
function LiveViewTab({
    snapshotData,
    pendingInteraction,
    onNavigateDecisions,
    promptText,
    onChangePrompt,
    onSend,
    isSending,
    onNewChat,
    onStop,
    timelineEvents,
}) {
    const [viewMode, setViewMode] = useState('screen'); // 'screen' | 'stream'
    const [fitMode, setFitMode] = useState('fit'); // 'fit' | 'full'
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const quickActions = ['Continue working', 'Explain what you did', 'Fix latest bug', 'Summarize progress'];

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-zinc-950">
            {/* Top Alert Banner if an action is pending */}
            {pendingInteraction && (
                <div
                    onClick={onNavigateDecisions}
                    className="cursor-pointer bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-zinc-900 border-b border-amber-600/50 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-200 transition hover:bg-amber-950 shrink-0"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 text-amber-400 shrink-0 animate-pulse">{Icon.alert}</div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Agent Awaiting Your Decision</p>
                            <p className="text-xs font-medium text-zinc-100 truncate">{pendingInteraction.title}</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition shrink-0">
                        Review Now <div className="w-3.5 h-3.5">{Icon.chevronRight}</div>
                    </button>
                </div>
            )}

            {/* Viewport Sub-header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-850 bg-zinc-900/80 shrink-0">
                <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                    <button
                        onClick={() => setViewMode('screen')}
                        className={`px-3 py-1 rounded-md font-medium transition ${
                            viewMode === 'screen' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        🖥️ Live IDE View
                    </button>
                    <button
                        onClick={() => setViewMode('stream')}
                        className={`px-3 py-1 rounded-md font-medium transition ${
                            viewMode === 'stream' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        📋 Activity Stream
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    {viewMode === 'screen' && snapshotData?.screenshot && (
                        <>
                            <button
                                onClick={() => setFitMode(f => f === 'fit' ? 'full' : 'fit')}
                                className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                                title="Toggle scale"
                            >
                                {fitMode === 'fit' ? '🔍 Zoom In' : '📏 Fit View'}
                            </button>
                            <button
                                onClick={() => setLightboxOpen(true)}
                                className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                title="Expand fullscreen"
                            >
                                <div className="w-4 h-4">{Icon.maximize}</div>
                            </button>
                        </>
                    )}
                    <button
                        onClick={onStop}
                        title="Emergency Stop Agent"
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 transition active:scale-95"
                    >
                        <div className="w-3.5 h-3.5 text-rose-400">{Icon.stop}</div>
                        Stop
                    </button>
                </div>
            </div>

            {/* Viewport Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col justify-start">
                {viewMode === 'screen' ? (
                    <div className="flex flex-col items-center justify-center flex-1 w-full min-h-[360px]">
                        {snapshotData?.screenshot ? (
                            <div className="relative w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl">
                                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
                                    <span className="truncate">{snapshotData.target || 'Antigravity IDE'}</span>
                                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-live" />
                                        LIVE CDP
                                    </span>
                                </div>
                                <div className={fitMode === 'fit' ? 'w-full' : 'overflow-auto max-h-[70vh]'}>
                                    <img
                                        src={snapshotData.screenshot}
                                        alt="Antigravity IDE Viewport"
                                        onClick={() => setLightboxOpen(true)}
                                        className={`cursor-zoom-in transition-all ${
                                            fitMode === 'fit' ? 'w-full h-auto object-contain block' : 'min-w-[1200px] h-auto block'
                                        }`}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-4 shadow-xl">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center mx-auto text-blue-400">
                                    <div className="w-8 h-8">{Icon.monitor}</div>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-zinc-100">Antigravity IDE Connected</h3>
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                        Remote debugging is active on port 9000. Start a task or run a command in Antigravity to stream the live workspace viewport.
                                    </p>
                                </div>
                                <div className="pt-2 flex justify-center gap-2">
                                    <button
                                        onClick={onNewChat}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95"
                                    >
                                        <div className="w-3.5 h-3.5">{Icon.plus}</div>
                                        New Conversation
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Activity Stream View */
                    <div className="max-w-3xl mx-auto w-full space-y-2.5">
                        <div className="flex items-center justify-between pb-1 text-xs text-zinc-400">
                            <span className="font-semibold text-zinc-300">Live Agent Action Feed</span>
                            <span>{timelineEvents.length} events logged</span>
                        </div>
                        {timelineEvents.length === 0 ? (
                            <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900/60 rounded-xl border border-zinc-800">
                                No activity recorded yet. Send a prompt below to start.
                            </div>
                        ) : (
                            timelineEvents.slice(0, 15).map(e => {
                                const colors = eventStateColors(e.execution_state);
                                const time = new Date(e.timestamp).toLocaleTimeString();
                                return (
                                    <div key={e._id || e.correlation_id || Math.random()} className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-start gap-3">
                                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                                    {colors.label}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 uppercase">{e.category || 'event'}</span>
                                                <span className="text-[10px] text-zinc-500 ml-auto font-mono">{time}</span>
                                            </div>
                                            <p className="text-xs font-medium text-zinc-200">{e.summary}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Prompt Composer & Quick Actions */}
            <div className="bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe">
                <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
                    {quickActions.map(action => (
                        <button
                            key={action}
                            onClick={() => onChangePrompt(action)}
                            className="text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full border border-zinc-700 transition shrink-0 active:scale-95"
                        >
                            {action}
                        </button>
                    ))}
                </div>
                <div className="px-3 pb-3 flex items-end gap-2">
                    <div className="flex-1 bg-zinc-950 border border-zinc-800 focus-within:border-blue-500 rounded-xl px-3 py-2 transition">
                        <textarea
                            value={promptText}
                            onChange={e => onChangePrompt(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSend();
                                }
                            }}
                            placeholder="Message the agent in Antigravity… (Enter to send)"
                            rows={1}
                            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-28 leading-relaxed"
                        />
                    </div>
                    <button
                        disabled={!promptText.trim() || isSending}
                        onClick={onSend}
                        className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition active:scale-95 shrink-0 shadow-md shadow-blue-900/40"
                    >
                        <div className="w-4 h-4">{Icon.send}</div>
                    </button>
                </div>
            </div>

            {/* Fullscreen Lightbox Modal */}
            {lightboxOpen && snapshotData?.screenshot && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 select-none cursor-zoom-out"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div className="flex items-center justify-between pb-3 shrink-0">
                        <span className="text-xs font-semibold text-zinc-300">Fullscreen Live Antigravity Viewport</span>
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition"
                        >
                            <div className="w-5 h-5">{Icon.x}</div>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-auto">
                        <img
                            src={snapshotData.screenshot}
                            alt="Fullscreen Viewport"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Timeline & Logs Tab ──────────────────────────────────────────────────────
function TimelineAndLogsTab({
    events,
    isLoadingEvents,
    onRefreshEvents,
    systemLogs,
    isLoadingLogs,
    onRefreshLogs,
}) {
    const [subTab, setSubTab] = useState('timeline'); // 'timeline' | 'logs'
    const [timelineCategory, setTimelineCategory] = useState(null);
    const [timelineSearch, setTimelineSearch] = useState('');
    const [expandedEventId, setExpandedEventId] = useState(null);

    // Logs view state
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [copiedLogs, setCopiedLogs] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const logContainerRef = useRef(null);

    useEffect(() => {
        if (subTab === 'logs' && autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [subTab, systemLogs, autoScroll]);

    const categories = [
        { id: null, label: 'All' },
        { id: 'prompt', label: 'Prompts' },
        { id: 'execution', label: 'Execution' },
        { id: 'tool', label: 'Tools' },
        { id: 'interaction', label: 'Decisions' },
        { id: 'recovery', label: 'Recovery' },
        { id: 'system', label: 'System' },
        { id: 'error', label: 'Errors' },
    ];

    const filteredEvents = events.filter(e => {
        if (timelineCategory && (e.category || '').toLowerCase() !== timelineCategory.toLowerCase()) return false;
        if (timelineSearch) {
            const q = timelineSearch.toLowerCase();
            const sum = (e.summary || '').toLowerCase();
            const type = (e.event_type || '').toLowerCase();
            return sum.includes(q) || type.includes(q);
        }
        return true;
    });

    const filteredLogs = systemLogs.filter(l => {
        if (logLevelFilter === 'ALL') return true;
        return l.level === logLevelFilter;
    });

    const handleCopyAllLogs = () => {
        const text = systemLogs.map(l => `${l.time_str} [${l.level}] [${l.logger}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedLogs(true);
        setTimeout(() => setCopiedLogs(false), 2000);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-zinc-950">
            {/* Sub-tab Navigation */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
                <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                    <button
                        onClick={() => setSubTab('timeline')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                            subTab === 'timeline'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <div className="w-3.5 h-3.5">{Icon.timeline}</div>
                        Activity Timeline ({events.length})
                    </button>
                    <button
                        onClick={() => setSubTab('logs')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                            subTab === 'logs'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <div className="w-3.5 h-3.5">{Icon.terminal}</div>
                        Live System Logs ({systemLogs.length})
                    </button>
                </div>

                <button
                    onClick={subTab === 'timeline' ? onRefreshEvents : onRefreshLogs}
                    title="Refresh data"
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition active:scale-95"
                >
                    <div className="w-4 h-4">{Icon.refresh}</div>
                </button>
            </div>

            {/* Sub-Tab 1: Timeline */}
            {subTab === 'timeline' && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Search & Filter pills */}
                    <div className="p-3 border-b border-zinc-850 space-y-2 bg-zinc-950/40 shrink-0">
                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
                            <div className="w-3.5 h-3.5 text-zinc-500">{Icon.search}</div>
                            <input
                                type="text"
                                value={timelineSearch}
                                onChange={e => setTimelineSearch(e.target.value)}
                                placeholder="Search events, summaries, errors..."
                                className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                            />
                            {timelineSearch && (
                                <button onClick={() => setTimelineSearch('')} className="text-zinc-500 hover:text-zinc-300">
                                    <div className="w-3.5 h-3.5">{Icon.x}</div>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            {categories.map(c => (
                                <button
                                    key={String(c.id)}
                                    onClick={() => setTimelineCategory(c.id)}
                                    className={`text-[11px] px-3 py-1 rounded-full border font-medium transition shrink-0 ${
                                        timelineCategory === c.id
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeline List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-w-3xl mx-auto w-full">
                        {isLoadingEvents ? (
                            <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">Loading timeline events...</div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="p-12 text-center space-y-3 bg-zinc-900/40 rounded-2xl border border-zinc-850">
                                <div className="w-12 h-12 rounded-xl bg-zinc-850 flex items-center justify-center mx-auto text-zinc-500">
                                    <div className="w-6 h-6">{Icon.timeline}</div>
                                </div>
                                <p className="text-sm font-medium text-zinc-300">No matching events</p>
                                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                                    Actions dispatched to Antigravity and responses will populate here automatically.
                                </p>
                            </div>
                        ) : (
                            filteredEvents.map(e => {
                                const colors = eventStateColors(e.execution_state);
                                const isExpanded = expandedEventId === (e._id || e.correlation_id);
                                const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                const dateStr = new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

                                return (
                                    <div
                                        key={e._id || e.correlation_id || Math.random()}
                                        className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-3.5 transition cursor-pointer"
                                        onClick={() => setExpandedEventId(isExpanded ? null : (e._id || e.correlation_id))}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                                        {colors.label}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-750 font-medium">
                                                        {(e.category || e.event_type || 'EVENT').toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-zinc-100 leading-snug break-words">
                                                    {e.summary || e.event_type}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-mono text-zinc-400">{timeStr}</p>
                                                <p className="text-[10px] text-zinc-600">{dateStr}</p>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 text-xs">
                                                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                    <span>Source: <strong className="text-zinc-200">{e.source || 'system'}</strong> ({e.source_confidence || 'observed'})</span>
                                                    {e.correlation_id && (
                                                        <span className="font-mono text-zinc-500 truncate max-w-[200px]" title={e.correlation_id}>
                                                            ID: {e.correlation_id}
                                                        </span>
                                                    )}
                                                </div>
                                                {e.sanitized_payload && Object.keys(e.sanitized_payload).length > 0 && (
                                                    <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
                                                        {JSON.stringify(e.sanitized_payload, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Sub-Tab 2: System Logs */}
            {subTab === 'logs' && (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Log Controls Header */}
                    <div className="px-4 py-2 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs">
                            {['ALL', 'INFO', 'WARNING', 'ERROR'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setLogLevelFilter(lvl)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                                        logLevelFilter === lvl
                                            ? 'bg-blue-600 text-white'
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
                                Auto-scroll
                            </label>
                            <button
                                onClick={handleCopyAllLogs}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                            >
                                <div className="w-3.5 h-3.5">{copiedLogs ? Icon.check : Icon.copy}</div>
                                {copiedLogs ? 'Copied!' : 'Copy Logs'}
                            </button>
                        </div>
                    </div>

                    {/* Console View */}
                    <div
                        ref={logContainerRef}
                        className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs select-text space-y-1"
                    >
                        {isLoadingLogs && systemLogs.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">Connecting to server log stream...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="p-8 text-center text-zinc-600">No log entries matching filter.</div>
                        ) : (
                            filteredLogs.map((l, idx) => {
                                let badgeColor = 'text-blue-400 bg-blue-950/60 border-blue-900';
                                if (l.level === 'WARNING') badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-900';
                                if (l.level === 'ERROR' || l.level === 'CRITICAL') badgeColor = 'text-rose-400 bg-rose-950/60 border-rose-900';
                                return (
                                    <div key={idx} className="flex items-start gap-2.5 hover:bg-zinc-900/60 px-2 py-0.5 rounded transition">
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
            )}
        </div>
    );
}

// ─── Decisions Tab ────────────────────────────────────────────────────────────
function DecisionsTab({
    pendingInteraction,
    selectedOptions,
    onToggleOption,
    customResponse,
    onChangeCustomResponse,
    isSubmitting,
    submitSuccess,
    onSubmit,
    pastDecisions = [],
}) {
    const isMulti = pendingInteraction?.kind === 'multiple_choice';

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 space-y-6 max-w-3xl mx-auto w-full select-text">
            {pendingInteraction ? (
                <div className="space-y-4">
                    <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 shadow-xl shadow-amber-950/30">
                        <div className="bg-zinc-900 rounded-[14px] p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <div className="w-5 h-5">{Icon.decision}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Action Required
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                            {pendingInteraction.kind?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-bold text-zinc-100 leading-snug">{pendingInteraction.title}</h2>
                                    {pendingInteraction.description && (
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{pendingInteraction.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Options List */}
                            {pendingInteraction.options?.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    {pendingInteraction.options.map(opt => {
                                        const sel = selectedOptions.has(opt.id);
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => onToggleOption(opt.id)}
                                                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition active:scale-[0.99] ${
                                                    sel
                                                        ? 'bg-blue-950/50 border-blue-500 text-zinc-100 shadow-md shadow-blue-950/40'
                                                        : 'bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition ${
                                                    sel ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700 bg-zinc-900'
                                                }`}>
                                                    {sel ? <div className="w-3 h-3">{Icon.check}</div> : null}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-zinc-100">{opt.label}</span>
                                                        {opt.is_recommended && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                                                                Recommended
                                                            </span>
                                                        )}
                                                    </div>
                                                    {opt.description && (
                                                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{opt.description}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Custom Response input */}
                            {pendingInteraction.allow_custom_response && (
                                <div className="pt-2">
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Custom Guidance (Optional)</label>
                                    <input
                                        type="text"
                                        value={customResponse}
                                        onChange={e => onChangeCustomResponse(e.target.value)}
                                        placeholder="Type alternate instructions for the agent..."
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition"
                                    />
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end pt-2">
                                {submitSuccess ? (
                                    <div className="flex items-center gap-2 text-sm text-emerald-400 font-semibold px-4 py-2 bg-emerald-950/60 rounded-xl border border-emerald-800">
                                        <div className="w-4 h-4">{Icon.check}</div> Decision Dispatched!
                                    </div>
                                ) : (
                                    <button
                                        disabled={isSubmitting || (selectedOptions.size === 0 && !customResponse.trim())}
                                        onClick={onSubmit}
                                        className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-blue-900/40"
                                    >
                                        {isSubmitting ? 'Dispatching to Agent…' : 'Submit Decision'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center space-y-3 bg-zinc-900/40 rounded-2xl border border-zinc-850">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-850 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                        <div className="w-8 h-8">{Icon.check}</div>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-100">All Decisions Clear</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        The agent is currently working autonomously or waiting for your prompt. When interactive choices arise, they will appear here.
                    </p>
                </div>
            )}

            {/* Resolved History */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Decisions History</h3>
                {pastDecisions.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">No previous decisions recorded in current session.</p>
                ) : (
                    pastDecisions.map(d => (
                        <div key={d._id || Math.random()} className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                            <div>
                                <p className="font-medium text-zinc-300">{d.summary}</p>
                                <p className="text-[10px] text-zinc-500">{new Date(d.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                                Resolved
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Status & Recovery Tab ────────────────────────────────────────────────────
function StatusTab({
    appState,
    diagnostics,
    recoveryItems,
    isRecoveryLoading,
    onReconcileAction,
    onNewChat,
    onStop,
    onRefresh,
    historyChats,
    isHistoryLoading,
    onOpenHistory,
    onSetMode,
    onSetModel,
}) {
    const [reconcilingKey, setReconcilingKey] = useState(null);

    const handleReconcile = async (item) => {
        const key = item.context?.idempotency_key;
        setReconcilingKey(key);
        try {
            await onReconcileAction({
                scope: item.context?.scope || 'prompt_send',
                idempotency_key: key,
                resolution_notes: 'Reconciled via mobile status tab'
            });
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setReconcilingKey(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 space-y-5 max-w-3xl mx-auto w-full select-text">
            {/* System Health Section */}
            <section className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">System Health & Connectivity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Antigravity IDE Card */}
                    <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-blue-400">
                                <div className="w-5 h-5">{Icon.monitor}</div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-200">Antigravity IDE</h4>
                                <p className="text-[11px] text-zinc-500">{diagnostics?.cdp_target || 'Target port 9000'}</p>
                            </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            (diagnostics?.cdp_connected ?? appState.connected)
                                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                                : 'bg-zinc-850 border-zinc-750 text-zinc-500'
                        }`}>
                            {(diagnostics?.cdp_connected ?? appState.connected) ? 'Live' : 'Standby'}
                        </span>
                    </div>

                    {/* MongoDB Card */}
                    <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                                <div className="w-5 h-5">{Icon.db}</div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-200">MongoDB Database</h4>
                                <p className="text-[11px] text-zinc-500">{diagnostics?.mongodb_database || 'AgentWatch_v2'}</p>
                            </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            diagnostics?.mongodb_ready
                                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                                : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                        }`}>
                            {diagnostics?.mongodb_ready ? 'Ready' : 'Connecting…'}
                        </span>
                    </div>
                </div>
            </section>

            {/* Recovery Items Section */}
            <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5">{Icon.alert}</div>
                        Recovery Center ({recoveryItems.length})
                    </h3>
                    {recoveryItems.length > 0 && (
                        <span className="text-[10px] text-amber-400 font-medium">Reconciliation Required</span>
                    )}
                </div>

                {isRecoveryLoading ? (
                    <div className="p-4 text-center text-xs text-zinc-500">Scanning recovery queue...</div>
                ) : recoveryItems.length === 0 ? (
                    <div className="p-4 bg-zinc-900/60 border border-zinc-850 rounded-2xl text-xs text-zinc-400 flex items-center gap-2">
                        <div className="w-4 h-4 text-emerald-400 shrink-0">{Icon.check}</div>
                        <span>Zero crash recovery anomalies or unconfirmed dispatches.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recoveryItems.map((item, idx) => {
                            const isReconciling = reconcilingKey === item.context?.idempotency_key;
                            return (
                                <div key={idx} className="p-3.5 bg-amber-950/20 border border-amber-800/50 rounded-2xl space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold text-amber-200">{item.summary}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                Scope: {item.context?.scope || 'unknown'} · {item.context?.idempotency_key}
                                            </p>
                                        </div>
                                        <button
                                            disabled={isReconciling}
                                            onClick={() => handleReconcile(item)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 transition disabled:opacity-40"
                                        >
                                            {isReconciling ? 'Resolving…' : 'Mark Resolved'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Quick Actions & Settings Controls */}
            <section className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Agent Controls & Preferences</h3>
                <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
                    {/* Agent Mode */}
                    <div className="flex items-center justify-between py-2.5 first:pt-0">
                        <div>
                            <p className="text-xs font-medium text-zinc-200">Execution Mode</p>
                            <p className="text-[11px] text-zinc-500">{appState.mode} (Direct execution vs step planning)</p>
                        </div>
                        <button
                            onClick={onSetMode}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                        >
                            Change Mode
                        </button>
                    </div>

                    {/* Agent Model */}
                    <div className="flex items-center justify-between py-2.5">
                        <div>
                            <p className="text-xs font-medium text-zinc-200">Target Model</p>
                            <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">{appState.model}</p>
                        </div>
                        <button
                            onClick={onSetModel}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                        >
                            Switch Model
                        </button>
                    </div>

                    {/* Conversation History */}
                    <div className="flex items-center justify-between py-2.5">
                        <div>
                            <p className="text-xs font-medium text-zinc-200">Conversation History</p>
                            <p className="text-[11px] text-zinc-500">Resume prior agent chat sessions</p>
                        </div>
                        <button
                            onClick={onOpenHistory}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                        >
                            View Sessions
                        </button>
                    </div>

                    {/* Diagnostics Refresh */}
                    <div className="flex items-center justify-between py-2.5 last:pb-0">
                        <div>
                            <p className="text-xs font-medium text-zinc-200">Diagnostics Check</p>
                            <p className="text-[11px] text-zinc-500">Probe CDP, MongoDB, and process health</p>
                        </div>
                        <button
                            onClick={onRefresh}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                        >
                            <div className="w-3.5 h-3.5">{Icon.refresh}</div> Run Check
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ─── Selection Modal ──────────────────────────────────────────────────────────
function SelectionModal({ isOpen, title, options, onSelect, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none" onClick={onClose}>
            <div className="w-full max-w-lg bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => onSelect(opt)}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition active:scale-[0.99]"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── History Drawer ───────────────────────────────────────────────────────────
function HistoryDrawer({ isOpen, onClose, chats, isLoading, onSelectChat }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none" onClick={onClose}>
            <div className="w-full max-w-lg bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl p-4 pb-8 space-y-3 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-100">Past Agent Sessions</h3>
                    <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white">
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-zinc-500">Loading sessions…</div>
                    ) : chats.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-500">No past conversations recorded.</div>
                    ) : chats.map(chat => (
                        <button
                            key={chat.session_id}
                            onClick={() => { onSelectChat(chat.title); onClose(); }}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 transition truncate active:scale-[0.99]"
                        >
                            {chat.title || chat.session_id}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
function BottomNav({ activeTab, onSelect, decisionCount, recoveryCount }) {
    const tabs = [
        { id: 'live', label: 'Live View', icon: Icon.monitor },
        { id: 'timeline', label: 'Timeline & Logs', icon: Icon.timeline },
        { id: 'decisions', label: 'Decisions', icon: Icon.decision, badge: decisionCount },
        { id: 'status', label: 'Status', icon: Icon.settings, badge: recoveryCount, badgeColor: 'bg-amber-500' },
    ];

    return (
        <nav className="bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe select-none">
            <div className="flex items-stretch max-w-4xl mx-auto">
                {tabs.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onSelect(tab.id)}
                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition ${
                                active ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {active && <div className="tab-active-bar" />}
                            <div className="relative">
                                <div className="w-5 h-5">{tab.icon}</div>
                                {tab.badge > 0 && (
                                    <span className={`absolute -top-1 -right-2 w-3.5 h-3.5 ${tab.badgeColor || 'bg-amber-500'} rounded-full text-[9px] font-bold text-zinc-950 flex items-center justify-center shadow`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// ─── Main Application Container ───────────────────────────────────────────────
export default function App() {
    const [activeTab, setActiveTab] = useState('live');
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model'
    const [historyOpen, setHistoryOpen] = useState(false);

    const [appState, setAppState] = useState({ status: 'Connecting…', connected: false, mode: 'Fast', model: 'Default' });
    const [snapshotData, setSnapshotData] = useState(null);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);

    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);

    const h = { 'ngrok-skip-browser-warning': 'true' };

    // ── Fetchers ───────────────────────────────────────────────────────────────
    const fetchAppState = async () => {
        try {
            const res = await fetch('/app-state', { headers: h });
            if (!isMountedRef.current) return;
            if (res.status === 401) { window.location.href = '/login.html'; return; }
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                setAppState({
                    status: data.antigravity_connected ? 'Live' : 'Standby',
                    connected: Boolean(data.antigravity_connected),
                    mode: data.mode || 'Fast',
                    model: data.model || 'Default'
                });
            }
        } catch {}
    };

    const fetchSnapshot = async () => {
        const seq = ++snapshotSeqRef.current;
        try {
            const res = await fetch('/snapshot', { headers: h });
            if (!isMountedRef.current || seq < snapshotSeqRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current || seq < snapshotSeqRef.current) return;
                setSnapshotData(data);
            }
        } catch {}
    };

    const fetchPendingInteractions = async () => {
        try {
            const res = await fetch('/api/v1/interactions/pending', { headers: h });
            if (!isMountedRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                if (data.interactions?.length > 0) {
                    const latest = data.interactions[0];
                    setPendingInteraction(prev => {
                        if (!prev || prev.interaction_id !== latest.interaction_id) {
                            setSelectedOptions(new Set());
                            setCustomResponse('');
                            setSubmitSuccess(false);
                        }
                        return latest;
                    });
                } else {
                    setPendingInteraction(null);
                }
            }
        } catch {}
    };

    const fetchTimelineEvents = async () => {
        setIsTimelineLoading(true);
        try {
            const res = await fetch('/api/v1/events?limit=80', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setTimelineEvents(data.events || []);
            }
        } catch {} finally {
            setIsTimelineLoading(false);
        }
    };

    const fetchSystemLogs = async () => {
        setIsLogsLoading(true);
        try {
            const res = await fetch('/api/v1/logs?limit=200', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setSystemLogs(data.logs || []);
            }
        } catch {} finally {
            setIsLogsLoading(false);
        }
    };

    const fetchRecoveryItems = async () => {
        setIsRecoveryLoading(true);
        try {
            const res = await fetch('/api/v1/events/recovery-items', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setRecoveryItems(data || []);
            }
        } catch {} finally {
            setIsRecoveryLoading(false);
        }
    };

    const fetchDiagnostics = async () => {
        try {
            const res = await fetch('/api/v1/diagnostics', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setDiagnostics(data);
            }
        } catch {}
    };

    // ── Intervals ──────────────────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        fetchAppState();
        fetchSnapshot();
        fetchPendingInteractions();
        fetchRecoveryItems();
        fetchDiagnostics();
        fetchTimelineEvents();
        fetchSystemLogs();

        const fastInterval = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchAppState();
            fetchPendingInteractions();
            fetchSnapshot();
            fetchSystemLogs();
        }, 2500);

        const slowInterval = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchRecoveryItems();
            fetchDiagnostics();
            fetchTimelineEvents();
        }, 8000);

        return () => {
            isMountedRef.current = false;
            clearInterval(fastInterval);
            clearInterval(slowInterval);
        };
    }, []);

    // ── Action Handlers ────────────────────────────────────────────────────────
    const handleSendPrompt = async () => {
        const msg = promptText.trim();
        if (!msg || isSendingPrompt) return;
        setIsSendingPrompt(true);
        const saved = promptText;
        setPromptText('');
        const key = 'prompt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        try {
            const res = await fetch('/send', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, idempotency_key: key })
            });
            if (!res.ok) setPromptText(saved);
            else {
                setTimeout(fetchSnapshot, 400);
                setTimeout(fetchTimelineEvents, 600);
            }
        } catch {
            setPromptText(saved);
        } finally {
            setIsSendingPrompt(false);
        }
    };

    const handleInteractionSubmit = async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) {
            alert('Please select an option or provide a custom response.');
            return;
        }
        setIsSubmitting(true);
        const key = 'resp-' + pendingInteraction.interaction_id + '-' + Date.now();
        try {
            const res = await fetch(`/api/v1/interactions/${encodeURIComponent(pendingInteraction.interaction_id)}/respond`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_option_ids: [...selectedOptions],
                    custom_response: customOk ? customResponse.trim() : null,
                    idempotency_key: key
                })
            });
            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    setPendingInteraction(null);
                    setSubmitSuccess(false);
                    fetchSnapshot();
                    fetchTimelineEvents();
                }, 1000);
            } else {
                const e = await res.json().catch(() => ({}));
                alert(e.detail || 'Submission failed.');
            }
        } catch (e) {
            alert(`Network error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleOption = (id) => {
        const isMulti = pendingInteraction?.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const n = new Set(prev);
            if (isMulti) {
                if (n.has(id)) n.delete(id);
                else n.add(id);
            } else {
                n.clear();
                n.add(id);
            }
            return n;
        });
    };

    const handleNewChat = async () => {
        try {
            await fetch('/new-chat', { method: 'POST', headers: h });
            setTimeout(() => { fetchSnapshot(); fetchTimelineEvents(); }, 500);
        } catch {}
    };

    const handleStop = async () => {
        try {
            await fetch('/stop', { method: 'POST', headers: h });
            setTimeout(fetchTimelineEvents, 500);
        } catch {}
    };

    const handleSetMode = async (m) => {
        setActiveModal(null);
        try {
            await fetch('/set-mode', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: m })
            });
            setAppState(p => ({ ...p, mode: m }));
        } catch {}
    };

    const handleSetModel = async (m) => {
        setActiveModal(null);
        try {
            await fetch('/set-model', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: m })
            });
            setAppState(p => ({ ...p, model: m }));
        } catch {}
    };

    const handleOpenHistory = async () => {
        setHistoryOpen(true);
        setIsHistoryLoading(true);
        try {
            const res = await fetch('/chat-history', { headers: h });
            if (res.ok) {
                const d = await res.json();
                setHistoryChats(d.chats || []);
            }
        } catch {
            setHistoryChats([]);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleReconcileAction = async ({ scope, idempotency_key, resolution_notes }) => {
        const res = await fetch('/api/v1/events/reconcile-action', {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope, idempotency_key, resolution_notes })
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.detail || 'Reconciliation failed');
        }
        fetchRecoveryItems();
        fetchTimelineEvents();
    };

    return (
        <div className="flex flex-col h-[100dvh] w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* ── Top Header ────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0 select-none max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/40">
                        AW
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-zinc-100 tracking-tight leading-none">AgentWatch</h1>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">v2.0</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-none">
                            <button onClick={() => setActiveModal('mode')} className="hover:text-zinc-300 underline underline-offset-2">
                                {appState.mode}
                            </button>
                            {' · '}
                            <button onClick={() => setActiveModal('model')} className="hover:text-zinc-300 underline underline-offset-2 truncate max-w-[140px] inline-block align-bottom">
                                {appState.model.split(' ')[0]}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <StatusBadge connected={appState.connected} status={appState.status} />
                    <button
                        onClick={handleNewChat}
                        title="New Chat"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition active:scale-95"
                    >
                        <div className="w-4 h-4">{Icon.plus}</div>
                    </button>
                </div>
            </header>

            {/* ── Content Area with Responsive Container ───────────── */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden max-w-4xl mx-auto w-full">
                {activeTab === 'live' && (
                    <LiveViewTab
                        snapshotData={snapshotData}
                        pendingInteraction={pendingInteraction}
                        onNavigateDecisions={() => setActiveTab('decisions')}
                        promptText={promptText}
                        onChangePrompt={setPromptText}
                        onSend={handleSendPrompt}
                        isSending={isSendingPrompt}
                        onNewChat={handleNewChat}
                        onStop={handleStop}
                        timelineEvents={timelineEvents}
                    />
                )}

                {activeTab === 'timeline' && (
                    <TimelineAndLogsTab
                        events={timelineEvents}
                        isLoadingEvents={isTimelineLoading}
                        onRefreshEvents={fetchTimelineEvents}
                        systemLogs={systemLogs}
                        isLoadingLogs={isLogsLoading}
                        onRefreshLogs={fetchSystemLogs}
                    />
                )}

                {activeTab === 'decisions' && (
                    <DecisionsTab
                        pendingInteraction={pendingInteraction}
                        selectedOptions={selectedOptions}
                        onToggleOption={handleToggleOption}
                        customResponse={customResponse}
                        onChangeCustomResponse={setCustomResponse}
                        isSubmitting={isSubmitting}
                        submitSuccess={submitSuccess}
                        onSubmit={handleInteractionSubmit}
                        pastDecisions={timelineEvents.filter(e => e.category === 'interaction')}
                    />
                )}

                {activeTab === 'status' && (
                    <StatusTab
                        appState={appState}
                        diagnostics={diagnostics}
                        recoveryItems={recoveryItems}
                        isRecoveryLoading={isRecoveryLoading}
                        onReconcileAction={handleReconcileAction}
                        onNewChat={handleNewChat}
                        onStop={handleStop}
                        onRefresh={() => {
                            fetchAppState();
                            fetchSnapshot();
                            fetchRecoveryItems();
                            fetchDiagnostics();
                            fetchSystemLogs();
                        }}
                        historyChats={historyChats}
                        isHistoryLoading={isHistoryLoading}
                        onOpenHistory={handleOpenHistory}
                        onSetMode={() => setActiveModal('mode')}
                        onSetModel={() => setActiveModal('model')}
                    />
                )}
            </main>

            {/* ── Bottom Navigation ─────────────────────────────────── */}
            <BottomNav
                activeTab={activeTab}
                onSelect={setActiveTab}
                decisionCount={pendingInteraction ? 1 : 0}
                recoveryCount={recoveryItems.length}
            />

            {/* ── Modals & Drawers ──────────────────────────────────── */}
            <SelectionModal
                isOpen={activeModal === 'mode'}
                title="Select Agent Execution Mode"
                options={['Fast', 'Planning']}
                onSelect={handleSetMode}
                onClose={() => setActiveModal(null)}
            />
            <SelectionModal
                isOpen={activeModal === 'model'}
                title="Select AI Model"
                options={[
                    'Default Antigravity Agent',
                    'Gemini 3.1 Pro (High)',
                    'Claude Sonnet 4.6 (Thinking)',
                    'Claude Opus 4.6 (Thinking)',
                    'GPT-OSS 120B (Medium)'
                ]}
                onSelect={handleSetModel}
                onClose={() => setActiveModal(null)}
            />
            <HistoryDrawer
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
                onSelectChat={(title) => {
                    fetch('/select-chat', {
                        method: 'POST',
                        headers: { ...h, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title })
                    });
                    setTimeout(fetchSnapshot, 500);
                    setHistoryOpen(false);
                }}
            />
        </div>
    );
}
