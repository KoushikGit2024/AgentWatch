import React, { useState, useEffect, useRef } from 'react';

// ─── Icons (inline SVG to avoid dependencies) ─────────────────────────────────
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
    chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    chevronUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>,
    link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    db: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><ellipse cx={12} cy={5} rx={9} ry={3}/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/></svg>,
    filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    wrench: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>,
};

// ─── Connection Status Badge ───────────────────────────────────────────────────
function StatusBadge({ connected, status }) {
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            connected
                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 pulse-live' : 'bg-zinc-500'}`} />
            {status}
        </div>
    );
}

// ─── Event State Color Helper ─────────────────────────────────────────────────
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

// ─── Category Chip ─────────────────────────────────────────────────────────────
function CategoryChip({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition shrink-0 ${
                active
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-900/50'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
        >
            {label}
        </button>
    );
}

// ─── Timeline Event Card ──────────────────────────────────────────────────────
function EventCard({ event }) {
    const [expanded, setExpanded] = useState(false);
    const colors = eventStateColors(event.execution_state);
    const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div className="group relative pl-4 pb-4 last:pb-0">
            {/* Timeline line */}
            <div className="absolute left-0 top-2 bottom-0 w-px bg-zinc-800 group-last:hidden" />
            {/* Dot */}
            <div className={`absolute left-[-3.5px] top-2 w-2 h-2 rounded-full border border-zinc-950 ${colors.dot}`} />

            <div
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all cursor-pointer"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.badge}`}>
                                    {colors.label}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-800">
                                    {(event.category || event.event_type || 'event').toUpperCase()}
                                </span>
                            </div>
                            <p className="text-sm font-medium text-zinc-100 leading-snug break-words">
                                {event.summary || event.event_type || 'Agent event'}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-zinc-500 font-mono">{timeStr}</span>
                            <span className="text-[10px] text-zinc-600">{dateStr}</span>
                        </div>
                    </div>
                </div>

                {expanded && (
                    <div className="border-t border-zinc-800 px-3 py-2.5 bg-zinc-950/50 space-y-2">
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span>Source: <span className="text-zinc-300">{event.source || 'unknown'}</span></span>
                            {event.source_confidence && <span className="text-zinc-600">({event.source_confidence})</span>}
                            {event.correlation_id && (
                                <span className="truncate text-[10px] font-mono text-zinc-600" title={event.correlation_id}>
                                    {event.correlation_id.slice(0, 16)}…
                                </span>
                            )}
                        </div>
                        {event.sanitized_payload && Object.keys(event.sanitized_payload).length > 0 && (
                            <pre className="text-[10px] font-mono text-zinc-300 bg-zinc-900 rounded-lg p-2 border border-zinc-800 overflow-x-auto whitespace-pre-wrap break-all">
                                {JSON.stringify(event.sanitized_payload, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Live View Tab ────────────────────────────────────────────────────────────
function LiveViewTab({ snapshotData, pendingInteraction, selectedOptions, onToggleOption, customResponse, onChangeCustomResponse, isSubmitting, submitSuccess, onSubmit, promptText, onChangePrompt, onSend, isSending, onNewChat }) {
    const quickActions = ['Continue working', 'Explain what you just did', 'Fix the latest bug', 'Summarize progress'];
    const isMulti = pendingInteraction?.kind === 'multiple_choice';

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Viewport */}
            <div className="flex-1 overflow-y-auto bg-zinc-950 overscroll-contain select-text">
                {snapshotData?.html ? (
                    <div
                        className="chat-content max-w-3xl mx-auto w-full p-4"
                        dangerouslySetInnerHTML={{ __html: snapshotData.html }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-full p-8 text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                            <div className="w-8 h-8">{Icon.monitor}</div>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-200 mb-1">No Active Session</h2>
                            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                                The agent workspace will appear here once Antigravity IDE is connected and a conversation is active.
                            </p>
                        </div>
                        <button
                            onClick={onNewChat}
                            className="mt-1 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95"
                        >
                            <div className="w-4 h-4">{Icon.plus}</div>
                            New Conversation
                        </button>
                    </div>
                )}
            </div>

            {/* Pending Interaction Banner */}
            {pendingInteraction && (
                <div className="bg-amber-950/40 border-t-2 border-amber-600/60 shrink-0">
                    <div className="p-3 space-y-2.5">
                        <div className="flex items-start gap-2">
                            <div className="w-4 h-4 text-amber-400 shrink-0 mt-0.5">{Icon.decision}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-0.5">Agent Needs Your Input</p>
                                <p className="text-sm font-medium text-zinc-100">{pendingInteraction.title}</p>
                                {pendingInteraction.description && (
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pendingInteraction.description}</p>
                                )}
                            </div>
                        </div>

                        {pendingInteraction.options?.length > 0 && (
                            <div className="space-y-1.5">
                                {pendingInteraction.options.map(opt => {
                                    const sel = selectedOptions.has(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => onToggleOption(opt.id)}
                                            className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border transition active:scale-[0.99] ${
                                                sel
                                                    ? 'bg-blue-950/40 border-blue-600/60 text-zinc-100'
                                                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sel ? 'text-blue-400' : 'text-zinc-600'}`}>
                                                {sel ? Icon.check : (isMulti ? <span className="text-zinc-600">□</span> : <span className="text-zinc-600">○</span>)}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium flex items-center gap-1.5">
                                                    {opt.label}
                                                    {opt.is_recommended && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Recommended</span>
                                                    )}
                                                </div>
                                                {opt.description && <p className="text-[11px] text-zinc-500 mt-0.5">{opt.description}</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {pendingInteraction.allow_custom_response && (
                            <input
                                type="text"
                                value={customResponse}
                                onChange={e => onChangeCustomResponse(e.target.value)}
                                placeholder="Or type a custom response..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                            />
                        )}

                        <div className="flex justify-end">
                            {submitSuccess ? (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                    <div className="w-3.5 h-3.5">{Icon.check}</div> Submitted
                                </span>
                            ) : (
                                <button
                                    disabled={isSubmitting || (selectedOptions.size === 0 && !customResponse.trim())}
                                    onClick={onSubmit}
                                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {isSubmitting ? 'Submitting…' : 'Submit'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Composer */}
            <div className="bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe">
                <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
                    {quickActions.map(action => (
                        <button
                            key={action}
                            onClick={() => onChangePrompt(action)}
                            className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 px-3 py-1.5 rounded-full border border-zinc-700 transition shrink-0"
                        >
                            {action}
                        </button>
                    ))}
                </div>
                <div className="px-3 pb-3 flex items-end gap-2">
                    <div className="flex-1 bg-zinc-950 border border-zinc-800 focus-within:border-zinc-600 rounded-xl px-3 py-2.5 transition">
                        <textarea
                            value={promptText}
                            onChange={e => onChangePrompt(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}}
                            placeholder="Message the agent…"
                            rows={1}
                            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-32 leading-relaxed"
                        />
                    </div>
                    <button
                        disabled={!promptText.trim() || isSending}
                        onClick={onSend}
                        className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition active:scale-95 shrink-0"
                    >
                        <div className="w-4 h-4">{Icon.send}</div>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
function TimelineTab({ events, isLoading, activeCategory, onSelectCategory, searchQuery, onChangeSearch, onRefresh }) {
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

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Search + Filters */}
            <div className="px-4 pt-3 pb-2 space-y-2.5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 rounded-xl px-3 py-2 transition">
                        <div className="w-3.5 h-3.5 text-zinc-500 shrink-0">{Icon.search}</div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => onChangeSearch(e.target.value)}
                            placeholder="Search events, tools, prompts…"
                            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => onChangeSearch('')} className="text-zinc-500 hover:text-zinc-300 transition">
                                <div className="w-3.5 h-3.5">{Icon.x}</div>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-zinc-200 transition active:scale-95 shrink-0"
                    >
                        <div className="w-4 h-4">{Icon.refresh}</div>
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {categories.map(c => (
                        <CategoryChip
                            key={String(c.id)}
                            label={c.label}
                            active={activeCategory === c.id}
                            onClick={() => onSelectCategory(c.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 select-text">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                            <div className="w-7 h-7">{Icon.timeline}</div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-zinc-300 mb-1">No Events Yet</p>
                            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                                {searchQuery
                                    ? `No events matching "${searchQuery}". Try a different search.`
                                    : 'Agent activity — prompts, tool calls, decisions, errors — will appear here in real time.'}
                            </p>
                        </div>
                        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl transition">
                            <div className="w-4 h-4">{Icon.refresh}</div>
                            Refresh
                        </button>
                    </div>
                ) : (
                    <div className="ml-2">
                        {events.map(e => <EventCard key={e._id || e.correlation_id || Math.random()} event={e} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Status / Settings Tab ────────────────────────────────────────────────────
function StatusTab({ appState, diagnostics, recoveryItems, isRecoveryLoading, onReconcileAction, onNewChat, onStop, onRefresh, historyChats, isHistoryLoading, onOpenHistory, onSetMode, onSetModel }) {
    const [reconciling, setReconciling] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const handleReconcile = async (item) => {
        setReconciling(item.context?.idempotency_key);
        try {
            await onReconcileAction({
                scope: item.context?.scope || 'prompt_send',
                idempotency_key: item.context?.idempotency_key,
                resolution_notes: 'Manually marked resolved from mobile recovery center'
            });
        } catch (e) {
            alert(`Failed: ${e.message}`);
        } finally {
            setReconciling(null);
        }
    };

    const diag = diagnostics;

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">

            {/* ── System Health ─────────────────────────────── */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">System Health</h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                    {/* IDE Connection */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <div className="w-4 h-4">{Icon.link}</div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200">Antigravity IDE</p>
                                <p className="text-xs text-zinc-500">{diag?.cdp_target ? 'CDP connected' : 'Not connected'}</p>
                            </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            (diag?.cdp_connected ?? appState.connected)
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        }`}>
                            {(diag?.cdp_connected ?? appState.connected) ? 'Live' : 'Offline'}
                        </span>
                    </div>

                    {/* MongoDB */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <div className="w-4 h-4">{Icon.db}</div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200">MongoDB</p>
                                <p className="text-xs text-zinc-500">{diag?.mongodb_database || 'AgentWatch_v2'}</p>
                            </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            diag?.mongodb_ready
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        }`}>
                            {diag?.mongodb_ready ? 'Ready' : diag ? 'Down' : 'Checking…'}
                        </span>
                    </div>

                    {/* FastAPI */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <div className="w-4 h-4">{Icon.settings}</div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-200">API Server</p>
                                <p className="text-xs text-zinc-500">FastAPI · port 8000</p>
                            </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">OK</span>
                    </div>
                </div>

                {/* Stats row */}
                {diag && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-zinc-100">{diag.in_progress_operations_count ?? 0}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">In Progress</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-amber-400">{diag.outcome_unknown_count ?? 0}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Unknown</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-zinc-100">{diag.reconnection_attempts ?? 0}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Reconnects</p>
                        </div>
                    </div>
                )}
            </section>

            {/* ── Recovery Items ────────────────────────────── */}
            {recoveryItems.length > 0 && (
                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5">{Icon.alert}</div>
                        Recovery Needed · {recoveryItems.length}
                    </h2>
                    <div className="space-y-2">
                        {recoveryItems.map((item, i) => (
                            <div key={i} className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-3.5 space-y-2">
                                <div>
                                    <p className="text-sm font-medium text-zinc-100">{item.description || 'Unresolved operation'}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {item.context?.scope || 'unknown'} · {item.action_type}
                                    </p>
                                </div>
                                {!item.is_retry_safe && (
                                    <p className="text-[11px] text-amber-400/80">⚠ Not safe to auto-retry — requires manual review</p>
                                )}
                                <button
                                    disabled={reconciling === item.context?.idempotency_key}
                                    onClick={() => handleReconcile(item)}
                                    className="w-full py-2 text-sm font-semibold rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 transition disabled:opacity-50"
                                >
                                    {reconciling === item.context?.idempotency_key ? 'Marking resolved…' : 'Mark as Resolved'}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Quick Controls ────────────────────────────── */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Agent Controls</h2>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onNewChat} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium transition active:scale-95">
                        <div className="w-4 h-4">{Icon.plus}</div> New Chat
                    </button>
                    <button onClick={onStop} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-950/30 border border-rose-800/40 hover:border-rose-700/60 text-rose-300 text-sm font-medium transition active:scale-95">
                        <div className="w-4 h-4">{Icon.stop}</div> Stop Agent
                    </button>
                    <button onClick={onRefresh} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium transition active:scale-95">
                        <div className="w-4 h-4">{Icon.refresh}</div> Refresh
                    </button>
                    <button onClick={onOpenHistory} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium transition active:scale-95">
                        <div className="w-4 h-4">{Icon.history}</div> History
                    </button>
                </div>
            </section>

            {/* ── Configuration ─────────────────────────────── */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Configuration</h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-zinc-400">Mode</span>
                        <button onClick={onSetMode} className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition flex items-center gap-1.5">
                            {appState.mode} <div className="w-3.5 h-3.5 text-zinc-500">{Icon.chevronDown}</div>
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-zinc-400">Model</span>
                        <button onClick={onSetModel} className="text-sm font-medium text-zinc-200 hover:text-blue-400 transition flex items-center gap-1.5 text-right max-w-48 truncate">
                            {appState.model} <div className="w-3.5 h-3.5 text-zinc-500 shrink-0">{Icon.chevronDown}</div>
                        </button>
                    </div>
                </div>
            </section>

            <div className="h-4" />
        </div>
    );
}

// ─── Selection Modal (Mode / Model) ──────────────────────────────────────────
function SelectionModal({ isOpen, title, options, onSelect, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                    <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="p-3 space-y-1.5 pb-8">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => onSelect(opt)}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-sm text-zinc-200 font-medium transition active:scale-[0.99]"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── History Sheet ─────────────────────────────────────────────────────────────
function HistorySheet({ isOpen, onClose, chats, isLoading, onSelectChat }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                    <h3 className="text-base font-semibold text-zinc-100">Past Conversations</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-3 pb-8 space-y-1">
                    {isLoading ? (
                        <div className="p-6 text-center text-sm text-zinc-500">Loading…</div>
                    ) : chats.length === 0 ? (
                        <div className="p-6 text-center text-sm text-zinc-500">No past conversations found.</div>
                    ) : chats.map(chat => (
                        <button
                            key={chat.session_id}
                            onClick={() => { onSelectChat(chat.title); onClose(); }}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 text-sm text-zinc-200 transition active:scale-[0.99] truncate"
                        >
                            {chat.title || chat.session_id}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Bottom Nav Bar ────────────────────────────────────────────────────────────
function BottomNav({ activeTab, onSelect, decisionCount, recoveryCount }) {
    const tabs = [
        { id: 'live', label: 'Live View', icon: Icon.monitor },
        { id: 'timeline', label: 'Timeline', icon: Icon.timeline },
        { id: 'decisions', label: 'Decisions', icon: Icon.decision, badge: decisionCount },
        { id: 'status', label: 'Status', icon: Icon.settings, badge: recoveryCount, badgeColor: 'bg-amber-500' },
    ];

    return (
        <nav className="bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe">
            <div className="flex items-stretch">
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
                                    <span className={`absolute -top-1 -right-1.5 w-2.5 h-2.5 ${tab.badgeColor || 'bg-blue-500'} rounded-full border border-zinc-900`} />
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
    const [activeTab, setActiveTab] = useState('live');
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model'
    const [historyOpen, setHistoryOpen] = useState(false);

    const [appState, setAppState] = useState({ status: 'Connecting…', connected: false, mode: 'Fast', model: 'Default' });
    const [snapshotData, setSnapshotData] = useState(null);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [isInteractionCollapsed, setIsInteractionCollapsed] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [timelineCategory, setTimelineCategory] = useState(null);
    const [timelineSearch, setTimelineSearch] = useState('');

    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);

    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const h = { 'ngrok-skip-browser-warning': 'true' };

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
            const params = new URLSearchParams({ limit: '50' });
            if (timelineCategory) params.append('category', timelineCategory);
            if (timelineSearch) params.append('search', timelineSearch);
            const res = await fetch(`/api/v1/events?${params}`, { headers: h });
            if (res.ok) { const data = await res.json(); setTimelineEvents(data.events || []); }
        } catch {} finally { setIsTimelineLoading(false); }
    };

    const fetchRecoveryItems = async () => {
        setIsRecoveryLoading(true);
        try {
            const res = await fetch('/api/v1/events/recovery-items', { headers: h });
            if (res.ok) { const data = await res.json(); setRecoveryItems(data || []); }
        } catch {} finally { setIsRecoveryLoading(false); }
    };

    const fetchDiagnostics = async () => {
        try {
            const res = await fetch('/api/v1/diagnostics', { headers: h });
            if (res.ok) { const data = await res.json(); setDiagnostics(data); }
        } catch {}
    };

    // ── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        fetchAppState(); fetchSnapshot(); fetchPendingInteractions(); fetchRecoveryItems(); fetchDiagnostics();
        const t1 = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchAppState(); fetchPendingInteractions(); fetchSnapshot();
        }, 3000);
        const t2 = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchRecoveryItems(); fetchDiagnostics();
        }, 10000);
        return () => { isMountedRef.current = false; clearInterval(t1); clearInterval(t2); };
    }, []);

    useEffect(() => {
        if (activeTab === 'timeline') fetchTimelineEvents();
    }, [activeTab, timelineCategory, timelineSearch]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSendPrompt = async () => {
        const msg = promptText.trim();
        if (!msg || isSendingPrompt) return;
        setIsSendingPrompt(true);
        const saved = promptText;
        setPromptText('');
        const key = 'prompt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        try {
            const res = await fetch('/send', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, idempotency_key: key }) });
            if (!res.ok) setPromptText(saved);
            else setTimeout(fetchSnapshot, 500);
        } catch { setPromptText(saved); } finally { setIsSendingPrompt(false); }
    };

    const handleInteractionSubmit = async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) { alert('Please select an option or type a custom response.'); return; }
        setIsSubmitting(true);
        const key = 'resp-' + pendingInteraction.interaction_id + '-' + Date.now();
        try {
            const res = await fetch(`/api/v1/interactions/${encodeURIComponent(pendingInteraction.interaction_id)}/respond`, {
                method: 'POST', headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ selected_option_ids: [...selectedOptions], custom_response: customOk ? customResponse.trim() : null, idempotency_key: key })
            });
            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => { setPendingInteraction(null); setSubmitSuccess(false); fetchSnapshot(); }, 1000);
            } else { const e = await res.json().catch(() => ({})); alert(e.detail || 'Submission failed.'); }
        } catch (e) { alert(`Network error: ${e.message}`); } finally { setIsSubmitting(false); }
    };

    const handleToggleOption = (id) => {
        const isMulti = pendingInteraction?.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const n = new Set(prev);
            if (isMulti) { if (n.has(id)) n.delete(id); else n.add(id); }
            else { n.clear(); n.add(id); }
            return n;
        });
    };

    const handleNewChat = async () => { try { await fetch('/new-chat', { method: 'POST', headers: h }); setTimeout(fetchSnapshot, 400); } catch {} };
    const handleStop = async () => { try { await fetch('/stop', { method: 'POST', headers: h }); } catch {} };
    const handleSetMode = async (m) => { setActiveModal(null); try { await fetch('/set-mode', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: m }) }); setAppState(p => ({ ...p, mode: m })); } catch {} };
    const handleSetModel = async (m) => { setActiveModal(null); try { await fetch('/set-model', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: m }) }); setAppState(p => ({ ...p, model: m })); } catch {} };
    const handleOpenHistory = async () => { setHistoryOpen(true); setIsHistoryLoading(true); try { const res = await fetch('/chat-history', { headers: h }); if (res.ok) { const d = await res.json(); setHistoryChats(d.chats || []); } } catch { setHistoryChats([]); } finally { setIsHistoryLoading(false); } };
    const handleReconcileAction = async ({ scope, idempotency_key, resolution_notes }) => {
        const res = await fetch('/api/v1/events/reconcile-action', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, idempotency_key, resolution_notes }) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Reconciliation failed'); }
        fetchRecoveryItems();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[100dvh] w-screen bg-zinc-950 text-zinc-100 overflow-hidden">

            {/* ── Top Bar ─────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0 select-none">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/50">
                        AW
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-zinc-100 leading-none">AgentWatch</h1>
                        <p className="text-[10px] text-zinc-500 leading-none mt-0.5">{appState.mode} · {appState.model.split(' ')[0]}</p>
                    </div>
                </div>
                <StatusBadge connected={appState.connected} status={appState.status} />
            </header>

            {/* ── Tab Content ─────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeTab === 'live' && (
                    <LiveViewTab
                        snapshotData={snapshotData}
                        pendingInteraction={pendingInteraction}
                        selectedOptions={selectedOptions}
                        onToggleOption={handleToggleOption}
                        customResponse={customResponse}
                        onChangeCustomResponse={setCustomResponse}
                        isSubmitting={isSubmitting}
                        submitSuccess={submitSuccess}
                        onSubmit={handleInteractionSubmit}
                        promptText={promptText}
                        onChangePrompt={setPromptText}
                        onSend={handleSendPrompt}
                        isSending={isSendingPrompt}
                        onNewChat={handleNewChat}
                    />
                )}

                {activeTab === 'timeline' && (
                    <TimelineTab
                        events={timelineEvents}
                        isLoading={isTimelineLoading}
                        activeCategory={timelineCategory}
                        onSelectCategory={setTimelineCategory}
                        searchQuery={timelineSearch}
                        onChangeSearch={setTimelineSearch}
                        onRefresh={fetchTimelineEvents}
                    />
                )}

                {activeTab === 'decisions' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        {pendingInteraction ? (
                            <div className="space-y-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-950/50 border border-amber-800/50 flex items-center justify-center text-amber-400 shrink-0">
                                            <div className="w-4.5 h-4.5">{Icon.decision}</div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-0.5">Agent is waiting for you</p>
                                            <h3 className="text-base font-semibold text-zinc-100">{pendingInteraction.title}</h3>
                                            {pendingInteraction.description && (
                                                <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{pendingInteraction.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {pendingInteraction.options?.length > 0 && (
                                        <div className="space-y-2">
                                            {pendingInteraction.options.map(opt => {
                                                const sel = selectedOptions.has(opt.id);
                                                const isMulti = pendingInteraction.kind === 'multiple_choice';
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => handleToggleOption(opt.id)}
                                                        className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition active:scale-[0.99] ${
                                                            sel ? 'bg-blue-950/40 border-blue-600/60' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                                                        }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${sel ? 'border-blue-500 bg-blue-600' : 'border-zinc-600'}`}>
                                                            {sel && <div className="w-2.5 h-2.5 text-white">{Icon.check}</div>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                                                                {opt.label}
                                                                {opt.is_recommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Recommended</span>}
                                                            </div>
                                                            {opt.description && <p className="text-xs text-zinc-500 mt-1">{opt.description}</p>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {pendingInteraction.allow_custom_response && (
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Custom response</label>
                                            <input
                                                type="text"
                                                value={customResponse}
                                                onChange={e => setCustomResponse(e.target.value)}
                                                placeholder="Enter custom guidance…"
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-1">
                                        {submitSuccess ? (
                                            <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                                                <div className="w-4 h-4">{Icon.check}</div> Submitted successfully!
                                            </div>
                                        ) : (
                                            <button
                                                disabled={isSubmitting || (selectedOptions.size === 0 && !customResponse.trim())}
                                                onClick={handleInteractionSubmit}
                                                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                            >
                                                {isSubmitting ? 'Submitting…' : 'Submit Response'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                                    <div className="w-8 h-8">{Icon.decision}</div>
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-zinc-300 mb-1">No Pending Decisions</p>
                                    <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                                        When the agent needs your input — permissions, choices, or confirmations — they will appear here.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
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
                        onRefresh={() => { fetchAppState(); fetchSnapshot(); fetchRecoveryItems(); fetchDiagnostics(); }}
                        historyChats={historyChats}
                        isHistoryLoading={isHistoryLoading}
                        onOpenHistory={handleOpenHistory}
                        onSetMode={() => setActiveModal('mode')}
                        onSetModel={() => setActiveModal('model')}
                    />
                )}
            </div>

            {/* ── Bottom Navigation ───────────────────────── */}
            <BottomNav
                activeTab={activeTab}
                onSelect={setActiveTab}
                decisionCount={pendingInteraction ? 1 : 0}
                recoveryCount={recoveryItems.length}
            />

            {/* ── Modals ──────────────────────────────────── */}
            <SelectionModal
                isOpen={activeModal === 'mode'}
                title="Select Agent Mode"
                options={['Fast', 'Planning']}
                onSelect={handleSetMode}
                onClose={() => setActiveModal(null)}
            />
            <SelectionModal
                isOpen={activeModal === 'model'}
                title="Select Model"
                options={['Default Antigravity Agent', 'Gemini 3.1 Pro (High)', 'Claude Sonnet 4.6 (Thinking)', 'Claude Opus 4.6 (Thinking)', 'GPT-OSS 120B (Medium)']}
                onSelect={handleSetModel}
                onClose={() => setActiveModal(null)}
            />
            <HistorySheet
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
                onSelectChat={(title) => { fetch('/select-chat', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }); setTimeout(fetchSnapshot, 500); setHistoryOpen(false); }}
            />
        </div>
    );
}
