import React, { useState } from 'react';

export function ActivityTimelineDrawer({
    isOpen,
    onClose,
    events = [],
    isLoading = false,
    activeCategory,
    onSelectCategory,
    searchQuery,
    onChangeSearch,
    onRefresh
}) {
    const [expandedEventId, setExpandedEventId] = useState(null);

    if (!isOpen) return null;

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'prompt', label: 'Prompts' },
        { id: 'execution', label: 'Execution' },
        { id: 'interaction', label: 'Decisions' },
        { id: 'recovery', label: 'Recovery' },
        { id: 'system', label: 'System' }
    ];

    const getStatusBadge = (state) => {
        switch (state) {
            case 'completion_confirmed':
            case 'execution_observed':
                return <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Confirmed</span>;
            case 'dispatch_acknowledged':
            case 'request_accepted':
                return <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Acknowledged</span>;
            case 'stop_acknowledged':
            case 'stop_requested':
                return <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Stop Signal</span>;
            case 'failed':
            case 'rejected':
                return <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">Failed</span>;
            case 'outcome_unknown':
            default:
                return <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">Observed</span>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none">
            <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <h2 className="text-sm font-semibold text-zinc-100">Activity Timeline & Trace</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onRefresh}
                            title="Refresh Events"
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <line x1={18} y1={6} x2={6} y2={18} />
                                <line x1={6} y1={6} x2={18} y2={18} />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="p-3 border-b border-zinc-800 space-y-2 bg-zinc-950/40">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="Search summaries, events..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => onSelectCategory(c.id === 'all' ? null : c.id)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition shrink-0 ${
                                    (activeCategory === c.id || (!activeCategory && c.id === 'all'))
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Event List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 select-text">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-zinc-500">Loading activity timeline...</div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <p className="text-xs text-zinc-400 font-medium">No activity recorded</p>
                            <p className="text-[11px] text-zinc-500">Actions, prompts, and agent state transitions will appear here in chronological order.</p>
                        </div>
                    ) : (
                        events.map((e) => {
                            const isExpanded = expandedEventId === e._id;
                            const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                            return (
                                <div
                                    key={e._id}
                                    className="bg-zinc-850 border border-zinc-800 hover:border-zinc-700/80 rounded-lg p-3 transition"
                                >
                                    <div
                                        onClick={() => setExpandedEventId(isExpanded ? null : e._id)}
                                        className="cursor-pointer select-none flex items-start justify-between gap-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-750 text-zinc-400">
                                                    {e.category || e.event_type}
                                                </span>
                                                {getStatusBadge(e.execution_state)}
                                                <span className="text-[10px] text-zinc-500 font-mono ml-auto">
                                                    {timeStr}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-zinc-200 leading-snug break-words">
                                                {e.summary || e.event_type}
                                            </p>
                                        </div>
                                        <button className="text-zinc-500 hover:text-zinc-300 transition mt-0.5">
                                            <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Expanded Structured Metadata */}
                                    {isExpanded && (
                                        <div className="mt-2.5 pt-2 border-t border-zinc-800 text-[11px] space-y-1.5 text-zinc-400">
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span>Source: <strong className="text-zinc-300 font-normal">{e.source}</strong> ({e.source_confidence})</span>
                                                {e.correlation_id && (
                                                    <span className="truncate max-w-[150px]" title={e.correlation_id}>
                                                        Corr: <code className="text-zinc-300 font-mono">{e.correlation_id}</code>
                                                    </span>
                                                )}
                                            </div>
                                            {e.sanitized_payload && Object.keys(e.sanitized_payload).length > 0 && (
                                                <div className="bg-zinc-950 p-2 rounded border border-zinc-800 font-mono text-[10px] text-zinc-300 overflow-x-auto">
                                                    <pre className="whitespace-pre-wrap break-all">
                                                        {JSON.stringify(e.sanitized_payload, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
